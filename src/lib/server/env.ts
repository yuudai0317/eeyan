import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません（.env.example を参照）`);
  return value;
}

/** サーバー専用の環境変数。クライアントのバンドルには入らない */
export const serverEnv = {
  get databaseUrl() {
    return required('DATABASE_URL');
  },
  get supabaseUrl() {
    return required('NEXT_PUBLIC_SUPABASE_URL');
  },
  /** Supabase の新しい名前（PUBLISHABLE_KEY）と従来の名前（ANON_KEY）のどちらでも読む */
  get supabaseAnonKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
};
