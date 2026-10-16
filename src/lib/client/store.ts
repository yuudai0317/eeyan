'use client';

import { create } from 'zustand';
import type { RoomPreview, RoomSnapshot } from '@/lib/types/api';

export type LoadStatus = 'loading' | 'ready' | 'not-member' | 'error';

interface RoomStore {
  code: string | null;
  status: LoadStatus;
  snapshot: RoomSnapshot | null;
  preview: RoomPreview | null;
  error: { code: string; message: string } | null;
  /** Realtime・ハートビートが途切れているとき true（ヘッダーに「つながり直してます…」） */
  reconnecting: boolean;
  /** 後から始まった取得結果だけを反映するための番号 */
  appliedSeq: number;

  reset: (code: string) => void;
  applySnapshot: (snapshot: RoomSnapshot, seq: number) => void;
  applyPreview: (preview: RoomPreview, seq: number) => void;
  setError: (error: { code: string; message: string }) => void;
  setReconnecting: (value: boolean) => void;
}

let seqCounter = 0;
/** 取得を始めるたびに呼んで番号をもらう */
export const nextSeq = () => ++seqCounter;

export const useRoomStore = create<RoomStore>((set, get) => ({
  code: null,
  status: 'loading',
  snapshot: null,
  preview: null,
  error: null,
  reconnecting: false,
  appliedSeq: 0,

  reset: (code) =>
    set({ code, status: 'loading', snapshot: null, preview: null, error: null, reconnecting: false, appliedSeq: 0 }),
  applySnapshot: (snapshot, seq) => {
    if (seq < get().appliedSeq) return;
    set({ snapshot, status: 'ready', error: null, appliedSeq: seq });
  },
  applyPreview: (preview, seq) => {
    if (seq < get().appliedSeq) return;
    set({ preview, snapshot: null, status: 'not-member', appliedSeq: seq });
  },
  setError: (error) => set({ error, status: get().snapshot ? get().status : 'error' }),
  setReconnecting: (value) => {
    if (get().reconnecting !== value) set({ reconnecting: value });
  },
}));
