import { expect, test } from '@playwright/test';
import { setupGame, splitRoles, type Player } from './helpers';

/** 3つのブラウザで、ルーム作成 → 参加 → 3点先取の1ゲームを最後まで通す */
test('3人で1ゲーム（3点先取）を最後まで遊べる', async ({ browser }) => {
  test.setTimeout(240_000);
  const { players } = await setupGame(browser, { prep: 'null', pitch: 'null', target: '3' });
  const host = players[0];

  for (let round = 1; round <= 10; round++) {
    // 準備：子が全員「いけるで！」
    for (const p of players) await expect(p.page.locator('main[data-phase="prep"]')).toBeVisible();
    await expect(host.page.getByText(`第${round}ラウンド`)).toBeVisible();
    const { parent, children } = await splitRoles(players);
    await expect(parent.page.getByText('みんな考え中やで')).toBeVisible();
    for (const c of children) await c.page.getByRole('button', { name: 'いけるで！' }).click();

    // プレゼン：発表者が「以上です！」。発表者は親の画面の表示（〇〇さんの売り込み中）から特定する
    let previous = '';
    for (let i = 0; i < children.length; i++) {
      const label = parent.page.getByTestId('presenter');
      await expect(label).toHaveText(/さんの売り込み中/);
      await expect(label).not.toHaveText(previous);
      previous = (await label.textContent())!;
      const presenter: Player = children.find((c) => previous.startsWith(`${c.name}さん`))!;
      expect(presenter).toBeDefined();
      // 発表者のカード3枚が全員の画面に見える
      for (const p of players) await expect(p.page.getByRole('list', { name: '発表中のカード' }).getByRole('listitem')).toHaveCount(3);
      await presenter.page.getByRole('button', { name: '以上です！' }).click();
    }

    // 判定：親が1人選んで「ええやん！」→ 確認
    await expect(parent.page.locator('main[data-phase="judge"]')).toBeVisible();
    for (const c of children) await expect(c.page.getByText(/悩んでます/)).toBeVisible();
    // 毎回ふたり目以降の先頭を選ぶ（同じ人が勝ちやすく、早く終わる）
    const candidates = parent.page.getByTestId('judge-candidate');
    await expect(candidates).toHaveCount(children.length);
    await candidates.first().click();
    await parent.page.getByRole('button', { name: 'ええやん！' }).click();
    await parent.page.getByRole('dialog').getByRole('button', { name: 'ええやん！' }).click();

    // 結果：全員に勝者が表示される
    for (const p of players) await expect(p.page.getByTestId('winner')).toBeVisible();
    const finalBtn = parent.page.getByRole('button', { name: '結果発表いこか' });
    if (await finalBtn.isVisible()) {
      await finalBtn.click();
      break;
    }
    await parent.page.getByRole('button', { name: '次いこか' }).click();
  }

  // ゲーム終了画面
  for (const p of players) {
    await expect(p.page.getByText('今日のいちばん“ええやん”')).toBeVisible();
    await expect(p.page.getByTestId('champion')).toBeVisible();
  }
  await expect(host.page.getByText('3点').first()).toBeVisible();
  // もういっかい
  await host.page.getByRole('button', { name: 'もういっかい' }).click();
  for (const p of players) await expect(p.page.locator('main[data-phase="prep"]')).toBeVisible();
  await expect(host.page.getByText('第1ラウンド')).toBeVisible();
});
