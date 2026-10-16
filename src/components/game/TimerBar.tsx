'use client';

import { useEffect, useRef } from 'react';
import { ja } from '@/i18n/ja';
import { vibrate } from '@/lib/client/feedback';
import { useCountdown } from '@/lib/client/useCountdown';

/**
 * 残り時間バー。サーバーの締め切り時刻をもとに描画する。
 * 残り10秒で小刻みに揺れ、対応端末では軽く振動する。
 */
export function TimerBar({
  endsAt,
  startedAt,
  label = ja.prep.remaining,
}: {
  endsAt: number | null;
  startedAt: number;
  label?: string;
}) {
  const remaining = useCountdown(endsAt);
  const buzzed = useRef<string | null>(null);
  const seconds = remaining === null ? null : Math.ceil(remaining / 1000);
  const warn = seconds !== null && seconds <= 10 && seconds > 0;

  useEffect(() => {
    if (seconds === null || endsAt === null) return;
    const key = `${endsAt}`;
    if (seconds <= 10 && seconds > 0 && buzzed.current !== key) {
      buzzed.current = key;
      vibrate(60);
    }
  }, [seconds, endsAt]);

  if (endsAt === null || remaining === null) {
    return (
      <div className="flex items-center justify-between text-sm font-bold text-ink-soft">
        <span>{label}</span>
        <span>{ja.common.unlimited}</span>
      </div>
    );
  }

  const total = Math.max(1, endsAt - startedAt);
  const ratio = Math.min(1, Math.max(0, remaining / total));
  return (
    <div className={warn ? 'anim-jitter' : ''}>
      <div className="mb-1 flex items-center justify-between text-sm font-bold">
        <span>{label}</span>
        <span className={`font-card text-2xl ${warn ? 'text-shu-ink' : ''}`} aria-live={warn ? 'polite' : 'off'}>
          {seconds}
          <span className="text-base">秒</span>
        </span>
      </div>
      <div
        className="h-4 overflow-hidden rounded-full border-2 border-ink bg-paper-deep"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.round(total / 1000)}
        aria-valuenow={seconds ?? 0}
      >
        <div
          className={`h-full rounded-full ${warn ? 'bg-shu' : 'bg-karashi'}`}
          style={{ width: `${ratio * 100}%`, transition: 'width 200ms linear' }}
        />
      </div>
    </div>
  );
}
