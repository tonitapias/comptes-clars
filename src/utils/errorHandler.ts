// src/utils/errorHandler.ts
import React from 'react';
import { TFunction } from 'i18next';
import { LITERALS } from '../constants/literals';
import * as Sentry from "@sentry/react"; 

interface FirebaseError extends Error {
  code: string;
}

const isFirebaseError = (error: unknown): error is FirebaseError => {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
};

export const parseAppError = (error: unknown, t: TFunction): string => {
  if (!navigator.onLine || (error instanceof TypeError && error.message.toLowerCase().includes('network'))) {
    return t('ERRORS.NETWORK', LITERALS.ERRORS.NETWORK);
  }

  if (isFirebaseError(error)) {
    switch (error.code) {
      case 'permission-denied':
        return t('ERRORS.PERMISSION_DENIED', LITERALS.ERRORS.PERMISSION_DENIED);
      case 'not-found':
        return t('ERRORS.NOT_FOUND', LITERALS.ERRORS.NOT_FOUND);
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return t('ERRORS.AUTH_INVALID', LITERALS.ERRORS.AUTH_INVALID);
      case 'auth/network-request-failed':
      case 'unavailable':
      case 'failed-precondition':
        return t('ERRORS.NETWORK', LITERALS.ERRORS.NETWORK);
    }
  }

  // [FASE 2 FIX]: Ara traduïm el missatge si coincideix amb una clau de diccionari, sinó mostrem el missatge original
  if (error instanceof Error) return t(error.message, error.message);
  
  if (typeof error === 'string') return t(error, error);
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as Record<string, unknown>).message);
    return t(msg, msg);
  }

  return t('ERRORS.UNEXPECTED', LITERALS.ERRORS.UNEXPECTED);
};

export const logAppError = (error: Error, errorInfo?: React.ErrorInfo | Record<string, unknown>, context?: string) => {
  if (import.meta.env.PROD) { 
    Sentry.captureException(error, { 
      extra: { 
        errorInfo, 
        context: context || 'Error Global No Controlat' 
      } 
    }); 
  }
  
  const errorPayload = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    info: errorInfo,
    context: context || 'Error Global No Controlat',
    url: typeof window !== 'undefined' ? window.location.href : 'Desconeguda',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconegut',
  };

  console.error('[MONITORITZACIÓ CRÍTICA] 🔴 App Crash:', JSON.stringify(errorPayload, null, 2));
};