import 'server-only';
import { checkWinner } from '@/lib/game';
import type { MyHand, PublicPitch, PublicRound, RoomSnapshot, RoundHistory } from '@/lib/types/api';
import { getHand, getPitches, type RoundRow } from './repo/rows';
import { toLite, type RoomContext } from './roomContext';

export function publicRound(r: RoundRow): PublicRound {
  return {
    id: r.id,
    roundNo: r.roundNo,
    parentId: r.parentPlayerId,
    topicId: r.topicCardId,
    phase: r.phase,
    phaseStartedAt: r.phaseStartedAt.getTime(),
    phaseEndsAt: r.phaseEndsAt ? r.phaseEndsAt.getTime() : null,
    pitchOrder: r.pitchOrder,
    currentPitchIndex: r.currentPitchIndex,
    readyPlayerIds: r.readyPlayerIds,
    winnerId: r.winnerPlayerId,
    version: r.version,
  };
}

/**
 * 本人向けのルーム全体の状態。手札は本人のものだけを含める。
 * 他人の手札は、発表で公開された分（pitches）しか含めない。
 */
export async function buildSnapshot(ctx: RoomContext): Promise<RoomSnapshot> {
  const { tx, room, round, me, now } = ctx;
  const players = ctx.players.map((p) => {
    const lite = toLite(p, now);
    return {
      id: p.id,
      nickname: p.nickname,
      seatOrder: p.seatOrder,
      score: p.score,
      connected: lite.connected,
      left: lite.left,
    };
  });

  let pitches: PublicPitch[] = [];
  let myHand: MyHand | null = null;
  if (round) {
    pitches = (await getPitches(tx, round.id)).map((p) => ({
      playerId: p.playerId,
      cardIds: p.cardIds,
      orderIndex: p.orderIndex,
      skipped: p.skipped,
      startedAt: p.startedAt.getTime(),
      endedAt: p.endedAt ? p.endedAt.getTime() : null,
    }));
    if (me) {
      const hand = await getHand(tx, round.id, me.id);
      if (hand) {
        myHand = { cardIds: hand.cardIds, memo: hand.memo ?? '', swapped: hand.swapped, isReady: hand.isReady };
      }
    }
  }

  // 今のゲームで勝者が決まったラウンドの振り返り（勝者のカードは発表で公開済みなので全員に見せてよい）
  const historyRows = await tx<
    { roundNo: number; topicCardId: string; parentPlayerId: string; winnerPlayerId: string | null; cardIds: string[] | null }[]
  >`
    select r.round_no, r.topic_card_id, r.parent_player_id, r.winner_player_id, p.card_ids
    from rounds r
    left join pitches p on p.round_id = r.id and p.player_id = r.winner_player_id
    where r.room_id = ${room.id} and r.game_no = ${room.gameNo} and r.phase = 'result'
    order by r.round_no`;
  const history: RoundHistory[] = historyRows.map((h) => ({
    roundNo: h.roundNo,
    topicId: h.topicCardId,
    parentId: h.parentPlayerId,
    winnerId: h.winnerPlayerId,
    cardIds: h.cardIds ?? [],
  }));

  return {
    room: {
      id: room.id,
      code: room.code,
      status: room.status,
      hostPlayerId: room.hostPlayerId,
      settings: room.settings,
      gameNo: room.gameNo,
      lowPlayerDecision: room.lowPlayerDecision,
      expiresAt: room.expiresAt.getTime(),
    },
    players,
    meId: me?.id ?? null,
    round: round ? publicRound(round) : null,
    pitches,
    myHand,
    history,
    championId: room.status === 'lobby' ? null : checkWinner(players, room.settings.targetScore),
  };
}
