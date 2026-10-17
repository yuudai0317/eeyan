'use client';

import { useState } from 'react';
import { TopicCard } from '@/components/cards/TopicCard';
import { WordCard } from '@/components/cards/WordCard';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ja } from '@/i18n/ja';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/useAction';
import { useTicker } from '@/lib/client/useCountdown';
import { PROXY_JUDGE_AFTER_MS } from '@/lib/game/constants';
import type { RoomSnapshot } from '@/lib/types/api';
import type { View } from './view';

/** 判定フェーズ：親は一覧から1人を選んで「ええやん！」。子は待つ */
export function JudgeView({ snapshot, view }: { snapshot: RoomSnapshot; view: View }) {
  const round = snapshot.round!;
  const code = snapshot.room.code;
  const now = useTicker(1000);
  const { run, busy } = useAction();
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingNone, setConfirmingNone] = useState(false);

  const parent = view.byId.get(round.parentId);
  const proxy =
    view.isHost && !view.isParent && !!parent && !parent.connected && now - round.phaseStartedAt >= PROXY_JUDGE_AFTER_MS;
  const canJudge = view.isParent || proxy;
  const candidates = [...snapshot.pitches].filter((p) => !p.skipped).sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="flex flex-col gap-4">
      <TopicCard topicId={round.topicId} showPrice={snapshot.room.settings.showPrice} compact />
      <div className="text-center">
        {canJudge ? (
          <>
            <h2 className="font-hand text-3xl">{ja.judge.title}</h2>
            <p className="text-base">{ja.judge.pick}</p>
            {proxy && <p className="mt-1 text-sm font-bold text-shu-ink">{ja.judge.proxyNote}</p>}
          </>
        ) : (
          <p className="font-hand text-3xl" role="status">
            {ja.judge.thinking(view.nameOf(round.parentId))}
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-4" role={canJudge ? 'radiogroup' : undefined} aria-label={ja.judge.title}>
        {candidates.map((p) => {
          const isSelected = selected === p.playerId;
          const body = (
            <>
              <p className="mb-2 text-lg font-bold">{ja.common.san(view.nameOf(p.playerId))}</p>
              <div className="grid grid-cols-1 gap-2">
                {p.cardIds.map((id, i) => (
                  <WordCard key={id} cardId={id} order={i + 1} size="sm" />
                ))}
              </div>
            </>
          );
          return (
            <li key={p.playerId}>
              {canJudge ? (
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-testid="judge-candidate"
                  data-player-id={p.playerId}
                  onClick={() => setSelected(p.playerId)}
                  className={`w-full rounded-3xl border-[3px] p-3 text-left transition-colors ${
                    isSelected ? 'border-shu-ink bg-[color-mix(in_srgb,var(--shu)_12%,transparent)]' : 'border-dashed border-ink/40'
                  }`}
                >
                  {body}
                </button>
              ) : (
                <div className="rounded-3xl border-[3px] border-dashed border-ink/30 p-3">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      {canJudge && (
        <button
          type="button"
          className="btn btn-primary font-hand sticky bottom-3 z-20 w-full !text-2xl"
          disabled={!selected || busy}
          onClick={() => setConfirming(true)}
        >
          {ja.judge.submit}
        </button>
      )}

      {canJudge && (
        <button
          type="button"
          className="btn btn-plain btn-small mx-auto"
          disabled={busy}
          onClick={() => setConfirmingNone(true)}
        >
          {ja.judge.noWinner}
        </button>
      )}

      <ConfirmDialog
        open={confirmingNone}
        title={ja.judge.noWinnerConfirm}
        confirmLabel={ja.judge.noWinner}
        cancelLabel={ja.common.cancel}
        busy={busy}
        onCancel={() => setConfirmingNone(false)}
        onConfirm={async () => {
          await run(() => api.judge(code, null, round.version));
          setConfirmingNone(false);
        }}
      />

      <ConfirmDialog
        open={confirming && !!selected}
        title={selected ? ja.judge.confirm(view.nameOf(selected)) : ''}
        confirmLabel={ja.judge.submit}
        cancelLabel={ja.common.cancel}
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          if (selected) await run(() => api.judge(code, selected, round.version));
          setConfirming(false);
        }}
      />
    </div>
  );
}
