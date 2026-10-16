import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'eeyan',
    short_name: 'eeyan',
    description: '営業トーク対戦パーティーゲーム「ええやん」',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5eedf',
    theme_color: '#f5eedf',
    lang: 'ja',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
