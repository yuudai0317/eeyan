'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { RulesContent } from '@/components/RulesContent';
import { ja } from '@/i18n/ja';
import { useSoundPref } from '@/lib/client/feedback';
import { useRoomStore } from '@/lib/client/store';
import type { RoomSnapshot } from '@/lib/types/api';
import { sortBySeat, type View } from './view';

function ScoreDots({ score, target }: { score: number; target: number }) {
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {Array.from({ length: target }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full border-[1.5px] border-ink ${i < score ? 'bg-shu' : 'bg-transparent'}`}
        />
      ))}
    </span>
  );
}

export function SoundToggle() {
  const { enabled, load, toggle } = useSoundPref();
  useEffect(() => load(), [load]);
  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-plain btn-small !min-w-11 !px-2 !text-sm"
      aria-pressed={enabled}
      aria-label={enabled ? ja.common.soundOn : ja.common.soundOff}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {enabled ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5M21 9.5l-5 5" />}
      </svg>
    </button>
  );
}

export function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-plain btn-small font-hand !min-w-11 !px-2 !text-xl"
        aria-label={ja.common.help}
      >
        ？
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={ja.top.howTo}>
        <RulesContent />
        <button type="button" className="btn btn-plain btn-small mt-5 w-full" onClick={() => setOpen(false)}>
          {ja.common.close}
        </button>
      </Dialog>
    </>
  );
}

/** ゲーム画面の共通ヘッダー：ラウンド数、親、全員の得点（目標点までのドット） */
export function GameHeader({ snapshot, view }: { snapshot: RoomSnapshot; view: View }) {
  const reconnecting = useRoomStore((s) => s.reconnecting);
  const target = snapshot.room.settings.targetScore;
  const round = snapshot.round;
  return (
    <header className="sticky top-0 z-30 border-b-[2.5px] border-ink bg-paper/95 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-[2px]">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {round && <p className="font-hand text-xl leading-tight">{ja.header.round(round.roundNo)}</p>}
          {round && (
            <p className="truncate text-sm">
              <span className="mr-1 rounded-md border-2 border-ink bg-karashi px-1.5 text-xs font-bold text-[#3b2a20]">
                {ja.header.parent}
              </span>
              {view.nameOf(round.parentId)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {reconnecting && (
            <span role="status" className="rounded-full border-2 border-ink bg-mizu px-2 py-0.5 text-xs font-bold text-[#3b2a20]">
              {ja.common.reconnecting}
            </span>
          )}
          <SoundToggle />
          <HelpButton />
        </div>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {sortBySeat(snapshot.players).map((p) => (
          <li
            key={p.id}
            className={`flex items-center gap-1.5 text-sm ${p.left ? 'line-through opacity-50' : ''} ${!p.connected && !p.left ? 'opacity-60' : ''}`}
            aria-label={ja.header.scoreLabel(p.nickname, p.score, target)}
          >
            <span className={`max-w-[6.5em] truncate ${p.id === snapshot.meId ? 'font-bold' : ''}`}>{p.nickname}</span>
            <ScoreDots score={p.score} target={target} />
          </li>
        ))}
      </ul>
    </header>
  );
}
