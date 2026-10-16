'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { HEARTBEAT_INTERVAL_MS } from '@/lib/game/constants';
import type { RoomSnapshot } from '@/lib/types/api';
import { api, ApiClientError } from './api';
import { nextSeq, useRoomStore } from './store';
import { getAccessToken, supabase } from './supabase';

/** どこからでも「最新状態を取り直して」と頼めるようにする（409 のときなど） */
let refetchRef: (() => void) | null = null;
export function requestRefetch(): void {
  refetchRef?.();
}

/** 念のための定期取得（Realtime が黙って止まっていても状態がずれ続けないように） */
const SAFETY_POLL_MS = 20_000;
const DEBOUNCE_MS = 120;

/** players の更新のうち、画面に影響しないもの（ハートビートだけの更新）を見分ける */
function isHeartbeatOnly(row: Record<string, unknown>, snapshot: RoomSnapshot | null): boolean {
  const p = snapshot?.players.find((x) => x.id === row.id);
  if (!p) return false;
  return (
    row.nickname === p.nickname &&
    row.score === p.score &&
    row.seat_order === p.seatOrder &&
    row.is_connected === p.connected &&
    !!row.left_at === p.left
  );
}

/**
 * ルームの状態を同期する。
 * - 最初に API から全体を取得
 * - Realtime（rooms / players / rounds / pitches）の変更通知を受けたら取り直す
 * - 購読が切れたら再購読し、つながったら全体を取り直して整合させる
 * - 10秒ごとにハートビートを送る（接続状態・ホスト移譲の判定に使われる）
 */
export function useRoomSync(code: string) {
  const reset = useRoomStore((s) => s.reset);
  const roomId = useRoomStore((s) => s.snapshot?.room.id ?? null);
  const isMember = useRoomStore((s) => !!s.snapshot?.meId);
  // 取り直しの窓口。最初の effect で中身を差し込む
  const scheduleRef = useRef<() => void>(() => {});
  const refetch = useCallback(() => scheduleRef.current(), []);

  // 初回取得・取り直しの仕組み
  useEffect(() => {
    let inFlight = false;
    let again = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const fetchNow = async (): Promise<void> => {
      if (inFlight) {
        again = true;
        return;
      }
      inFlight = true;
      const store = useRoomStore.getState();
      const seq = nextSeq();
      try {
        const r = await api.state(code);
        if (disposed) return;
        if (r.member) store.applySnapshot(r.snapshot, seq);
        else store.applyPreview(r.preview, seq);
        store.setReconnecting(false);
      } catch (e) {
        if (disposed) return;
        if (e instanceof ApiClientError && e.status === 0) store.setReconnecting(true);
        else if (e instanceof ApiClientError) store.setError({ code: e.code, message: e.message });
        else store.setError({ code: 'UNKNOWN', message: String(e) });
      } finally {
        inFlight = false;
        if (again && !disposed) {
          again = false;
          void fetchNow();
        }
      }
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void fetchNow(), DEBOUNCE_MS);
    };

    reset(code);
    scheduleRef.current = schedule;
    refetchRef = schedule;
    void fetchNow();

    const onVisible = () => document.visibilityState === 'visible' && schedule();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', schedule);
    const poll = setInterval(schedule, SAFETY_POLL_MS);
    return () => {
      disposed = true;
      refetchRef = null;
      scheduleRef.current = () => {};
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', schedule);
      clearInterval(poll);
      if (timer) clearTimeout(timer);
    };
  }, [code, reset]);

  // Realtime の購読（切れたら作り直す）
  useEffect(() => {
    if (!roomId || !isMember) return;
    let channel: RealtimeChannel | null = null;
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    const sb = supabase();

    const onChange = (payload: { table: string; eventType: string; new: Record<string, unknown> }) => {
      if (
        payload.table === 'players' &&
        payload.eventType === 'UPDATE' &&
        isHeartbeatOnly(payload.new, useRoomStore.getState().snapshot)
      ) {
        return;
      }
      refetch();
    };

    const subscribe = async () => {
      if (disposed) return;
      try {
        sb.realtime.setAuth(await getAccessToken());
      } catch {
        // トークンが取れなくても、再試行で拾う
      }
      const ch = sb.channel(`room-${roomId}-${Math.random().toString(36).slice(2, 8)}`);
      for (const [table, filter] of [
        ['rooms', `id=eq.${roomId}`],
        ['players', `room_id=eq.${roomId}`],
        ['rounds', `room_id=eq.${roomId}`],
        ['pitches', `room_id=eq.${roomId}`],
      ] as const) {
        ch.on('postgres_changes', { event: '*', schema: 'public', table, filter }, onChange);
      }
      channel = ch;
      ch.subscribe((status) => {
        if (disposed || channel !== ch) return;
        if (status === 'SUBSCRIBED') {
          attempt = 0;
          useRoomStore.getState().setReconnecting(false);
          // 購読し直したら、その間に起きた変更を取りこぼさないよう全体を取り直す
          refetch();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          useRoomStore.getState().setReconnecting(true);
          void sb.removeChannel(ch);
          channel = null;
          const wait = Math.min(1000 * 2 ** attempt++, 15_000);
          retry = setTimeout(() => void subscribe(), wait);
        }
      });
    };

    void subscribe();
    return () => {
      disposed = true;
      if (retry) clearTimeout(retry);
      if (channel) void sb.removeChannel(channel);
    };
  }, [roomId, isMember, refetch]);

  // ハートビート
  useEffect(() => {
    if (!isMember) return;
    const beat = async () => {
      try {
        await api.heartbeat(code);
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 0) useRoomStore.getState().setReconnecting(true);
        else refetch();
      }
    };
    void beat();
    const id = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [code, isMember, refetch]);

  return { refetch };
}
