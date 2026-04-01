'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic client-only error content (no SSR)
const ErrorContent = dynamic(() => import('./error-content'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-destructive/20 border-t-destructive rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  ),
});

export default function GlobalError({ error, reset }) {
  return (
    <Suspense fallback={<div>Loading error boundary...</div>}>
      <ErrorContent error={error} reset={reset} />
    </Suspense>
  );
}
