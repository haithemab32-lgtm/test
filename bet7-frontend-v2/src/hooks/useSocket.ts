/**
 * Hook personnalisé pour gérer les connexions Socket.io et les mises à jour en temps réel
 */

import { useEffect, useCallback, useRef } from "react";
import { Socket } from "socket.io-client";
import {
  socketService,
  OddsUpdateEvent,
  OddsUpdateCallback,
  MatchStartedEvent,
  MatchStartedCallback,
} from "../services/socket/socketService";

// Réexporter les types pour faciliter l'import
export type { OddsUpdateEvent, MatchStartedEvent };

export interface UseSocketOptions {
  onOddsUpdate?: (update: OddsUpdateEvent) => void;
  onMatchStarted?: (event: MatchStartedEvent) => void;
  autoConnect?: boolean;
}

/**
 * Hook pour gérer la connexion Socket.io et écouter les mises à jour des cotes
 */
export function useSocket(options: UseSocketOptions = {}): {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  socket: Socket | null;
} {
  const { onOddsUpdate, onMatchStarted, autoConnect = true } = options;
  const onOddsUpdateRef = useRef<OddsUpdateCallback | null>(null);
  const onMatchStartedRef = useRef<MatchStartedCallback | null>(null);
  const registeredRef = useRef(false);

  // Mettre à jour les refs quand les callbacks changent (sans déclencher de re-render)
  useEffect(() => {
    onOddsUpdateRef.current = onOddsUpdate || null;
    onMatchStartedRef.current = onMatchStarted || null;
  }, [onOddsUpdate, onMatchStarted]);

  // Créer des callbacks stables qui utilisent les refs
  const stableOddsUpdate = useCallback((update: OddsUpdateEvent) => {
    if (onOddsUpdateRef.current) {
      onOddsUpdateRef.current(update);
    }
  }, []);

  const stableMatchStarted = useCallback((event: MatchStartedEvent) => {
    if (onMatchStartedRef.current) {
      onMatchStartedRef.current(event);
    }
  }, []);

  useEffect(() => {
    if (!autoConnect) return;

    // Connecter au socket
    socketService.connect();

    // Enregistrer les listeners - toujours réenregistrer pour s'assurer qu'ils sont actifs
    socketService.onOddsUpdate(stableOddsUpdate);
    socketService.onMatchStarted(stableMatchStarted);
    registeredRef.current = true;

    // Cleanup seulement au démontage du composant
    return () => {
      // Ne pas retirer les listeners ici car ils sont partagés entre plusieurs composants
      // Les listeners seront retirés uniquement au démontage complet de l'application
      registeredRef.current = false;
    };
  }, [autoConnect, stableOddsUpdate, stableMatchStarted]);

  // Fonction pour se connecter manuellement
  const connect = useCallback(() => {
    socketService.connect();
    if (!registeredRef.current) {
      socketService.onOddsUpdate(stableOddsUpdate);
      socketService.onMatchStarted(stableMatchStarted);
      registeredRef.current = true;
    }
  }, [stableOddsUpdate, stableMatchStarted]);

  // Fonction pour se déconnecter manuellement
  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  return {
    connected: socketService.connected,
    connect,
    disconnect,
    socket: socketService.socketInstance,
  };
}
