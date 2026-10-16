import 'server-only';
import { isConnectedAt, MIN_PLAYERS, pickNewHost } from '@/lib/game';
import type { PlayerLite } from '@/lib/game/types';
import { transaction, type Tx } from './db';
import { errors } from './errors';
import {
  deleteRoom,
  getPlayers,
  getRound,
  lockRoomByCode,
  updateRoom,
  type PlayerRow,
  type RoomRow,
  type RoundRow,
} from './repo/rows';

export interface RoomContext {
  tx: Tx;
  now: Date;
  room: RoomRow;
  players: PlayerRow[];
  /** 操作している本人（参加していなければ null） */
  me: PlayerRow | null;
  round: RoundRow | null;
}

/** ハートビートで last_seen_at を書き込む最小間隔（Realtime の通知を減らすため） */
const TOUCH_INTERVAL_MS = 5_000;

export function toLite(p: PlayerRow, now: Date): PlayerLite {
  return {
    id: p.id,
    seatOrder: p.seatOrder,
    score: p.score,
    connected: !p.leftAt && isConnectedAt(p.lastSeenAt.getTime(), now.getTime()),
    left: !!p.leftAt,
  };
}

export function activePlayers(ctx: Pick<RoomContext, 'players'>): PlayerRow[] {
  return ctx.players.filter((p) => !p.leftAt);
}

export function isConnected(ctx: Pick<RoomContext, 'now'>, p: PlayerRow): boolean {
  return !p.leftAt && isConnectedAt(p.lastSeenAt.getTime(), ctx.now.getTime());
}

/**
 * ルームの行をロック（SELECT … FOR UPDATE）してから処理する。
 * 同じルームへの操作はここで直列化されるので、二重実行や競合は起きない。
 * あわせて、接続状態の更新・ホスト移譲・期限切れの確認を行う。
 */
export async function withRoom<T>(
  code: string,
  uid: string,
  fn: (ctx: RoomContext) => Promise<T>,
  options: { allowNonMember?: boolean } = {},
): Promise<T> {
  const expired = await transaction(async (tx) => {
    const now = new Date();
    const room = await lockRoomByCode(tx, code);
    if (!room) throw errors.roomNotFound();
    if (room.expiresAt.getTime() <= now.getTime()) {
      await deleteRoom(tx, room.id);
      return true;
    }
    return false;
  });
  if (expired) throw errors.roomExpired();

  return transaction(async (tx) => {
    const now = new Date();
    const room = await lockRoomByCode(tx, code);
    if (!room) throw errors.roomNotFound();

    const players = await getPlayers(tx, room.id);
    const meRow = players.find((p) => p.authUid === uid) ?? null;
    if (meRow?.leftAt && !options.allowNonMember) throw errors.leftRoom();
    const me = meRow && !meRow.leftAt ? meRow : null;
    if (!me && !options.allowNonMember) throw errors.notMember();

    const ctx: RoomContext = {
      tx,
      now,
      room,
      players,
      me,
      round: room.currentRoundId ? await getRound(tx, room.currentRoundId) : null,
    };
    await sweepPresence(ctx);
    return fn(ctx);
  });
}

/** 自分の最終接続時刻を更新し、切断者の印付け・ホスト移譲・人数警告の解除を行う */
async function sweepPresence(ctx: RoomContext): Promise<void> {
  const { tx, now, me } = ctx;

  if (me && (now.getTime() - me.lastSeenAt.getTime() >= TOUCH_INTERVAL_MS || !me.isConnected)) {
    await tx`update players set last_seen_at = ${now}, is_connected = true where id = ${me.id}`;
    me.lastSeenAt = now;
    me.isConnected = true;
  }

  for (const p of ctx.players) {
    const connected = isConnected(ctx, p);
    if (p.isConnected !== connected) {
      await tx`update players set is_connected = ${connected} where id = ${p.id}`;
      p.isConnected = connected;
    }
  }

  const room = ctx.room;
  if (room.hostPlayerId) {
    const newHost = pickNewHost(ctx.players.map((p) => toLite(p, now)), room.hostPlayerId);
    if (newHost) {
      await updateRoom(tx, room.id, { hostPlayerId: newHost });
      room.hostPlayerId = newHost;
    }
  }

  // 人数が戻ったら「続行」の選択を解除し、次に下回ったときにもう一度確認する
  if (room.status === 'playing' && room.lowPlayerDecision) {
    const connectedCount = ctx.players.filter((p) => isConnected(ctx, p)).length;
    if (connectedCount >= MIN_PLAYERS) {
      await updateRoom(tx, room.id, { lowPlayerDecision: null });
      room.lowPlayerDecision = null;
    }
  }
}

export function requireHost(ctx: RoomContext): PlayerRow {
  if (!ctx.me || ctx.room.hostPlayerId !== ctx.me.id) throw errors.hostOnly();
  return ctx.me;
}

export function requireMe(ctx: RoomContext): PlayerRow {
  if (!ctx.me) throw errors.notMember();
  return ctx.me;
}

export function requireRound(ctx: RoomContext): RoundRow {
  if (ctx.room.status !== 'playing' || !ctx.round) throw errors.wrongPhase('ゲーム中ではありません。');
  return ctx.round;
}

/** クライアントが送ってきた version が古ければ 409 */
export function checkVersion(round: RoundRow, version: number | undefined): void {
  if (version !== undefined && version !== round.version) throw errors.conflict();
}
