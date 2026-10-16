'use client';

import { useEffect, useState } from 'react';
import { serverNow } from './clock';

/** サーバー時刻で補正した残り時間（ms）。締め切りが null（無制限）なら null */
export function useCountdown(endsAt: number | null): number | null {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => setNow(serverNow()), 200);
    return () => clearInterval(id);
  }, [endsAt]);
  if (endsAt === null) return null;
  return Math.max(0, endsAt - now);
}

/** 一定間隔で再描画する（経過時間で表示が変わるものに使う） */
export function useTicker(intervalMs: number): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
