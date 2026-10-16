import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/server/db';
import { createRoom, joinRoom } from '@/lib/server/actions/room';
import { startGame } from '@/lib/server/actions/game';

/**
 * 本物の匿名ユーザーで Supabase に直接クエリし、RLS が手札・山札を守っていることを確かめる。
 * （ブラウザが anon key で直接 SELECT しても他人の手札が取れないことの確認）
 */

interface User {
  uid: string;
  client: SupabaseClient;
}

async function anonUser(): Promise<User> {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error('匿名ログインに失敗しました');
  return { uid: data.user.id, client };
}

let users: User[];
let outsider: User;
let code: string;
let roomId: string;

beforeAll(async () => {
  users = await Promise.all([anonUser(), anonUser(), anonUser()]);
  outsider = await anonUser();
  ({ code } = await createRoom(users[0].uid, 'あ', {}));
  await joinRoom(users[1].uid, code, 'い');
  await joinRoom(users[2].uid, code, 'う');
  const { snapshot } = await startGame(users[0].uid, code);
  roomId = snapshot.room.id;
});

afterAll(async () => {
  await db().end();
});

describe('RLS', () => {
  it('hands は自分の行しか読めない', async () => {
    const [{ count }] = await db()<{ count: number }[]>`
      select count(*)::int as count from hands h join rounds r on r.id = h.round_id where r.room_id = ${roomId}`;
    expect(count).toBe(2);

    for (const u of users) {
      const { data, error } = await u.client.from('hands').select('player_id, card_ids');
      expect(error).toBeNull();
      const [me] = await db()<{ id: string }[]>`select id from players where auth_uid = ${u.uid}`;
      expect(data!.every((h) => h.player_id === me.id)).toBe(true);
      expect(data!.length).toBeLessThanOrEqual(1);
    }
  });

  it('decks はクライアントから読めない', async () => {
    const { data, error } = await users[0].client.from('decks').select('*');
    expect(error?.code === '42501' || (data ?? []).length === 0).toBe(true);
  });

  it('players の auth_uid は読めないが、それ以外の列は読める', async () => {
    const bad = await users[0].client.from('players').select('auth_uid');
    expect(bad.error).not.toBeNull();
    const ok = await users[0].client.from('players').select('id, nickname, score').eq('room_id', roomId);
    expect(ok.error).toBeNull();
    expect(ok.data).toHaveLength(3);
  });

  it('参加していないルームは見えない', async () => {
    for (const table of ['rooms', 'players', 'rounds', 'pitches', 'hands'] as const) {
      const { data } = await outsider.client.from(table).select('id');
      expect(data ?? [], table).toHaveLength(0);
    }
  });

  it('クライアントからは書き込めない', async () => {
    const upd = await users[1].client.from('players').update({ score: 99 }).eq('room_id', roomId).select();
    expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true);
    const [{ max }] = await db()<{ max: number }[]>`select max(score)::int as max from players where room_id = ${roomId}`;
    expect(max).toBe(0);
    const ins = await users[1].client.from('pitches').insert({ room_id: roomId });
    expect(ins.error).not.toBeNull();
  });

  it('自分の部屋の rounds は読める', async () => {
    const { data, error } = await users[1].client.from('rounds').select('id, phase').eq('room_id', roomId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
