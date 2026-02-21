import { TFunction } from 'i18next';
import { LITERALS } from '../constants/literals';

// [RISC ZERO]: Interfície local per detectar objectes de Firebase sense importar la llibreria.
interface FirebaseError extends Error {
  code: string;
}

// Type Guard estricte (evitem l'ús d'any)
const isFirebaseError = (error: unknown): error is FirebaseError => {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
};

export const parseAppError = (error: unknown, t: TFunction): string => {
  // 1. Intercepció d'errors de Xarxa / Connexió
  if (!navigator.onLine || (error instanceof TypeError && error.message.toLowerCase().includes('network'))) {
    return t('ERRORS.NETWORK', LITERALS.ACTIONS.CONNECTION_ERROR || 'Sense connexió a Internet. Revisa la teva xarxa.');
  }

  // 2. Intercepció d'errors coneguts de Firebase
  if (isFirebaseError(error)) {
    switch (error.code) {
      case 'permission-denied':
        return t('ERRORS.PERMISSION_DENIED', 'No tens permisos suficients per fer aquesta acció.');
      case 'not-found':
        return t('ERRORS.NOT_FOUND', 'No s\'ha trobat la dada sol·licitada.');
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return t('ERRORS.AUTH_INVALID', 'Les credencials no són vàlides.');
      // [RISC ZERO]: Afegim codis específics de Firestore quan cau la xarxa 'unavailable' i 'failed-precondition'
      case 'auth/network-request-failed':
      case 'unavailable':
      case 'failed-precondition':
        return t('ERRORS.NETWORK', LITERALS.ACTIONS.CONNECTION_ERROR || 'Error de connexió amb el servidor. Comprova la teva xarxa.');
      // [ESCALABILITAT]: Aquí es poden afegir més codis en el futur.
    }
  }

  // 3. FALLBACK [RISC ZERO]: Lògica original intacta per si és un error genèric
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as Record<string, unknown>).message);
  }

  return t('ERRORS.UNEXPECTED', LITERALS.ACTIONS.UNEXPECTED_ERROR || 'S\'ha produït un error inesperat');
};

// --- NOU CODI: ADAPTADOR DE TELEMETRIA ---
export const logAppError = (error: Error, errorInfo?: React.ErrorInfo | Record<string, unknown>, context?: string) => {
  // [FUTUR]: Aquí és on connectarem Sentry o Datadog.
  // if (import.meta.env.PROD) { Sentry.captureException(error, { extra: { errorInfo, context } }); }
  
  const errorPayload = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    info: errorInfo,
    context: context || 'Error Global No Controlat',
    url: typeof window !== 'undefined' ? window.location.href : 'Desconeguda',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconegut',
  };

  // En lloc d'un simple console.error, fem un log estructurat preparat per ser indexat
  console.error('[MONITORITZACIÓ CRÍTICA] 🔴 App Crash:', JSON.stringify(errorPayload, null, 2));
};