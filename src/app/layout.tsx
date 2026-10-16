import type { Metadata, Viewport } from 'next';
import { InkFilters } from '@/components/ui/InkFilters';
import './globals.css';

/**
 * フォントは Google Fonts のスタイルシートを直接読み込む。
 * 日本語フォントは文字ごとに細かく分割されて配信されるので、ブラウザが必要な分だけ取りに行くこの方式が軽い。
 * - 本文・ボタン：Zen Maru Gothic（丸ゴシック）
 * - 単語カード：Kiwi Maru（太めの丸い書体）
 * - ロゴ・スタンプ：Yusei Magic（手書き風）
 */
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Kiwi+Maru:wght@500&family=Yusei+Magic&family=Zen+Maru+Gothic:wght@500;700&display=swap';

export const metadata: Metadata = {
  title: { default: 'ええやん', template: '%s｜ええやん' },
  description: '配られた3枚の言葉で売り込む、営業トーク対戦パーティーゲーム',
  applicationName: 'eeyan',
  appleWebApp: { title: 'ええやん', capable: true, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5eedf' },
    { media: '(prefers-color-scheme: dark)', color: '#2a211b' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body className="min-h-dvh antialiased">
        <InkFilters />
        {children}
      </body>
    </html>
  );
}
