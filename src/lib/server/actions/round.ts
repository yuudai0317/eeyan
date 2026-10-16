import 'server-only';
import {
  buildPitchOrder,
  cryptoRng,
  dealHands,
  deadlineFrom,
  discardCards,
  drawCards,
  planPitch,
} from '@/lib/game';
import { categoryOf } from '@/lib/cards';
import { getDeck, getHands, saveDeck, updateRoom, updateRound, type RoomRow, type RoundRow } from '../repo/rows';
import { isConnected, toLite, type RoomContext } from '../roomContext';

/** ルームの行を更新し、ctx.room にも反映する */
export async function patchRoom(
  ctx: RoomContext,
  patch: Parameters<typeof updateRoom>[2],
): Promise<RoomRow> {
  await updateRoom(ctx.tx, ctx.room.id, patch);
  Object.assign(ctx.room, patch);
  return ctx.room;
}

/**
 * 新しいラウンドを始める。前のラウンドのお題と手札は捨て札へ送ってから、お題を1枚引き、子に手札を配る。
 */
export async function startRound(ctx: RoomContext, parentId: string, roundNo: number): Promise<RoundRow> {
  const { tx, room, now } = ctx;
  let deck = await getDeck(tx, room.id);

  if (ctx.round) {
    const prevHands = await getHands(tx, ctx.round.id);
    deck = {
      topics: discardCards(deck.topics, [ctx.round.topicCardId]),
      words: discardCards(
        deck.words,
        prevHands.flatMap((h) => h.cardIds),
      ),
    };
  }

  const topic = drawCards(deck.topics.pile, deck.topics.discard, 1, cryptoRng);
  const lite = ctx.players.map((p) => toLite(p, now));
  const dealt = dealHands(
    lite,
    parentId,
    deck.words,
    { spreadCategories: room.settings.spreadCategories, categoryOf },
    cryptoRng,
  );
  const pitchOrder = buildPitchOrder(lite, parentId);
  const endsAt = deadlineFrom(now.getTime(), room.settings.prepSeconds);

  const [round] = await tx<RoundRow[]>`
    insert into rounds (room_id, game_no, round_no, parent_player_id, topic_card_id, phase,
                        phase_started_at, phase_ends_at, pitch_order, current_pitch_index)
    values (${room.id}, ${room.gameNo}, ${roundNo}, ${parentId}, ${topic.drawn[0]}, 'prep',
            ${now}, ${endsAt === null ? null : new Date(endsAt)}, ${pitchOrder}::uuid[], 0)
    returning *`;

  for (const [playerId, cardIds] of dealt.hands) {
    await tx`insert into hands (round_id, player_id, card_ids) values (${round.id}, ${playerId}, ${cardIds}::text[])`;
  }

  await saveDeck(tx, room.id, {
    topics: { pile: topic.pile, discard: topic.discard },
    words: { pile: dealt.pile, discard: dealt.discard },
  });
  await patchRoom(ctx, { currentRoundId: round.id });
  ctx.round = round;
  return round;
}

/** 子が全員「いけるで！」を押したか。切断中の子は待たない */
export function isAllReady(ctx: RoomContext, round: RoundRow): boolean {
  const waiting = round.pitchOrder.filter((pid) => {
    const p = ctx.players.find((x) => x.id === pid);
    return p && isConnected(ctx, p) && !round.readyPlayerIds.includes(pid);
  });
  return waiting.length === 0;
}

/**
 * fromIndex 以降で発表できる人を探して発表を始める。切断中の人はスキップとして記録する。
 * 誰も残っていなければ判定へ（誰も発表していなければ結果「該当なし」へ）。
 */
export async function beginPitch(
  ctx: RoomContext,
  round: RoundRow,
  fromIndex: number,
  anyonePitched: boolean,
): Promise<RoundRow> {
  const { tx, now, room } = ctx;
  const hands = await getHands(tx, round.id);
  const handOf = new Map(hands.map((h) => [h.playerId, h]));

  const plan = planPitch({
    pitchOrder: round.pitchOrder,
    fromIndex,
    isAvailable: (pid) => {
      const p = ctx.players.find((x) => x.id === pid);
      return !!p && isConnected(ctx, p) && handOf.has(pid);
    },
    anyonePitched,
    now: now.getTime(),
    pitchSeconds: room.settings.pitchSeconds,
  });

  for (const index of plan.skipped) {
    await tx`
      insert into pitches (room_id, round_id, player_id, card_ids, order_index, skipped, started_at, ended_at)
      values (${room.id}, ${round.id}, ${round.pitchOrder[index]}, '{}', ${index}, true, ${now}, ${now})
      on conflict (round_id, player_id) do nothing`;
  }

  if (plan.phase === 'pitch') {
    const presenterId = round.pitchOrder[plan.currentPitchIndex];
    // 発表開始時に、並べた順のカードを公開用テーブルへコピーする
    const hand = handOf.get(presenterId)!;
    await tx`
      insert into pitches (room_id, round_id, player_id, card_ids, order_index, started_at)
      values (${room.id}, ${round.id}, ${presenterId}, ${hand.cardIds}::text[], ${plan.currentPitchIndex}, ${now})
      on conflict (round_id, player_id) do nothing`;
  }

  const updated = await updateRound(tx, round, {
    phase: plan.phase,
    currentPitchIndex: plan.currentPitchIndex,
    phaseStartedAt: now,
    phaseEndsAt: plan.phaseEndsAt === null ? null : new Date(plan.phaseEndsAt),
  });
  ctx.round = updated;
  return updated;
}

/** 現在の発表を終わらせ、次の人へ進める */
export async function finishCurrentPitch(ctx: RoomContext, round: RoundRow): Promise<RoundRow> {
  await ctx.tx`
    update pitches set ended_at = ${ctx.now}
    where round_id = ${round.id} and order_index = ${round.currentPitchIndex} and ended_at is null`;
  return beginPitch(ctx, round, round.currentPitchIndex + 1, true);
}
