import type { PublicPlayer, RoomSnapshot } from '@/lib/types/api';

/** スナップショットから画面でよく使う値を取り出す */
export function deriveView(s: RoomSnapshot) {
  const byId = new Map(s.players.map((p) => [p.id, p]));
  const me = s.meId ? (byId.get(s.meId) ?? null) : null;
  const round = s.round;
  const presenterId =
    round && round.phase === 'pitch' ? (round.pitchOrder[round.currentPitchIndex] ?? null) : null;
  // 次の発表者（スキップされそうな切断中の人は飛ばして予告する）
  let nextPresenterId: string | null = null;
  if (round && (round.phase === 'pitch' || round.phase === 'prep')) {
    const start = round.phase === 'pitch' ? round.currentPitchIndex + 1 : 0;
    nextPresenterId =
      round.pitchOrder.slice(start).find((pid) => {
        const p = byId.get(pid);
        return p && p.connected && !p.left;
      }) ?? null;
  }
  const active = s.players.filter((p) => !p.left);
  return {
    me,
    byId,
    round,
    isHost: !!me && s.room.hostPlayerId === me.id,
    isParent: !!me && !!round && round.parentId === me.id,
    presenterId,
    nextPresenterId,
    activePlayers: active,
    connectedCount: active.filter((p) => p.connected).length,
    nameOf: (id: string | null | undefined) => (id ? (byId.get(id)?.nickname ?? '？') : '？'),
  };
}

export type View = ReturnType<typeof deriveView>;

export function sortBySeat(players: PublicPlayer[]): PublicPlayer[] {
  return [...players].sort((a, b) => a.seatOrder - b.seatOrder);
}
