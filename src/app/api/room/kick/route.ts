import { kickPlayer } from '@/lib/server/actions/room';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.kick, ({ uid, input }) => kickPlayer(uid, input.code, input.playerId));
