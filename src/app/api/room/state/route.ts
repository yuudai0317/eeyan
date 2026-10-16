import { getState } from '@/lib/server/actions/room';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const GET = apiRoute(schemas.codeOnly, ({ uid, input }) => getState(uid, input.code), { bucket: 'read', source: 'query' });
