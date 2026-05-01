import { Suspense } from 'react';
import { SharePageClient } from './share-page-client';

export default function SharePage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading share tools...</div>}>
      <SharePageClient />
    </Suspense>
  );
}
