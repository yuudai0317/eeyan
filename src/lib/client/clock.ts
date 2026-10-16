'use client';

/**
 * 端末時計とサーバー時計のずれを補正する。
 * API 応答の serverTime と往復時間から、いちばん往復が短かった（＝信頼できる）サンプルを採用する。
 */
let offsetMs = 0;
let bestRtt = Number.POSITIVE_INFINITY;
let sampledAt = 0;

export function recordServerTime(serverTime: number, sentAt: number, receivedAt: number): void {
  const rtt = receivedAt - sentAt;
  // 古いサンプルは時計のずれが変わっている可能性があるので、1分たったら入れ替えを許す
  if (rtt <= bestRtt || receivedAt - sampledAt > 60_000) {
    bestRtt = rtt;
    sampledAt = receivedAt;
    offsetMs = serverTime - (sentAt + rtt / 2);
  }
}

/** サーバー時刻での「今」 */
export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function clockOffset(): number {
  return offsetMs;
}
