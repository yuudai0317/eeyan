'use client';

import { useEffect, useRef } from 'react';
import type { RoomSnapshot } from '@/lib/types/api';
import { api, ApiClientError } from './api';
import { serverNow } from './clock';
import { nextSeq, useRoomStore } from './store';
import { requestRefetch } from './useRoomSync';

/** 準備中に、接続中の子が全員「いけるで！」を押しているか */
function allConnectedReady(s: RoomSnapshot): boolean {
  const r = s.round!;
  return r.pitchOrder.every((pid) => {
    const p = s.players.find((x) => x.id === pid);
    return !p || !p.connected || p.left || r.readyPlayerIds.includes(pid);
  });
}

/**
 * 締め切りを過ぎたら /api/phase/advance を呼ぶ。サーバーが時刻と version を確かめるので、
 * 全員の端末が呼んでも進むのは1回だけ。同時に殺到しないよう少しだけずらす。
 */
export function useAutoAdvance(code: string, snapshot: RoomSnapshot | null) {
  const attempted = useRef<string | null>(null);
  const round = snapshot?.round ?? null;
  const playing = snapshot?.room.status === 'playing' && !!snapshot.meId;

  useEffect(() => {
    if (!playing || !round || (round.phase !== 'prep' && round.phase !== 'pitch')) return;
    const key = `${round.id}:${round.version}`;
    let pending: ReturnType<typeof setTimeout> | null = null;

    const check = () => {
      if (attempted.current === key || pending) return;
      const s = useRoomStore.getState().snapshot;
      if (!s?.round || s.round.version !== round.version) return;
      const timeUp = round.phaseEndsAt !== null && serverNow() >= round.phaseEndsAt;
      const readyUp = round.phase === 'prep' && allConnectedReady(s);
      if (!timeUp && !readyUp) return;

      pending = setTimeout(async () => {
        attempted.current = key;
        const seq = nextSeq();
        try {
          const r = await api.advance(code, round.version);
          useRoomStore.getState().applySnapshot(r.snapshot, seq);
        } catch (e) {
          // NOT_DUE（端末時計のずれ）なら少し待って再挑戦。競合なら最新状態を取り直す
          if (e instanceof ApiClientError && e.code === 'NOT_DUE') {
            setTimeout(() => {
              if (attempted.current === key) attempted.current = null;
            }, 1000);
          }
          requestRefetch();
        } finally {
          pending = null;
        }
      }, Math.random() * 400);
    };

    check();
    const id = setInterval(check, 300);
    return () => {
      clearInterval(id);
      if (pending) clearTimeout(pending);
    };
  }, [code, playing, round]);
}
