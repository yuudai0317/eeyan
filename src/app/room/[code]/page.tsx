import type { Metadata } from 'next';
import { RoomScreen } from '@/components/game/RoomScreen';

export const metadata: Metadata = { title: 'ルーム' };

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomScreen code={code} />;
}
