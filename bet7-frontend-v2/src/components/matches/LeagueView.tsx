import { Match } from "../matchCard/type";
import MatchCard from "../matchCard/MatchCard";
import MarketHeaders from "../matchCard/MarketHeaders";
import SportNavigation from "../matchCard/SportNavigation";
import { groupMatchesByDay } from "../../utils/matchGroupers";
import { isLiveMatch, isFinishedMatch } from "../../utils/matchTransformers";

interface LeagueViewProps {
  leagueName: string;
  matches: Match[];
  loading: boolean;
  onBack: () => void;
  isMobile?: boolean;
  onMatchClick?: (matchId: number) => void;
}

/**
 * Composant pour afficher les matchs d'une ligue spécifique, groupés par jour
 */
export default function LeagueView({
  leagueName,
  matches,
  loading,
  onBack,
  isMobile = false,
  onMatchClick,
}: LeagueViewProps) {
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
          Aucun match disponible pour cette ligue
        </div>
      </div>
    );
  }

  // Séparer les matchs live, terminés et à venir
  const liveMatches = matches.filter((match) => isLiveMatch(match.status));
  const finishedMatches = matches.filter((match) =>
    isFinishedMatch(match.status)
  );
  const upcomingMatches = matches.filter(
    (match) => !isLiveMatch(match.status) && !isFinishedMatch(match.status)
  );

  const groupedByDay = groupMatchesByDay(upcomingMatches);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">{leagueName}</h1>
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

      <div className={isMobile ? "space-y-6" : "bg-[#2a2a2a] space-y-6"}>
        {/* Section Match en direct */}
        {liveMatches.length > 0 && (
          <div className={isMobile ? "space-y-2" : "space-y-px"}>
            <div
              className={`${
                isMobile ? "bg-[#2a2a2a]" : ""
              } text-yellow-400 font-bold text-lg px-4 py-2 mb-2`}
            >
              Match en direct
            </div>
            <div className="space-y-px">
              {liveMatches.map((match, index) => (
                <div
                  key={`${match.id}-${index}`}
                  className="bg-[#2a2a2a] border-b border-white/10"
                >
                  <MatchCard match={match} onMatchClick={onMatchClick} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section Match terminés */}
        {finishedMatches.length > 0 && (
          <div className={isMobile ? "space-y-2" : "space-y-px"}>
            <div
              className={`${
                isMobile ? "bg-[#2a2a2a]" : ""
              } text-gray-400 font-bold text-lg px-4 py-2 mb-2`}
            >
              Matchs terminés
            </div>
            <div className="space-y-px">
              {finishedMatches.map((match, index) => (
                <div
                  key={`${match.id}-${index}`}
                  className="bg-[#2a2a2a] border-b border-white/10 opacity-75"
                >
                  <MatchCard match={match} onMatchClick={onMatchClick} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section Match à venir groupés par jour */}
        {Object.entries(groupedByDay).map(([date, dayMatches]) => (
          <div key={date} className={isMobile ? "space-y-2" : "space-y-px"}>
            <div
              className={`${
                isMobile ? "bg-[#2a2a2a]" : ""
              } text-yellow-400 font-bold text-lg px-4 py-2 mb-2`}
            >
              {date}
            </div>
            <div className="space-y-px">
              {dayMatches.map((match, index) => (
                <div
                  key={`${match.id}-${index}`}
                  className="bg-[#2a2a2a] border-b border-white/10"
                >
                  <MatchCard match={match} onMatchClick={onMatchClick} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
