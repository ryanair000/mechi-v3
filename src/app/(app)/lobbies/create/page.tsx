import { Suspense } from 'react';
import { CreateLobbyPageClient } from './create-lobby-page-client';

export const dynamic = 'force-dynamic';

export default function CreateLobbyPage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading lobby creator...</div>}>
      <CreateLobbyPageClient />
    </Suspense>
  );
}
