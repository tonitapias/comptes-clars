import { useCallback } from 'react';

// Afegeixo 'selection' al tipus per als botons de +/-
type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

export const useHapticFeedback = () => {
  const trigger = useCallback((pattern: HapticPattern = 'light') => {
    // Comprovem si el dispositiu suporta vibració
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;

    switch (pattern) {
      case 'selection': 
        // Feedback ultra-curt (5ms) per a repetició ràpida (steppers)
        navigator.vibrate(5); 
        break;
      case 'light':
        navigator.vibrate(10); // Feedback subtil (clic normal)
        break;
      case 'medium':
        navigator.vibrate(20); // Accions secundàries
        break;
      case 'heavy':
        navigator.vibrate(40); // Accions destructives o importants
        break;
      case 'success':
        navigator.vibrate([10, 50, 20]); // "Ta-da!" (Pattern rítmic)
        break;
      case 'error':
        navigator.vibrate([50, 30, 50, 30, 50]); // Negació (Brrr-brrr-brrr)
        break;
    }
  }, []);

  return { trigger };
};