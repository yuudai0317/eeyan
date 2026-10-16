import { swapHandCard } from '@/lib/server/actions/hand';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.swap, ({ uid, input }) => swapHandCard(uid, input.code, input.cardId));
