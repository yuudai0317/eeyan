import { judge } from '@/lib/server/actions/game';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.judge, ({ uid, input }) => judge(uid, input.code, input.winnerPlayerId, input.version));
