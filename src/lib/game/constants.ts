/** ゲーム全体で使う定数。人数などはここを書き換えれば変更できる。 */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const HAND_SIZE = 3;

export const NICKNAME_MAX_LENGTH = 12;

export const ROOM_CODE_LENGTH = 6;
/** 紛らわしい 0 / O / 1 / I / L を除いた文字 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_TTL_HOURS = 24;

/** この時間ハートビートが途絶えたら切断扱い */
export const DISCONNECT_AFTER_MS = 25_000;
export const HEARTBEAT_INTERVAL_MS = 10_000;

/** 親が切断したまま判定フェーズがこの時間続いたら、ホストが代理判定できる */
export const PROXY_JUDGE_AFTER_MS = 60_000;

export const MEMO_MAX_LENGTH = 300;
