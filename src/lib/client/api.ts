'use client';

import type { Settings } from '@/lib/game/settings';
import type { RoomSnapshot, StateResponse } from '@/lib/types/api';
import { recordServerTime } from './clock';
import { getAccessToken } from './supabase';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const NETWORK_MESSAGE = '通信できませんでした。電波の良いところで、もう一度お試しください。';

async function request<T>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
  const token = await getAccessToken();
  const sentAt = Date.now();
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiClientError(0, 'NETWORK', NETWORK_MESSAGE);
  }
  const receivedAt = Date.now();
  const json = (await res.json().catch(() => null)) as (T & { serverTime?: number; code?: string; message?: string }) | null;
  if (json?.serverTime) recordServerTime(json.serverTime, sentAt, receivedAt);
  if (!res.ok || !json) {
    throw new ApiClientError(res.status, json?.code ?? 'UNKNOWN', json?.message ?? NETWORK_MESSAGE);
  }
  return json;
}

type SnapshotResult = { snapshot: RoomSnapshot };

/** API の呼び出し口。操作系はすべて最新のスナップショットを返す */
export const api = {
  state: (code: string) => request<StateResponse>('GET', `/api/room/state?code=${encodeURIComponent(code)}`),
  createRoom: (nickname: string, settings: Partial<Settings>) =>
    request<{ code: string }>('POST', '/api/room/create', { nickname, settings }),
  joinRoom: (code: string, nickname: string) => request<SnapshotResult>('POST', '/api/room/join', { code, nickname }),
  updateSettings: (code: string, settings: Partial<Settings>) =>
    request<SnapshotResult>('POST', '/api/room/settings', { code, settings }),
  kick: (code: string, playerId: string) => request<SnapshotResult>('POST', '/api/room/kick', { code, playerId }),
  leave: (code: string) => request<{ ok: true }>('POST', '/api/room/leave', { code }),
  heartbeat: (code: string) => request<{ ok: true }>('POST', '/api/presence/heartbeat', { code }),
  start: (code: string) => request<SnapshotResult>('POST', '/api/game/start', { code }),
  rematch: (code: string) => request<SnapshotResult>('POST', '/api/game/rematch', { code }),
  endGame: (code: string) => request<SnapshotResult>('POST', '/api/game/end', { code }),
  lowPlayers: (code: string, decision: 'continue' | 'end') =>
    request<SnapshotResult>('POST', '/api/game/low-players', { code, decision }),
  arrange: (code: string, patch: { cardIds?: string[]; memo?: string }) =>
    request<SnapshotResult>('POST', '/api/hand/arrange', { code, ...patch }),
  swap: (code: string, cardId: string) => request<SnapshotResult>('POST', '/api/hand/swap', { code, cardId }),
  ready: (code: string, ready: boolean) => request<SnapshotResult>('POST', '/api/hand/ready', { code, ready }),
  advance: (code: string, version: number) =>
    request<SnapshotResult>('POST', '/api/phase/advance', { code, version }),
  endPitch: (code: string, version: number) => request<SnapshotResult>('POST', '/api/pitch/end', { code, version }),
  judge: (code: string, winnerPlayerId: string, version: number) =>
    request<SnapshotResult>('POST', '/api/judge', { code, winnerPlayerId, version }),
  nextRound: (code: string, version: number) => request<SnapshotResult>('POST', '/api/round/next', { code, version }),
};
