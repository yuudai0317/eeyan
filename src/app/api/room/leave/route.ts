import { leaveRoom } from '@/lib/server/actions/room';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.codeOnly, ({ uid, input }) => leaveRoom(uid, input.code));
