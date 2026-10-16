'use client';

import { TopicCard } from '@/components/cards/TopicCard';
import { WordCard } from '@/components/cards/WordCard';
import { ja } from '@/i18n/ja';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/useAction';
import type { RoomSnapshot } from '@/lib/types/api';
import { TimerBar } from './TimerBar';
import type { View } from './view';

/** プレゼンフェーズ：発表者のカード3枚を並び順で大きく表示 */
export function PitchView({ snapshot, view }: { snapshot: RoomSnapshot; view: View }) {
  const round = snapshot.round!;
  const code = snapshot.room.code;
  const { run, busy } = useAction();
  const presenterId = view.presenterId;
  const pitch = snapshot.pitches.find((p) => p.playerId === presenterId);
  const isMe = presenterId === snapshot.meId;
  const isNext = view.nextPresenterId === snapshot.meId && !isMe;
  const canSkip = !isMe && (view.isParent || view.isHost);

  return (
    <div className="flex flex-col gap-4">
      <TopicCard topicId={round.topicId} showPrice={snapshot.room.settings.showPrice} compact />

      {isNext && (
        <p role="status" className="anim-fade rounded-2xl border-[2.5px] border-ink bg-mizu px-4 py-2 text-center font-bold text-[#3b2a20]">
          {ja.pitch.nextYou}
        </p>
      )}

      <div className="text-center">
        <p className="font-hand text-3xl" data-testid="presenter">
          {isMe ? ja.pitch.yourTurn : ja.pitch.nowPitching(view.nameOf(presenterId))}
        </p>
      </div>

      <TimerBar endsAt={round.phaseEndsAt} startedAt={round.phaseStartedAt} />

      <ol className="flex flex-col gap-3" key={presenterId ?? 'none'} aria-label="発表中のカード">
        {(pitch?.cardIds ?? []).map((id, i) => (
          <li key={id}>
            <WordCard cardId={id} order={i + 1} size="lg" animate delayIndex={i} />
          </li>
        ))}
      </ol>

      {isMe && (
        <>
          {snapshot.myHand?.memo && (
            <section className="paper-flat px-4 py-3">
              <h2 className="mb-1 text-sm font-bold">{ja.pitch.yourMemo}</h2>
              <p className="whitespace-pre-wrap">{snapshot.myHand.memo}</p>
            </section>
          )}
          <button
            type="button"
            className="btn btn-primary sticky bottom-3 z-20 w-full text-xl"
            disabled={busy}
            onClick={() => run(() => api.endPitch(code, round.version))}
          >
            {ja.pitch.end}
          </button>
        </>
      )}
      {canSkip && (
        <button
          type="button"
          className="btn btn-plain btn-small mx-auto"
          disabled={busy}
          onClick={() => run(() => api.endPitch(code, round.version))}
        >
          {ja.pitch.skip}
        </button>
      )}

      <section aria-label={ja.pitch.order} className="mt-2">
        <h2 className="mb-1 text-sm font-bold">{ja.pitch.order}</h2>
        <ol className="flex flex-wrap gap-2 text-sm">
          {round.pitchOrder.map((pid, i) => {
            const done = i < round.currentPitchIndex;
            const skipped = snapshot.pitches.find((p) => p.playerId === pid)?.skipped;
            const current = i === round.currentPitchIndex;
            return (
              <li
                key={pid}
                className={`rounded-full border-2 border-ink px-2.5 py-0.5 ${current ? 'bg-karashi font-bold text-[#3b2a20]' : 'bg-card'} ${done ? 'opacity-60' : ''}`}
              >
                {i + 1}. {view.nameOf(pid)}
                {skipped ? `（${ja.pitch.skipped}）` : done ? `（${ja.pitch.done}）` : ''}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
