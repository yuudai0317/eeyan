import { nextRound } from '@/lib/server/actions/game';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.withVersion, ({ uid, input }) => nextRound(uid, input.code, input.version));
