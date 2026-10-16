import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  poweredByHeader: false,
  // 開発時の左下のインジケーターがボタンに重なるので消す
  devIndicators: false,
};

export default nextConfig;
