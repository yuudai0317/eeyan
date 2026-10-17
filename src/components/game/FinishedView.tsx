'use client';

import Link from 'next/link';
import { Stamp } from '@/components/cards/Stamp';
import { WordCard } from '@/components/cards/WordCard';
import { ja } from '@/i18n/ja';
import { api } from '@/lib/client/api';
import { getTopic } from '@/lib/cards';
import { useAction } from '@/lib/client/useAction';
import { topicText } from '@/lib/game/topic';
import type { RoomSnapshot } from '@/lib/types/api';
import { HelpButton, SoundToggle } from './Header';
import type { View } from './view';

/** ゲーム終了：優勝者・最終得点・各ラウンドの勝ちトークの振り返り */
export function FinishedView({ snapshot, view }: { snapshot: RoomSnapshot; view: View }) {
  const code = snapshot.room.code;
  const { run, busy } = useAction();
  const champion = snapshot.championId ? view.byId.get(snapshot.championId) : null;
  const ranking = [...snapshot.players].sort((a, b) => b.score - a.score || a.seatOrder - b.seatOrder);
  const showPrice = snapshot.room.settings.showPrice;

  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-4">
      <div className="mb-2 flex justify-end gap-2">
        <SoundToggle />
        <HelpButton />
      </div>

      <section className="paper relative mb-6 overflow-visible px-5 py-6 text-center">
        <p className="font-bold">{ja.finished.title}</p>
        {champion ? (
          <p className="font-hand mt-2 text-5xl" data-testid="champion">
            {ja.finished.champion(champion.nickname)}
          </p>
        ) : (
          <p className="font-hand mt-2 text-3xl">{ja.finished.noChampion}</p>
        )}
        {champion && <Stamp className="absolute -right-2 -top-6 w-fit scale-75" />}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-bold">{ja.finished.scores}</h2>
        <ol className="flex flex-col gap-2">
          {ranking.map((p, i) => (
            <li key={p.id} className="paper-flat flex min-h-[48px] items-center justify-between px-3">
              <span className={p.left ? 'line-through opacity-60' : ''}>
                <span className="font-card mr-2">{i + 1}.</span>
                {p.nickname}
              </span>
              <span className="font-card text-xl">{p.score}点</span>
            </li>
          ))}
        </ol>
      </section>

      {snapshot.history.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 font-bold">{ja.finished.history}</h2>
          <ol className="flex flex-col gap-5">
            {snapshot.history.map((h) => {
              const topic = getTopic(h.topicId);
              return (
                <li key={h.roundNo} className="rounded-3xl border-[2.5px] border-dashed border-ink/40 p-3">
                  <p className="text-sm font-bold text-ink-soft">{ja.finished.historyRound(h.roundNo)}</p>
                  {topic && <p className="font-card mb-1 text-lg">{topicText(topic, showPrice)}</p>}
                  <p className="mb-2 font-bold">
                    {h.winnerId ? ja.result.winner(view.nameOf(h.winnerId)) : ja.result.noPoint}
                  </p>
                  <div className="flex flex-col gap-2">
                    {h.cardIds.map((id, i) => (
                      <WordCard key={id} cardId={id} order={i + 1} size="sm" />
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {view.isHost ? (
        <button type="button" className="btn btn-primary w-full text-xl" disabled={busy} onClick={() => run(() => api.rematch(code))}>
          {ja.finished.rematch}
        </button>
      ) : (
        <p className="text-center font-bold">{ja.finished.waitingRematch}</p>
      )}
      <div className="mt-6 text-center">
        <Link href="/" className="inline-flex min-h-11 items-center px-3 underline underline-offset-4">
          {ja.common.toTop}
        </Link>
      </div>
    </main>
  );
}
