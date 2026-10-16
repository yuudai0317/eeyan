import { updateSettings } from '@/lib/server/actions/room';
import { apiRoute } from '@/lib/server/http';
import { schemas } from '@/lib/server/schemas';

export const POST = apiRoute(schemas.updateSettings, ({ uid, input }) => updateSettings(uid, input.code, input.settings));
