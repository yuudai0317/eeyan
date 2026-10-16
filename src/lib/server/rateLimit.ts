import 'server-only';

/**
 * 簡易レート制限（同一ユーザー・1秒あたりの回数）。
 * サーバーのメモリ内で数えるので、Netlify の関数で複数インスタンスが動くと厳密ではない（docs/DECISIONS.md 参照）。
 */
const WINDOW_MS = 1000;
const LIMITS = { action: 5, read: 10 } as const;
export type RateBucket = keyof typeof LIMITS;

const hits = new Map<string, number[]>();
let lastSweep = 0;

export function checkRateLimit(userId: string, bucket: RateBucket, now = Date.now()): boolean {
  const key = `${bucket}:${userId}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMITS[bucket]) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);

  // 古いキーを時々掃除してメモリが増え続けないようにする
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return true;
}
