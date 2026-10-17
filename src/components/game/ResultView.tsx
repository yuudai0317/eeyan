'use client';

import { useEffect } from 'react';
import { Stamp } from '@/components/cards/Stamp';
import { TopicCard } from '@/components/cards/TopicCard';
import { WordCard } from '@/components/cards/WordCard';
import { ja } from '@/i18n/ja';
import { api } from '@/lib/client/api';
import { playPakon, vibrate } from '@/lib/client/feedback';
import { useAction } from '@/lib/client/useAction';
import type { RoomSnapshot } from '@/lib/types/api';
import type { View } from './view';

/** 結果：勝者のカードに「ええやん！」スタンプがポンと押される */
export function ResultView({ snapshot, view }: { snapshot: RoomSnapshot; view: View }) {
  const round = snapshot.round!;
  const code = snapshot.room.code;
  const { run, busy } = useAction();
  const winnerId = round.winnerId;
  const pitch = snapshot.pitches.find((p) => p.playerId === winnerId);
  const winner = winnerId ? view.byId.get(winnerId) : null;
  const canNext = view.isHost || view.isParent;

  useEffect(() => {
    if (!winnerId) return;
    const t = setTimeout(() => {
      playPakon();
      vibrate(40);
    }, 450);
    return () => clearTimeout(t);
  }, [round.id, winnerId]);

  return (
    <div className="flex flex-col gap-5">
      <TopicCard topicId={round.topicId} showPrice={snapshot.room.settings.showPrice} compact />

      {winner && pitch ? (
        <section className="relative pt-2" aria-labelledby="winner-name">
          <h2 id="winner-name" className="font-hand mb-1 text-center text-4xl" data-testid="winner">
            {ja.result.winner(winner.nickname)}
          </h2>
          <p className="mb-4 text-center text-lg font-bold">
            {winner.score - 1} → <span className="text-shu-ink">{winner.score}点</span>（{ja.result.plusOne}）
          </p>
          <div className="relative">
            <ol className="flex flex-col gap-3">
              {pitch.cardIds.map((id, i) => (
                <li key={id}>
                  <WordCard cardId={id} order={i + 1} />
                </li>
              ))}
            </ol>
            <Stamp className="absolute right-1 top-1/2 w-fit -translate-y-1/2" />
          </div>
        </section>
      ) : (
        <p className="paper-flat px-4 py-6 text-center font-bold">
          {snapshot.pitches.some((p) => !p.skipped) ? ja.result.noneChosen : ja.result.noWinner}
        </p>
      )}

      {canNext ? (
        <button
          type="button"
          className="btn btn-primary sticky bottom-3 z-20 w-full text-xl"
          disabled={busy}
          onClick={() => run(() => api.nextRound(code, round.version))}
        >
          {snapshot.championId ? ja.result.toFinal : ja.result.next}
        </button>
      ) : (
        <p className="text-center text-base text-ink-soft">{ja.result.waitingNext}</p>
      )}
    </div>
  );
}
