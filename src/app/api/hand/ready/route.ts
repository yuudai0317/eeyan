import { setReady } from '@/lib/server/actions/hand';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.ready, ({ uid, input }) => setReady(uid, input.code, input.ready));
