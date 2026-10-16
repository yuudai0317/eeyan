import {
  DISCONNECT_AFTER_MS,
  NICKNAME_MAX_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from './constants';
import { randomInt, type Rng } from './rng';
import type { PlayerLite } from './types';

export function generateRoomCode(rng: Rng): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length, rng)];
  }
  return code;
}

/** 入力されたコードを正規化する（小文字・空白を許容。O→0 のような読み替えはしない） */
export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  return [...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch));
}

/** ニックネームを正規化して検証する。問題があれば null */
export function normalizeNickname(input: string): string | null {
  const name = input.normalize('NFC').trim().replace(/\s+/g, ' ');
  const length = Array.from(name).length;
  if (length < 1 || length > NICKNAME_MAX_LENGTH) return null;
  // 制御文字は不可
  if (/\p{Cc}/u.test(name)) return null;
  return name;
}

/** 最後のハートビートから一定時間たったら切断扱い */
export function isConnectedAt(lastSeenAt: number, now: number): boolean {
  return now - lastSeenAt < DISCONNECT_AFTER_MS;
}

/** ホストが切断・離脱していたら、seat_order が最も小さい接続中の人に移す。移さないなら null */
export function pickNewHost(
  players: readonly Pick<PlayerLite, 'id' | 'seatOrder' | 'connected' | 'left'>[],
  hostId: string,
): string | null {
  const host = players.find((p) => p.id === hostId);
  if (host && host.connected && !host.left) return null;
  const candidate = [...players]
    .filter((p) => p.connected && !p.left && p.id !== hostId)
    .sort((a, b) => a.seatOrder - b.seatOrder)[0];
  return candidate?.id ?? null;
}
