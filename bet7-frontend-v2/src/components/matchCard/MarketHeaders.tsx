import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

const MarketHeaders: React.FC = () => {
  const { theme } = useTheme();
  const marketHeaders = [
    { key: "_1x2", label: "1x2" },
    { key: "doubleChance", label: "Double Chance" },
    { key: "totalGoals", label: "Total Goals" },
    { key: "ggNg", label: "Both Teams Score" },
    { key: "pairImpaire", label: "Pair/Impaire" },
  ];

  return (
    <div
      className={`border-b px-3 py-2 ${
        theme === "light"
          ? "bg-white border-gray-200"
          : "bg-[#2a2a2a] border-gray-700"
      }`}
    >
      <div className="flex items-center justify-end gap-2">
        {/* Espace pour l'ID du match (aligné avec MatchCard) */}
        <div className="w-10 flex-shrink-0"></div>

        {/* Espace pour le contenu principal (aligné avec MatchCard) */}
        <div className="flex-1 ml-5 mr-4"></div>

        {/* En-têtes des marchés alignés avec les cotes */}
        <div className="flex gap-0.5 flex-shrink-0">
          {marketHeaders.map((market) => {
            // Calcul de la largeur selon le type de marché - DOIT ÊTRE IDENTIQUE À MatchCard
            let width = "w-[75px] min-w-[60px] max-w-[75px]";
            if (market.key === "_1x2" || market.key === "doubleChance") {
              // 3 boutons × 50px + 2 gaps × 2px = ~154px (réduit de 218px)
              width = "w-[154px] min-w-[120px] max-w-[154px]";
            } else if (market.key === "totalGoals") {
              // Sélecteur (50px) + gap (4px) + Over (45px) + gap (4px) + Under (45px) = ~148px (réduit de 200px)
              width = "w-[148px] min-w-[120px] max-w-[148px]";
            } else if (market.key === "ggNg" || market.key === "pairImpaire") {
              // 2 boutons × 50px + 1 gap × 2px = ~102px (réduit de 144px)
              width = "w-[102px] min-w-[80px] max-w-[102px]";
            }
            return (
              <div key={market.key} className={`${width} text-center`}>
                <span
                  className={`px-1 py-0.5 rounded text-[10px] font-semibold capitalize w-full block text-center ${
                    theme === "light"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-gray-700 text-white"
                  }`}
                >
                  {market.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Espace pour le bouton + (aligné avec MatchCard) */}
        <div className="w-[28px] flex-shrink-0"></div>
      </div>
    </div>
  );
};

export default MarketHeaders;
