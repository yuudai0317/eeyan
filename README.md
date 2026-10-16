# ええやん（eeyan）

「このボールペンを1万円で売ってください」をヒントにした、営業トーク対戦パーティーゲームです。
参加者は各自のスマートフォンで同じルームを開き、配られた3枚の言葉カードを使って口頭で売り込みます。
親が思わず「ええやん！」と言ったトークが1点。最初に3点を取った人が優勝です。

- 遊び方（印刷して配れる版）：[docs/RULES.md](docs/RULES.md)
- 状態遷移図：[docs/state-machine.md](docs/state-machine.md)
- 設計判断の記録：[docs/DECISIONS.md](docs/DECISIONS.md)

## 構成

| 領域 | 技術 |
|---|---|
| 画面・API | Next.js 16（App Router）+ TypeScript + Tailwind CSS v4 |
| DB・同期・認証 | Supabase（Postgres + Realtime + 匿名認証） |
| サーバーからDBへ | postgres.js（直接接続・トランザクション） |
| 並べ替え | dnd-kit |
| 状態管理 | Zustand |
| テスト | Vitest（ロジック・統合）、Playwright（E2E） |

```
src/
  app/                 画面（/, /create, /join, /room/[code], /how-to-play）と API（/api/...）
  components/          画面の部品（cards/ game/ ui/ icons/）
  data/                カードデータ（topics.json, words.json, categories.ts）
  i18n/ja.ts           画面の文言
  lib/game/            ゲームロジック（DB・UIに依存しない純粋関数）
  lib/server/          サーバー専用（認証・DB・各操作）
  lib/client/          ブラウザ専用（API呼び出し・Realtime購読・タイマー）
supabase/migrations/   DB のマイグレーション（RLS・cron を含む）
tests/integration/     ローカル Supabase に対する統合テスト
e2e/                   Playwright の E2E テスト
```

## ローカルで動かす

必要なもの：Node.js 20 以上、pnpm、Docker（Supabase をローカルで動かすため）

```bash
pnpm install

# 1. Supabase をローカルで起動（初回はイメージのダウンロードに数分かかります）
pnpm exec supabase start
#    表示された API_URL / ANON_KEY / DB_URL を控える

# 2. 環境変数を用意
cp .env.example .env.local
#    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=<表示された ANON_KEY>
#    DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# 3. マイグレーションを適用（supabase start 時にも自動で適用されます）
pnpm exec supabase db reset

# 4. 起動
pnpm dev
```

ブラウザで http://localhost:3000 を開きます。1台で試すときは、通常のウィンドウとシークレットウィンドウ（別のブラウザでも可）を
3つ開くと、それぞれ別のプレイヤーになります。スマートフォンから試すときは、同じ Wi-Fi で `http://<PCのIPアドレス>:3000` を開いてください
（`.env.local` の `NEXT_PUBLIC_SUPABASE_URL` も PC の IP アドレスにする必要があります）。

### テスト

```bash
pnpm test               # ゲームロジックとカードデータのユニットテスト
pnpm test:integration   # API とRLS の統合テスト（要 supabase start）
pnpm e2e                # 3ブラウザでの E2E テスト（要 supabase start。dev サーバーは自動で起動）
pnpm typecheck && pnpm lint
```

## Supabase プロジェクトの作成（本番）

1. https://supabase.com でプロジェクトを作成します（リージョンは Tokyo がおすすめです）。
2. **SQL の実行**：ダッシュボードの「SQL Editor」で、`supabase/migrations/` の SQL ファイルを古い順にすべて実行します。
   Supabase CLI を使う場合は `pnpm exec supabase link --project-ref <ref>` のあと `pnpm exec supabase db push` でも適用できます。
   - マイグレーションは `pg_cron` 拡張を有効にし、期限切れルームを毎時削除するジョブを登録します。
     エラーになる場合は「Database → Extensions」で `pg_cron` を有効にしてから、もう一度実行してください。
3. **匿名認証の有効化**：「Authentication → Sign In / Providers」で **Allow anonymous sign-ins** をオンにします。
   - 不正利用を防ぐため、「Authentication → Attack Protection」で CAPTCHA や、匿名サインインのレート制限も確認してください。
4. **Realtime の有効化**：マイグレーションで `rooms` / `players` / `rounds` / `pitches` を Realtime の配信対象に追加済みです。
   「Database → Publications → supabase_realtime」にこの4テーブルが入っていることを確認してください。
   `hands`（手札）は**意図的に入れていません**（手札の秘匿のため）。
5. **キーと接続文字列を控える**
   - 「Project Settings → API」：Project URL と anon（publishable）key
   - 「Connect」ボタン → **Transaction pooler**（ポート 6543）の接続文字列。パスワードはプロジェクト作成時のもの

## Vercel へのデプロイ

1. このリポジトリを Vercel にインポートします（Framework Preset は Next.js のまま）。
2. Environment Variables に次の3つを設定します。

   | 名前 | 値 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase の Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon（publishable）key |
   | `DATABASE_URL` | Transaction pooler の接続文字列（`...pooler.supabase.com:6543/postgres`） |

   `DATABASE_URL` は RLS を通らない強い権限を持つので、**`NEXT_PUBLIC_` を付けないでください**。
3. デプロイします。Function のリージョンは Supabase と同じ地域（例：Tokyo `hnd1`）にすると速くなります。
4. デプロイ後、トップページから部屋を作り、別の端末から参加できることを確認します。

## カードデータの編集

カードは JSON ファイルで管理しています。編集したら `pnpm test` を実行すると、枚数・ID の重複・文字数などを自動で確認できます。

### お題カード：`src/data/topics.json`

```json
{"id": "t001", "item": "ボールペン", "price": 10000, "note": null}
```

| 項目 | 内容 |
|---|---|
| `id` | 重複しないID（`t` + 番号） |
| `item` | 商品名。画面では「この{item}を{price}で売ってください」と表示されます |
| `price` | 円。300〜1,000,000 |
| `note` | 状況設定（例：「晴れの日に売る」）。なければ `null` |

### 単語カード：`src/data/words.json`

```json
{"id": "w001", "text": "実はこれ、", "category": "hook"}
```

| 項目 | 内容 |
|---|---|
| `id` | 重複しないID（`w` + 番号） |
| `text` | 2〜15文字。標準語の営業フレーズ |
| `category` | `hook` `question` `pain` `benefit` `future` `authority` `social` `scarcity` `story` `emotion` `price` `closing` のいずれか |

- カテゴリの表示名と色は `src/data/categories.ts` で変えられます。
- 各カテゴリ15枚以上あると、カテゴリ分散配布がうまく働きます。
- **ID は変えない・使い回さない**でください。遊んでいるルームのカードが表示できなくなります。消すときは、遊んでいるルームがない時に行ってください。

## 画面の文言を変える

ボタンや案内の文言は `src/i18n/ja.ts` にまとめてあります。短い文言はやわらかい関西弁、ルール説明とエラーは標準語です。
エラーメッセージは `src/lib/server/errors.ts`、遊び方のページは `src/components/RulesContent.tsx` にあります。
