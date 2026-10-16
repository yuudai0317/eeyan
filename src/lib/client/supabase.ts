'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** ブラウザ用の Supabase クライアント。匿名セッションは localStorage に保存され、同じ端末なら同じプレイヤーとして復帰できる */
export function supabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      '環境変数 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません。設定後に再デプロイしてください。',
    );
  }
  client ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'eeyan-auth' },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return client;
}

let pending: Promise<string> | null = null;

/** 匿名ログイン済みのアクセストークンを返す。まだなら匿名ログインする */
export async function getAccessToken(): Promise<string> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  const session = data.session;
  if (session && (session.expires_at ?? 0) * 1000 > Date.now() + 30_000) return session.access_token;
  if (session) {
    const refreshed = await sb.auth.refreshSession();
    if (refreshed.data.session) return refreshed.data.session.access_token;
  }
  pending ??= sb.auth
    .signInAnonymously()
    .then(({ data: d, error }) => {
      if (error || !d.session) throw error ?? new Error('匿名ログインに失敗しました');
      return d.session.access_token;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}
