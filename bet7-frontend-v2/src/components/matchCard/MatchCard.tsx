import React, { useState } from "react";
import OddsMarket from "./OddsMarket";
import OddsButton from "./OddsButton";
import { Match } from "./type";
import { useTheme } from "../../contexts/ThemeContext";
import { useBetSlip } from "../../contexts/BetSlipContext";
import { betslipLogger } from "../../utils/betslipLogger";
import {
  validateOdd,
  isLiveMatch,
  isFinishedMatch,
} from "../../utils/matchTransformers";

interface MatchCardProps {
  match: Match;
  hideLeagueInfo?: boolean;
  onMatchClick?: (matchId: number) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  hideLeagueInfo = false,
  onMatchClick,
}) => {
  const { theme } = useTheme();
  const { addBet, isBetInSlip } = useBetSlip();
  const [showMoreMarkets, setShowMoreMarkets] = useState(false);
  const [expandedMarkets, setExpandedMarkets] = useState<
    Record<string, boolean>
  >({});
  const [favoriteMarkets, setFavoriteMarkets] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedMobileMarket, setSelectedMobileMarket] =
    useState<string>("_1x2");

  // Utiliser directement le temps elapsed depuis les données du socket
  // Le socket envoie automatiquement les mises à jour avec status.elapsed
  const liveTime = match.time?.elapsed ?? null;

  const defaultMarkets = [
    { key: "_1x2", label: "1x2" },
    { key: "doubleChance", label: "Double Chance" },
    { key: "totalGoals", label: "Total Goals" },
    { key: "ggNg", label: "Both Teams Score" },
    { key: "pairImpaire", label: "Pair/Impaire" },
  ];

  // Marchés disponibles pour le sélecteur mobile (sans Total Goals)
  const mobileMarketOptions = [
    { key: "_1x2", label: "1x2" },
    { key: "doubleChance", label: "Double Chance" },
    { key: "ggNg", label: "Both Teams Score" },
    { key: "pairImpaire", label: "Pair/Impaire" },
  ];

  // Helper pour créer un bet depuis les données du marché
  const createBetFromMarket = (
    marketName: string,
    selection: string,
    odd: number | string,
    handicap?: string | null
  ) => {
    const fixtureId = parseInt(match.id);
    if (!fixtureId || !match.homeTeam?.name || !match.awayTeam?.name) {
      betslipLogger.warn("Données manquantes pour créer le bet", {
        fixtureId,
        homeTeam: match.homeTeam?.name,
        awayTeam: match.awayTeam?.name,
      });
      return null;
    }

    // Mapper le nom du marché interne vers le format de l'API
    const marketNameMapping: Record<string, string> = {
      _1x2: "Match Winner",
      doubleChance: "Double Chance",
      ggNg: "Both Teams Score",
      pairImpaire: "Odd/Even",
      totalGoals: isLiveMatch(match.status)
        ? "Over/Under Line"
        : "Goals Over/Under",
    };

    const apiMarketName = marketNameMapping[marketName] || marketName;

    // Mapper la sélection interne vers le format de l'API
    const selectionMapping: Record<string, string> = {
      _1: "Home",
      X: "Draw",
      _2: "Away",
      _1X: "Home or Draw",
      _12: "Home or Away",
      X2: "Draw or Away",
      GG: "Yes",
      NG: "No",
      Pair: "Even",
      Impaire: "Odd",
      Over: "Over",
      Under: "Under",
    };

    const apiSelection = selectionMapping[selection] || selection;

    return {
      fixtureId,
      market: apiMarketName,
      selection: apiSelection,
      odd: typeof odd === "number" ? odd : parseFloat(String(odd)) || 0,
      handicap: handicap || null,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      leagueName:
        typeof match.league === "string"
          ? match.league
          : match.league?.name || "",
      timestamp: new Date().toISOString(),
    };
  };

  // Mapping pour les labels des marchés transformés
  const marketLabels: Record<string, string> = {
    _1x2: "1x2",
    doubleChance: "Double Chance",
    ggNg: "Both Teams Score",
    pairImpaire: "Pair/Impaire",
    totalGoals: "Total Goals",
  };

  // Fonction helper pour formater les labels d'affichage
  const formatDisplayLabel = (label: string, marketKey: string): string => {
    // Mapping des labels internes vers les labels d'affichage
    const labelMapping: Record<string, string> = {
      _1: "1",
      _2: "2",
      X: "X",
      _1X: "1X",
      _12: "12",
      X2: "X2",
      GG: "Yes",
      NG: "No",
      Pair: "Even",
      Impaire: "Odd",
      Over: "Over",
      Under: "Under",
    };

    // Si le label est dans le mapping, l'utiliser
    if (labelMapping[label]) {
      return labelMapping[label];
    }

    // Pour Double Chance, mapper les labels longs vers les courts
    if (marketKey === "doubleChance") {
      const labelLower = label.toLowerCase();
      if (labelLower.includes("home") && labelLower.includes("draw")) {
        return "1X";
      }
      if (labelLower.includes("home") && labelLower.includes("away")) {
        return "12";
      }
      if (labelLower.includes("draw") && labelLower.includes("away")) {
        return "X2";
      }
    }

    // Pour Both Teams Score
    if (marketKey === "ggNg") {
      const labelLower = label.toLowerCase();
      if (labelLower.includes("yes") || label === "GG") {
        return "Yes";
      }
      if (labelLower.includes("no") || label === "NG") {
        return "No";
      }
    }

    // Pour Pair/Impaire
    if (marketKey === "pairImpaire") {
      const labelLower = label.toLowerCase();
      if (labelLower.includes("even") || label === "Pair") {
        return "Even";
      }
      if (labelLower.includes("odd") || label === "Impaire") {
        return "Odd";
      }
    }

    // Retourner le label original si aucun mapping trouvé
    return label;
  };

  const toggleMarket = (marketKey: string) => {
    setExpandedMarkets((prev) => ({
      ...prev,
      [marketKey]: !prev[marketKey],
    }));
  };

  const toggleFavorite = (marketKey: string) => {
    setFavoriteMarkets((prev) => {
      if (prev.includes(marketKey)) {
        return prev.filter((key) => key !== marketKey);
      } else {
        return [...prev, marketKey];
      }
    });
  };

  // Utiliser les fonctions utilitaires importées

  // Filtrer les marchés selon l'onglet actif
  const getFilteredMarkets = () => {
    // Fonction pour normaliser un nom de marché (enlever les variantes comme "(1st Half)")
    // Mais on garde les variantes de temps pour les distinguer
    const normalizeMarketName = (name: string): string => {
      if (!name) return name;
      return name.trim();
    };

    // Fonction pour obtenir le nom de base d'un marché (sans variantes de temps)
    const getBaseMarketName = (name: string): string => {
      if (!name) return name;
      // Enlever les variantes de temps pour la comparaison
      return name
        .replace(/\s*\(1st\s+Half\)/gi, "")
        .replace(/\s*\(2nd\s+Half\)/gi, "")
        .replace(/\s*\(First\s+Half\)/gi, "")
        .replace(/\s*\(Second\s+Half\)/gi, "")
        .trim();
    };

    // Fonction pour vérifier si deux marchés sont équivalents (même marché de base)
    const areMarketsEquivalent = (
      market1: string,
      market2: string
    ): boolean => {
      const base1 = getBaseMarketName(market1).toLowerCase();
      const base2 = getBaseMarketName(market2).toLowerCase();

      // Si les noms de base sont identiques, ce sont des doublons
      if (base1 === base2) {
        return true;
      }

      // Mapping des équivalences (sans variantes de temps)
      const equivalenceGroups = [
        // 1x2 / Match Winner
        ["_1x2", "match winner", "fulltime result", "1x2"],
        // Double Chance
        ["double chance"],
        // Both Teams Score
        ["ggng", "both teams to score", "both teams score"],
        // Pair/Impaire / Odd/Even
        [
          "pairimpaire",
          "pair/impaire",
          "odd/even",
          "goals odd/even",
          "odd even",
        ],
        // Total Goals / Over/Under Line / Goals Over/Under
        [
          "totalgoals",
          "total goals",
          "over/under line",
          "over under line",
          "goals over/under",
          "match goals",
        ],
      ];

      // Vérifier si les deux marchés sont dans le même groupe d'équivalence
      for (const group of equivalenceGroups) {
        const inGroup1 = group.some((g) => base1.includes(g));
        const inGroup2 = group.some((g) => base2.includes(g));
        if (inGroup1 && inGroup2) {
          return true;
        }
      }

      return false;
    };

    // Mapping des équivalences pour les marchés transformés
    const getTransformedMarketKey = (marketName: string): string | null => {
      const base = getBaseMarketName(marketName).toLowerCase();

      if (
        base.includes("match winner") ||
        base.includes("fulltime result") ||
        base === "_1x2" ||
        base === "1x2"
      ) {
        return "_1x2";
      }
      if (base.includes("double chance")) {
        return "doubleChance";
      }
      if (base.includes("both teams") || base === "ggng") {
        return "ggNg";
      }
      if (
        base.includes("odd") ||
        base.includes("even") ||
        base.includes("pair") ||
        base.includes("impaire") ||
        base === "pairimpaire"
      ) {
        return "pairImpaire";
      }
      if (
        base.includes("over") ||
        base.includes("under") ||
        base.includes("total goals") ||
        base === "totalgoals"
      ) {
        return "totalGoals";
      }

      return null;
    };

    // Créer une liste de tous les marchés disponibles (odds + rawMarkets)
    const allAvailableMarkets = [
      ...Object.keys(match.odds || {}).map((key) => ({
        key,
        label:
          marketLabels[key] ||
          String(key)
            .replace(/([A-Z])/g, " $1")
            .trim(),
        isFromOdds: true,
        originalKey: key,
      })),
      ...(match.rawMarkets || []).map((rawMarket: any) => ({
        key: rawMarket.market,
        label: rawMarket.market,
        isFromRaw: true,
        originalKey: rawMarket.market,
      })),
    ];

    // Supprimer les doublons en se basant sur les équivalences
    // Priorité : garder les marchés transformés (_1x2, doubleChance, etc.) pour les marchés principaux
    const seenKeys = new Set<string>();
    const seenNormalizedKeys = new Set<string>();

    // D'abord, collecter tous les marchés transformés avec leurs équivalents
    const transformedMarkets = new Set([
      "_1x2",
      "doubleChance",
      "ggNg",
      "pairImpaire",
      "totalGoals",
    ]);

    const uniqueMarkets = allAvailableMarkets.filter((market) => {
      // Si c'est un marché transformé, le garder et marquer ses équivalents comme vus
      if (transformedMarkets.has(market.key)) {
        seenKeys.add(market.key);
        const base = getBaseMarketName(market.key);
        seenNormalizedKeys.add(base.toLowerCase());
        return true;
      }

      // Obtenir la clé transformée équivalente si elle existe
      const transformedKey = getTransformedMarketKey(market.key);
      if (transformedKey && transformedMarkets.has(transformedKey)) {
        // Ce marché est équivalent à un marché transformé, l'ignorer
        return false;
      }

      // Vérifier si un marché équivalent (même base) a déjà été vu
      const base = getBaseMarketName(market.key).toLowerCase();
      if (seenNormalizedKeys.has(base)) {
        return false;
      }

      // Vérifier si ce marché est équivalent à un marché déjà vu
      for (const seenKey of seenKeys) {
        if (areMarketsEquivalent(market.key, seenKey)) {
          return false;
        }
      }

      // Vérifier si ce marché est équivalent à un marché transformé déjà vu
      for (const transformedKey of transformedMarkets) {
        if (areMarketsEquivalent(market.key, transformedKey)) {
          return false;
        }
      }

      seenKeys.add(market.key);
      seenNormalizedKeys.add(base);
      return true;
    });

    switch (activeTab) {
      case "MY MARKETS":
        return uniqueMarkets.filter((market) =>
          favoriteMarkets.includes(market.key)
        );
      case "MAIN":
        return uniqueMarkets.filter((market) =>
          defaultMarkets.some((d) => d.key === market.key)
        );
      case "POPULAR":
        return uniqueMarkets.filter((market) =>
          ["_1x2", "doubleChance", "totalGoals", "ggNg"].includes(market.key)
        );
      case "1ST HALF":
        const filtered1st = uniqueMarkets.filter(
          (market) =>
            market.label.toLowerCase().includes("first half") ||
            market.label.toLowerCase().includes("1st") ||
            market.key.toLowerCase().includes("first") ||
            market.key.toLowerCase().includes("1st")
        );
        return filtered1st;
      case "2ND HALF":
        const filtered2nd = uniqueMarkets.filter(
          (market) =>
            market.label.toLowerCase().includes("second half") ||
            market.label.toLowerCase().includes("2nd") ||
            market.key.toLowerCase().includes("second") ||
            market.key.toLowerCase().includes("2nd")
        );
        return filtered2nd;
      case "TEAMS":
        return uniqueMarkets.filter(
          (market) =>
            market.label.toLowerCase().includes("home") ||
            market.label.toLowerCase().includes("away") ||
            market.label.toLowerCase().includes("team")
        );
      case "CORRECT SCORE":
        return uniqueMarkets.filter(
          (market) =>
            market.label.toLowerCase().includes("score") ||
            market.key.toLowerCase().includes("score")
        );
      default:
        return uniqueMarkets;
    }
  };

  const handleZoneClick = (e: React.MouseEvent) => {
    // Ne pas déclencher si on clique sur un élément interactif
    const target = e.target as HTMLElement;

    // Vérifier si on clique sur un bouton de cote ou un élément interactif
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest(".odds-button") ||
      target.closest(".no-click") ||
      target.closest("select") ||
      target.closest(".odds-market") ||
      target.closest("[data-odds-button]")
    ) {
      // Laisser le clic se propager normalement pour les boutons de cotes
      return;
    }

    // Si on clique sur la zone principale (équipes, score), ouvrir les détails
    if (onMatchClick) {
      // Convertir match.id en nombre, qu'il soit string ou number
      const fixtureId =
        typeof match.id === "number"
          ? match.id
          : typeof match.id === "string"
          ? parseInt(match.id, 10)
          : null;

      if (fixtureId !== null && !isNaN(fixtureId) && isFinite(fixtureId)) {
        e.preventDefault();
        e.stopPropagation();
        console.log("🔵 [MatchCard] Clic sur match, appel de onMatchClick:", {
          matchId: match.id,
          fixtureId,
          hasOnMatchClick: !!onMatchClick,
        });
        onMatchClick(fixtureId);
      } else {
        console.warn(
          "⚠️ [MatchCard] Impossible de convertir match.id en nombre:",
          {
            matchId: match.id,
            type: typeof match.id,
            fixtureId,
          }
        );
      }
    } else {
      console.warn(
        "⚠️ [MatchCard] onMatchClick n'est pas défini pour ce match:",
        {
          matchId: match.id,
          hasOnMatchClick: !!onMatchClick,
        }
      );
    }
  };

  return (
    <div
      className={`w-full shadow-sm border-b transition-all relative ${
        theme === "light"
          ? "bg-white border-gray-100 even:bg-gray-50/30"
          : "bg-[#2a2a2a] border-gray-800"
      } desktop:px-3 desktop:py-1`}
    >
      {/* Zone cliquable visible au hover */}
      {onMatchClick && (
        <div
          className={`absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-0 ${
            theme === "light"
              ? "bg-blue-50 border-l-4 border-blue-500"
              : "bg-blue-900/20 border-l-4 border-blue-500"
          }`}
        />
      )}

      {/* Indicateur visuel que la carte est cliquable */}
      {onMatchClick && (
        <div
          className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 ${
            theme === "light" ? "text-blue-600" : "text-blue-400"
          }`}
        >
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
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
      )}

      {/* Mode Desktop */}
      <div
        className={`hidden desktop:flex items-start text-xs mb-0.5 relative z-10 ${
          theme === "light" ? "text-gray-900" : "text-white"
        }`}
      >
        {/* ID du match - Largeur réduite */}
        <div
          className={`flex w-10 text-center pt-0.5 flex-shrink-0 ${
            theme === "light" ? "text-gray-500" : "text-gray-400"
          }`}
        >
          <span className="font-medium text-xs">#{match.id}</span>
        </div>

        {/* Contenu principal - Zone cliquable */}
        <div
          className={`flex-1 ml-5 mr-4 flex flex-col gap-0.5 min-w-0 ${
            onMatchClick ? "cursor-pointer hover:bg-opacity-80 group" : ""
          }`}
          onClick={handleZoneClick}
        >
          {/* Ligne du haut */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {isLiveMatch(match.status) && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-1 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                LIVE
                {liveTime !== null && liveTime !== undefined
                  ? ` ${liveTime}'`
                  : match.time?.elapsed !== null &&
                    match.time?.elapsed !== undefined
                  ? ` ${match.time.elapsed}'`
                  : ""}
              </span>
            )}
            {match.status === "UPCOMING" && match.dateTime && (
              <span
                className={`text-[10px] font-bold px-1 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${
                  theme === "light" ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {match.dateTime.day !== "Invalid Date" &&
                match.dateTime.time !== "Invalid Date"
                  ? `${match.dateTime.day} ${match.dateTime.time}`
                  : "Date TBD"}
              </span>
            )}
            {!hideLeagueInfo && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  theme === "light" ? "text-gray-600" : "text-gray-300"
                }`}
              >
                {typeof match.league === "object" && (
                  <>
                    {match.league.flag ? (
                      <img
                        src={match.league.flag}
                        alt={match.league.country}
                        width={14}
                        height={10}
                        className="rounded-sm flex-shrink-0"
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
                      className="w-3.5 h-2.5 flex items-center justify-center flex-shrink-0"
                      style={{ display: match.league.flag ? "none" : "flex" }}
                    >
                      <svg
                        className="w-3 h-3 text-blue-400"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                      </svg>
                    </div>
                  </>
                )}
                <span className="whitespace-nowrap">
                  {typeof match.league === "string"
                    ? match.league
                    : `${match.league?.name || ""} • ${
                        match.league?.country || ""
                      }`}
                </span>
              </div>
            )}
          </div>

          {/* Équipes */}
          <div className="flex gap-2">
            {match.status !== "UPCOMING" && (
              <div className="space-y-0">
                <div className="text-yellow-400 font-semibold text-xs leading-tight">
                  {match.homeTeam.score}
                </div>
                <div className="text-yellow-400 font-semibold text-xs leading-tight">
                  {match.awayTeam.score}
                </div>
              </div>
            )}
            <div className="space-y-0">
              <div
                className={`font-bold text-xs leading-tight ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                {match.homeTeam.name}
              </div>
              <div
                className={`font-bold text-xs leading-tight ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                {match.awayTeam.name}
              </div>
            </div>
          </div>
        </div>

        {/* Marchés et bouton + - Zone non cliquable pour ouvrir les détails */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0 pt-0.5 min-w-0">
          <div className="flex gap-0.5 flex-shrink-0">
            {defaultMarkets.map((market) => {
              // Calcul de la largeur selon le type de marché - RÉDUITE POUR GAGNER DE L'ESPACE ET RESPONSIVE
              let width = "w-[75px] min-w-[60px] max-w-[75px]";
              if (market.key === "_1x2" || market.key === "doubleChance") {
                // 3 boutons × 50px + 2 gaps × 2px = ~154px (réduit de 218px)
                width = "w-[154px] min-w-[120px] max-w-[154px]";
              } else if (market.key === "totalGoals") {
                // Sélecteur (50px) + gap (4px) + Over (45px) + gap (4px) + Under (45px) = ~148px (réduit de 200px)
                width = "w-[148px] min-w-[120px] max-w-[148px]";
              } else if (
                market.key === "ggNg" ||
                market.key === "pairImpaire"
              ) {
                // 2 boutons × 50px + 1 gap × 2px = ~102px (réduit de 144px)
                width = "w-[102px] min-w-[80px] max-w-[102px]";
              }
              // Vérifier que match.odds existe avant d'accéder à ses propriétés
              const oddsData = match.odds
                ? match.odds[market.key as keyof typeof match.odds]
                : undefined;

              return (
                <div key={market.key} className={`${width} text-center`}>
                  <OddsMarket
                    marketName={market.key}
                    oddsData={oddsData}
                    rawMarkets={match.rawMarkets}
                    oddsChanges={match.oddsChanges}
                    isLive={isLiveMatch(match.status)}
                    fixtureId={parseInt(match.id)}
                    homeTeam={match.homeTeam.name}
                    awayTeam={match.awayTeam.name}
                    leagueName={
                      typeof match.league === "string"
                        ? match.league
                        : match.league?.name || ""
                    }
                  />
                </div>
              );
            })}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMoreMarkets(!showMoreMarkets);
            }}
            className={`px-2 py-1 rounded-md font-bold flex items-center justify-center transition-all text-xs ${
              showMoreMarkets
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-yellow-400 text-black hover:bg-yellow-300"
            }`}
          >
            {showMoreMarkets ? "−" : "+"}
          </button>
        </div>
      </div>

      {/* Mode Mobile */}
      <div
        className={`desktop:hidden text-sm mb-2 px-2 py-1 relative z-10 ${
          theme === "light" ? "text-gray-900" : "text-white"
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span
            className={`font-medium flex-shrink-0 ${
              theme === "light" ? "text-gray-600" : "text-gray-400"
            }`}
          >
            #{match.id}
          </span>
          {isLiveMatch(match.status) && match.time && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap flex-shrink-0">
              LIVE{" "}
              {match.time.elapsed !== null && match.time.elapsed !== undefined
                ? `${match.time.elapsed}'`
                : ""}
            </span>
          )}
          {match.status === "UPCOMING" && match.dateTime && (
            <span
              className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${
                theme === "light" ? "text-gray-600" : "text-gray-400"
              }`}
            >
              {match.dateTime.day !== "Invalid Date" &&
              match.dateTime.time !== "Invalid Date"
                ? `${match.dateTime.day} ${match.dateTime.time}`
                : "Date TBD"}
            </span>
          )}
          <div
            className={`flex items-center text-sm ${
              theme === "light" ? "text-gray-600" : "text-gray-300"
            }`}
          >
            {!hideLeagueInfo && typeof match.league === "object" && (
              <>
                {match.league.flag ? (
                  <img
                    src={match.league.flag}
                    alt={match.league.country}
                    width={14}
                    height={10}
                    className="mr-1"
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
                  className="mr-1 w-3.5 h-2.5 flex items-center justify-center"
                  style={{ display: match.league.flag ? "none" : "flex" }}
                >
                  <svg
                    className="w-3 h-3 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </div>
              </>
            )}
            {!hideLeagueInfo && (
              <span>
                {typeof match.league === "string"
                  ? match.league
                  : match.league.name}
              </span>
            )}
          </div>
        </div>

        <div
          className={`flex justify-between items-start mb-2 gap-2 ${
            onMatchClick ? "cursor-pointer hover:bg-opacity-80 group" : ""
          }`}
          onClick={handleZoneClick}
        >
          <div className="flex gap-2">
            {match.status !== "UPCOMING" && (
              <div className="space-y-0.5">
                <div
                  className={`font-semibold text-sm ${
                    theme === "light" ? "text-gray-900" : "text-white"
                  }`}
                >
                  {match.homeTeam.score}
                </div>
                <div
                  className={`font-semibold text-sm ${
                    theme === "light" ? "text-gray-900" : "text-white"
                  }`}
                >
                  {match.awayTeam.score}
                </div>
              </div>
            )}
            <div className="space-y-0.5">
              <div
                className={`text-sm ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                {match.homeTeam.name}
              </div>
              <div
                className={`text-sm ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                {match.awayTeam.name}
              </div>
            </div>
          </div>
        </div>

        {/* Sélecteur de marché en mode mobile */}
        <div className="mb-3">
          <select
            value={selectedMobileMarket}
            onChange={(e) => setSelectedMobileMarket(e.target.value)}
            className={`w-full px-3 py-2 rounded-md text-sm font-medium ${
              theme === "light"
                ? "bg-white text-gray-900 border border-gray-300"
                : "bg-gray-700 text-white border border-gray-600"
            } focus:outline-none focus:ring-2 focus:ring-yellow-400`}
          >
            {mobileMarketOptions.map((market) => (
              <option key={market.key} value={market.key}>
                {market.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1">
            <OddsMarket
              marketName={selectedMobileMarket}
              oddsData={
                match.odds?.[selectedMobileMarket as keyof typeof match.odds] ||
                null
              }
              rawMarkets={match.rawMarkets}
              isMobile={true}
              oddsChanges={match.oddsChanges}
              isLive={isLiveMatch(match.status)}
              fixtureId={parseInt(match.id)}
              homeTeam={match.homeTeam.name}
              awayTeam={match.awayTeam.name}
              leagueName={
                typeof match.league === "string"
                  ? match.league
                  : match.league?.name || ""
              }
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMoreMarkets(!showMoreMarkets);
            }}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center justify-center transition-all flex-shrink-0 ${
              showMoreMarkets
                ? "bg-red-600 text-white"
                : "bg-yellow-400 text-black"
            }`}
          >
            {showMoreMarkets ? "−" : "+"}
          </button>
        </div>
      </div>

      {/* DIV suppléments : style harmonisé avec MatchCard */}
      {showMoreMarkets && (
        <div
          className={`mt-4 rounded-xl border shadow-inner p-4 transition-all ${
            theme === "light"
              ? "bg-gray-100 border-gray-300"
              : "bg-[#2C2C2E] border-gray-700"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Boutons d'onglets */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {[
              "ALL",
              "MY MARKETS",
              "MAIN",
              "POPULAR",
              "1ST HALF",
              "2ND HALF",
              "TEAMS",
              "CORRECT SCORE",
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm rounded-md font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : theme === "light"
                    ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tous les marchés */}
          <div className="space-y-3">
            {getFilteredMarkets().map((market) => (
              <div
                key={market.key}
                className={`rounded-lg border overflow-hidden ${
                  theme === "light"
                    ? "bg-white border-gray-300"
                    : "bg-[#1C1C1E] border-gray-700"
                }`}
              >
                <div
                  className={`flex items-center justify-between p-3 border-b ${
                    theme === "light"
                      ? "bg-gray-50 border-gray-300"
                      : "bg-[#2C2C2E] border-gray-700"
                  }`}
                >
                  <span
                    className={`font-medium flex items-center gap-2 ${
                      theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(market.key);
                      }}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                      {favoriteMarkets.includes(market.key) ? (
                        <span className="text-yellow-400">★</span>
                      ) : (
                        <span
                          className={
                            theme === "light"
                              ? "text-gray-400"
                              : "text-gray-500"
                          }
                        >
                          ☆
                        </span>
                      )}
                    </button>
                    {market.label}
                  </span>
                  <button
                    onClick={() => toggleMarket(market.key)}
                    className={`transition-colors ${
                      theme === "light"
                        ? "text-gray-600 hover:text-gray-900"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
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
                        d={
                          expandedMarkets[market.key]
                            ? "M5 15l7-7 7 7"
                            : "M19 9l-7 7-7-7"
                        }
                      />
                    </svg>
                  </button>
                </div>

                {expandedMarkets[market.key] && (
                  <div className="p-3">
                    {/* Utiliser rawMarkets si disponible pour ce marché, sinon utiliser match.odds */}
                    {(() => {
                      // Mapping des équivalences pour retrouver le marché dans rawMarkets
                      // Pour Total Goals en live, utiliser "Over/Under Line"
                      const isLive = isLiveMatch(match.status);
                      const marketEquivalences: Record<string, string> = {
                        _1x2: "Match Winner",
                        doubleChance: "Double Chance",
                        ggNg: "Both Teams Score",
                        pairImpaire: "Odd/Even",
                        totalGoals: isLive
                          ? "Over/Under Line"
                          : "Goals Over/Under",
                      };

                      // Chercher d'abord avec le key exact, puis avec l'équivalent
                      const marketKeyInRaw =
                        marketEquivalences[market.key] || market.key;

                      // Détecter si c'est un marché Over/Under Line (peut être "totalGoals" ou directement "Over/Under Line")
                      const isOverUnderLineMarketName =
                        market.key === "totalGoals" ||
                        market.key === "Over/Under Line" ||
                        market.key.startsWith("Over/Under Line") ||
                        market.label === "Over/Under Line" ||
                        market.label?.startsWith("Over/Under Line");

                      // Pour Total Goals en live, chercher uniquement "Over/Under Line"
                      const rawMarket = match.rawMarkets?.find((m: any) => {
                        // Si c'est un marché Over/Under Line, chercher spécifiquement ce type
                        if (isOverUnderLineMarketName) {
                          return (
                            m.market === "Over/Under Line" ||
                            m.market === "Over/Under Line (1st Half)" ||
                            m.market?.startsWith("Over/Under Line")
                          );
                        }
                        // Pour les autres marchés, chercher normalement
                        return (
                          m.market === market.key || m.market === marketKeyInRaw
                        );
                      });

                      // Si c'est un marché Over/Under Line mais qu'on ne l'a pas trouvé, afficher un message
                      if (isOverUnderLineMarketName && !rawMarket) {
                        return (
                          <div
                            className={`text-sm text-center py-2 ${
                              theme === "light"
                                ? "text-gray-500"
                                : "text-gray-400"
                            }`}
                          >
                            Marché "Over/Under Line" non trouvé dans les données
                          </div>
                        );
                      }

                      if (rawMarket && rawMarket.values) {
                        // Vérifier si values est un tableau vide
                        if (
                          Array.isArray(rawMarket.values) &&
                          rawMarket.values.length === 0
                        ) {
                          return (
                            <div
                              className={`text-sm text-center py-2 ${
                                theme === "light"
                                  ? "text-gray-500"
                                  : "text-gray-400"
                              }`}
                            >
                              Aucune valeur disponible pour ce marché
                            </div>
                          );
                        }

                        // Pour Total Goals et tous les marchés "Over/Under Line", grouper par ligne (1.5, 2.5, etc.)
                        const isOverUnderLineMarket =
                          isOverUnderLineMarketName ||
                          (rawMarket.market &&
                            rawMarket.market.startsWith("Over/Under Line"));

                        if (isOverUnderLineMarket) {
                          // Debug: afficher les données du marché
                          console.log(
                            "[MatchCard] Traitement Over/Under Line:",
                            {
                              marketName: rawMarket.market,
                              valuesCount: rawMarket.values?.length || 0,
                              values: rawMarket.values,
                            }
                          );

                          const linesMap: Record<
                            string,
                            { over?: string | number; under?: string | number }
                          > = {};

                          // Extraire les lignes depuis le champ handicap ou les labels
                          rawMarket.values.forEach((item: any) => {
                            // Utiliser directement le champ handicap si disponible
                            let handicap: string | null = null;
                            if (
                              item.handicap !== undefined &&
                              item.handicap !== null
                            ) {
                              handicap = String(item.handicap);
                            }

                            // Si pas de handicap, essayer d'extraire depuis le label ou value (fallback)
                            let line: string | null = handicap;
                            if (!line) {
                              // Essayer depuis item.value d'abord
                              const valueStr = String(item.value || "");
                              const valueMatch = valueStr.match(/([\d.]+)/);
                              if (valueMatch) {
                                line = valueMatch[1];
                              } else {
                                // Essayer depuis item.label
                                const label = String(item.label || "");
                                const overMatch = label.match(
                                  /over\s*\/?\s*([\d.]+)/i
                                );
                                const underMatch = label.match(
                                  /under\s*\/?\s*([\d.]+)/i
                                );
                                line = overMatch
                                  ? overMatch[1]
                                  : underMatch
                                  ? underMatch[1]
                                  : null;
                              }
                            }

                            if (!line) {
                              // Debug: afficher ce qui n'a pas pu être extrait
                              console.warn(
                                "[MatchCard] Impossible d'extraire la ligne pour:",
                                item
                              );
                              return; // Ignorer si aucune ligne trouvée
                            }

                            // Déterminer si c'est Over ou Under
                            // Vérifier d'abord item.value, puis item.label
                            const valueStr = String(
                              item.value || item.label || ""
                            ).toLowerCase();
                            const labelStr = String(
                              item.label || item.value || ""
                            ).toLowerCase();

                            // Vérifier si c'est Over ou Under (plusieurs façons possibles)
                            const isOver =
                              valueStr.includes("over") ||
                              labelStr.includes("over") ||
                              valueStr === "o" ||
                              labelStr === "o";
                            const isUnder =
                              valueStr.includes("under") ||
                              labelStr.includes("under") ||
                              valueStr === "u" ||
                              labelStr === "u";

                            // Si on a une ligne mais qu'on ne peut pas déterminer Over/Under,
                            // essayer de deviner depuis l'index ou l'ordre
                            if (!isOver && !isUnder && line) {
                              // Si on ne peut pas déterminer, on peut essayer d'autres indices
                              // Mais pour l'instant, on ignore cet élément
                              console.warn(
                                "[MatchCard] Impossible de déterminer Over/Under pour:",
                                item
                              );
                              return;
                            }

                            if (!linesMap[line]) {
                              linesMap[line] = {};
                            }

                            const oddValue =
                              item.suspended === true
                                ? "locked"
                                : validateOdd(item.odd);

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

                          // Si aucune ligne trouvée, afficher un message
                          if (sortedLines.length === 0) {
                            return (
                              <div
                                className={`text-sm text-center py-2 ${
                                  theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-400"
                                }`}
                              >
                                Aucune ligne disponible pour ce marché
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {sortedLines.map((line) => {
                                const lineData = linesMap[line];
                                return (
                                  <div key={line} className="space-y-2">
                                    {/* Afficher la ligne */}
                                    <div
                                      className={`text-xs text-center font-semibold ${
                                        theme === "light"
                                          ? "text-gray-600"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {line}
                                    </div>
                                    {/* Afficher Over et Under côte à côte */}
                                    <div className="flex gap-1">
                                      <div className="flex-1">
                                        <OddsButton
                                          value={validateOdd(lineData.over)}
                                          isExpanded={true}
                                          label={`Over ${line}`}
                                          onClick={() => {
                                            betslipLogger.click({
                                              fixtureId: parseInt(match.id),
                                              marketName: rawMarket.market,
                                              selection: "Over",
                                              line,
                                              odd: lineData.over,
                                            });
                                            // Vérifier si la cote est <= 1 (doit être verrouillée)
                                            const overValue =
                                              typeof lineData.over === "string"
                                                ? parseFloat(lineData.over)
                                                : lineData.over;
                                            const isOverLocked =
                                              lineData.over === "locked" ||
                                              lineData.over === null ||
                                              lineData.over === undefined ||
                                              (overValue !== null &&
                                                overValue !== undefined &&
                                                typeof overValue === "number" &&
                                                overValue <= 1);

                                            if (
                                              !isOverLocked &&
                                              lineData.over !== undefined
                                            ) {
                                              const bet = createBetFromMarket(
                                                market.key,
                                                "Over",
                                                lineData.over,
                                                line
                                              );
                                              if (bet) {
                                                betslipLogger.betCreated(bet);
                                                addBet(bet);
                                              } else {
                                                betslipLogger.warn(
                                                  "Bet Over non créé (showMoreMarkets)"
                                                );
                                              }
                                            }
                                          }}
                                          isSelected={isBetInSlip(
                                            parseInt(match.id),
                                            rawMarket.market,
                                            "Over"
                                          )}
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <OddsButton
                                          value={validateOdd(lineData.under)}
                                          isExpanded={true}
                                          label={`Under ${line}`}
                                          onClick={() => {
                                            betslipLogger.click({
                                              fixtureId: parseInt(match.id),
                                              marketName: rawMarket.market,
                                              selection: "Under",
                                              line,
                                              odd: lineData.under,
                                            });
                                            // Vérifier si la cote est <= 1 (doit être verrouillée)
                                            const underValue =
                                              typeof lineData.under === "string"
                                                ? parseFloat(lineData.under)
                                                : lineData.under;
                                            const isUnderLocked =
                                              lineData.under === "locked" ||
                                              lineData.under === null ||
                                              lineData.under === undefined ||
                                              (underValue !== null &&
                                                underValue !== undefined &&
                                                typeof underValue ===
                                                  "number" &&
                                                underValue <= 1);

                                            if (
                                              !isUnderLocked &&
                                              lineData.under !== undefined
                                            ) {
                                              const bet = createBetFromMarket(
                                                market.key,
                                                "Under",
                                                lineData.under,
                                                line
                                              );
                                              if (bet) {
                                                betslipLogger.betCreated(bet);
                                                addBet(bet);
                                              } else {
                                                betslipLogger.warn(
                                                  "Bet Under non créé (showMoreMarkets)"
                                                );
                                              }
                                            }
                                          }}
                                          isSelected={isBetInSlip(
                                            parseInt(match.id),
                                            rawMarket.market,
                                            "Under"
                                          )}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        } else {
                          // Pour les autres marchés, afficher normalement
                          return (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {rawMarket.values.map(
                                (item: any, index: number) => (
                                  <div key={index} className="w-full">
                                    <OddsButton
                                      value={validateOdd(item.odd)}
                                      isExpanded={true}
                                      label={(() => {
                                        const baseLabel = formatDisplayLabel(
                                          item.label || item.value || "",
                                          market.key
                                        );
                                        // Si l'item a un handicap, l'ajouter au label
                                        if (
                                          item.handicap !== undefined &&
                                          item.handicap !== null
                                        ) {
                                          return `${baseLabel} ${item.handicap}`;
                                        }
                                        // Si l'item a une valeur numérique dans le label, elle est déjà incluse
                                        return baseLabel;
                                      })()}
                                      onClick={() => {
                                        // Vérifier si la cote est <= 1 (doit être verrouillée)
                                        const oddValue =
                                          typeof item.odd === "string"
                                            ? parseFloat(item.odd)
                                            : item.odd;
                                        const isOddLocked =
                                          item.odd === "locked" ||
                                          item.odd === null ||
                                          item.odd === undefined ||
                                          (oddValue !== null &&
                                            oddValue !== undefined &&
                                            typeof oddValue === "number" &&
                                            oddValue <= 1);

                                        betslipLogger.click({
                                          fixtureId: parseInt(match.id),
                                          marketName: rawMarket.market,
                                          label: item.label,
                                          odd: item.odd,
                                          isOddLocked,
                                        });
                                        if (!isOddLocked) {
                                          const bet = createBetFromMarket(
                                            market.key,
                                            item.label,
                                            item.odd,
                                            item.handicap || item.value || null
                                          );
                                          if (bet) {
                                            betslipLogger.betCreated(bet);
                                            addBet(bet);
                                          } else {
                                            betslipLogger.warn(
                                              "Bet non créé (showMoreMarkets - rawMarket)"
                                            );
                                          }
                                        }
                                      }}
                                      isSelected={isBetInSlip(
                                        parseInt(match.id),
                                        rawMarket.market,
                                        item.label
                                      )}
                                    />
                                  </div>
                                )
                              )}
                            </div>
                          );
                        }
                      } else {
                        const oddsForMarket = match.odds
                          ? match.odds[market.key as keyof typeof match.odds]
                          : undefined;
                        if (
                          oddsForMarket &&
                          typeof oddsForMarket === "object"
                        ) {
                          return (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {Object.entries(oddsForMarket).map(
                                ([label, value], index) => (
                                  <div key={index} className="w-full">
                                    <OddsButton
                                      value={validateOdd(value)}
                                      isExpanded={true}
                                      label={formatDisplayLabel(
                                        label,
                                        market.key
                                      )}
                                      onClick={() => {
                                        betslipLogger.click({
                                          fixtureId: parseInt(match.id),
                                          marketName: market.key,
                                          label,
                                          value,
                                        });
                                        // Vérifier si la cote est <= 1 (doit être verrouillée)
                                        const oddValue =
                                          typeof value === "string"
                                            ? parseFloat(value)
                                            : value;
                                        const isOddLocked =
                                          value === "locked" ||
                                          value === null ||
                                          value === undefined ||
                                          (oddValue !== null &&
                                            oddValue !== undefined &&
                                            typeof oddValue === "number" &&
                                            oddValue <= 1);

                                        if (!isOddLocked) {
                                          const bet = createBetFromMarket(
                                            market.key,
                                            label,
                                            value,
                                            null
                                          );
                                          if (bet) {
                                            betslipLogger.betCreated(bet);
                                            addBet(bet);
                                          } else {
                                            betslipLogger.warn(
                                              "Bet non créé (showMoreMarkets - oddsForMarket)"
                                            );
                                          }
                                        }
                                      }}
                                      isSelected={(() => {
                                        const marketMapping: Record<
                                          string,
                                          string
                                        > = {
                                          _1x2: "Match Winner",
                                          doubleChance: "Double Chance",
                                          ggNg: "Both Teams Score",
                                          pairImpaire: "Odd/Even",
                                          totalGoals: isLiveMatch(match.status)
                                            ? "Over/Under Line"
                                            : "Goals Over/Under",
                                        };
                                        return isBetInSlip(
                                          parseInt(match.id),
                                          marketMapping[market.key] ||
                                            market.key,
                                          label
                                        );
                                      })()}
                                    />
                                  </div>
                                )
                              )}
                            </div>
                          );
                        }
                      }
                      return (
                        <div
                          className={`text-sm text-center py-2 ${
                            theme === "light"
                              ? "text-gray-500"
                              : "text-gray-400"
                          }`}
                        >
                          Aucune cote disponible pour ce marché
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchCard;
