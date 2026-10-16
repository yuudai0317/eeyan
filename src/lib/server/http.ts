import 'server-only';
import type { z } from 'zod';
import { authenticate } from './auth';
import { ApiError, errors } from './errors';
import { checkRateLimit, type RateBucket } from './rateLimit';
import { firstIssueMessage } from './schemas';

const noStore = { 'cache-control': 'no-store' };

/** 応答には必ずサーバー時刻を入れる（クライアントが時計のずれを補正する） */
function json(status: number, body: object): Response {
  return Response.json({ ...body, serverTime: Date.now() }, { status, headers: noStore });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof ApiError) return json(e.status, { code: e.code, message: e.message });
  const pgCode = (e as { code?: string })?.code;
  // 一意制約違反などは、ほかの操作との競合として扱う
  if (pgCode === '23505' || pgCode === '40001' || pgCode === '40P01') {
    const c = errors.conflict();
    return json(c.status, { code: c.code, message: c.message });
  }
  console.error('[api] unexpected error', e);
  const i = errors.internal();
  return json(i.status, { code: i.code, message: i.message });
}

/**
 * Route Handler の共通処理：匿名認証の検証 → レート制限 → 入力検証 → 実行 → 応答。
 */
export function apiRoute<S extends z.ZodType>(
  schema: S,
  handler: (args: { uid: string; input: z.output<S> }) => Promise<object>,
  options: { bucket?: RateBucket; source?: 'body' | 'query' } = {},
) {
  return async (req: Request): Promise<Response> => {
    try {
      const uid = await authenticate(req);
      if (!checkRateLimit(uid, options.bucket ?? 'action')) throw errors.rateLimited();

      let raw: unknown;
      if (options.source === 'query') {
        raw = Object.fromEntries(new URL(req.url).searchParams);
      } else {
        try {
          raw = await req.json();
        } catch {
          throw errors.badRequest('リクエストの形式が正しくありません。');
        }
      }
      const parsed = schema.safeParse(raw);
      if (!parsed.success) throw errors.badRequest(firstIssueMessage(parsed.error));

      return json(200, await handler({ uid, input: parsed.data }));
    } catch (e) {
      return errorResponse(e);
    }
  };
}
