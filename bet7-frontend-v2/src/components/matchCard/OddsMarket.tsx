import React, { useState, useMemo, useEffect } from "react";
import OddsButton from "./OddsButton";
import { useTheme } from "../../contexts/ThemeContext";
import { useBetSlip } from "../../contexts/BetSlipContext";
import { Bet } from "../../types/betslip";
import { betslipLogger } from "../../utils/betslipLogger";
import { validateOdd } from "../../utils/matchTransformers";

interface OddsMarketProps {
  marketName: string;
  oddsData: Record<string, number | string> | null;
  rawMarkets?: any[];
  isMobile?: boolean;
  oddsChanges?: Record<string, Record<string, "up" | "down">>;
  isLive?: boolean; // Indique si le match est en direct
  fixtureId?: number; // ID du match pour le BetSlip
  homeTeam?: string; // Nom de l'équipe à domicile
  awayTeam?: string; // Nom de l'équipe à l'extérieur
  leagueName?: string; // Nom de la ligue
}

const OddsMarket: React.FC<OddsMarketProps> = ({
  marketName,
  oddsData,
  rawMarkets,
  isMobile = false,
  oddsChanges,
  isLive = false,
  fixtureId,
  homeTeam,
  awayTeam,
  leagueName,
}) => {
  const { theme } = useTheme();
  const { addBet, isBetInSlip } = useBetSlip();

  // Mapper le nom du marché interne vers le nom de l'API
  // IMPORTANT: Ces noms doivent correspondre exactement à ce que le backend attend
  const marketNameMapping: Record<string, string> = {
    _1x2: "Match Winner",
    "1x2": "Match Winner",
    doubleChance: "Double Chance",
    totalGoals: isLive ? "Over/Under Line" : "Goals Over/Under",
    ggNg: "Both Teams To Score",
    pairImpaire: "Odd/Even",
  };

  // Fonction pour créer un Bet à partir des informations disponibles
  const createBet = (
    market: string,
    selection: string,
    odd: number,
    handicap?: string | null
  ): Bet | null => {
    betslipLogger.log("🔧 Création du bet avec:", {
      fixtureId,
      market,
      selection,
      odd,
      handicap,
      homeTeam,
      awayTeam,
      leagueName,
    });
    if (!fixtureId || !homeTeam || !awayTeam) {
      betslipLogger.warn("Données manquantes:", {
        fixtureId,
        homeTeam,
        awayTeam,
      });
      return null;
    }

    // Mapper la sélection interne vers le format de l'API
    const selectionMapping: Record<string, string> = {
      _1: "Home",
      X: "Draw",
      _2: "Away",
      _1X: "1X",
      _12: "12",
      X2: "X2",
      GG: "Yes",
      NG: "No",
      Pair: "Even",
      Impaire: "Odd",
    };

    const apiMarket = marketNameMapping[market] || market;
    const apiSelection = selectionMapping[selection] || selection;

    // Pour Over/Under, utiliser "Over" ou "Under"
    let finalSelection = apiSelection;
    if (market === "totalGoals") {
      if (selection.toLowerCase().includes("over")) {
        finalSelection = "Over";
      } else if (selection.toLowerCase().includes("under")) {
        finalSelection = "Under";
      }
    }

    return {
      fixtureId,
      market: apiMarket,
      selection: finalSelection,
      odd: typeof odd === "number" ? odd : parseFloat(String(odd)) || 0,
      handicap: handicap || null,
      homeTeam,
      awayTeam,
      leagueName: leagueName || "",
    };
  };

  // Fonction helper pour mapper les labels (Home -> 1, Draw -> X, Away -> 2, etc.)
  const getChangeDirection = (
    market: string,
    label: string
  ): "up" | "down" | undefined => {
    if (!oddsChanges) return undefined;

    // Mapper les noms de marchés affichés vers les clés internes utilisées dans App.tsx
    // Dans App.tsx, on stocke dans match.oddsChanges[marketKey][label]
    // où marketKey = "_1x2", "doubleChance", "totalGoals", "ggNg", "pairImpaire"
    const marketNameToKeyMap: Record<string, string> = {
      "1x2": "_1x2",
      "Match Winner": "_1x2",
      "Fulltime Result": "_1x2",
      "Double Chance": "doubleChance",
      "Goals Over/Under": "totalGoals",
      "Total Goals": "totalGoals",
      "Match Goals": "totalGoals",
      "Over/Under Line": "totalGoals",
      "Both Teams Score": "ggNg",
      "Both Teams To Score": "ggNg",
      "GG/NG": "ggNg",
      "Odd/Even": "pairImpaire",
      "Goals Odd/Even": "pairImpaire",
      "Pair/Impaire": "pairImpaire",
    };

    // Trouver la clé interne du marché
    // Si market commence par "_", c'est déjà une clé interne
    const marketKey = market.startsWith("_")
      ? market
      : marketNameToKeyMap[market] || market;

    // Si le marché n'existe pas dans oddsChanges, retourner undefined
    if (!oddsChanges[marketKey]) {
      return undefined;
    }

    const marketChanges = oddsChanges[marketKey];

    // Mapper les labels pour correspondre aux formats utilisés dans App.tsx
    // Dans App.tsx, on utilise: _1, X, _2, _1X, _12, X2, GG, NG, Pair, Impaire
    const labelMap: Record<string, string[]> = {
      _1: ["Home", "1", "_1", "Home Team"],
      X: ["Draw", "X", "Tie"],
      _2: ["Away", "2", "_2", "Away Team"],
      _1X: ["1X", "Home Draw", "Home/Draw", "1 X", "Home or Draw"],
      _12: ["12", "Home Away", "Home/Away", "1 2", "Home or Away"],
      X2: ["X2", "Draw Away", "Draw/Away", "X 2", "Draw or Away"],
      GG: ["Yes", "GG", "Both Teams To Score"],
      NG: ["No", "NG", "Not Both Teams To Score"],
      Pair: ["Even", "Pair", "Even Goals"],
      Impaire: ["Odd", "Impaire", "Odd Goals"],
    };

    // Chercher dans les labels mappés
    for (const [key, variations] of Object.entries(labelMap)) {
      if (variations.some((v) => v.toLowerCase() === label.toLowerCase())) {
        const change = marketChanges[key];
        if (change) {
          return change;
        }
      }
    }

    // Chercher directement avec le label exact (pour les cas comme "over_2.5", "under_2.5")
    if (marketChanges[label]) {
      return marketChanges[label];
    }

    // Pour totalGoals, essayer de construire le label depuis le format du socket
    // Le socket peut envoyer "Over 2.5" ou "Over/2.5" mais App.tsx stocke "over_2.5"
    if (marketKey === "totalGoals") {
      const labelLower = label.toLowerCase();
      // Extraire le numéro de ligne si présent
      const lineMatch = labelLower.match(/(\d+\.?\d*)/);
      if (lineMatch) {
        const line = lineMatch[1];
        // Essayer "over_X" et "under_X"
        if (labelLower.includes("over")) {
          const overLabel = `over_${line}`;
          if (marketChanges[overLabel]) {
            return marketChanges[overLabel] as "up" | "down";
          }
        }
        if (labelLower.includes("under")) {
          const underLabel = `under_${line}`;
          if (marketChanges[underLabel]) {
            return marketChanges[underLabel] as "up" | "down";
          }
        }
      }
    }

    // Chercher de manière insensible à la casse
    const labelLower = label.toLowerCase();
    for (const [key, value] of Object.entries(marketChanges)) {
      if (key.toLowerCase() === labelLower) {
        return value as "up" | "down";
      }
    }

    return undefined;
  };

  // 🔍 Trouve le marché des buts
  // Pour les matchs live, utiliser UNIQUEMENT "Over/Under Line"
  // Pour les matchs à venir, utiliser n'importe quel marché disponible
  const goalsMarket = useMemo(() => {
    if (!rawMarkets || !Array.isArray(rawMarkets)) return null;

    if (isLive) {
      // Pour les matchs live : chercher uniquement "Over/Under Line"
      return (
        rawMarkets.find(
          (m) =>
            m.market === "Over/Under Line" ||
            m.market === "Over/Under Line (1st Half)" ||
            m.name === "Over/Under Line" ||
            m.name === "Over/Under Line (1st Half)"
        ) || null
      );
    } else {
      // Pour les matchs à venir : utiliser n'importe quel marché disponible
      return (
        rawMarkets.find(
          (m) =>
            m.market?.toLowerCase().includes("over/under") ||
            m.market?.toLowerCase().includes("total goals") ||
            m.name?.toLowerCase().includes("over/under") ||
            m.name?.toLowerCase().includes("total goals")
        ) || null
      );
    }
  }, [rawMarkets, isLive]);

  // 🧮 Extrait toutes les valeurs disponibles (handicaps/lignes)
  const availableValues = useMemo<string[]>(() => {
    if (!goalsMarket?.values) return [];
    const values = [
      ...new Set(
        goalsMarket.values
          .map((v: any) => {
            // Utiliser directement le champ handicap si disponible
            if (v.handicap) {
              return String(v.handicap);
            }
            // Fallback: extraire depuis le label si pas de handicap
            const label = String(v.label || v.value || "").toLowerCase();
            const overMatch = label.match(/over\s*\/?\s*([\d.]+)/);
            const underMatch = label.match(/under\s*\/?\s*([\d.]+)/);
            return overMatch ? overMatch[1] : underMatch ? underMatch[1] : null;
          })
          .filter(Boolean)
      ),
    ].sort((a, b) => parseFloat(String(a)) - parseFloat(String(b)));
    return values as string[];
  }, [goalsMarket]);

  // 🧱 Trouver le marché correspondant dans rawMarkets
  const rawMarket = useMemo(() => {
    if (!rawMarkets || !Array.isArray(rawMarkets)) return null;
    // Mapping des clés internes vers les noms de marchés
    // Pour Total Goals en live, utiliser "Over/Under Line"
    const marketNameMapping: Record<string, string[]> = {
      _1x2: ["Match Winner", "Fulltime Result", "1x2"],
      doubleChance: ["Double Chance"],
      totalGoals: isLive
        ? ["Over/Under Line", "Over/Under Line (1st Half)"]
        : ["Goals Over/Under", "Total Goals", "Match Goals"],
      ggNg: ["Both Teams To Score", "Both Teams Score", "GG/NG"],
      pairImpaire: ["Odd/Even", "Goals Odd/Even", "Pair/Impaire"],
    };
    // Chercher avec les noms de marchés mappés ou le marketName original
    const searchNames = marketNameMapping[marketName] || [marketName];

    // Pour Total Goals en live, chercher uniquement "Over/Under Line"
    if (marketName === "totalGoals" && isLive) {
      return (
        rawMarkets.find(
          (market: any) =>
            market.market === "Over/Under Line" ||
            market.market === "Over/Under Line (1st Half)" ||
            market.name === "Over/Under Line" ||
            market.name === "Over/Under Line (1st Half)"
        ) || null
      );
    }

    return rawMarkets.find(
      (market: any) =>
        searchNames.includes(market.market) ||
        searchNames.includes(market.name) ||
        market.market === marketName ||
        market.name === marketName ||
        market.market?.toLowerCase() === marketName.toLowerCase() ||
        market.name?.toLowerCase() === marketName.toLowerCase()
    );
  }, [rawMarkets, marketName, isLive]);

  // Utiliser rawMarkets si disponible, sinon oddsData
  const marketData = rawMarket ? rawMarket.values : oddsData;

  // Ne pas retourner null si oddsData existe (même s'il contient "locked")
  // Cela permet d'afficher les cotes "locked" pour les matchs à venir
  if (!marketData && !oddsData) {
    return null;
  }

  // ⚽ Affichage pour le marché Total Goals et tous les marchés "Over/Under Line"
  const isGoalsMarket =
    marketName.toLowerCase() === "total goals" ||
    marketName.toLowerCase() === "totalgoals" ||
    marketName === "totalGoals" || // Format camelCase
    marketName.toLowerCase().includes("over/under") ||
    marketName.toLowerCase() === "goals over/under" ||
    (rawMarket &&
      rawMarket.market &&
      rawMarket.market.startsWith("Over/Under Line"));

  // Vérifier si oddsData contient les totalGoals au format { value, over, under, allLines? }
  const totalGoalsFromOddsData = useMemo(() => {
    if (
      oddsData &&
      typeof oddsData === "object" &&
      "value" in oddsData &&
      "over" in oddsData &&
      "under" in oddsData
    ) {
      const result = oddsData as unknown as {
        value: string;
        over: number | string;
        under: number | string;
        allLines?: Record<
          string,
          { over: number | string; under: number | string }
        >;
      };

      return result;
    }
    return null;
  }, [oddsData, marketName]);

  // État pour la ligne sélectionnée dans totalGoals
  const [selectedTotalGoalsLine, setSelectedTotalGoalsLine] =
    useState<string>("2.5");

  // Initialiser avec la valeur par défaut
  useEffect(() => {
    if (totalGoalsFromOddsData) {
      setSelectedTotalGoalsLine(totalGoalsFromOddsData.value || "2.5");
    }
  }, [totalGoalsFromOddsData]);

  // Obtenir les lignes disponibles et les cotes pour la ligne sélectionnée
  const totalGoalsLines = useMemo(() => {
    if (totalGoalsFromOddsData?.allLines) {
      return totalGoalsFromOddsData.allLines;
    }
    return null;
  }, [totalGoalsFromOddsData, marketName]);

  // Obtenir les cotes pour la ligne sélectionnée
  const currentTotalGoalsOdds = useMemo(() => {
    if (totalGoalsLines && selectedTotalGoalsLine in totalGoalsLines) {
      return totalGoalsLines[selectedTotalGoalsLine];
    }
    // Fallback sur les valeurs par défaut
    if (totalGoalsFromOddsData) {
      return {
        over: totalGoalsFromOddsData.over,
        under: totalGoalsFromOddsData.under,
      };
    }
    return { over: "locked", under: "locked" };
  }, [totalGoalsLines, selectedTotalGoalsLine, totalGoalsFromOddsData]);

  if (isGoalsMarket) {
    // Si on a les données depuis oddsData directement (format transformé avec allLines)
    if (totalGoalsFromOddsData) {
      // Trier les lignes disponibles pour l'affichage
      const sortedLines = totalGoalsLines
        ? Object.keys(totalGoalsLines).sort((a, b) => {
            const numA = parseFloat(a) || 0;
            const numB = parseFloat(b) || 0;
            return numA - numB;
          })
        : [];

      // Toujours afficher le sélecteur si on a plusieurs lignes, sinon afficher la valeur
      return (
        <div
          className="odds-market w-full flex items-center gap-1 justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {sortedLines.length > 0 ? (
            <select
              value={selectedTotalGoalsLine}
              onChange={(e) => {
                e.stopPropagation();
                setSelectedTotalGoalsLine(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className={`w-12 text-[9px] px-1 py-0.5 rounded border focus:border-yellow-400 focus:outline-none ${
                theme === "light"
                  ? "bg-gray-100 text-gray-800 border-gray-300"
                  : "bg-gray-700 text-white border-gray-600"
              }`}
            >
              {sortedLines.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>
          ) : (
            <div
              className={`w-12 text-[9px] px-1 py-0.5 rounded border flex items-center justify-center ${
                theme === "light"
                  ? "bg-gray-100 text-gray-800 border-gray-300"
                  : "bg-gray-700 text-white border-gray-600"
              }`}
            >
              {totalGoalsFromOddsData.value || "2.5"}
            </div>
          )}
          <div className="flex flex-col items-center min-w-[42px]">
            <span
              className={`text-[8px] mb-0.5 font-medium ${
                theme === "light" ? "text-gray-600" : "text-gray-300"
              }`}
            >
              Over
            </span>
            <OddsButton
              value={validateOdd(currentTotalGoalsOdds.over)}
              changeDirection={
                // Pour les matchs live, utiliser "Over/Under Line"
                (isLive
                  ? getChangeDirection(
                      "Over/Under Line",
                      `over_${selectedTotalGoalsLine}`
                    )
                  : null) ||
                getChangeDirection(
                  "Goals Over/Under",
                  `over_${selectedTotalGoalsLine}`
                ) ||
                getChangeDirection(
                  "Total Goals",
                  `over_${selectedTotalGoalsLine}`
                ) ||
                (isLive
                  ? getChangeDirection("Over/Under Line", "Over")
                  : null) ||
                getChangeDirection("Goals Over/Under", "Over") ||
                getChangeDirection("Total Goals", "Over")
              }
              onClick={() => {
                betslipLogger.click({
                  fixtureId,
                  marketName,
                  selection: "Over",
                  line: selectedTotalGoalsLine,
                  odd: currentTotalGoalsOdds.over,
                });
                if (
                  fixtureId &&
                  currentTotalGoalsOdds.over !== "locked" &&
                  currentTotalGoalsOdds.over !== null
                ) {
                  const bet = createBet(
                    marketName,
                    "Over",
                    typeof currentTotalGoalsOdds.over === "number"
                      ? currentTotalGoalsOdds.over
                      : parseFloat(String(currentTotalGoalsOdds.over)) || 0,
                    selectedTotalGoalsLine
                  );
                  if (bet) {
                    betslipLogger.betCreated(bet);
                    addBet(bet);
                  } else {
                    betslipLogger.warn("Bet Over non créé");
                  }
                } else {
                  betslipLogger.warn("Impossible d'ajouter Over", {
                    fixtureId,
                    odd: currentTotalGoalsOdds.over,
                  });
                }
              }}
              isSelected={
                fixtureId
                  ? isBetInSlip(fixtureId, "Over/Under Line", "Over")
                  : false
              }
            />
          </div>
          <div className="flex flex-col items-center min-w-[42px]">
            <span
              className={`text-[8px] mb-0.5 font-medium ${
                theme === "light" ? "text-gray-600" : "text-gray-300"
              }`}
            >
              Under
            </span>
            <OddsButton
              value={validateOdd(currentTotalGoalsOdds.under)}
              changeDirection={
                // Pour les matchs live, utiliser "Over/Under Line"
                (isLive
                  ? getChangeDirection(
                      "Over/Under Line",
                      `under_${selectedTotalGoalsLine}`
                    )
                  : null) ||
                getChangeDirection(
                  "Goals Over/Under",
                  `under_${selectedTotalGoalsLine}`
                ) ||
                getChangeDirection(
                  "Total Goals",
                  `under_${selectedTotalGoalsLine}`
                ) ||
                (isLive
                  ? getChangeDirection("Over/Under Line", "Under")
                  : null) ||
                getChangeDirection("Goals Over/Under", "Under") ||
                getChangeDirection("Total Goals", "Under")
              }
              onClick={() => {
                betslipLogger.click({
                  fixtureId,
                  marketName,
                  selection: "Under",
                  line: selectedTotalGoalsLine,
                  odd: currentTotalGoalsOdds.under,
                });
                if (
                  fixtureId &&
                  currentTotalGoalsOdds.under !== "locked" &&
                  currentTotalGoalsOdds.under !== null
                ) {
                  const bet = createBet(
                    marketName,
                    "Under",
                    typeof currentTotalGoalsOdds.under === "number"
                      ? currentTotalGoalsOdds.under
                      : parseFloat(String(currentTotalGoalsOdds.under)) || 0,
                    selectedTotalGoalsLine
                  );
                  if (bet) {
                    betslipLogger.betCreated(bet);
                    addBet(bet);
                  } else {
                    betslipLogger.warn("Bet Under non créé");
                  }
                } else {
                  betslipLogger.warn("Impossible d'ajouter Under", {
                    fixtureId,
                    odd: currentTotalGoalsOdds.under,
                  });
                }
              }}
              isSelected={
                fixtureId
                  ? isBetInSlip(fixtureId, "Over/Under Line", "Under")
                  : false
              }
            />
          </div>
        </div>
      );
    }

    // Sinon, utiliser rawMarkets si disponible (format original)
    if (goalsMarket && availableValues.length > 0) {
      // Grouper par ligne pour afficher toutes les lignes avec leurs cotes
      const linesMap: Record<
        string,
        { over?: string | number; under?: string | number }
      > = {};

      goalsMarket.values.forEach((v: any) => {
        // Utiliser directement le champ handicap si disponible
        const handicap = v.handicap ? String(v.handicap) : null;

        // Si pas de handicap, essayer d'extraire depuis le label (fallback)
        let line: string | null = handicap;
        if (!line) {
          const label = String(v.label || v.value || "").toLowerCase();
          const overMatch = label.match(/over\s*\/?\s*([\d.]+)/);
          const underMatch = label.match(/under\s*\/?\s*([\d.]+)/);
          line = overMatch ? overMatch[1] : underMatch ? underMatch[1] : null;
        }

        if (!line) return; // Ignorer si aucune ligne trouvée

        const valueStr = String(v.value || "").toLowerCase();
        const isOver = valueStr.includes("over");
        const isUnder = valueStr.includes("under");

        if (!linesMap[line]) {
          linesMap[line] = {};
        }

        const oddValue = v.suspended === true ? "locked" : validateOdd(v.odd);

        if (isOver) {
          linesMap[line].over = oddValue;
        } else if (isUnder) {
          linesMap[line].under = oddValue;
        }
      });

      // Trier les lignes par ordre numérique
      const sortedLines = Object.keys(linesMap).sort(
        (a, b) => parseFloat(a) - parseFloat(b)
      );

      // Afficher toutes les lignes avec leurs cotes Over/Under
      return (
        <div
          className="odds-market w-full grid grid-cols-2 md:grid-cols-3 gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {sortedLines.map((line) => {
            const lineData = linesMap[line];
            return (
              <div key={line} className="space-y-1">
                {/* Afficher la ligne de manière visible */}
                <div
                  className={`text-[10px] text-center font-semibold ${
                    theme === "light" ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  {line}
                </div>
                {/* Afficher Over et Under côte à côte */}
                <div className="flex gap-1">
                  <div className="flex-1">
                    <OddsButton
                      value={validateOdd(lineData.over)}
                      onClick={() => {
                        betslipLogger.click({
                          fixtureId,
                          marketName,
                          selection: "Over",
                          line,
                          odd: lineData.over,
                        });
                        if (
                          fixtureId &&
                          lineData.over !== "locked" &&
                          lineData.over !== null
                        ) {
                          const bet = createBet(
                            marketName,
                            "Over",
                            typeof lineData.over === "number"
                              ? lineData.over
                              : parseFloat(String(lineData.over)) || 0,
                            line
                          );
                          if (bet) {
                            betslipLogger.betCreated(bet);
                            addBet(bet);
                          } else {
                            betslipLogger.warn(
                              "Bet Over non créé (multi-lines)"
                            );
                          }
                        } else {
                          betslipLogger.warn(
                            "Impossible d'ajouter Over (multi-lines)",
                            {
                              fixtureId,
                              odd: lineData.over,
                            }
                          );
                        }
                      }}
                      isSelected={
                        fixtureId
                          ? isBetInSlip(fixtureId, "Over/Under Line", "Over")
                          : false
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <OddsButton
                      value={validateOdd(lineData.under)}
                      onClick={() => {
                        betslipLogger.click({
                          fixtureId,
                          marketName,
                          selection: "Under",
                          line,
                          odd: lineData.under,
                        });
                        if (
                          fixtureId &&
                          lineData.under !== "locked" &&
                          lineData.under !== null
                        ) {
                          const bet = createBet(
                            marketName,
                            "Under",
                            typeof lineData.under === "number"
                              ? lineData.under
                              : parseFloat(String(lineData.under)) || 0,
                            line
                          );
                          if (bet) {
                            betslipLogger.betCreated(bet);
                            addBet(bet);
                          } else {
                            betslipLogger.warn(
                              "Bet Under non créé (multi-lines)"
                            );
                          }
                        } else {
                          betslipLogger.warn(
                            "Impossible d'ajouter Under (multi-lines)",
                            {
                              fixtureId,
                              odd: lineData.under,
                            }
                          );
                        }
                      }}
                      isSelected={
                        fixtureId
                          ? isBetInSlip(fixtureId, "Over/Under Line", "Under")
                          : false
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  }

  // 🧩 Marchés standards (1x2, Double Chance, etc.)
  // Vérifier si on a des données dans oddsData (format transformé) ou rawMarkets
  // Pour les matchs à venir, oddsData peut contenir "locked" mais doit quand même s'afficher
  if (!oddsData && !rawMarket) {
    // Debug: logger pourquoi le marché n'est pas affiché
    if (marketName === "_1x2" || marketName === "totalGoals") {
      console.log(`⚠️ [OddsMarket] ${marketName} - No data:`, {
        hasOddsData: !!oddsData,
        hasRawMarket: !!rawMarket,
        rawMarketsLength: rawMarkets?.length || 0,
        rawMarketsNames: rawMarkets?.map((m: any) => m.name || m.market) || [],
      });
    }
    return null;
  }

  // Si on a oddsData (format transformé comme doubleChance: { _1X, _12, X2 })
  if (oddsData && typeof oddsData === "object" && !Array.isArray(oddsData)) {
    // Vérifier si c'est un format transformé (pas un tableau de valeurs)
    // Inclure X pour le marché 1x2
    const isTransformedFormat = Object.keys(oddsData).some(
      (key) =>
        key.startsWith("_") ||
        key === "GG" ||
        key === "NG" ||
        key === "Pair" ||
        key === "Impaire" ||
        key === "X" // Pour le marché 1x2
    );

    if (isTransformedFormat) {
      // Format transformé (ex: { _1X: 1.5, _12: 1.2, X2: 1.8 })
      return (
        <div
          className={`odds-market flex ${
            isMobile ? "gap-2 w-full" : "gap-0.5 justify-center"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {Object.entries(oddsData).map(([label, value], index) => {
            // Mapper les labels internes vers les labels d'affichage
            let displayLabel: string;
            if (
              marketName === "Double Chance" ||
              marketName === "doubleChance"
            ) {
              // Labels courts pour Double Chance: 1X, 12, X2
              displayLabel =
                label === "_1X"
                  ? "1X"
                  : label === "_12"
                  ? "12"
                  : label === "X2"
                  ? "X2"
                  : label;
            } else {
              // Mapping pour 1x2 et autres marchés
              displayLabel =
                label === "_1X"
                  ? "1X"
                  : label === "_12"
                  ? "12"
                  : label === "_1"
                  ? "1"
                  : label === "_2"
                  ? "2"
                  : label === "X"
                  ? "X"
                  : label;
            }
            const changeDirection = getChangeDirection(marketName, label);
            return (
              <div
                key={index}
                className={`flex flex-col items-center ${
                  isMobile ? "flex-1 w-1/3" : "flex-1 min-w-[48px]"
                }`}
              >
                {!isMobile && (
                  <span
                    className={`text-[8px] text-gray-300 mb-0.5 font-medium`}
                  >
                    {displayLabel}
                  </span>
                )}
                <div className="relative w-full">
                  <OddsButton
                    value={validateOdd(value)}
                    isMobile={isMobile}
                    changeDirection={changeDirection}
                    label={isMobile ? displayLabel : undefined}
                    onClick={() => {
                      betslipLogger.click({
                        fixtureId,
                        marketName,
                        label: displayLabel,
                        value,
                        homeTeam,
                        awayTeam,
                        source: "transformedFormat",
                      });
                      if (fixtureId && value !== "locked" && value !== null) {
                        const bet = createBet(
                          marketName,
                          label,
                          typeof value === "number"
                            ? value
                            : parseFloat(String(value)) || 0,
                          null
                        );
                        if (bet) {
                          betslipLogger.betCreated(bet);
                          addBet(bet);
                        } else {
                          betslipLogger.warn(
                            "Bet non créé (transformedFormat - données manquantes)"
                          );
                        }
                      } else {
                        betslipLogger.warn(
                          "Impossible d'ajouter (transformedFormat): fixtureId ou value manquant",
                          {
                            fixtureId,
                            value,
                          }
                        );
                      }
                    }}
                    isSelected={
                      fixtureId
                        ? isBetInSlip(
                            fixtureId,
                            marketNameMapping[marketName] || marketName,
                            label
                          )
                        : false
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  }

  // Sinon, utiliser rawMarkets si disponible
  return (
    <div
      className={`odds-market flex ${
        isMobile ? "gap-2 w-full" : "gap-0.5 justify-center"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {rawMarket
        ? // Utiliser rawMarkets si disponible
          rawMarket.values.map((item: any, index: number) => {
            const changeDirection = getChangeDirection(
              rawMarket.market || marketName,
              item.label
            );
            // Mapper les labels pour Double Chance: afficher 1X, 12, X2 au lieu de Home or Draw, etc.
            let displayLabel = item.label;
            if (
              (marketName === "Double Chance" ||
                marketName === "doubleChance") &&
              rawMarket.market === "Double Chance"
            ) {
              const labelStr = String(item.label || "").toLowerCase();
              const valueStr = String(item.value || "").toLowerCase();
              const searchStr = labelStr || valueStr;

              // Mapping des labels vers 1X, 12, X2
              if (
                searchStr === "1x" ||
                searchStr === "home or draw" ||
                searchStr === "home/draw" ||
                searchStr === "home draw" ||
                searchStr === "homedraw"
              ) {
                displayLabel = "1X";
              } else if (
                searchStr === "12" ||
                searchStr === "home or away" ||
                searchStr === "home/away" ||
                searchStr === "home away" ||
                searchStr === "homeaway"
              ) {
                displayLabel = "12";
              } else if (
                searchStr === "x2" ||
                searchStr === "away or draw" ||
                searchStr === "away/draw" ||
                searchStr === "away draw" ||
                searchStr === "awaydraw" ||
                searchStr === "draw or away" ||
                searchStr === "draw/away" ||
                searchStr === "draw away" ||
                searchStr === "drawaway"
              ) {
                displayLabel = "X2";
              }
            }
            return (
              <div
                key={index}
                className={`flex flex-col items-center ${
                  isMobile ? "flex-1 w-1/3" : "flex-1 min-w-[48px]"
                }`}
              >
                {!isMobile && (
                  <span
                    className={`text-[8px] text-gray-300 mb-0.5 font-medium`}
                  >
                    {displayLabel}
                  </span>
                )}
                <div className="relative w-full">
                  <OddsButton
                    value={validateOdd(item.odd)}
                    isMobile={isMobile}
                    changeDirection={changeDirection}
                    label={isMobile ? displayLabel : undefined}
                    onClick={() => {
                      betslipLogger.click({
                        fixtureId,
                        marketName,
                        label: item.label || displayLabel,
                        odd: item.odd,
                        homeTeam,
                        awayTeam,
                      });
                      if (
                        fixtureId &&
                        item.odd !== "locked" &&
                        item.odd !== null
                      ) {
                        const bet = createBet(
                          marketName,
                          item.label || displayLabel,
                          typeof item.odd === "number"
                            ? item.odd
                            : parseFloat(String(item.odd)) || 0,
                          item.handicap || item.value || null
                        );
                        if (bet) {
                          betslipLogger.betCreated(bet);
                          addBet(bet);
                        } else {
                          betslipLogger.warn(
                            "Bet non créé (données manquantes)"
                          );
                        }
                      } else {
                        betslipLogger.warn(
                          "Impossible d'ajouter: fixtureId ou odd manquant",
                          {
                            fixtureId,
                            odd: item.odd,
                          }
                        );
                      }
                    }}
                    isSelected={
                      fixtureId
                        ? isBetInSlip(
                            fixtureId,
                            marketNameMapping[marketName] || marketName,
                            item.label || displayLabel
                          )
                        : false
                    }
                  />
                </div>
              </div>
            );
          })
        : // Utiliser oddsData sinon (format tableau ou autre)
          Object.entries(oddsData || {}).map(([label, value], index) => {
            const changeDirection = getChangeDirection(marketName, label);
            return (
              <div
                key={index}
                className={`flex flex-col items-center ${
                  isMobile ? "flex-1 w-1/3" : "flex-1 min-w-[48px]"
                }`}
              >
                {!isMobile && (
                  <span
                    className={`text-[8px] text-gray-300 mb-0.5 font-medium`}
                  >
                    {label}
                  </span>
                )}
                <div className="relative w-full">
                  <OddsButton
                    value={validateOdd(value)}
                    isMobile={isMobile}
                    changeDirection={changeDirection}
                    label={isMobile ? label : undefined}
                    onClick={() => {
                      betslipLogger.click({
                        fixtureId,
                        marketName,
                        label,
                        value,
                        homeTeam,
                        awayTeam,
                        source: "oddsData",
                      });
                      if (fixtureId && value !== "locked" && value !== null) {
                        const bet = createBet(
                          marketName,
                          label,
                          typeof value === "number"
                            ? value
                            : parseFloat(String(value)) || 0,
                          null
                        );
                        if (bet) {
                          betslipLogger.betCreated(bet);
                          addBet(bet);
                        } else {
                          betslipLogger.warn(
                            "Bet non créé (oddsData - données manquantes)"
                          );
                        }
                      } else {
                        betslipLogger.warn(
                          "Impossible d'ajouter (oddsData): fixtureId ou value manquant",
                          {
                            fixtureId,
                            value,
                          }
                        );
                      }
                    }}
                    isSelected={
                      fixtureId
                        ? isBetInSlip(
                            fixtureId,
                            marketNameMapping[marketName] || marketName,
                            label
                          )
                        : false
                    }
                  />
                </div>
              </div>
            );
          })}
    </div>
  );
};

export default OddsMarket;
