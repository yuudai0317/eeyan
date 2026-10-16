'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { JoinForm } from '@/components/JoinForm';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Logo } from '@/components/ui/Logo';
import { Toast } from '@/components/ui/Toast';
import { ja } from '@/i18n/ja';
import { api } from '@/lib/client/api';
import { playPon, vibrate } from '@/lib/client/feedback';
import { useRoomStore } from '@/lib/client/store';
import { useAction } from '@/lib/client/useAction';
import { useAutoAdvance } from '@/lib/client/useAutoAdvance';
import { useRoomSync } from '@/lib/client/useRoomSync';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/game/room';
import type { RoomSnapshot } from '@/lib/types/api';
import { FinishedView } from './FinishedView';
import { GameHeader } from './Header';
import { JudgeView } from './JudgeView';
import { Lobby } from './Lobby';
import { LowPlayersBanner } from './LowPlayersBanner';
import { PitchView } from './PitchView';
import { PrepView } from './PrepView';
import { ResultView } from './ResultView';
import { deriveView, type View } from './view';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-5 text-center">
      {children}
    </main>
  );
}

/** ラウンドが配られたとき・自分の番が来たときに「ポン」と知らせる */
function useCues(snapshot: RoomSnapshot | null, view: View | null) {
  const lastRound = useRef<string | null>(null);
  const lastTurn = useRef<string | null>(null);
  useEffect(() => {
    const round = snapshot?.round;
    if (!round || snapshot.room.status !== 'playing') return;
    if (round.phase === 'prep' && lastRound.current !== round.id) {
      lastRound.current = round.id;
      playPon();
    }
    const turnKey = `${round.id}:${round.currentPitchIndex}`;
    if (round.phase === 'pitch' && view?.presenterId === snapshot.meId && lastTurn.current !== turnKey) {
      lastTurn.current = turnKey;
      playPon();
      vibrate([60, 60, 60]);
    }
  }, [snapshot, view?.presenterId]);
}

function GameBody({ snapshot, view }: { snapshot: RoomSnapshot; view: View }) {
  switch (snapshot.round?.phase) {
    case 'prep':
      return <PrepView snapshot={snapshot} view={view} />;
    case 'pitch':
      return <PitchView snapshot={snapshot} view={view} />;
    case 'judge':
      return <JudgeView snapshot={snapshot} view={view} />;
    case 'result':
      return <ResultView snapshot={snapshot} view={view} />;
    default:
      return <p>{ja.common.loading}</p>;
  }
}

function Game({ snapshot, view }: { snapshot: RoomSnapshot; view: View }) {
  const { run, busy } = useAction();
  const [ending, setEnding] = useState(false);
  return (
    <>
      <GameHeader snapshot={snapshot} view={view} />
      <LowPlayersBanner snapshot={snapshot} view={view} />
      <main className="mx-auto max-w-md px-4 pb-10 pt-4" data-phase={snapshot.round?.phase}>
        <GameBody snapshot={snapshot} view={view} />
        {view.isHost && (
          <div className="mt-10 text-center">
            <button type="button" className="min-h-11 px-3 text-sm underline underline-offset-4" onClick={() => setEnding(true)}>
              {ja.room.endGame}
            </button>
          </div>
        )}
      </main>
      <ConfirmDialog
        open={ending}
        title={ja.room.endGameConfirm}
        confirmLabel={ja.room.endGame}
        cancelLabel={ja.common.cancel}
        busy={busy}
        onCancel={() => setEnding(false)}
        onConfirm={async () => {
          await run(() => api.endGame(snapshot.room.code));
          setEnding(false);
        }}
      />
    </>
  );
}

export function RoomScreen({ code: rawCode }: { code: string }) {
  const code = normalizeRoomCode(decodeURIComponent(rawCode));
  const valid = isValidRoomCode(code);
  const { refetch } = useRoomSync(valid ? code : 'INVALID');
  const status = useRoomStore((s) => s.status);
  const snapshot = useRoomStore((s) => s.snapshot);
  const preview = useRoomStore((s) => s.preview);
  const error = useRoomStore((s) => s.error);
  const view = snapshot ? deriveView(snapshot) : null;

  useAutoAdvance(code, snapshot);
  useCues(snapshot, view);

  let body: React.ReactNode;
  if (!valid || (error && !snapshot)) {
    const message =
      !valid || error?.code === 'ROOM_NOT_FOUND'
        ? ja.room.notFound
        : error?.code === 'LEFT_ROOM'
          ? ja.room.left
          : (error?.message ?? ja.room.notFound);
    body = (
      <Centered>
        <Logo size="sm" />
        <p className="font-bold" role="alert">
          {message}
        </p>
        <Link href="/" className="btn btn-plain">
          {ja.common.toTop}
        </Link>
      </Centered>
    );
  } else if (status === 'loading' || (!snapshot && !preview)) {
    body = (
      <Centered>
        <Logo size="sm" />
        <p role="status">{ja.common.loading}</p>
      </Centered>
    );
  } else if (status === 'not-member' && preview) {
    body =
      preview.status === 'lobby' ? (
        <main className="mx-auto max-w-md px-4 pb-10 pt-10">
          <div className="mb-6 text-center">
            <Logo size="sm" />
          </div>
          <h1 className="font-hand mb-2 text-3xl">{ja.room.joinTitle}</h1>
          <p className="font-card mb-5 text-2xl tracking-[0.18em]">{preview.code}</p>
          <JoinForm fixedCode={preview.code} onJoined={refetch} />
        </main>
      ) : (
        <Centered>
          <Logo size="sm" />
          <p className="font-bold">{ja.room.inGame}</p>
          <Link href="/" className="btn btn-plain">
            {ja.common.toTop}
          </Link>
        </Centered>
      );
  } else if (snapshot && view) {
    if (snapshot.room.status === 'lobby') body = <Lobby snapshot={snapshot} view={view} />;
    else if (snapshot.room.status === 'finished') body = <FinishedView snapshot={snapshot} view={view} />;
    else body = <Game snapshot={snapshot} view={view} />;
  }

  return (
    <>
      {body}
      <Toast />
    </>
  );
}
