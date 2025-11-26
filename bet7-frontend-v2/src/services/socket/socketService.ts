/**
 * Service Socket.io pour la gestion des mises à jour en temps réel
 */

import { io, Socket } from "socket.io-client";
import { SOCKET_CONFIG } from "../../config/api";

export interface OddsUpdateEvent {
  matchId: string | number;
  fixtureId?: number;
  market: string; // "home", "draw", "away", etc.
  oldOdd: number;
  newOdd: number;
  trend: "up" | "down";
  bookmaker?: string;
  suspended?: boolean; // Indique si la cote est suspendue (true = locked)
  status?: {
    short?: string; // "1H", "2H", "HT", "LIVE", etc.
    elapsed?: number; // Temps écoulé en minutes
    long?: string;
  };
}

export interface MatchStartedEvent {
  matchId: string | number;
  fixtureId?: number;
  match?: any; // Données complètes du match (optionnel)
}

export type OddsUpdateCallback = (update: OddsUpdateEvent) => void;
export type MatchStartedCallback = (event: MatchStartedEvent) => void;

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private anyListenerSetup: boolean = false;
  private subscribedToLive: boolean = false;
  private matchStartedCallbacks: Set<MatchStartedCallback> = new Set();
  private oddsUpdateCallbacks: Set<OddsUpdateCallback> = new Set();
  private oddsUpdateListenerSetup: boolean = false;

  /**
   * Initialise la connexion Socket.io
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_CONFIG.URL, SOCKET_CONFIG.OPTIONS);

    // Configurer onAny une seule fois pour le débogage (seulement pour les événements odds)
    if (!this.anyListenerSetup && this.socket) {
      try {
        this.socket.onAny((eventName, ...args) => {
          // Log seulement les événements liés aux odds
          if (
            eventName.toLowerCase().includes("odds") ||
            eventName.toLowerCase().includes("update")
          ) {
          }
        });
        this.anyListenerSetup = true;
      } catch (error) {
        console.error(
          "❌ [Socket] Erreur lors de la configuration de onAny:",
          error
        );
      }
    }

    this.socket.on("connect", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // S'abonner immédiatement à la room "live:matches" pour recevoir les mises à jour
      this.subscribeToLiveRoom();
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Erreur de connexion Socket.io:", error);
      this.reconnectAttempts++;
      if (
        this.reconnectAttempts >= SOCKET_CONFIG.OPTIONS.reconnectionAttempts
      ) {
        console.error("Nombre maximum de tentatives de reconnexion atteint");
      }
    });

    this.socket.on("reconnect", () => {
      this.reconnectAttempts = 0;
      // Réabonner aux rooms après reconnexion
      this.subscribedToLive = false; // Reset pour permettre la réabonnement
      this.oddsUpdateListenerSetup = false; // Reset pour reconfigurer les listeners
      this.subscribeToLiveRoom();
      // Reconfigurer les listeners si des callbacks sont enregistrés
      if (this.oddsUpdateCallbacks.size > 0 && !this.oddsUpdateListenerSetup) {
        this.setupOddsUpdateListener();
      }
    });
  }

  /**
   * S'abonne à la room "live:matches" pour recevoir les mises à jour
   */
  private subscribeToLiveRoom(): void {
    if (this.socket && this.socket.connected && !this.subscribedToLive) {
      this.socket.emit("subscribe:live");
      this.subscribedToLive = true;
    }
  }

  /**
   * Déconnecte le socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.subscribedToLive = false;
      this.anyListenerSetup = false;
    }
  }

  /**
   * Écoute les événements de mise à jour des cotes
   */
  onOddsUpdate(callback: OddsUpdateCallback): void {
    // Ajouter le callback au Set
    this.oddsUpdateCallbacks.add(callback);

    if (!this.socket) {
      this.connect();
      // Attendre que le socket soit connecté
      setTimeout(() => {
        if (this.socket && !this.oddsUpdateListenerSetup) {
          this.setupOddsUpdateListener();
        }
      }, 1000);
      return;
    }

    // Si le socket est déjà connecté, configurer immédiatement
    if (this.socket.connected && !this.oddsUpdateListenerSetup) {
      this.setupOddsUpdateListener();
    } else if (!this.oddsUpdateListenerSetup) {
      // Sinon, attendre la connexion
      this.socket.once("connect", () => {
        if (!this.oddsUpdateListenerSetup) {
          this.setupOddsUpdateListener();
        }
      });
    }
  }

  /**
   * Configure le listener pour les mises à jour de cotes
   */
  private setupOddsUpdateListener(): void {
    if (!this.socket || this.oddsUpdateListenerSetup) {
      return;
    }

    // Retirer l'ancien listener s'il existe (pour éviter les doublons)
    this.socket.off("oddsUpdate");
    this.socket.off("odds-update");
    this.socket.off("odds_update");
    this.socket.off("updateOdds");
    this.socket.off("oddsChange");
    this.socket.off("odds-updates"); // Pour les événements batch
    this.socket.off("oddsUpdates"); // Pour les événements batch

    // Handler pour un événement unique ou batch
    const handleSingleUpdate = (data: any) => {
      try {
        // Vérifier si c'est le nouveau format avec changes/allChanges/odds
        if (data.changes || data.allChanges || data.odds) {
          const fixtureId =
            data.fixtureId || data.fixture_id || data.matchId || data.match_id;

          // Traiter allChanges si disponible (liste complète de tous les changements)
          if (data.allChanges && Array.isArray(data.allChanges)) {
            data.allChanges.forEach((change: any) => {
              const normalizedData: OddsUpdateEvent = {
                matchId: fixtureId,
                fixtureId: fixtureId,
                market: change.market || change.label || change.type || "",
                oldOdd:
                  change.oldOdd ||
                  change.old_odd ||
                  change.old ||
                  change.oldValue ||
                  0,
                newOdd:
                  change.newOdd ||
                  change.new_odd ||
                  change.new ||
                  change.newValue ||
                  change.odd ||
                  0,
                trend: (() => {
                  const rawTrend = change.trend || change.direction;
                  // Mapper "increased" -> "up" et "decreased" -> "down"
                  if (rawTrend === "increased" || rawTrend === "increase")
                    return "up";
                  if (rawTrend === "decreased" || rawTrend === "decrease")
                    return "down";
                  if (rawTrend === "up" || rawTrend === "down") return rawTrend;
                  // Fallback: calculer depuis les valeurs
                  return change.newOdd > change.oldOdd ? "up" : "down";
                })(),
                bookmaker: change.bookmaker || change.source,
                // Inclure le champ suspended si présent (true = cote suspendue, doit afficher "locked")
                suspended:
                  change.suspended !== undefined
                    ? change.suspended
                    : data.suspended !== undefined
                    ? data.suspended
                    : undefined,
                // Inclure les données de status si présentes (status: { "short": "1H", "elapsed": 25 })
                status: data.status || change.status || undefined,
              };
              // Appeler tous les callbacks enregistrés
              this.oddsUpdateCallbacks.forEach((cb) => {
                try {
                  cb(normalizedData);
                } catch (error) {
                  console.error(
                    "❌ [Socket] Erreur dans callback oddsUpdate:",
                    error
                  );
                }
              });
            });
          }
          // Sinon, traiter changes (groupés par marché)
          else if (data.changes && typeof data.changes === "object") {
            Object.entries(data.changes).forEach(
              ([marketName, marketChanges]: [string, any]) => {
                if (Array.isArray(marketChanges)) {
                  marketChanges.forEach((change: any) => {
                    // Pour Total Goals, combiner marketName et label si nécessaire
                    // Ex: marketName = "Goals Over/Under", label = "Over 2.5" -> "Over 2.5"
                    let marketLabel =
                      change.label || change.value || change.market || "";

                    // Si le label est vide ou ne contient pas d'info sur Over/Under, utiliser marketName
                    if (
                      !marketLabel ||
                      (!marketLabel.toLowerCase().includes("over") &&
                        !marketLabel.toLowerCase().includes("under"))
                    ) {
                      // Si marketName contient "Goals" ou "Over/Under", combiner avec label
                      if (
                        marketName &&
                        (marketName.toLowerCase().includes("goals") ||
                          marketName.toLowerCase().includes("over/under"))
                      ) {
                        marketLabel = marketLabel
                          ? `${marketLabel} ${marketName}`
                          : marketName;
                      } else {
                        marketLabel = marketLabel || marketName || "";
                      }
                    }

                    // DEBUG: Log du marketLabel final
                    if (
                      marketName.toLowerCase().includes("goals") ||
                      marketName.toLowerCase().includes("over/under") ||
                      marketLabel.toLowerCase().includes("over") ||
                      marketLabel.toLowerCase().includes("under")
                    ) {
                      // marketLabel final pour total goals
                    }

                    const normalizedData: OddsUpdateEvent = {
                      matchId: fixtureId,
                      fixtureId: fixtureId,
                      market: marketLabel,
                      oldOdd:
                        change.oldOdd ||
                        change.old_odd ||
                        change.old ||
                        change.oldValue ||
                        0,
                      newOdd:
                        change.newOdd ||
                        change.new_odd ||
                        change.new ||
                        change.newValue ||
                        change.odd ||
                        0,
                      trend: (() => {
                        const rawTrend = change.trend || change.direction;
                        // Mapper "increased" -> "up" et "decreased" -> "down"
                        if (rawTrend === "increased" || rawTrend === "increase")
                          return "up";
                        if (rawTrend === "decreased" || rawTrend === "decrease")
                          return "down";
                        if (rawTrend === "up" || rawTrend === "down")
                          return rawTrend;
                        // Fallback: calculer depuis les valeurs
                        return change.newOdd > change.oldOdd ? "up" : "down";
                      })(),
                      bookmaker: change.bookmaker || change.source,
                      // Inclure le champ suspended si présent (true = cote suspendue, doit afficher "locked")
                      suspended:
                        change.suspended !== undefined
                          ? change.suspended
                          : data.suspended !== undefined
                          ? data.suspended
                          : undefined,
                      // Inclure les données de status si présentes (status: { "short": "1H", "elapsed": 25 })
                      status: data.status || change.status || undefined,
                    };
                    // Appeler tous les callbacks enregistrés
                    this.oddsUpdateCallbacks.forEach((cb) => {
                      try {
                        cb(normalizedData);
                      } catch (error) {
                        console.error(
                          "❌ [Socket] Erreur dans callback oddsUpdate:",
                          error
                        );
                      }
                    });
                  });
                }
              }
            );
          }

          // Si odds est fourni, on pourrait aussi mettre à jour toutes les cotes
          // mais pour l'instant, on se concentre sur les changements individuels
        } else {
          // Format individuel (ancien format)
          const normalizedData: OddsUpdateEvent = {
            matchId:
              data.matchId ||
              data.fixtureId ||
              data.match_id ||
              data.fixture_id,
            fixtureId: data.fixtureId || data.fixture_id,
            market: data.market || data.label || data.type || "",
            oldOdd: data.oldOdd || data.old_odd || data.old || 0,
            newOdd: data.newOdd || data.new_odd || data.new || data.odd || 0,
            trend: (() => {
              const rawTrend = data.trend || data.direction;
              // Mapper "increased" -> "up" et "decreased" -> "down"
              if (rawTrend === "increased" || rawTrend === "increase")
                return "up";
              if (rawTrend === "decreased" || rawTrend === "decrease")
                return "down";
              if (rawTrend === "up" || rawTrend === "down") return rawTrend;
              // Fallback: calculer depuis les valeurs
              const newOdd =
                data.newOdd || data.new_odd || data.new || data.odd || 0;
              const oldOdd = data.oldOdd || data.old_odd || data.old || 0;
              return newOdd > oldOdd ? "up" : "down";
            })(),
            bookmaker: data.bookmaker || data.source,
            // Inclure le champ suspended si présent (true = cote suspendue, doit afficher "locked")
            suspended:
              data.suspended !== undefined ? data.suspended : undefined,
            // Inclure les données de status si présentes (status: { "short": "1H", "elapsed": 25 })
            status: data.status || undefined,
          };
          // Appeler tous les callbacks enregistrés
          this.oddsUpdateCallbacks.forEach((cb) => {
            try {
              cb(normalizedData);
            } catch (error) {
              console.error(
                "❌ [Socket] Erreur dans callback oddsUpdate:",
                error
              );
            }
          });
        }
      } catch (error) {
        console.error("❌ Erreur lors du traitement de la mise à jour:", error);
      }
    };

    // Handler pour des événements batch (tableau de mises à jour)
    const handleBatchUpdates = (updates: any[]) => {
      if (Array.isArray(updates)) {
        updates.forEach((data) => {
          handleSingleUpdate(data);
        });
      }
    };

    // Écouter plusieurs noms d'événements possibles (format unique)
    this.socket.on("oddsUpdate", handleSingleUpdate);
    this.socket.on("odds-update", handleSingleUpdate);
    this.socket.on("odds_update", handleSingleUpdate);
    this.socket.on("updateOdds", handleSingleUpdate);
    this.socket.on("oddsChange", handleSingleUpdate);

    // Écouter les événements batch (format tableau)
    this.socket.on("odds-updates", handleBatchUpdates);
    this.socket.on("oddsUpdates", handleBatchUpdates);

    this.oddsUpdateListenerSetup = true;

    // Le backend émet vers les rooms "live:matches" et "fixture:${fixtureId}"
    // Il faut s'abonner avec les événements "subscribe:live" et "subscribe:fixture"
    // S'assurer que nous sommes abonnés à la room live:matches
    if (this.socket.connected) {
      this.subscribeToLiveRoom();
    } else {
      // Si pas encore connecté, attendre la connexion (mais le handler connect le fera aussi)
      this.socket.once("connect", () => {
        this.subscribeToLiveRoom();
      });
    }
  }

  /**
   * Arrête d'écouter les événements de mise à jour des cotes
   */
  offOddsUpdate(callback?: OddsUpdateCallback): void {
    if (callback) {
      this.oddsUpdateCallbacks.delete(callback);
    } else {
      this.oddsUpdateCallbacks.clear();
    }
  }

  /**
   * Vérifie si le socket est connecté
   */
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Écoute les événements de match qui commence (passe de upcoming à live)
   */
  onMatchStarted(callback: MatchStartedCallback): void {
    if (!this.socket) {
      this.connect();
      setTimeout(() => {
        if (this.socket) {
          this.setupMatchStartedListener(callback);
        }
      }, 1000);
      return;
    }

    if (this.socket.connected) {
      this.setupMatchStartedListener(callback);
    } else {
      this.socket.once("connect", () => {
        this.setupMatchStartedListener(callback);
      });
    }
  }

  /**
   * Configure le listener pour les matchs qui commencent
   */
  private setupMatchStartedListener(callback: MatchStartedCallback): void {
    if (!this.socket) {
      return;
    }

    // Ajouter le callback à la liste
    this.matchStartedCallbacks.add(callback);

    // Configurer le listener une seule fois
    if (this.matchStartedCallbacks.size === 1) {
      const handleMatchStarted = (data: any) => {
        try {
          const normalizedData: MatchStartedEvent = {
            matchId:
              data.matchId ||
              data.fixtureId ||
              data.match_id ||
              data.fixture_id,
            fixtureId: data.fixtureId || data.fixture_id,
            match: data.match || data,
          };

          // Appeler tous les callbacks enregistrés
          this.matchStartedCallbacks.forEach((cb) => {
            try {
              cb(normalizedData);
            } catch (error) {
              console.error("❌ Erreur dans le callback matchStarted:", error);
            }
          });
        } catch (error) {
          console.error("❌ Erreur lors du traitement de matchStarted:", error);
        }
      };

      // Écouter plusieurs noms d'événements possibles
      this.socket.on("matchStarted", handleMatchStarted);
      this.socket.on("match-started", handleMatchStarted);
      this.socket.on("match_started", handleMatchStarted);
      this.socket.on("statusChange", (data: any) => {
        // Si le statut passe à "live" ou contient "live", considérer comme matchStarted
        if (
          data.status &&
          (data.status.toLowerCase().includes("live") ||
            data.status.toLowerCase() === "1h" ||
            data.status.toLowerCase() === "2h")
        ) {
          handleMatchStarted(data);
        }
      });
    }
  }

  /**
   * Arrête d'écouter les événements de match qui commence
   */
  offMatchStarted(callback?: MatchStartedCallback): void {
    if (callback) {
      this.matchStartedCallbacks.delete(callback);
    } else {
      this.matchStartedCallbacks.clear();
      if (this.socket) {
        this.socket.off("matchStarted");
        this.socket.off("match-started");
        this.socket.off("match_started");
        this.socket.off("statusChange");
      }
    }
  }

  /**
   * Obtient l'instance du socket
   */
  get socketInstance(): Socket | null {
    return this.socket;
  }
}

// Export d'une instance singleton
export const socketService = new SocketService();
