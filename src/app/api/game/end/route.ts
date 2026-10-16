import { endGame } from '@/lib/server/actions/game';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.codeOnly, ({ uid, input }) => endGame(uid, input.code));
