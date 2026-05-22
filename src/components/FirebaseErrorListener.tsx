'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * Listens for global Firebase errors and surfaces them via toasts.
 * This is critical for debugging Security Rules in the browser.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    errorEmitter.on('permission-error', (error: FirestorePermissionError) => {
      toast({
        variant: 'destructive',
        title: 'Database Permission Error',
        description: `Operation '${error.context.operation}' was denied on path: ${error.context.path}`,
      });
    });
  }, [toast]);

  return null;
}
