import { randomInt, type Rng } from './rng';
import type { PlayerLite } from './types';

type SeatPlayer = Pick<PlayerLite, 'id' | 'seatOrder' | 'connected' | 'left'>;

const bySeat = (a: SeatPlayer, b: SeatPlayer) => a.seatOrder - b.seatOrder;

/** 初回の親をランダムに決める。接続中の人を優先する。 */
export function decideFirstParent(players: readonly SeatPlayer[], rng: Rng): string {
  const active = players.filter((p) => !p.left).sort(bySeat);
  const connected = active.filter((p) => p.connected);
  const pool = connected.length > 0 ? connected : active;
  if (pool.length === 0) throw new Error('親を決められるプレイヤーがいません');
  return pool[randomInt(pool.length, rng)].id;
}

/**
 * 次の親を seat_order 順（時計回り）で決める。
 * 抜けた人は飛ばす。切断中の人も飛ばすが、全員切断中なら抜けていない次の人にする。
 */
export function nextParent(players: readonly SeatPlayer[], currentParentId: string): string {
  const sorted = [...players].sort(bySeat);
  const current = sorted.find((p) => p.id === currentParentId);
  const startSeat = current ? current.seatOrder : Number.NEGATIVE_INFINITY;

  // 現在の親の次の席から一周する並び
  const after = sorted.filter((p) => p.seatOrder > startSeat);
  const before = sorted.filter((p) => p.seatOrder <= startSeat);
  const cycle = [...after, ...before].filter((p) => p.id !== currentParentId);

  const candidate = cycle.find((p) => !p.left && p.connected) ?? cycle.find((p) => !p.left);
  if (candidate) return candidate.id;
  if (current && !current.left) return current.id;
  throw new Error('次の親を決められるプレイヤーがいません');
}
