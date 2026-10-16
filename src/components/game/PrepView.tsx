'use client';

import { useEffect, useRef, useState } from 'react';
import { TopicCard } from '@/components/cards/TopicCard';
import { ja } from '@/i18n/ja';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/useAction';
import type { RoomSnapshot } from '@/lib/types/api';
import { MemoBox } from './MemoBox';
import { SortableHand } from './SortableHand';
import { TimerBar } from './TimerBar';
import type { View } from './view';

function ReadyCount({ snapshot }: { snapshot: RoomSnapshot }) {
  const round = snapshot.round!;
  const children = round.pitchOrder.filter((pid) => !snapshot.players.find((p) => p.id === pid)?.left);
  const ready = round.readyPlayerIds.filter((pid) => children.includes(pid)).length;
  return (
    <p className="text-center font-bold" data-testid="ready-count">
      {ja.prep.readyCount(ready, children.length)}
    </p>
  );
}

/** 準備フェーズ（子）：手札の並べ替え・メモ・交換・「いけるで！」 */
function ChildPrep({ snapshot }: { snapshot: RoomSnapshot }) {
  const round = snapshot.round!;
  const hand = snapshot.myHand!;
  const code = snapshot.room.code;
  const { run, busy } = useAction();
  const [order, setOrder] = useState(hand.cardIds);
  const [swapMode, setSwapMode] = useState(false);
  const pending = useRef(false);

  // サーバー側の並び（交換・再読み込み）を反映する。自分の送信待ちの間は上書きしない
  const serverKey = hand.cardIds.join(',');
  useEffect(() => {
    if (!pending.current) setOrder(hand.cardIds);
  }, [serverKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const reorder = async (next: string[]) => {
    setOrder(next);
    pending.current = true;
    await run(() => api.arrange(code, { cardIds: next }));
    pending.current = false;
  };

  return (
    <div className="flex flex-col gap-5">
      <TopicCard topicId={round.topicId} showPrice={snapshot.room.settings.showPrice} />
      <TimerBar endsAt={round.phaseEndsAt} startedAt={round.phaseStartedAt} />

      <section>
        <div className="mb-2 flex items-end justify-between gap-2">
          <h2 className="font-hand text-2xl">{ja.prep.yourHand}</h2>
          <p className="text-sm text-ink-soft">{swapMode ? ja.prep.swapPick : ja.prep.dragHint}</p>
        </div>
        <div key={round.id}>
          <SortableHand
            order={order}
            onChange={reorder}
            swapMode={swapMode}
            animate
            onSwap={async (cardId) => {
              setSwapMode(false);
              await run(() => api.swap(code, cardId));
            }}
          />
        </div>
        <p className="mt-3 text-center text-sm font-bold">※ {ja.prep.rule}</p>
      </section>

      {snapshot.room.settings.allowSwap && (
        <div className="text-center">
          {hand.swapped ? (
            <span className="text-sm text-ink-soft">{ja.prep.swapDone}</span>
          ) : (
            <button
              type="button"
              className="btn btn-plain btn-small"
              disabled={busy}
              onClick={() => setSwapMode((v) => !v)}
            >
              {swapMode ? ja.prep.swapCancel : ja.prep.swap}
            </button>
          )}
        </div>
      )}

      <MemoBox key={round.id} code={code} initial={hand.memo} />

      <div className="sticky bottom-3 z-20 flex flex-col items-center gap-2">
        <button
          type="button"
          className={`btn w-full text-xl ${hand.isReady ? 'btn-plain' : 'btn-primary'}`}
          disabled={busy}
          onClick={() => run(() => api.ready(code, !hand.isReady))}
        >
          {hand.isReady ? ja.prep.unready : ja.prep.ready}
        </button>
        {hand.isReady && <p className="rounded-full bg-paper px-3 text-sm font-bold">{ja.prep.readyDone}</p>}
      </div>
      <ReadyCount snapshot={snapshot} />
    </div>
  );
}

/** 準備フェーズ（親）：お題と、準備完了人数 */
function ParentPrep({ snapshot }: { snapshot: RoomSnapshot }) {
  const round = snapshot.round!;
  return (
    <div className="flex flex-col gap-5">
      <TopicCard topicId={round.topicId} showPrice={snapshot.room.settings.showPrice} />
      <TimerBar endsAt={round.phaseEndsAt} startedAt={round.phaseStartedAt} />
      <div className="paper-flat px-4 py-6 text-center">
        <p className="font-hand mb-2 text-3xl">{ja.prep.parentWaiting}</p>
        <p className="text-base">{ja.prep.parentRole}</p>
      </div>
      <ReadyCount snapshot={snapshot} />
    </div>
  );
}

export function PrepView({ snapshot, view }: { snapshot: RoomSnapshot; view: View }) {
  if (snapshot.myHand && !view.isParent) return <ChildPrep snapshot={snapshot} />;
  return <ParentPrep snapshot={snapshot} />;
}
