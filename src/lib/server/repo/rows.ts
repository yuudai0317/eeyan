import 'server-only';
import type { Phase, RoomStatus } from '@/lib/game/types';
import type { Settings } from '@/lib/game/settings';
import type { PileState } from '@/lib/game/deck';
import type { Tx } from '../db';
import { errors } from '../errors';

/** DB の行（列名は postgres.camel で camelCase に変換済み） */

export interface RoomRow {
  id: string;
  code: string;
  hostPlayerId: string | null;
  status: RoomStatus;
  settings: Settings;
  currentRoundId: string | null;
  gameNo: number;
  lowPlayerDecision: 'continue' | null;
  version: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface PlayerRow {
  id: string;
  roomId: string;
  authUid: string;
  nickname: string;
  seatOrder: number;
  score: number;
  isConnected: boolean;
  lastSeenAt: Date;
  leftAt: Date | null;
}

export interface RoundRow {
  id: string;
  roomId: string;
  gameNo: number;
  roundNo: number;
  parentPlayerId: string;
  topicCardId: string;
  phase: Phase;
  phaseStartedAt: Date;
  phaseEndsAt: Date | null;
  pitchOrder: string[];
  currentPitchIndex: number;
  readyPlayerIds: string[];
  winnerPlayerId: string | null;
  version: number;
}

export interface HandRow {
  id: string;
  roundId: string;
  playerId: string;
  cardIds: string[];
  memo: string | null;
  swapped: boolean;
  isReady: boolean;
}

export interface PitchRow {
  id: string;
  roundId: string;
  playerId: string;
  cardIds: string[];
  orderIndex: number;
  skipped: boolean;
  startedAt: Date;
  endedAt: Date | null;
}

export interface DeckState {
  topics: PileState;
  words: PileState;
}

// ─── rooms ───────────────────────────────────────────────

export async function lockRoomByCode(tx: Tx, code: string): Promise<RoomRow | null> {
  const [room] = await tx<RoomRow[]>`select * from rooms where code = ${code} for update`;
  return room ?? null;
}

export async function deleteRoom(tx: Tx, roomId: string): Promise<void> {
  await tx`delete from rooms where id = ${roomId}`;
}

export async function updateRoom(
  tx: Tx,
  roomId: string,
  patch: Partial<Pick<RoomRow, 'hostPlayerId' | 'status' | 'settings' | 'currentRoundId' | 'gameNo' | 'lowPlayerDecision'>>,
): Promise<void> {
  const columns = Object.keys(patch) as (keyof typeof patch)[];
  if (columns.length === 0) return;
  const values = { ...patch, settings: patch.settings ? tx.json(patch.settings) : undefined };
  await tx`update rooms set ${tx(values, columns)}, version = version + 1 where id = ${roomId}`;
}

// ─── players ─────────────────────────────────────────────

export async function getPlayers(tx: Tx, roomId: string): Promise<PlayerRow[]> {
  return tx<PlayerRow[]>`select * from players where room_id = ${roomId} order by seat_order`;
}

// ─── rounds ──────────────────────────────────────────────

export async function getRound(tx: Tx, roundId: string): Promise<RoundRow | null> {
  const [round] = await tx<RoundRow[]>`select * from rounds where id = ${roundId}`;
  return round ?? null;
}

export interface RoundPatch {
  phase?: Phase;
  phaseStartedAt?: Date;
  phaseEndsAt?: Date | null;
  currentPitchIndex?: number;
  readyPlayerIds?: string[];
  winnerPlayerId?: string | null;
}

/**
 * ラウンドを楽観ロック付きで更新する。expectedVersion が一致しなければ 409。
 * 戻り値は更新後の行。
 */
export async function updateRound(tx: Tx, round: RoundRow, patch: RoundPatch): Promise<RoundRow> {
  const next = { ...round, ...patch };
  const [row] = await tx<RoundRow[]>`
    update rounds set
      phase = ${next.phase},
      phase_started_at = ${next.phaseStartedAt},
      phase_ends_at = ${next.phaseEndsAt},
      current_pitch_index = ${next.currentPitchIndex},
      ready_player_ids = ${next.readyPlayerIds}::uuid[],
      winner_player_id = ${next.winnerPlayerId},
      version = version + 1
    where id = ${round.id} and version = ${round.version}
    returning *`;
  if (!row) throw errors.conflict();
  return row;
}

// ─── hands / pitches ─────────────────────────────────────

export async function getHands(tx: Tx, roundId: string): Promise<HandRow[]> {
  return tx<HandRow[]>`select * from hands where round_id = ${roundId}`;
}

export async function getHand(tx: Tx, roundId: string, playerId: string): Promise<HandRow | null> {
  const [hand] = await tx<HandRow[]>`select * from hands where round_id = ${roundId} and player_id = ${playerId}`;
  return hand ?? null;
}

export async function getPitches(tx: Tx, roundId: string): Promise<PitchRow[]> {
  return tx<PitchRow[]>`select * from pitches where round_id = ${roundId} order by order_index`;
}

// ─── decks ───────────────────────────────────────────────

export async function getDeck(tx: Tx, roomId: string): Promise<DeckState> {
  const [row] = await tx<
    { topicDrawPile: string[]; topicDiscard: string[]; wordDrawPile: string[]; wordDiscard: string[] }[]
  >`select * from decks where room_id = ${roomId} for update`;
  if (!row) throw errors.internal();
  return {
    topics: { pile: row.topicDrawPile, discard: row.topicDiscard },
    words: { pile: row.wordDrawPile, discard: row.wordDiscard },
  };
}

export async function saveDeck(tx: Tx, roomId: string, deck: DeckState): Promise<void> {
  await tx`
    insert into decks (room_id, topic_draw_pile, topic_discard, word_draw_pile, word_discard)
    values (${roomId}, ${deck.topics.pile}::text[], ${deck.topics.discard}::text[],
            ${deck.words.pile}::text[], ${deck.words.discard}::text[])
    on conflict (room_id) do update set
      topic_draw_pile = excluded.topic_draw_pile,
      topic_discard = excluded.topic_discard,
      word_draw_pile = excluded.word_draw_pile,
      word_discard = excluded.word_discard`;
}
