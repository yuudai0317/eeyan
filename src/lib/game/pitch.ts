import type { PlayerLite } from './types';

type SeatPlayer = Pick<PlayerLite, 'id' | 'seatOrder' | 'left'>;

/**
 * 発表順を作る。親の次の席から時計回りに、抜けていない子を並べる。
 * 切断中の人も含める（順番が来た時点で切断中ならスキップする）。
 */
export function buildPitchOrder(players: readonly SeatPlayer[], parentId: string): string[] {
  const sorted = [...players].sort((a, b) => a.seatOrder - b.seatOrder);
  const parent = sorted.find((p) => p.id === parentId);
  const parentSeat = parent ? parent.seatOrder : Number.NEGATIVE_INFINITY;
  const after = sorted.filter((p) => p.seatOrder > parentSeat);
  const before = sorted.filter((p) => p.seatOrder <= parentSeat);
  return [...after, ...before].filter((p) => p.id !== parentId && !p.left).map((p) => p.id);
}

/**
 * fromIndex 以降で、発表できる（接続中の）最初の人の位置を返す。いなければ null。
 * 飛ばした位置も返すので、呼び出し側でスキップとして記録できる。
 */
export function findNextPresenter(
  order: readonly string[],
  fromIndex: number,
  isAvailable: (playerId: string) => boolean,
): { index: number | null; skipped: number[] } {
  const skipped: number[] = [];
  for (let i = Math.max(0, fromIndex); i < order.length; i++) {
    if (isAvailable(order[i])) return { index: i, skipped };
    skipped.push(i);
  }
  return { index: null, skipped };
}
