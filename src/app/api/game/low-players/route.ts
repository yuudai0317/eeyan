import { decideLowPlayers } from '@/lib/server/actions/game';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.lowPlayers, ({ uid, input }) => decideLowPlayers(uid, input.code, input.decision));
