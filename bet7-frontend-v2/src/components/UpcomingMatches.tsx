import { useState, useEffect, useCallback, useRef } from "react";
import MatchCard from "./matchCard/MatchCard";
import MarketHeaders from "./matchCard/MarketHeaders";
import SportNavigation from "./matchCard/SportNavigation";
import { Match } from "./matchCard/type";
import { fetchUpcomingMatches8H } from "../services/api/matches";
import { useSocket, MatchStartedEvent } from "../hooks/useSocket";
import { hasMatchStarted } from "../utils/dateFormatters";
import { useTheme } from "../contexts/ThemeContext";

interface UpcomingMatchesProps {
  showAllUpcoming: boolean;
  setShowAllUpcoming: (value: boolean) => void;
  onMatchClick?: (matchId: number) => void;
}

// Cache global pour éviter les appels multiples
let globalUpcomingMatches: Match[] | null = null;
let globalUpcomingMatchesPromise: Promise<Match[]> | null = null;

export default function UpcomingMatches({
  showAllUpcoming,
  setShowAllUpcoming,
  onMatchClick,
}: UpcomingMatchesProps) {
  const { theme } = useTheme();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedLeagues, setCollapsedLeagues] = useState<Set<string>>(
    new Set()
  );
  const [favoriteLeagues, setFavoriteLeagues] = useState<Set<string>>(
    new Set()
  );

  const toggleLeagueCollapse = (leagueName: string) => {
    setCollapsedLeagues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leagueName)) {
        newSet.delete(leagueName);
      } else {
        newSet.add(leagueName);
      }
      return newSet;
    });
  };

  const toggleFavoriteLeague = (leagueName: string) => {
    setFavoriteLeagues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leagueName)) {
        newSet.delete(leagueName);
      } else {
        newSet.add(leagueName);
      }
      return newSet;
    });
  };

  /**
   * Retire un match de la liste upcoming
   */
  const removeMatchFromUpcoming = useCallback(
    (matchId: string, fixtureId?: string) => {
      setMatches((prevMatches) => {
        // Retirer le match de la liste upcoming
        const filtered = prevMatches.filter((m) => {
          const mId = m.id.toString();
          return (
            mId !== matchId &&
            mId !== fixtureId &&
            !(fixtureId && mId.includes(fixtureId)) &&
            !(matchId && mId.includes(matchId))
          );
        });

        // Mettre à jour le cache global si un match a été retiré
        if (filtered.length < prevMatches.length) {
          globalUpcomingMatches = filtered;
        }

        return filtered;
      });
    },
    []
  );

  /**
   * Gère les matchs qui commencent (passent de upcoming à live) via Socket.io
   */
  const handleMatchStarted = useCallback(
    (event: MatchStartedEvent) => {
      const matchId = event.matchId?.toString();
      const fixtureId = event.fixtureId?.toString();

      if (!matchId && !fixtureId) {
        return;
      }

      removeMatchFromUpcoming(matchId, fixtureId);
    },
    [removeMatchFromUpcoming]
  );

  // Écouter les événements de match qui commence
  useSocket({
    onMatchStarted: handleMatchStarted,
    autoConnect: true,
  });

  // Utiliser une ref pour suivre les matchs déjà notifiés (évite les boucles)
  const notifiedMatchesRef = useRef<Set<string>>(new Set());

  // Vérification périodique pour détecter les matchs qui ont commencé
  // Cette vérification complète les événements Socket.io au cas où ils ne seraient pas émis
  useEffect(() => {
    // Vérifier toutes les minutes si des matchs ont commencé
    const checkForStartedMatches = () => {
      setMatches((prevMatches) => {
        // Ne rien faire si la liste est vide
        if (prevMatches.length === 0) {
          return prevMatches;
        }

        const startedMatches: string[] = [];

        // Identifier les matchs qui ont commencé ET qui n'ont pas déjà été notifiés
        prevMatches.forEach((match) => {
          const matchId = match.id.toString();
          if (
            hasMatchStarted(match, 1) &&
            !notifiedMatchesRef.current.has(matchId)
          ) {
            // Le match a commencé et n'a pas encore été notifié
            startedMatches.push(matchId);
            notifiedMatchesRef.current.add(matchId);
          }
        });

        // Si des matchs ont commencé, les retirer de la liste
        if (startedMatches.length > 0) {
          const filtered = prevMatches.filter((m) => {
            const mId = m.id.toString();
            return !startedMatches.some(
              (startedId) => mId === startedId || mId.includes(startedId)
            );
          });

          // Mettre à jour le cache global
          if (filtered.length < prevMatches.length) {
            globalUpcomingMatches = filtered;
          }

          // Déclencher un événement personnalisé pour notifier App.tsx de recharger les matchs live
          // Cela permet d'ajouter automatiquement ces matchs à la liste live
          // On déclenche un seul événement avec tous les matchIds pour éviter plusieurs rechargements
          window.dispatchEvent(
            new CustomEvent("matchStartedFromUpcoming", {
              detail: { matchIds: startedMatches },
            })
          );

          return filtered;
        }

        return prevMatches;
      });
    };

    // Vérifier immédiatement au montage
    checkForStartedMatches();

    // Puis vérifier toutes les minutes (60000 ms)
    const intervalId = setInterval(checkForStartedMatches, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, []); // Pas de dépendances, on veut que ça tourne en continu

  useEffect(() => {
    const fetchUpcomingMatches = async () => {
      // Si on a déjà les données en cache, les utiliser
      if (globalUpcomingMatches) {
        setMatches(globalUpcomingMatches);
        setLoading(false);
        return;
      }

      // Si une requête est déjà en cours, attendre sa résolution
      if (globalUpcomingMatchesPromise) {
        try {
          const cachedMatches = await globalUpcomingMatchesPromise;
          setMatches(cachedMatches);
          setLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
          setLoading(false);
        }
        return;
      }

      // Nouvelle requête
      try {
        setLoading(true);
        setError(null);

        globalUpcomingMatchesPromise = (async () => {
          // Récupérer les matchs pour les prochaines 24 heures
          const result = await fetchUpcomingMatches8H(24);

          if (result.matches && result.matches.length > 0) {
            // Mettre en cache
            globalUpcomingMatches = result.matches;
            return result.matches;
          } else {
            globalUpcomingMatches = [];
            return [];
          }
        })();

        const result = await globalUpcomingMatchesPromise;
        setMatches(result);
      } catch (err) {
        console.error("Error fetching upcoming matches:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
        globalUpcomingMatchesPromise = null;
      }
    };

    fetchUpcomingMatches();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div
          className={`text-lg ${
            theme === "light" ? "text-yellow-600" : "text-yellow-400"
          }`}
        >
          Chargement des matchs à venir...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div
          className={`text-lg ${
            theme === "light" ? "text-red-600" : "text-red-400"
          }`}
        >
          Erreur: {error}
        </div>
        <div
          className={`text-sm mt-2 ${
            theme === "light" ? "text-gray-600" : "text-gray-400"
          }`}
        >
          {error.includes("rateLimit") || error.includes("Too many requests")
            ? "Limite de requêtes API atteinte. Veuillez réessayer dans quelques instants."
            : "Vérifiez que le serveur API est bien démarré"}
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8">
        <div
          className={`text-lg ${
            theme === "light" ? "text-gray-700" : "text-gray-400"
          }`}
        >
          Aucun match à venir
        </div>
        <div
          className={`text-sm mt-2 ${
            theme === "light" ? "text-gray-600" : "text-gray-500"
          }`}
        >
          {error
            ? `Erreur: ${error}`
            : loading
            ? "Chargement..."
            : "Aucun match programmé dans les prochaines 24 heures"}
        </div>
        {process.env.NODE_ENV === "development" && (
          <div
            className={`text-xs mt-2 space-y-1 ${
              theme === "light" ? "text-gray-500" : "text-gray-600"
            }`}
          >
            <div>
              Debug: matches.length = {matches.length}, loading ={" "}
              {loading ? "true" : "false"}, error = {error || "null"}
            </div>
            <div>API appelée: /api/upcoming-matches/in-hours?hours=24</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${
        theme === "light" ? "bg-white" : "bg-[#2a2a2a]"
      } overflow-x-hidden`}
    >
      <SportNavigation />
      <div className="hidden desktop:block">
        <MarketHeaders />
      </div>
      <div className="space-y-px mb-8 overflow-x-hidden">
        {(() => {
          const matchesSlice = matches.slice(
            0,
            showAllUpcoming ? matches.length : 5
          );

          // Si on affiche tous les matchs, regrouper par ligue
          if (showAllUpcoming) {
            const groupedByLeague = matchesSlice.reduce((acc, match) => {
              const leagueName =
                typeof match.league === "string"
                  ? match.league
                  : match.league?.name || "Autres";
              if (!acc[leagueName]) {
                acc[leagueName] = [];
              }
              acc[leagueName].push(match);
              return acc;
            }, {} as Record<string, typeof matchesSlice>);

            // Trier les ligues par nom de pays (country) puis par nom de ligue
            const sortedLeagueEntries = Object.entries(groupedByLeague).sort(
              ([a, matchesA], [b, matchesB]) => {
                // Obtenir les infos de ligue pour extraire le country
                const firstMatchA = matchesA[0];
                const leagueInfoA =
                  typeof firstMatchA.league === "string"
                    ? { name: firstMatchA.league, country: "", flag: "" }
                    : firstMatchA.league || {
                        name: "Autres",
                        country: "",
                        flag: "",
                      };

                const firstMatchB = matchesB[0];
                const leagueInfoB =
                  typeof firstMatchB.league === "string"
                    ? { name: firstMatchB.league, country: "", flag: "" }
                    : firstMatchB.league || {
                        name: "Autres",
                        country: "",
                        flag: "",
                      };

                // Trier d'abord par country, puis par nom de ligue
                const countryA = leagueInfoA.country || "";
                const countryB = leagueInfoB.country || "";
                const countryCompare = countryA.localeCompare(countryB);

                if (countryCompare !== 0) {
                  return countryCompare;
                }

                // Si même pays, trier par nom de ligue
                return a.localeCompare(b);
              }
            );

            // Initialiser collapsedLeagues avec toutes les ligues sauf les 3 premières
            const leagueNames = sortedLeagueEntries.map(([name]) => name);
            const firstThreeLeagues = leagueNames.slice(0, 3);
            const remainingLeagues = leagueNames.slice(3);

            // Si c'est la première fois qu'on affiche, initialiser l'état
            if (collapsedLeagues.size === 0 && remainingLeagues.length > 0) {
              setCollapsedLeagues(new Set(remainingLeagues));
            }

            return sortedLeagueEntries.map(([leagueName, leagueMatches]) => {
              // Prendre le premier match pour obtenir les infos de la ligue
              const firstMatch = leagueMatches[0];
              const leagueInfo =
                typeof firstMatch.league === "string"
                  ? { name: firstMatch.league, country: "", flag: "" }
                  : firstMatch.league || {
                      name: "Autres",
                      country: "",
                      flag: "",
                    };

              return (
                <div key={leagueName}>
                  <div
                    className={`font-bold text-sm px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                      theme === "light"
                        ? "bg-gray-50 text-gray-900 hover:bg-gray-100"
                        : "bg-[#2e2e2e] text-white hover:bg-[#333333]"
                    }`}
                    onClick={() => toggleLeagueCollapse(leagueName)}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteLeague(leagueName);
                        }}
                        className="text-yellow-400 hover:text-yellow-300 transition-colors"
                      >
                        {favoriteLeagues.has(leagueName) ? (
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                          </svg>
                        )}
                      </button>
                      {leagueInfo.flag ? (
                        <img
                          src={leagueInfo.flag}
                          alt={leagueInfo.country}
                          className="w-6 h-4 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const nextElement = e.currentTarget
                              .nextElementSibling as HTMLElement;
                            if (nextElement) {
                              nextElement.style.display = "flex";
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="w-6 h-4 flex items-center justify-center"
                        style={{ display: leagueInfo.flag ? "none" : "flex" }}
                      >
                        <svg
                          className="w-6 h-6 text-blue-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                        </svg>
                      </div>
                      <span>{leagueInfo.country}</span>
                      <span
                        className={
                          theme === "light" ? "text-gray-400" : "text-gray-300"
                        }
                      >
                        -
                      </span>
                      <span>{leagueInfo.name}</span>
                    </div>
                    <div className="text-yellow-400">
                      {collapsedLeagues.has(leagueName) ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  {!collapsedLeagues.has(leagueName) && (
                    <>
                      {leagueMatches.map((match, index) => (
                        <div
                          key={`${match.id}-${index}`}
                          className={`border-b ${
                            theme === "light"
                              ? "bg-white border-gray-200"
                              : "bg-[#2a2a2a] border-white/10"
                          }`}
                        >
                          <MatchCard
                            match={match}
                            hideLeagueInfo={true}
                            onMatchClick={onMatchClick}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            });
          }

          // Affichage normal (pas de regroupement)
          return matchesSlice.map((match, index) => (
            <div
              key={`${match.id}-${index}`}
              className={`border-b ${
                theme === "light"
                  ? "bg-white border-gray-200"
                  : "bg-[#2a2a2a] border-white/10"
              }`}
            >
              <MatchCard match={match} onMatchClick={onMatchClick} />
            </div>
          ));
        })()}
        {matches.length > 0 && !showAllUpcoming && (
          <div
            className={`border-t pt-4 pb-4 ${
              theme === "light"
                ? "bg-white border-gray-200"
                : "bg-[#2a2a2a] border-white/10"
            }`}
          >
            <button
              onClick={() => {
                setShowAllUpcoming(true);
              }}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-6 rounded-lg text-lg transition duration-300"
            >
              Afficher plus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
