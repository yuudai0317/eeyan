import { expect, type Browser, type Page } from '@playwright/test';

export interface Player {
  name: string;
  page: Page;
}

export async function newPlayer(browser: Browser, name: string): Promise<Player> {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { name, page };
}

/** ルームを作ってコードを返す。settings はフォームのラベルと値 */
export async function createRoom(
  host: Player,
  options: { prep?: string; pitch?: string; target?: string; swap?: boolean } = {},
): Promise<string> {
  const { page } = host;
  await page.goto('/create');
  await page.getByLabel('ニックネーム').fill(host.name);
  if (options.target) await page.getByLabel('目標点').selectOption(options.target);
  if (options.prep) await page.getByLabel('準備時間').selectOption(options.prep);
  if (options.pitch) await page.getByLabel('プレゼン時間（1人）').selectOption(options.pitch);
  if (options.swap) await page.getByRole('switch', { name: /カード交換/ }).check({ force: true });
  await page.getByRole('button', { name: 'この設定でつくる' }).click();
  await page.waitForURL(/\/room\/[A-Z0-9]{6}$/);
  const code = (await page.getByTestId('room-code').textContent())!.trim();
  return code;
}

/** 招待URLから参加する */
export async function joinRoom(player: Player, code: string): Promise<void> {
  const { page } = player;
  await page.goto(`/room/${code}`);
  await page.getByLabel('ニックネーム').fill(player.name);
  await page.getByRole('button', { name: 'まぜてー' }).click();
  await expect(page.getByTestId('room-code')).toHaveText(code);
}

export async function setupGame(
  browser: Browser,
  options: Parameters<typeof createRoom>[1] = {},
): Promise<{ code: string; players: Player[] }> {
  const players = await Promise.all(['ホスト', 'ふたり目', 'さんにん目'].map((n) => newPlayer(browser, n)));
  const code = await createRoom(players[0], options);
  await joinRoom(players[1], code);
  await joinRoom(players[2], code);
  const start = players[0].page.getByRole('button', { name: 'はじめよか' });
  await expect(start).toBeEnabled();
  await start.click();
  for (const p of players) await expect(p.page.locator('main[data-phase="prep"]')).toBeVisible();
  return { code, players };
}

export async function phaseOf(page: Page): Promise<string | null> {
  return page.locator('main[data-phase]').getAttribute('data-phase', { timeout: 1000 }).catch(() => null);
}

/** そのページの匿名ユーザーのアクセストークン（supabase-js が localStorage に保存したもの） */
export async function accessTokenOf(page: Page): Promise<string> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('eeyan-auth');
    if (!raw) throw new Error('no session');
    return JSON.parse(raw).access_token as string;
  });
}

/** 手札のカードID（並び順） */
export async function handOf(page: Page): Promise<string[]> {
  return page.getByTestId('hand-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-card-id')!));
}

/** 子（手札がある人）と親を見分ける */
export async function splitRoles(players: Player[]): Promise<{ parent: Player; children: Player[] }> {
  const children: Player[] = [];
  let parent: Player | null = null;
  for (const p of players) {
    if ((await p.page.getByTestId('hand-card').count()) > 0) children.push(p);
    else parent = p;
  }
  if (!parent) throw new Error('parent not found');
  return { parent, children };
}
