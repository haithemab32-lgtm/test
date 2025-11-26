import React from "react";
import { Match } from "./type";
import { isLiveMatch, isFinishedMatch } from "../../utils/matchTransformers";

interface MatchHeaderProps {
  match: Match;
}

const MatchHeader: React.FC<MatchHeaderProps> = ({ match }) => {
  // Utiliser les fonctions utilitaires importées

  return (
    <div className="flex items-center justify-between mb-4 p-2 bg-[#2a2a2a] rounded-lg shadow-md">
      <div className="flex items-center gap-6">
        <span className="text-sm text-gray-400">{match.id}</span>
        {isLiveMatch(match.status) && match.time && (
          <span className="bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full flex items-center">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            LIVE{" "}
            {match.time.elapsed !== null && match.time.elapsed !== undefined
              ? `${match.time.elapsed}'`
              : ""}
            {match.time.short && (
              <span className="ml-1 text-xs text-gray-200">
                ({match.time.short})
              </span>
            )}
          </span>
        )}
        <div className="flex items-center text-sm text-gray-400">
          <img
            src={`https://flagcdn.com/w20/${match.league.flag}.png`}
            alt={match.league.country}
            width={20}
            height={15}
            className="mr-2"
          />
          <span>
            {match.league.name} • {match.league.country}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MatchHeader;
