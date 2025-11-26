import { useEffect } from "react";
import { Match } from "../matchCard/type";
import MatchCard from "../matchCard/MatchCard";
import MarketHeaders from "../matchCard/MarketHeaders";
import SportNavigation from "../matchCard/SportNavigation";
import { groupMatchesByLeague } from "../../utils/matchGroupers";
import { useTheme } from "../../contexts/ThemeContext";

interface LiveMatchesSectionProps {
  matches: Match[];
  showAllLive: boolean;
  displayedLiveCount: number;
  onShowAll: () => void;
  hideLeagueInfo?: boolean;
  favoriteLeagues?: Set<string>;
  collapsedLeagues?: Set<string>;
  onToggleFavorite?: (leagueName: string) => void;
  onToggleCollapse?: (leagueName: string) => void;
  setCollapsedLeagues?: (leagues: Set<string>) => void;
  onMatchClick?: (matchId: number) => void;
}

/**
 * Composant pour afficher la section des matchs en direct
 */
export default function LiveMatchesSection({
  matches,
  showAllLive,
  displayedLiveCount,
  onShowAll,
  hideLeagueInfo = false,
  favoriteLeagues = new Set(),
  collapsedLeagues = new Set(),
  onToggleFavorite,
  onToggleCollapse,
  setCollapsedLeagues,
  onMatchClick,
}: LiveMatchesSectionProps) {
  const { theme } = useTheme();
  const matchesToShow = showAllLive ? matches.length : displayedLiveCount;
  const matchesSlice = matches.slice(0, matchesToShow);

  // Initialiser collapsedLeagues avec les ligues sauf les 3 premières quand on affiche tout
  useEffect(() => {
    if (showAllLive && setCollapsedLeagues && matches.length > 0) {
      // Utiliser tous les matchs pour le regroupement
      const grouped = groupMatchesByLeague(matches);
      const leagueNames = Object.keys(grouped);

      // Trier les ligues : favorites en premier, puis par ordre alphabétique
      const sortedLeagueNames = leagueNames.sort((a, b) => {
        const aIsFavorite = favoriteLeagues.has(a);
        const bIsFavorite = favoriteLeagues.has(b);

        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        return a.localeCompare(b);
      });

      // const firstThreeLeagues = sortedLeagueNames.slice(0, 3);
      const remainingLeagues = sortedLeagueNames.slice(3);

      // Initialiser seulement si collapsedLeagues est vide
      if (collapsedLeagues.size === 0 && remainingLeagues.length > 0) {
        setCollapsedLeagues(new Set(remainingLeagues));
      }
    }
  }, [
    showAllLive,
    matches.length,
    favoriteLeagues,
    collapsedLeagues,
    setCollapsedLeagues,
    matches,
  ]);

  // Ne rien afficher si pas de matchs
  if (matches.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={`text-yellow-400 font-bold text-xl px-4 py-2 mb-4 ${
          theme === "light" ? "bg-gray-900" : "bg-[#2a2a2a]"
        }`}
      >
        Match en direct
      </div>
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
            // Si on affiche tous les matchs, regrouper par ligue
            if (showAllLive) {
              // Utiliser tous les matchs, pas seulement le slice
              const groupedByLeague = groupMatchesByLeague(matches);

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

              return sortedLeagueEntries.map(([leagueName, leagueMatches]) => {
                // Prendre le premier match pour obtenir les infos de la ligue
                const firstMatch = leagueMatches[0];
                const leagueInfo =
                  typeof firstMatch.league === "string"
                    ? {
                        name: firstMatch.league,
                        country: "",
                        flag: "",
                      }
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
                      onClick={() => onToggleCollapse?.(leagueName)}
                    >
                      <div className="flex items-center gap-3">
                        {onToggleFavorite && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(leagueName);
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
                        )}
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
                            theme === "light"
                              ? "text-gray-400"
                              : "text-gray-300"
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
                      <div className="space-y-px">
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
                      </div>
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
                <MatchCard
                  match={match}
                  hideLeagueInfo={hideLeagueInfo}
                  onMatchClick={onMatchClick}
                />
              </div>
            ));
          })()}
          {matches.length > displayedLiveCount && !showAllLive && (
            <div
              className={`border-t pt-4 pb-4 ${
                theme === "light"
                  ? "bg-white border-gray-200"
                  : "bg-[#2a2a2a] border-white/10"
              }`}
            >
              <button
                onClick={onShowAll}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-6 rounded-lg text-lg transition duration-300"
              >
                Afficher plus
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
