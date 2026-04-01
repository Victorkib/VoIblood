'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

export default function ErrorContent({ error, reset }) {
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    if (error) {
      setErrorDetails({
        message: error.message || 'An unexpected error occurred',
        stack: error.stack,
      });
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">
          {errorDetails?.message || 'An unexpected error occurred'}
        </p>

        {process.env.NODE_ENV === 'development' && errorDetails?.stack && (
          <div className="mb-6 p-4 bg-muted rounded-lg text-left">
            <p className="text-xs font-mono text-muted-foreground overflow-x-auto">
              {errorDetails.stack}
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => reset()}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
