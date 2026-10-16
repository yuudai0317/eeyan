/** 0以上1未満の数を返す乱数関数。テストではシード付き、本番では暗号論的乱数を使う。 */
export type Rng = () => number;

/** シード付き乱数（mulberry32）。テスト用。 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 暗号論的乱数。サーバーでの本番配布に使う。 */
export const cryptoRng: Rng = () => {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
};

export function randomInt(maxExclusive: number, rng: Rng): number {
  return Math.floor(rng() * maxExclusive);
}

/** Fisher–Yates。元の配列は変更しない。 */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, rng);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
