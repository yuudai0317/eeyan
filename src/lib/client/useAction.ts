'use client';

import { useCallback, useState } from 'react';
import { create } from 'zustand';
import type { RoomSnapshot } from '@/lib/types/api';
import { ApiClientError } from './api';
import { nextSeq, useRoomStore } from './store';
import { requestRefetch } from './useRoomSync';

/** 画面下に出す短いお知らせ（エラーなど） */
interface ToastStore {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}
let toastTimer: ReturnType<typeof setTimeout> | null = null;
export const useToast = create<ToastStore>((set) => ({
  message: null,
  show: (message) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ message });
    toastTimer = setTimeout(() => set({ message: null }), 4000);
  },
  hide: () => set({ message: null }),
}));

/** 競合など、利用者に知らせなくてよいエラー（最新状態を取り直せば済む） */
const SILENT = new Set(['CONFLICT', 'NOT_DUE', 'WRONG_PHASE']);

/**
 * API 操作を実行し、返ってきた最新スナップショットを反映する。
 * 409 などのときは黙って最新状態を取り直し、それ以外はメッセージを出す。
 */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn: () => Promise<{ snapshot?: RoomSnapshot } | object>, options: { silent?: boolean } = {}) => {
      setBusy(true);
      const seq = nextSeq();
      try {
        const r = await fn();
        if ('snapshot' in r && r.snapshot) useRoomStore.getState().applySnapshot(r.snapshot, seq);
        return true;
      } catch (e) {
        const err = e instanceof ApiClientError ? e : null;
        if (!options.silent && !(err && SILENT.has(err.code))) {
          useToast.getState().show(err?.message ?? 'うまくいきませんでした。もう一度お試しください。');
        }
        requestRefetch();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );
  return { run, busy };
}
