import 'server-only';
import postgres from 'postgres';
import { serverEnv } from './env';

export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;

const globalForDb = globalThis as unknown as { __eeyanSql?: Sql };

/**
 * Postgres への直接接続。列名は camelCase に変換して返す。
 * Supabase の接続プール（Transaction mode）でも動くよう prepare は無効にする。
 */
export function db(): Sql {
  globalForDb.__eeyanSql ??= postgres(serverEnv.databaseUrl, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    transform: postgres.camel,
  });
  return globalForDb.__eeyanSql;
}

/** トランザクションを開始する。コールバックが例外を投げればロールバックされる */
export function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db().begin((tx) => fn(tx)) as Promise<T>;
}
