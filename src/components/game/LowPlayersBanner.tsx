'use client';

import { ja } from '@/i18n/ja';
import { api } from '@/lib/client/api';
import { useAction } from '@/lib/client/useAction';
import { MIN_PLAYERS } from '@/lib/game/constants';
import type { RoomSnapshot } from '@/lib/types/api';
import type { View } from './view';

/** ゲーム中に接続人数が3名を下回ったときの警告。ホストに「続行／終了」を選んでもらう */
export function LowPlayersBanner({ snapshot, view }: { snapshot: RoomSnapshot; view: View }) {
  const { run, busy } = useAction();
  if (snapshot.room.status !== 'playing') return null;
  if (view.connectedCount >= MIN_PLAYERS || snapshot.room.lowPlayerDecision === 'continue') return null;
  const code = snapshot.room.code;
  return (
    <div role="alert" className="paper anim-fade mx-3 mt-3 border-shu-ink px-4 py-3">
      <p className="font-bold">{ja.lowPlayers.warning}</p>
      {view.isHost ? (
        <>
          <p className="mb-3 text-sm">{ja.lowPlayers.hostAsk}</p>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-secondary btn-small flex-1"
              disabled={busy}
              onClick={() => run(() => api.lowPlayers(code, 'continue'))}
            >
              {ja.lowPlayers.continue}
            </button>
            <button
              type="button"
              className="btn btn-plain btn-small flex-1"
              disabled={busy}
              onClick={() => run(() => api.lowPlayers(code, 'end'))}
            >
              {ja.lowPlayers.end}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm">{ja.lowPlayers.waitingHost}</p>
      )}
    </div>
  );
}
