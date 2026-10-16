import { joinRoom } from '@/lib/server/actions/room';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.joinRoom, ({ uid, input }) => joinRoom(uid, input.code, input.nickname));
