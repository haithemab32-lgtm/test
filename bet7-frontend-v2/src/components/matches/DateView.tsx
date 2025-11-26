import { Match } from "../matchCard/type";
import MatchCard from "../matchCard/MatchCard";
import MarketHeaders from "../matchCard/MarketHeaders";
import SportNavigation from "../matchCard/SportNavigation";
import { groupMatchesByLeague } from "../../utils/matchGroupers";
import { formatFullDate } from "../../utils/dateFormatters";

interface DateViewProps {
  date: string;
  matches: Match[];
  loading: boolean;
  onBack: () => void;
  favoriteLeagues: Set<string>;
  collapsedLeagues: Set<string>;
  onToggleFavorite: (leagueName: string) => void;
  onToggleCollapse: (leagueName: string) => void;
  isMobile?: boolean;
  onMatchClick?: (matchId: number) => void;
}

/**
 * Composant pour afficher les matchs d'une date spécifique, groupés par ligue
 */
export default function DateView({
  date,
  matches,
  loading,
  onBack,
  favoriteLeagues,
  collapsedLeagues,
  onToggleFavorite,
  onToggleCollapse,
  isMobile = false,
  onMatchClick,
}: DateViewProps) {
  const formattedDate = formatFullDate(date);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-yellow-400 text-lg">Chargement des matchs...</div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-lg">
          Aucun match disponible pour cette date
        </div>
      </div>
    );
  }

  const groupedByLeague = groupMatchesByLeague(matches);
  const sortedLeagues = Object.entries(groupedByLeague).sort(([a], [b]) => {
    const aIsFavorite = favoriteLeagues.has(a);
    const bIsFavorite = favoriteLeagues.has(b);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return a.localeCompare(b);
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">{formattedDate}</h1>
        <button
          onClick={onBack}
          className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-4 py-2 rounded-lg text-sm transition duration-300"
        >
          ← Retour
        </button>
      </div>

      {!isMobile && (
        <div className="bg-[#2a2a2a]">
          <SportNavigation />
          <div className="hidden desktop:block">
            <MarketHeaders />
          </div>
        </div>
      )}

      <div className={isMobile ? "space-y-2" : "bg-[#2a2a2a] space-y-2"}>
        {sortedLeagues.map(([leagueName, leagueMatches]) => {
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
          const isCollapsed = collapsedLeagues.has(leagueName);

          return (
            <div key={leagueName}>
              <div
                className="bg-[#2e2e2e] text-white font-bold text-sm px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#333333] transition-colors"
                onClick={() => onToggleCollapse(leagueName)}
              >
                <div className="flex items-center gap-3">
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
                  <span className="text-gray-300">-</span>
                  <span>{leagueInfo.name}</span>
                </div>
                <div className="text-yellow-400">
                  {isCollapsed ? (
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
              {!isCollapsed && (
                <>
                  {leagueMatches.map((match, index) => (
                    <div
                      key={`${match.id}-${index}`}
                      className="bg-[#2a2a2a] border-b border-white/10"
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
        })}
      </div>
    </>
  );
}
