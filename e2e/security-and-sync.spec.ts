import { expect, test } from '@playwright/test';
import { accessTokenOf, handOf, setupGame, splitRoles } from './helpers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';

test('子Aのブラウザから子Bの手札は取得できない（API・Realtime・Supabase直接）', async ({ browser }) => {
  // 子Aのブラウザが受け取ったものをすべて記録する（ネットワークタブ相当）
  const received: string[] = [];
  const { code, players } = await setupGame(browser, { prep: 'null', pitch: 'null' });
  const { children } = await splitRoles(players);
  const [a, b] = children;
  a.page.on('response', async (res) => {
    try {
      received.push(await res.text());
    } catch {
      // 本文のない応答
    }
  });
  a.page.on('websocket', (ws) => ws.on('framereceived', (f) => received.push(String(f.payload))));

  const bCards = await handOf(b.page);
  expect(bCards).toHaveLength(3);
  const aCards = await handOf(a.page);

  // 1) API：A の状態取得に B の手札が含まれない
  const token = await accessTokenOf(a.page);
  const state = await a.page.evaluate(
    async ([c, t]) => (await fetch(`/api/room/state?code=${c}`, { headers: { authorization: `Bearer ${t}` } })).text(),
    [code, token],
  );
  for (const id of bCards) expect(state).not.toContain(`"${id}"`);
  for (const id of aCards) expect(state).toContain(`"${id}"`);

  // 2) Supabase に直接問い合わせても、hands は自分の行しか返らない（RLS）
  const rows = await a.page.evaluate(
    async ([url, t, key]) => {
      const res = await fetch(`${url}/rest/v1/hands?select=player_id,card_ids`, {
        headers: { apikey: key, authorization: `Bearer ${t}` },
      });
      return (await res.json()) as { player_id: string; card_ids: string[] }[];
    },
    [SUPABASE_URL, token, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''],
  );
  expect(Array.isArray(rows)).toBe(true);
  expect(rows.flatMap((r) => r.card_ids)).not.toEqual(expect.arrayContaining([bCards[0]]));
  expect(rows.every((r) => r.card_ids.every((id) => aCards.includes(id)))).toBe(true);

  // 3) 少し待って、その間に A が受け取った通信（API応答・Realtime）にも B の手札がない
  await b.page.getByRole('button', { name: 'いけるで！' }).click();
  await a.page.reload();
  await expect(a.page.getByTestId('hand-card')).toHaveCount(3);
  await a.page.waitForTimeout(1500);
  const all = received.join('\n');
  for (const id of bCards) expect(all).not.toContain(`"${id}"`);
});

test('親以外が判定APIを呼ぶと403になる', async ({ browser }) => {
  const { code, players } = await setupGame(browser, { prep: 'null', pitch: 'null' });
  const { parent, children } = await splitRoles(players);
  const token = await accessTokenOf(children[0].page);
  const status = await children[0].page.evaluate(
    async ([c, t]) => {
      const res = await fetch('/api/judge', {
        method: 'POST',
        headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
        body: JSON.stringify({ code: c, winnerPlayerId: '00000000-0000-4000-8000-000000000000' }),
      });
      return res.status;
    },
    [code, token],
  );
  // 判定フェーズではないので 409、判定フェーズなら 403。ここでは判定フェーズまで進めてから確かめる
  expect([403, 409]).toContain(status);

  for (const c of children) await c.page.getByRole('button', { name: 'いけるで！' }).click();
  for (let i = 0; i < children.length; i++) {
    // 発表者は親の画面の表示から特定する
    const label = parent.page.getByTestId('presenter');
    await expect(label).toHaveText(new RegExp(`^(${children.map((c) => c.name).join('|')})さん`));
    const text = (await label.textContent())!;
    const presenter = children.find((c) => text.startsWith(`${c.name}さん`))!;
    await presenter.page.getByRole('button', { name: '以上です！' }).click();
    if (i < children.length - 1) await expect(label).not.toHaveText(text);
  }
  await expect(children[0].page.locator('main[data-phase="judge"]')).toBeVisible();
  const judgeStatus = await children[0].page.evaluate(
    async ([c, t]) => {
      const res = await fetch('/api/judge', {
        method: 'POST',
        headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
        body: JSON.stringify({ code: c, winnerPlayerId: '00000000-0000-4000-8000-000000000000' }),
      });
      return { status: res.status, body: await res.json() };
    },
    [code, token],
  );
  expect(judgeStatus.status).toBe(403);
  expect(judgeStatus.body.code).toBe('FORBIDDEN');
  expect(typeof judgeStatus.body.message).toBe('string');
});

test('準備中にページを再読み込みしても手札と並び順が残る', async ({ browser }) => {
  const { players } = await setupGame(browser, { prep: 'null', pitch: 'null' });
  const { children } = await splitRoles(players);
  const page = children[0].page;
  const before = await handOf(page);
  // 1枚目を下へ
  await page.getByRole('button', { name: /を下へ$/ }).first().click();
  const expected = [before[1], before[0], before[2]];
  await expect(async () => expect(await handOf(page)).toEqual(expected)).toPass();
  // 保存が終わるのを待つ
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/手元メモ/).fill('ここで笑いを取る');
  await page.getByLabel(/手元メモ/).blur();
  await page.waitForTimeout(500);

  await page.reload();
  await expect(page.getByTestId('hand-card')).toHaveCount(3);
  expect(await handOf(page)).toEqual(expected);
  await expect(page.getByLabel(/手元メモ/)).toHaveValue('ここで笑いを取る');
});

test('タイマー切れで自動的に次のフェーズへ進む', async ({ browser }) => {
  test.setTimeout(150_000);
  const { players } = await setupGame(browser, { prep: '30', pitch: '30' });
  // 誰も「いけるで！」を押さなくても、30秒たてばプレゼンへ
  for (const p of players) {
    await expect(p.page.locator('main[data-phase="pitch"]')).toBeVisible({ timeout: 45_000 });
  }
  // プレゼンも30秒たてば次の人へ
  const presenter = players[0].page.getByTestId('presenter');
  const first = await presenter.textContent();
  await expect(presenter).not.toHaveText(first!, { timeout: 45_000 });
});
