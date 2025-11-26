import React from "react";
import OddsButton from "./matchCard/OddsButton";
import { Match } from "./matchCard/type";
import { validateOdd } from "../utils/matchTransformers";

interface MatchTableProps {
  matches: Match[];
}

const MatchTable: React.FC<MatchTableProps> = ({ matches }) => {
  const marketHeaders = [
    { key: "_1x2", label: "1x2" },
    { key: "doubleChance", label: "Double Chance" },
    { key: "totalGoals", label: "Total Goals" },
    { key: "ggNg", label: "Both Teams Score" },
    { key: "pairImpaire", label: "Pair/Impaire" },
  ];

  return (
    <div className="w-full bg-[#1c1c1c] text-white rounded-xl shadow-lg border border-gray-800 overflow-hidden">
      {/* Header des marchés */}
      <div className="grid grid-cols-[300px_repeat(5,1fr)] border-b border-gray-700 bg-[#222] text-center text-sm font-semibold">
        <div className="p-3 text-left text-gray-300">Match</div>
        {marketHeaders.map((market) => (
          <div key={market.key} className="p-3 text-gray-200">
            {market.label}
          </div>
        ))}
      </div>

      {/* Liste des matchs */}
      {matches.map((match) => (
        <div
          key={match.id}
          className="grid grid-cols-[300px_repeat(5,1fr)] items-center border-b border-gray-800 hover:bg-[#2a2a2a] transition-colors"
        >
          {/* Bloc infos du match */}
          <div className="p-3 flex flex-col gap-1">
            {/* Ligne du haut : id, live badge, temps, ligue */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-300">#{match.id}</span>
                {match.status === "LIVE" && match.time && (
                  <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    {match.time.elapsed}'
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {typeof match.league === "object" && match.league.flag && (
                  <img
                    src={`https://flagcdn.com/w20/${match.league.flag}.png`}
                    alt={
                      typeof match.league === "object"
                        ? match.league.country
                        : ""
                    }
                    width={14}
                    height={10}
                  />
                )}
                <span className="truncate max-w-[120px]">
                  {typeof match.league === "object"
                    ? match.league.name
                    : match.league}
                </span>
              </div>
            </div>

            {/* Ligne du bas : équipes + score */}
            <div className="text-sm mt-1">
              <div className="flex justify-between">
                <span className="truncate">{match.homeTeam.name}</span>
                <span className="text-yellow-400 ml-2">
                  {match.homeTeam.score}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="truncate">{match.awayTeam.name}</span>
                <span className="text-yellow-400 ml-2">
                  {match.awayTeam.score}
                </span>
              </div>
            </div>
          </div>

          {/* Odds des marchés */}
          {marketHeaders.map((market) => {
            const odds =
              match.odds && match.odds[market.key as keyof typeof match.odds];

            return (
              <div
                key={market.key}
                className="p-2 flex items-center justify-center gap-1"
              >
                {odds ? (
                  Object.entries(odds).map(([label, value], index) => (
                    <div key={index} className="flex flex-col items-center">
                      <OddsButton
                        value={validateOdd(
                          value as number | string | null | undefined
                        )}
                      />
                      <span className="text-[10px] text-gray-400">{label}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500 text-xs">–</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default MatchTable;
