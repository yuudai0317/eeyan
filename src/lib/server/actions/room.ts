import 'server-only';
import { cryptoRng, generateRoomCode, MAX_PLAYERS, pickNewHost, resolveSettings, type Settings } from '@/lib/game';
import type { StateResponse } from '@/lib/types/api';
import { transaction } from '../db';
import { errors } from '../errors';
import { activePlayers, requireHost, requireMe, toLite, withRoom } from '../roomContext';
import { buildSnapshot } from '../snapshot';
import { patchRoom } from './round';

const UNIQUE_VIOLATION = '23505';

export async function createRoom(uid: string, nickname: string, settings: Partial<Settings> | undefined) {
  const resolved = resolveSettings(settings ?? {});
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode(cryptoRng);
    try {
      return await transaction(async (tx) => {
        const [room] = await tx<{ id: string }[]>`
          insert into rooms (code, settings) values (${code}, ${tx.json(resolved)}) returning id`;
        const [player] = await tx<{ id: string }[]>`
          insert into players (room_id, auth_uid, nickname, seat_order)
          values (${room.id}, ${uid}, ${nickname}, 0) returning id`;
        await tx`update rooms set host_player_id = ${player.id} where id = ${room.id}`;
        return { code };
      });
    } catch (e) {
      // ルームコードの衝突ならやり直す
      if ((e as { code?: string }).code === UNIQUE_VIOLATION) continue;
      throw e;
    }
  }
  throw errors.internal();
}

export function joinRoom(uid: string, code: string, nickname: string) {
  return withRoom(
    code,
    uid,
    async (ctx) => {
      if (ctx.players.some((p) => p.authUid === uid && p.leftAt)) throw errors.leftRoom();
      // 同じ端末で開き直した場合はそのまま復帰
      if (ctx.me) return { snapshot: await buildSnapshot(ctx) };

      if (ctx.room.status !== 'lobby') throw errors.gameInProgress();
      const active = activePlayers(ctx);
      if (active.length >= MAX_PLAYERS) throw errors.roomFull();
      if (ctx.players.some((p) => p.nickname === nickname)) throw errors.nicknameTaken();

      const seat = Math.max(-1, ...ctx.players.map((p) => p.seatOrder)) + 1;
      const [player] = await ctx.tx<(typeof ctx.players)[number][]>`
        insert into players (room_id, auth_uid, nickname, seat_order, last_seen_at)
        values (${ctx.room.id}, ${uid}, ${nickname}, ${seat}, ${ctx.now}) returning *`;
      ctx.players.push(player);
      ctx.me = player;
      if (!ctx.room.hostPlayerId) await patchRoom(ctx, { hostPlayerId: player.id });
      return { snapshot: await buildSnapshot(ctx) };
    },
    { allowNonMember: true },
  );
}

export function getState(uid: string, code: string): Promise<StateResponse> {
  return withRoom(
    code,
    uid,
    async (ctx): Promise<StateResponse> => {
      if (!ctx.me) {
        if (ctx.players.some((p) => p.authUid === uid && p.leftAt)) throw errors.leftRoom();
        return {
          member: false,
          preview: { code: ctx.room.code, status: ctx.room.status, playerCount: activePlayers(ctx).length },
        };
      }
      return { member: true, snapshot: await buildSnapshot(ctx) };
    },
    { allowNonMember: true },
  );
}

export function heartbeat(uid: string, code: string) {
  // 最終接続時刻の更新・切断者の判定・ホスト移譲は withRoom の中で行われる
  return withRoom(code, uid, async () => ({ ok: true }));
}

export function updateSettings(uid: string, code: string, settings: Partial<Settings>) {
  return withRoom(code, uid, async (ctx) => {
    requireHost(ctx);
    if (ctx.room.status !== 'lobby') throw errors.wrongPhase('設定はゲーム開始前だけ変更できます。');
    await patchRoom(ctx, { settings: resolveSettings({ ...ctx.room.settings, ...settings }) });
    return { snapshot: await buildSnapshot(ctx) };
  });
}

export function kickPlayer(uid: string, code: string, playerId: string) {
  return withRoom(code, uid, async (ctx) => {
    const host = requireHost(ctx);
    const target = ctx.players.find((p) => p.id === playerId && !p.leftAt);
    if (!target) throw errors.badRequest('そのプレイヤーは見つかりません。');
    if (target.id === host.id) throw errors.badRequest('自分自身は退出させられません。');
    await removePlayer(ctx, target.id);
    return { snapshot: await buildSnapshot(ctx) };
  });
}

export function leaveRoom(uid: string, code: string) {
  return withRoom(code, uid, async (ctx) => {
    const me = requireMe(ctx);
    await removePlayer(ctx, me.id);
    return { ok: true };
  });
}

/**
 * ロビーでは行ごと削除する。ゲーム中は「離脱」として残し、以降の親・発表・配布から外す（得点の表示は残す）。
 * ホストが抜けたら次の人へ移す。全員いなくなったらルームを消す。
 */
async function removePlayer(ctx: Parameters<Parameters<typeof withRoom>[2]>[0], playerId: string) {
  const { tx, room, now } = ctx;
  if (room.status === 'lobby') {
    await tx`delete from players where id = ${playerId}`;
    ctx.players = ctx.players.filter((p) => p.id !== playerId);
  } else {
    await tx`update players set left_at = ${now}, is_connected = false where id = ${playerId}`;
    const p = ctx.players.find((x) => x.id === playerId)!;
    p.leftAt = now;
    p.isConnected = false;
  }
  if (ctx.me?.id === playerId) ctx.me = null;

  const remaining = activePlayers(ctx);
  if (remaining.length === 0) {
    await tx`delete from rooms where id = ${room.id}`;
    return;
  }
  if (room.hostPlayerId === playerId) {
    const next =
      pickNewHost(ctx.players.map((p) => toLite(p, now)), playerId) ??
      [...remaining].sort((a, b) => a.seatOrder - b.seatOrder)[0].id;
    await patchRoom(ctx, { hostPlayerId: next });
  }
}
