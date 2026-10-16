import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from './env';
import { errors } from './errors';

let client: SupabaseClient | null = null;

function authClient(): SupabaseClient {
  client ??= createClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** 検証済みトークンの短期キャッシュ（毎リクエスト Auth サーバーへ問い合わせないため） */
const verified = new Map<string, { uid: string; exp: number }>();

/**
 * Authorization: Bearer <匿名認証のJWT> を検証し、Supabase のユーザーIDを返す。
 * 非対称鍵で署名されたJWTはJWKSで手元検証、対称鍵（ローカル環境など）は Auth サーバーに問い合わせる。
 */
export async function authenticate(req: Request): Promise<string> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw errors.unauthenticated();

  const now = Date.now();
  const cached = verified.get(token);
  if (cached && cached.exp * 1000 > now) return cached.uid;

  const { data, error } = await authClient().auth.getClaims(token);
  const sub = data?.claims?.sub;
  if (error || typeof sub !== 'string' || !sub) throw errors.unauthenticated();

  if (verified.size > 5000) verified.clear();
  verified.set(token, { uid: sub, exp: Number(data.claims.exp ?? 0) });
  return sub;
}
