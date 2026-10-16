import 'server-only';
import { cryptoRng, swapCard } from '@/lib/game';
import { categoryOf } from '@/lib/cards';
import { errors } from '../errors';
import { getDeck, getHand, saveDeck, updateRound, type HandRow } from '../repo/rows';
import { requireMe, requireRound, withRoom, type RoomContext } from '../roomContext';
import { buildSnapshot } from '../snapshot';
import { beginPitch, isAllReady } from './round';

async function requireMyHand(ctx: RoomContext): Promise<HandRow> {
  const me = requireMe(ctx);
  const round = requireRound(ctx);
  const hand = await getHand(ctx.tx, round.id, me.id);
  if (!hand) throw errors.forbidden('このラウンドでは手札がありません（親は手札を持ちません）。');
  return hand;
}

function isSamePermutation(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');
}

/** 3枚の並び順とメモを保存する。並び順は準備時間中だけ、メモは発表が終わるまで変更できる */
export function arrangeHand(uid: string, code: string, cardIds: string[] | undefined, memo: string | undefined) {
  return withRoom(code, uid, async (ctx) => {
    const hand = await requireMyHand(ctx);
    const phase = ctx.round!.phase;
    let nextCards = hand.cardIds;
    if (cardIds) {
      if (phase !== 'prep') throw errors.wrongPhase('カードの並べ替えは準備時間中だけできます。');
      if (!isSamePermutation(cardIds, hand.cardIds)) throw errors.badRequest('手札にないカードは並べられません。');
      nextCards = cardIds;
    }
    if (memo !== undefined && phase !== 'prep' && phase !== 'pitch') {
      throw errors.wrongPhase('メモは発表が終わるまで編集できます。');
    }
    await ctx.tx`
      update hands set card_ids = ${nextCards}::text[], memo = ${memo ?? hand.memo}
      where id = ${hand.id}`;
    return { snapshot: await buildSnapshot(ctx) };
  });
}

/** カード交換（オプション）：準備時間中に1回だけ、手札の1枚を山札と交換する */
export function swapHandCard(uid: string, code: string, cardId: string) {
  return withRoom(code, uid, async (ctx) => {
    const hand = await requireMyHand(ctx);
    const { settings } = ctx.room;
    if (!settings.allowSwap) throw errors.forbidden('このルームではカード交換はできません。');
    if (ctx.round!.phase !== 'prep') throw errors.wrongPhase('カード交換は準備時間中だけできます。');
    if (hand.swapped) throw errors.forbidden('カード交換は1ラウンドにつき1回までです。');
    if (!hand.cardIds.includes(cardId)) throw errors.badRequest('手札にないカードは交換できません。');

    const deck = await getDeck(ctx.tx, ctx.room.id);
    const r = swapCard(hand.cardIds, cardId, deck.words, { spreadCategories: settings.spreadCategories, categoryOf }, cryptoRng);
    await ctx.tx`update hands set card_ids = ${r.hand}::text[], swapped = true where id = ${hand.id}`;
    await saveDeck(ctx.tx, ctx.room.id, { topics: deck.topics, words: { pile: r.pile, discard: r.discard } });
    return { snapshot: await buildSnapshot(ctx) };
  });
}

/** 「いけるで！」。子が全員そろったら準備時間を待たずに発表へ進む */
export function setReady(uid: string, code: string, ready: boolean) {
  return withRoom(code, uid, async (ctx) => {
    const hand = await requireMyHand(ctx);
    const round = ctx.round!;
    if (round.phase !== 'prep') throw errors.wrongPhase('準備時間は終わっています。');

    await ctx.tx`update hands set is_ready = ${ready} where id = ${hand.id}`;
    const others = round.readyPlayerIds.filter((id) => id !== hand.playerId);
    const updated = await updateRound(ctx.tx, round, {
      readyPlayerIds: ready ? [...others, hand.playerId] : others,
    });
    ctx.round = updated;
    if (ready && isAllReady(ctx, updated)) await beginPitch(ctx, updated, 0, false);
    return { snapshot: await buildSnapshot(ctx) };
  });
}
