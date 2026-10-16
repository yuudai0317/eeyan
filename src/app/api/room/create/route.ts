import { createRoom } from '@/lib/server/actions/room';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.createRoom, ({ uid, input }) => createRoom(uid, input.nickname, input.settings));
