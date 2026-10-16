import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { ApiError } from '@/lib/server/errors';
import { db } from '@/lib/server/db';
import { getState } from '@/lib/server/actions/room';
import type { RoomSnapshot } from '@/lib/types/api';

export const newUid = () => randomUUID();

export async function snapshotOf(uid: string, code: string): Promise<RoomSnapshot> {
  const r = await getState(uid, code);
  if (!r.member) throw new Error('not a member');
  return r.snapshot;
}

export async function expectApiError(p: Promise<unknown>, status: number, code?: string) {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).status).toBe(status);
    if (code) expect((e as ApiError).code).toBe(code);
    return e as ApiError;
  }
  throw new Error(`期待したエラー（${status}）が発生しませんでした`);
}

/** テスト用に締め切りを過去にずらす */
export async function expireDeadline(code: string) {
  await db()`
    update rounds set phase_ends_at = now() - interval '1 second'
    where id = (select current_round_id from rooms where code = ${code})`;
}

/** テスト用に最終接続時刻を古くする（切断扱いにする） */
export async function makeDisconnected(playerId: string) {
  await db()`update players set last_seen_at = now() - interval '1 minute' where id = ${playerId}`;
}
