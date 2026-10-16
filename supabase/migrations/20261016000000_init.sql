-- ええやん 初期スキーマ
-- 方針:
--   * 書き込みはすべてサーバー（Route Handler から postgres ロールで直接接続）で行う。クライアントは SELECT のみ。
--   * 手札（hands）は本人だけが読める。山札（decks）はクライアントから一切読めない。
--   * カードの本文は src/data/*.json が正。DB にはカードIDだけを保存する。

create extension if not exists pg_cron with schema pg_catalog;

-- ─────────────────────────────────────────────────────────────
-- テーブル
-- ─────────────────────────────────────────────────────────────

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  -- 6文字。紛らわしい 0 / O / 1 / I / L を除外
  code text not null unique check (code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  host_player_id uuid,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  settings jsonb not null,
  current_round_id uuid,
  -- 再戦のたびに増える。ゲーム終了画面の振り返りを今のゲーム分に絞るために使う
  game_no int not null default 0,
  -- 接続人数が3名を下回ったときにホストが「続行」を選んだら 'continue'。3名以上に戻ったら null に戻す
  low_player_decision text check (low_player_decision in ('continue')),
  version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  -- Supabase 匿名ユーザーのID。クライアントには公開しない（列単位で権限を外す）
  auth_uid uuid not null,
  nickname text not null check (char_length(nickname) between 1 and 12),
  seat_order int not null,
  score int not null default 0 check (score >= 0),
  is_connected boolean not null default true,
  last_seen_at timestamptz not null default now(),
  -- ゲーム中にキック・離脱した時刻。ロビーでのキックは行ごと削除する
  left_at timestamptz,
  joined_at timestamptz not null default now(),
  unique (room_id, nickname),
  unique (room_id, auth_uid),
  unique (room_id, seat_order)
);

alter table public.rooms
  add constraint rooms_host_player_fk
  foreign key (host_player_id) references public.players (id) on delete set null
  deferrable initially deferred;

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  game_no int not null,
  round_no int not null,
  parent_player_id uuid not null references public.players (id) on delete cascade,
  topic_card_id text not null,
  phase text not null check (phase in ('prep', 'pitch', 'judge', 'result')),
  phase_started_at timestamptz not null default now(),
  -- 締め切り（サーバー時刻）。null は無制限。pitch 中は「いま発表している人」の締め切り
  phase_ends_at timestamptz,
  pitch_order uuid[] not null default '{}',
  current_pitch_index int not null default 0,
  -- 「いけるで！」を押した子。誰が準備完了かは全員に見えてよい情報
  ready_player_ids uuid[] not null default '{}',
  winner_player_id uuid references public.players (id) on delete set null,
  -- 楽観ロック用。ラウンドの行を更新するたびに +1
  version int not null default 0,
  created_at timestamptz not null default now(),
  unique (room_id, game_no, round_no)
);

alter table public.rooms
  add constraint rooms_current_round_fk
  foreign key (current_round_id) references public.rounds (id) on delete set null;

create table public.hands (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  -- 並び順を保持する（3枚）
  card_ids text[] not null check (cardinality(card_ids) = 3),
  memo text check (memo is null or char_length(memo) <= 300),
  swapped boolean not null default false,
  is_ready boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (round_id, player_id)
);

-- 発表で公開されたカード。発表開始時に hands からコピーする。切断でスキップされた人は card_ids を空のままにする
create table public.pitches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  round_id uuid not null references public.rounds (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  card_ids text[] not null default '{}',
  order_index int not null,
  skipped boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (round_id, player_id)
);

-- 山札（上が配列の先頭）。サーバーだけが読み書きする
create table public.decks (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  topic_draw_pile text[] not null default '{}',
  topic_discard text[] not null default '{}',
  word_draw_pile text[] not null default '{}',
  word_discard text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index rooms_expires_at_idx on public.rooms (expires_at);
create index players_room_id_idx on public.players (room_id);
create index players_auth_uid_idx on public.players (auth_uid);
create index rounds_room_id_idx on public.rounds (room_id, game_no, round_no);
create index hands_player_id_idx on public.hands (player_id);
create index pitches_round_id_idx on public.pitches (round_id, order_index);
create index pitches_room_id_idx on public.pitches (room_id);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger rooms_touch_updated_at before update on public.rooms
  for each row execute function public.touch_updated_at();
create trigger hands_touch_updated_at before update on public.hands
  for each row execute function public.touch_updated_at();
create trigger decks_touch_updated_at before update on public.decks
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 権限と RLS
-- ─────────────────────────────────────────────────────────────

-- 自分がそのルームに参加中か（RLS から使う。RLS の再帰を避けるため SECURITY DEFINER）
create or replace function public.is_room_member(target_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.players p
    where p.room_id = target_room
      and p.auth_uid = (select auth.uid())
      and p.left_at is null
  );
$$;

-- そのプレイヤーが自分か
create or replace function public.is_own_player(target_player uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.players p
    where p.id = target_player
      and p.auth_uid = (select auth.uid())
  );
$$;

revoke all on function public.is_room_member(uuid) from public, anon;
revoke all on function public.is_own_player(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_own_player(uuid) to authenticated;

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.rounds enable row level security;
alter table public.hands enable row level security;
alter table public.pitches enable row level security;
alter table public.decks enable row level security;

-- Supabase は public のテーブルに anon / authenticated の全権限を既定で付けるので、まず外す
revoke all on table public.rooms, public.players, public.rounds, public.hands, public.pitches, public.decks
  from anon, authenticated;

-- 匿名ユーザーは authenticated ロール。読み取りだけを許可する（書き込みは API 経由のみ）
grant select on table public.rooms, public.rounds, public.pitches, public.hands to authenticated;
-- players は auth_uid を除いた列だけ
grant select (id, room_id, nickname, seat_order, score, is_connected, last_seen_at, left_at, joined_at)
  on table public.players to authenticated;
-- decks には何も許可しない（ポリシーも作らない）

create policy rooms_select_members on public.rooms
  for select to authenticated using (public.is_room_member(id));

create policy players_select_members on public.players
  for select to authenticated using (public.is_room_member(room_id));

create policy rounds_select_members on public.rounds
  for select to authenticated using (public.is_room_member(room_id));

create policy pitches_select_members on public.pitches
  for select to authenticated using (public.is_room_member(room_id));

create policy hands_select_own on public.hands
  for select to authenticated using (public.is_own_player(player_id));

-- ─────────────────────────────────────────────────────────────
-- Realtime
-- hands は配信対象に含めない（手札の変化は本人のAPI応答で返す。漏えい経路を作らないため）
-- ─────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.rooms, public.players, public.rounds, public.pitches;

-- ─────────────────────────────────────────────────────────────
-- 期限切れルームの削除（作成から24時間）。アクセス時にもサーバー側で期限を確認する
-- ─────────────────────────────────────────────────────────────

select cron.schedule(
  'eeyan-delete-expired-rooms',
  '17 * * * *',
  $$delete from public.rooms where expires_at < now()$$
);

-- どのルームにも参加していない3日以上前の匿名ユーザーを削除する
select cron.schedule(
  'eeyan-delete-stale-anonymous-users',
  '41 4 * * *',
  $$delete from auth.users u
    where u.is_anonymous
      and u.created_at < now() - interval '3 days'
      and not exists (select 1 from public.players p where p.auth_uid = u.id)$$
);
