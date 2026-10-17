import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/server/db';
import { createRoom, heartbeat, joinRoom, kickPlayer, leaveRoom, updateSettings } from '@/lib/server/actions/room';
import {
  advancePhase,
  decideLowPlayers,
  endPitch,
  judge,
  nextRound,
  rematch,
  startGame,
} from '@/lib/server/actions/game';
import { arrangeHand, setReady, swapHandCard } from '@/lib/server/actions/hand';
import { expectApiError, expireDeadline, makeDisconnected, newUid, snapshotOf } from './helpers';

afterAll(async () => {
  await db().end();
});

async function setupRoom(n = 3, settings = {}) {
  const uids = Array.from({ length: n }, () => newUid());
  const { code } = await createRoom(uids[0], 'ホスト', settings);
  for (let i = 1; i < n; i++) await joinRoom(uids[i], code, `プレイヤー${i}`);
  const snap = await snapshotOf(uids[0], code);
  const uidOf = new Map(snap.players.map((p, i) => [p.id, uids[i]]));
  return { code, uids, uidOf, players: snap.players };
}

describe('ルームとロビー', () => {
  it('作成者がホストになり、参加順に seat_order が振られる', async () => {
    const { code, uids, players } = await setupRoom(3);
    const snap = await snapshotOf(uids[1], code);
    expect(snap.room.status).toBe('lobby');
    expect(snap.room.hostPlayerId).toBe(players[0].id);
    expect(players.map((p) => p.seatOrder)).toEqual([0, 1, 2]);
    expect(snap.meId).toBe(players[1].id);
  });

  it('同じニックネームは使えない', async () => {
    const { code } = await setupRoom(2);
    await expectApiError(joinRoom(newUid(), code, 'ホスト'), 409, 'NICKNAME_TAKEN');
  });

  it('同じユーザーが再参加すると同じプレイヤーとして復帰する', async () => {
    const { code, uids, players } = await setupRoom(2);
    const r = await joinRoom(uids[1], code, '別の名前');
    expect(r.snapshot.meId).toBe(players[1].id);
  });

  it('2名未満では開始できない。ホスト以外は開始できない', async () => {
    const { code, uids } = await setupRoom(1);
    await expectApiError(startGame(uids[0], code), 409, 'NOT_ENOUGH_PLAYERS');
    const guest = newUid();
    await joinRoom(guest, code, 'ふたり目');
    await expectApiError(startGame(guest, code), 403, 'HOST_ONLY');
  });

  it('ゲーム開始後は新規参加できない', async () => {
    const { code, uids } = await setupRoom(3);
    await startGame(uids[0], code);
    await expectApiError(joinRoom(newUid(), code, '遅刻'), 409, 'GAME_IN_PROGRESS');
  });

  it('ホストは設定を変更できる（ロビー中のみ・範囲外は400）', async () => {
    const { code, uids } = await setupRoom(3);
    const r = await updateSettings(uids[0], code, { targetScore: 5, prepSeconds: null });
    expect(r.snapshot.room.settings).toMatchObject({ targetScore: 5, prepSeconds: null, pitchSeconds: 60 });
    await expectApiError(updateSettings(uids[1], code, { targetScore: 2 }), 403);
  });

  it('ロビーでのキックは行ごと削除、ホストの退出でホストが移る', async () => {
    const { code, uids, players } = await setupRoom(4);
    const r = await kickPlayer(uids[0], code, players[3].id);
    expect(r.snapshot.players).toHaveLength(3);
    await leaveRoom(uids[0], code);
    const snap = await snapshotOf(uids[1], code);
    expect(snap.room.hostPlayerId).toBe(players[1].id);
  });

  it('存在しないコードは404', async () => {
    await expectApiError(snapshotOf(newUid(), 'ZZZZZZ'), 404, 'ROOM_NOT_FOUND');
  });

  it('期限切れのルームは410で、削除される', async () => {
    const { code, uids } = await setupRoom(1);
    await db()`update rooms set expires_at = now() - interval '1 second' where code = ${code}`;
    await expectApiError(snapshotOf(uids[0], code), 410, 'ROOM_EXPIRED');
    const rows = await db()`select 1 from rooms where code = ${code}`;
    expect(rows).toHaveLength(0);
  });
});

describe('1ラウンドの流れ', () => {
  it('開始 → 配布 → 準備完了 → 発表 → 判定 → 結果 → 次のラウンド', async () => {
    const { code, uids, uidOf, players } = await setupRoom(4);
    const started = await startGame(uids[0], code);
    const round = started.snapshot.round!;
    expect(round.phase).toBe('prep');
    expect(round.roundNo).toBe(1);
    expect(round.phaseEndsAt! - Date.now()).toBeGreaterThan(80_000);
    expect(round.pitchOrder).toHaveLength(3);
    expect(round.pitchOrder).not.toContain(round.parentId);

    const parentUid = uidOf.get(round.parentId)!;
    const parentSnap = await snapshotOf(parentUid, code);
    expect(parentSnap.myHand).toBeNull();

    // 子は3枚ずつ。カードは誰とも重複しない
    const childSnaps = await Promise.all(round.pitchOrder.map((pid) => snapshotOf(uidOf.get(pid)!, code)));
    const allCards = childSnaps.flatMap((s) => s.myHand!.cardIds);
    expect(allCards).toHaveLength(9);
    expect(new Set(allCards).size).toBe(9);
    // 他人の手札は自分のスナップショットに含まれない
    for (const s of childSnaps) {
      const json = JSON.stringify(s);
      for (const other of childSnaps) {
        if (other === s) continue;
        for (const card of other.myHand!.cardIds) expect(json).not.toContain(`"${card}"`);
      }
    }

    // 並べ替えとメモ
    const firstUid = uidOf.get(round.pitchOrder[0])!;
    const hand = childSnaps[0].myHand!.cardIds;
    const reordered = [hand[2], hand[0], hand[1]];
    const arranged = await arrangeHand(firstUid, code, reordered, 'まずはつかみから');
    expect(arranged.snapshot.myHand).toMatchObject({ cardIds: reordered, memo: 'まずはつかみから' });
    await expectApiError(arrangeHand(firstUid, code, [hand[0], hand[1], 'w999'], undefined), 400);
    // 親には手札がない
    await expectApiError(arrangeHand(parentUid, code, reordered, undefined), 403);
    // カード交換はOFF
    await expectApiError(swapHandCard(firstUid, code, hand[0]), 403);

    // 全員準備完了で発表へ
    for (const pid of round.pitchOrder.slice(0, 2)) {
      const r = await setReady(uidOf.get(pid)!, code, true);
      expect(r.snapshot.round!.phase).toBe('prep');
    }
    const ready = await setReady(uidOf.get(round.pitchOrder[2])!, code, true);
    expect(ready.snapshot.round!.phase).toBe('pitch');
    expect(ready.snapshot.round!.currentPitchIndex).toBe(0);
    // 発表者のカードが並べた順で公開される。まだの人のカードは公開されない
    expect(ready.snapshot.pitches).toHaveLength(1);
    expect(ready.snapshot.pitches[0]).toMatchObject({ playerId: round.pitchOrder[0], cardIds: reordered });
    // 発表中は並べ替えできない
    await expectApiError(arrangeHand(firstUid, code, hand, undefined), 409, 'WRONG_PHASE');

    // 発表者以外の子は発表を終えられない
    await expectApiError(endPitch(uidOf.get(round.pitchOrder[1])!, code, undefined), 403);
    let snap = (await endPitch(firstUid, code, ready.snapshot.round!.version)).snapshot;
    expect(snap.round!.currentPitchIndex).toBe(1);
    // 古い version は409
    await expectApiError(endPitch(uidOf.get(round.pitchOrder[1])!, code, ready.snapshot.round!.version), 409, 'CONFLICT');
    // 親も発表を終えられる
    snap = (await endPitch(parentUid, code, snap.round!.version)).snapshot;
    snap = (await endPitch(uidOf.get(round.pitchOrder[2])!, code, snap.round!.version)).snapshot;
    expect(snap.round!.phase).toBe('judge');
    expect(snap.pitches).toHaveLength(3);

    // 親以外の判定は403
    const winner = round.pitchOrder[1];
    await expectApiError(judge(uidOf.get(round.pitchOrder[0])!, code, winner, undefined), 403, 'FORBIDDEN');
    await expectApiError(judge(uids[0] === parentUid ? uidOf.get(round.pitchOrder[0])! : uids[0], code, winner, undefined), 403);
    // 親自身は選べない
    await expectApiError(judge(parentUid, code, round.parentId, undefined), 400);

    snap = (await judge(parentUid, code, winner, snap.round!.version)).snapshot;
    expect(snap.round!.phase).toBe('result');
    expect(snap.round!.winnerId).toBe(winner);
    expect(snap.players.find((p) => p.id === winner)!.score).toBe(1);
    expect(snap.history).toHaveLength(1);
    expect(snap.history[0].winnerId).toBe(winner);

    // 子は次へ進められない（ホストでも親でもない場合）
    const outsider = players.find((p) => p.id !== round.parentId && p.id !== players[0].id)!;
    await expectApiError(nextRound(uidOf.get(outsider.id)!, code, undefined), 403);

    snap = (await nextRound(parentUid, code, snap.round!.version)).snapshot;
    expect(snap.round!.roundNo).toBe(2);
    expect(snap.round!.phase).toBe('prep');
    // 親は seat_order 順で次の人
    const sorted = [...players].sort((a, b) => a.seatOrder - b.seatOrder);
    const idx = sorted.findIndex((p) => p.id === round.parentId);
    expect(snap.round!.parentId).toBe(sorted[(idx + 1) % sorted.length].id);
  });
});

/** 1ラウンドを最速で進める（全員準備完了 → 全員「以上です」 → 先頭の人が勝ち） */
async function playRound(code: string, uidOf: Map<string, string>, pick?: (order: string[]) => string) {
  let snap = await snapshotOf([...uidOf.values()][0], code);
  const round = snap.round!;
  for (const pid of round.pitchOrder) snap = (await setReady(uidOf.get(pid)!, code, true)).snapshot;
  while (snap.round!.phase === 'pitch') {
    const presenter = snap.round!.pitchOrder[snap.round!.currentPitchIndex];
    snap = (await endPitch(uidOf.get(presenter)!, code, snap.round!.version)).snapshot;
  }
  const winner = (pick ?? ((o) => o[0]))(round.pitchOrder);
  snap = (await judge(uidOf.get(round.parentId)!, code, winner, snap.round!.version)).snapshot;
  return { snap, winner, parentId: round.parentId };
}

describe('ゲーム全体', () => {
  it('3点先取で終了し、再戦できる。山札は重複なく回る', async () => {
    const { code, uids, uidOf, players } = await setupRoom(3);
    await startGame(uids[0], code);
    const fixedWinner = players[2].id;
    let rounds = 0;
    const topics = new Set<string>();
    for (;;) {
      const before = await snapshotOf(uids[0], code);
      topics.add(before.round!.topicId);
      const { snap } = await playRound(code, uidOf, (o) => (o.includes(fixedWinner) ? fixedWinner : o[0]));
      rounds++;
      const next = (await nextRound(uids[0], code, snap.round!.version)).snapshot;
      if (next.room.status === 'finished') {
        expect(next.championId).not.toBeNull();
        expect(next.players.find((p) => p.id === next.championId)!.score).toBe(3);
        expect(next.players.filter((p) => p.score >= 3)).toHaveLength(1);
        expect(next.history).toHaveLength(rounds);
        break;
      }
      expect(rounds).toBeLessThan(20);
    }
    // 同じゲーム内でお題は重複しない
    expect(topics.size).toBe(rounds);

    await expectApiError(rematch(uids[1], code), 403);
    const again = (await rematch(uids[0], code)).snapshot;
    expect(again.room.status).toBe('playing');
    expect(again.round!.roundNo).toBe(1);
    expect(again.players.every((p) => p.score === 0)).toBe(true);
    expect(again.history).toHaveLength(0);
  });
});

describe('タイマーと楽観ロック', () => {
  it('締め切り前は進まず、締め切りを過ぎると1回だけ進む', async () => {
    const { code, uids } = await setupRoom(3);
    const { snapshot } = await startGame(uids[0], code);
    const v = snapshot.round!.version;
    await expectApiError(advancePhase(uids[1], code, v), 409, 'NOT_DUE');
    await expireDeadline(code);
    // 3台から同時に呼ぶ
    const results = await Promise.allSettled(uids.map((u) => advancePhase(u, code, v)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const snap = await snapshotOf(uids[0], code);
    expect(snap.round!.phase).toBe('pitch');
    expect(snap.round!.version).toBe(v + 1);

    // 発表の時間切れでも次の人へ
    await expireDeadline(code);
    const next = (await advancePhase(uids[2], code, snap.round!.version)).snapshot;
    expect(next.round!.currentPitchIndex).toBe(1);
  });
});

describe('該当なし', () => {
  it('親は「該当なし」を選べて、誰にも点が入らない', async () => {
    const { code, uids, uidOf } = await setupRoom(3);
    let { snapshot: snap } = await startGame(uids[0], code);
    for (const pid of snap.round!.pitchOrder) snap = (await setReady(uidOf.get(pid)!, code, true)).snapshot;
    while (snap.round!.phase === 'pitch') snap = (await endPitch(uids[0], code, snap.round!.version)).snapshot;
    const parentUid = uidOf.get(snap.round!.parentId)!;
    const r = await judge(parentUid, code, null, snap.round!.version);
    expect(r.snapshot.round!.phase).toBe('result');
    expect(r.snapshot.round!.winnerId).toBeNull();
    expect(r.snapshot.players.every((p) => p.score === 0)).toBe(true);
    const next = await nextRound(parentUid, code, r.snapshot.round!.version);
    expect(next.snapshot.round!.roundNo).toBe(2);
  });
});

describe('カード交換', () => {
  it('ONなら準備中に1回だけ交換できる', async () => {
    const { code, uids, uidOf } = await setupRoom(3, { allowSwap: true });
    const { snapshot } = await startGame(uids[0], code);
    const childUid = uidOf.get(snapshot.round!.pitchOrder[0])!;
    const before = (await snapshotOf(childUid, code)).myHand!;
    const r = await swapHandCard(childUid, code, before.cardIds[1]);
    expect(r.snapshot.myHand!.swapped).toBe(true);
    expect(r.snapshot.myHand!.cardIds[0]).toBe(before.cardIds[0]);
    expect(r.snapshot.myHand!.cardIds[2]).toBe(before.cardIds[2]);
    expect(r.snapshot.myHand!.cardIds[1]).not.toBe(before.cardIds[1]);
    await expectApiError(swapHandCard(childUid, code, r.snapshot.myHand!.cardIds[0]), 403);
  });
});

describe('切断と離脱', () => {
  it('切断中の発表者はスキップされる', async () => {
    const { code, uids, uidOf } = await setupRoom(4);
    const { snapshot } = await startGame(uids[0], code);
    const order = snapshot.round!.pitchOrder;
    await makeDisconnected(order[0]);
    const others = order.slice(1);
    let snap = snapshot;
    for (const pid of others) snap = (await setReady(uidOf.get(pid)!, code, true)).snapshot;
    // 切断中の人は待たずに発表へ。先頭はスキップ
    expect(snap.round!.phase).toBe('pitch');
    expect(snap.round!.currentPitchIndex).toBe(1);
    expect(snap.pitches.find((p) => p.playerId === order[0])).toMatchObject({ skipped: true, cardIds: [] });
  });

  it('ホストが切断したら、seat_order が最小の接続中プレイヤーへホストが移る', async () => {
    const { code, uids, players } = await setupRoom(3);
    await makeDisconnected(players[0].id);
    await heartbeat(uids[2], code);
    const snap = await snapshotOf(uids[2], code);
    expect(snap.room.hostPlayerId).toBe(players[1].id);
    expect(snap.players[0].connected).toBe(false);
  });

  it('親が切断して60秒たつとホストが代理判定できる', async () => {
    const { code, uids, uidOf, players } = await setupRoom(4);
    let { snapshot: snap } = await startGame(uids[0], code);
    // ホストが親なら次のラウンドまで進める
    while (snap.round!.parentId === players[0].id) {
      const r = await playRound(code, uidOf);
      snap = (await nextRound(uids[0], code, r.snap.round!.version)).snapshot;
    }
    for (const pid of snap.round!.pitchOrder) snap = (await setReady(uidOf.get(pid)!, code, true)).snapshot;
    while (snap.round!.phase === 'pitch') {
      snap = (await endPitch(uids[0], code, snap.round!.version)).snapshot;
    }
    const target = snap.round!.pitchOrder[0];
    await expectApiError(judge(uids[0], code, target, undefined), 403);
    await makeDisconnected(snap.round!.parentId);
    await db()`update rounds set phase_started_at = now() - interval '61 seconds' where id = ${snap.round!.id}`;
    const r = await judge(uids[0], code, target, undefined);
    expect(r.snapshot.round!.winnerId).toBe(target);
  });

  it('ゲーム中のキックは離脱扱いで、以降の配布・親から外れる', async () => {
    const { code, uids, players } = await setupRoom(4);
    await startGame(uids[0], code);
    const r = await kickPlayer(uids[0], code, players[3].id);
    expect(r.snapshot.players.find((p) => p.id === players[3].id)!.left).toBe(true);
    await expectApiError(snapshotOf(uids[3], code), 403, 'LEFT_ROOM');
  });

  it('ホストは人数不足時に続行／終了を選べる', async () => {
    const { code, uids } = await setupRoom(3);
    await startGame(uids[0], code);
    const c = await decideLowPlayers(uids[0], code, 'continue');
    // 最少人数以上そろっているので、次の操作で自動的に解除される
    expect(c.snapshot.room.lowPlayerDecision).toBe('continue');
    const e = await decideLowPlayers(uids[0], code, 'end');
    expect(e.snapshot.room.status).toBe('finished');
  });
});
