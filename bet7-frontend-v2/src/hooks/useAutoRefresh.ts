import { useEffect, useRef } from "react";

/**
 * Hook pour rafraîchir automatiquement une fonction à intervalles réguliers
 * @param callback - Fonction à exécuter périodiquement
 * @param intervalMs - Intervalle en millisecondes (défaut: 5000 = 5 secondes)
 * @param enabled - Si false, désactive le rafraîchissement automatique
 */
export function useAutoRefresh(
  callback: () => void,
  intervalMs: number = 5000,
  enabled: boolean = true
) {
  const callbackRef = useRef(callback);

  // Mettre à jour la référence du callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Exécuter immédiatement au montage
    callbackRef.current();

    // Puis exécuter à intervalles réguliers
    const intervalId = setInterval(() => {
      callbackRef.current();
    }, intervalMs);

    // Nettoyer l'intervalle au démontage
    return () => {
      clearInterval(intervalId);
    };
  }, [intervalMs, enabled]);
}
