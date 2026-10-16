import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

/**
 * E2E テスト。ローカルの Supabase（supabase start）と Next.js を使う。
 * 事前に起動済みのサーバーがあれば使い回す（E2E_BASE_URL で変更可）。
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
// このリポジトリの開発コンテナに入っている Chromium（なければ Playwright 標準のものを使う）
const localChromium = '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    locale: 'ja-JP',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    trace: 'retain-on-failure',
    launchOptions: existsSync(localChromium) ? { executablePath: localChromium } : {},
  },
  webServer: {
    command: 'pnpm dev --port 3000',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
