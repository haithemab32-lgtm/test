import React, { useState } from "react";
import MatchHeader from "./MatchHeader";
import MatchScore from "./MatchScore";
import OddsMarket from "./OddsMarket";
import { Match } from "./type";
import { validateOdd } from "../../utils/matchTransformers";

interface MatchCardProps {
  match: Match;
}

const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const [showMoreMarkets, setShowMoreMarkets] = useState(false);

  // Marchés par défaut (toujours affichés)
  const defaultMarkets = [
    { key: "_1x2", label: "1x2" },
    { key: "doubleChance", label: "Double Chance" },
    { key: "totalGoals", label: "Total Goals" },
    { key: "ggNg", label: "Both Teams Score" },
    { key: "pairImpaire", label: "Pair/Impaire" },
  ];

  // Marchés pour mobile (seulement 1x2)
  const mobileMarkets = [{ key: "_1x2", label: "1x2" }];

  // Récupérer tous les marchés depuis match.odds
  const allMarkets = Object.keys(match.odds || {}).map((key) => {
    const keyStr = String(key);
    return {
      key: keyStr,
      label: keyStr.replace(/([A-Z])/g, " $1").trim(),
    };
  });

  // Marchés supplémentaires (affichés avec le bouton "plus")
  const additionalMarkets = allMarkets.filter(
    (market) =>
      !defaultMarkets.some((defaultMarket) => defaultMarket.key === market.key)
  );

  return (
    <div className="bg-[#2a2a2a] rounded-lg shadow-lg p-4 mb-4 border border-gray-800 w-full">
      <MatchHeader match={match} />
      <div className="flex flex-col desktop:flex-row text-white desktop:ml-4 text-sm mb-4 desktop:gap-80 gap-4">
        {/* Score du match */}
        <div className="flex items-center justify-center desktop:justify-start">
          <MatchScore match={match} />
        </div>

        {/* Section des marchés par défaut sur la même ligne */}
        <div className="flex flex-wrap justify-center desktop:justify-end gap-2">
          {/* Marchés pour mobile (seulement 1x2) */}
          <div className="flex desktop:hidden gap-2">
            {mobileMarkets.map((market) => (
              <div key={market.key} className="flex flex-col items-center">
                <div className="w-full mb-2">
                  <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-semibold capitalize w-full block text-center">
                    {market.label}
                  </span>
                </div>
                <OddsMarket
                  marketName={market.label}
                  oddsData={match.odds[market.key as keyof typeof match.odds]}
                  rawMarkets={match.rawMarkets}
                />
              </div>
            ))}
          </div>

          {/* Marchés pour desktop (tous les marchés par défaut) */}
          <div className="hidden desktop:flex gap-2">
            {defaultMarkets.map((market) => (
              <div key={market.key} className="flex flex-col items-center">
                <div className="w-full mb-2">
                  <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-semibold capitalize w-full block text-center">
                    {market.label}
                  </span>
                </div>
                <OddsMarket
                  marketName={market.label}
                  oddsData={match.odds[market.key as keyof typeof match.odds]}
                  rawMarkets={match.rawMarkets}
                />
              </div>
            ))}
          </div>

          {/* Bouton "Plus de marchés" sur la même ligne */}
          <button
            onClick={() => setShowMoreMarkets(!showMoreMarkets)}
            className={`px-3 py-2 rounded-md flex items-center justify-center transition-colors ${
              showMoreMarkets
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-yellow-400 text-black hover:bg-yellow-300"
            }`}
          >
            {showMoreMarkets ? "−" : "+"}
          </button>
        </div>
      </div>

      {/* Div pour tous les marchés (format collapsible) */}
      {showMoreMarkets && (
        <div className="mt-4 bg-gray-800 rounded-lg shadow-inner">
          {/* En-tête avec onglets */}
          <div className="flex flex-wrap gap-2 p-4 border-b border-gray-700">
            <button className="bg-red-500 text-white px-3 py-1 rounded text-sm font-semibold">
              ALL
            </button>
            <button className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-600">
              MY MARKETS
            </button>
            <button className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-600">
              MAIN
            </button>
            <button className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-600">
              POPULAR
            </button>
            <button className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-600">
              1ST HALF
            </button>
            <button className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-600">
              2ND HALF
            </button>
            <button className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-600">
              TEAMS
            </button>
            <button className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-600">
              CORRECT SCORE
            </button>
          </div>

          {/* Tous les marchés en format collapsible */}
          <div className="p-4 space-y-3">
            {allMarkets.map((market) => (
              <div
                key={market.key}
                className="bg-gray-900 rounded-lg overflow-hidden"
              >
                {/* En-tête du marché */}
                <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-white">☆</span>
                    <span className="text-white font-medium">
                      {market.label}
                    </span>
                  </div>
                  <button className="text-gray-400 hover:text-white">
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
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Contenu du marché */}
                <div className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(
                      match.odds[market.key as keyof typeof match.odds] || {}
                    ).map(([label, value], index) => {
                      const validatedValue = validateOdd(value);
                      return (
                        <div
                          key={index}
                          className="bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-600 cursor-pointer"
                        >
                          {label}:{" "}
                          {validatedValue === "locked"
                            ? "🔒"
                            : String(validatedValue)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchCard;
