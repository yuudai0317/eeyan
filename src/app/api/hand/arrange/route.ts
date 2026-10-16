import { arrangeHand } from '@/lib/server/actions/hand';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.arrange, ({ uid, input }) => arrangeHand(uid, input.code, input.cardIds, input.memo));
