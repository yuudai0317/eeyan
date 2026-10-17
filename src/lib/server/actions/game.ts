import 'server-only';
import {
  applyJudge,
  checkWinner,
  createDeck,
  cryptoRng,
  decideFirstParent,
  InvalidWinnerError,
  isDeadlinePassed,
  judgeAuthority,
  MIN_PLAYERS,
  nextParent,
} from '@/lib/game';
import { TOPICS, WORDS } from '@/lib/cards';
import { errors } from '../errors';
import { getPitches, saveDeck, updateRound } from '../repo/rows';
import {
  activePlayers,
  checkVersion,
  isConnected,
  requireHost,
  requireMe,
  requireRound,
  toLite,
  withRoom,
  type RoomContext,
} from '../roomContext';
import { buildSnapshot } from '../snapshot';
import { beginPitch, finishCurrentPitch, isAllReady, patchRoom, startRound } from './round';

async function respond(ctx: RoomContext) {
  return { snapshot: await buildSnapshot(ctx) };
}

/** ゲーム開始（参加者なら誰でも）：山札を作り、初回の親をランダムに決めて第1ラウンドを始める */
export function startGame(uid: string, code: string) {
  return withRoom(code, uid, async (ctx) => {
    requireMe(ctx);
    if (ctx.room.status !== 'lobby') throw errors.wrongPhase('ゲームはすでに始まっています。');
    if (activePlayers(ctx).length < MIN_PLAYERS) throw errors.notEnoughPlayers(MIN_PLAYERS);

    await saveDeck(ctx.tx, ctx.room.id, {
      topics: { pile: createDeck(TOPICS, cryptoRng), discard: [] },
      words: { pile: createDeck(WORDS, cryptoRng), discard: [] },
    });
    await patchRoom(ctx, { status: 'playing', gameNo: ctx.room.gameNo + 1, lowPlayerDecision: null });
    const parentId = decideFirstParent(ctx.players.map((p) => toLite(p, ctx.now)), cryptoRng);
    await startRound(ctx, parentId, 1);
    return respond(ctx);
  });
}

/** もういっかい（参加者なら誰でも）：得点を0に戻し、同じメンバーで再戦する。親はランダムで決め直す。山札は続きから使う */
export function rematch(uid: string, code: string) {
  return withRoom(code, uid, async (ctx) => {
    requireMe(ctx);
    if (ctx.room.status !== 'finished') throw errors.wrongPhase('ゲームが終わってから再戦できます。');
    if (activePlayers(ctx).length < MIN_PLAYERS) throw errors.notEnoughPlayers(MIN_PLAYERS);

    await ctx.tx`update players set score = 0 where room_id = ${ctx.room.id}`;
    ctx.players.forEach((p) => (p.score = 0));
    await patchRoom(ctx, { status: 'playing', gameNo: ctx.room.gameNo + 1, lowPlayerDecision: null });
    const parentId = decideFirstParent(ctx.players.map((p) => toLite(p, ctx.now)), cryptoRng);
    await startRound(ctx, parentId, 1);
    return respond(ctx);
  });
}

/** ホストがゲームを途中で終える */
export function endGame(uid: string, code: string) {
  return withRoom(code, uid, async (ctx) => {
    requireHost(ctx);
    if (ctx.room.status !== 'playing') throw errors.wrongPhase('ゲーム中ではありません。');
    await patchRoom(ctx, { status: 'finished' });
    return respond(ctx);
  });
}

/** 接続人数が最少人数を下回ったときの「続行／終了」 */
export function decideLowPlayers(uid: string, code: string, decision: 'continue' | 'end') {
  return withRoom(code, uid, async (ctx) => {
    requireHost(ctx);
    if (ctx.room.status !== 'playing') throw errors.wrongPhase('ゲーム中ではありません。');
    if (decision === 'end') await patchRoom(ctx, { status: 'finished' });
    else await patchRoom(ctx, { lowPlayerDecision: 'continue' });
    return respond(ctx);
  });
}

/** 時間切れ（または全員準備完了）で次のフェーズへ。複数端末から同時に呼ばれても1回しか進まない */
export function advancePhase(uid: string, code: string, version: number | undefined) {
  return withRoom(code, uid, async (ctx) => {
    const round = requireRound(ctx);
    checkVersion(round, version);
    const now = ctx.now.getTime();
    const timeUp = isDeadlinePassed(now, round.phaseEndsAt?.getTime() ?? null);

    if (round.phase === 'prep') {
      if (!timeUp && !isAllReady(ctx, round)) throw errors.notDue();
      await beginPitch(ctx, round, 0, false);
    } else if (round.phase === 'pitch') {
      if (!timeUp) throw errors.notDue();
      await finishCurrentPitch(ctx, round);
    } else {
      throw errors.notDue();
    }
    return respond(ctx);
  });
}

/** 「以上です！」：発表者本人・親・ホストが現在の発表を終える */
export function endPitch(uid: string, code: string, version: number | undefined) {
  return withRoom(code, uid, async (ctx) => {
    const me = requireMe(ctx);
    const round = requireRound(ctx);
    if (round.phase !== 'pitch') throw errors.wrongPhase('今は発表の時間ではありません。');
    checkVersion(round, version);
    const presenterId = round.pitchOrder[round.currentPitchIndex];
    if (me.id !== presenterId && me.id !== round.parentPlayerId && me.id !== ctx.room.hostPlayerId) {
      throw errors.forbidden('発表を終えられるのは、発表者・親・ホストだけです。');
    }
    await finishCurrentPitch(ctx, round);
    return respond(ctx);
  });
}

/** 親が「ええやん！」で勝者を1人選ぶ。「該当なし」（winnerPlayerId = null）も選べる */
export function judge(uid: string, code: string, winnerPlayerId: string | null, version: number | undefined) {
  return withRoom(code, uid, async (ctx) => {
    const me = requireMe(ctx);
    const round = requireRound(ctx);
    if (round.phase !== 'judge') throw errors.wrongPhase('今は判定の時間ではありません。');

    const parent = ctx.players.find((p) => p.id === round.parentPlayerId);
    const authority = judgeAuthority({
      actorId: me.id,
      parentId: round.parentPlayerId,
      hostId: ctx.room.hostPlayerId ?? '',
      parentConnected: !!parent && isConnected(ctx, parent),
      now: ctx.now.getTime(),
      phaseStartedAt: round.phaseStartedAt.getTime(),
    });
    if (!authority) throw errors.forbidden('判定できるのは親だけです。');
    checkVersion(round, version);

    const pitches = await getPitches(ctx.tx, round.id);
    const candidates = pitches.filter((p) => !p.skipped).map((p) => p.playerId);

    if (winnerPlayerId === null) {
      ctx.round = await updateRound(ctx.tx, round, {
        phase: 'result',
        winnerPlayerId: null,
        phaseStartedAt: ctx.now,
        phaseEndsAt: null,
      });
      return respond(ctx);
    }

    let result;
    try {
      result = applyJudge(
        { players: ctx.players.map((p) => ({ id: p.id, score: p.score })), targetScore: ctx.room.settings.targetScore, candidates },
        winnerPlayerId,
      );
    } catch (e) {
      if (e instanceof InvalidWinnerError) throw errors.badRequest(e.message);
      throw e;
    }

    await ctx.tx`update players set score = score + 1 where id = ${winnerPlayerId}`;
    ctx.players.find((p) => p.id === winnerPlayerId)!.score += 1;
    ctx.round = await updateRound(ctx.tx, round, {
      phase: 'result',
      winnerPlayerId: result.winnerId,
      phaseStartedAt: ctx.now,
      phaseEndsAt: null,
    });
    return respond(ctx);
  });
}

/** 「次いこか」：目標点に達した人がいればゲーム終了、いなければ親を交代して次のラウンドへ */
export function nextRound(uid: string, code: string, version: number | undefined) {
  return withRoom(code, uid, async (ctx) => {
    const me = requireMe(ctx);
    const round = requireRound(ctx);
    if (round.phase !== 'result') throw errors.wrongPhase('結果の表示中だけ次へ進めます。');
    if (me.id !== ctx.room.hostPlayerId && me.id !== round.parentPlayerId) {
      throw errors.forbidden('次へ進められるのは、ホストと親だけです。');
    }
    checkVersion(round, version);

    if (checkWinner(ctx.players, ctx.room.settings.targetScore)) {
      await patchRoom(ctx, { status: 'finished' });
    } else {
      const parentId = nextParent(ctx.players.map((p) => toLite(p, ctx.now)), round.parentPlayerId);
      await startRound(ctx, parentId, round.roundNo + 1);
    }
    return respond(ctx);
  });
}
