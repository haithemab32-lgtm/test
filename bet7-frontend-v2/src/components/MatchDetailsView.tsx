import React, { useState, useEffect, useMemo } from "react";
import { MatchDetails } from "../types/api";
import { useTheme } from "../contexts/ThemeContext";
import { useBetSlip } from "../contexts/BetSlipContext";
import { useSocket } from "../hooks/useSocket";
import OddsButton from "./matchCard/OddsButton";
import { betslipLogger } from "../utils/betslipLogger";
import { validateOdd } from "../utils/matchTransformers";

interface MatchDetailsViewProps {
  matchDetails: MatchDetails;
  onBack: () => void;
  isCompact?: boolean;
}

const MatchDetailsView: React.FC<MatchDetailsViewProps> = ({
  matchDetails: initialMatchDetails,
  onBack,
  isCompact = false,
}) => {
  const { theme } = useTheme();
  const { addBet, isBetInSlip } = useBetSlip();
  const { socket } = useSocket();
  const [matchDetails, setMatchDetails] =
    useState<MatchDetails>(initialMatchDetails);
  const [activeTab, setActiveTab] = useState("overview");

  // Mettre à jour matchDetails quand initialMatchDetails change
  useEffect(() => {
    setMatchDetails(initialMatchDetails);
  }, [initialMatchDetails]);
  const [expandedMarkets, setExpandedMarkets] = useState<
    Record<string, boolean>
  >({});
  const [favoriteMarkets, setFavoriteMarkets] = useState<string[]>([]);
  const [marketsTab, setMarketsTab] = useState("ALL");
  const [currentTime, setCurrentTime] = useState<{
    minutes: number;
    seconds: number;
  } | null>(null);

  // Parser seconds depuis le socket (format "MM:SS") et comparer avec la valeur actuelle
  useEffect(() => {
    if (!matchDetails.isLive) {
      setCurrentTime(null);
      return;
    }

    // Si seconds est disponible depuis le socket, le parser
    if (matchDetails.fixture.status.seconds) {
      const timeStr = matchDetails.fixture.status.seconds;
      const [minutesStr, secondsStr] = timeStr.split(":");
      const parsedMinutes = parseInt(minutesStr, 10) || 0;
      const parsedSeconds = parseInt(secondsStr, 10) || 0;

      // Comparer avec la valeur actuelle
      setCurrentTime((prev) => {
        // Si pas de valeur actuelle, initialiser avec celle du socket
        if (!prev) {
          return {
            minutes: parsedMinutes,
            seconds: parsedSeconds,
          };
        }

        // Si les valeurs sont égales, garder la valeur actuelle (qui continue de s'incrémenter)
        if (prev.minutes === parsedMinutes && prev.seconds === parsedSeconds) {
          return prev; // Garder la valeur actuelle
        }

        // Si les valeurs sont différentes, choisir la plus récente
        // On compare le temps total en secondes pour déterminer laquelle est plus récente
        const currentTotalSeconds = prev.minutes * 60 + prev.seconds;
        const socketTotalSeconds = parsedMinutes * 60 + parsedSeconds;

        // Si la valeur du socket est plus récente (plus grande), l'utiliser
        // Sinon, garder la valeur actuelle si elle est plus récente
        if (socketTotalSeconds > currentTotalSeconds) {
          return {
            minutes: parsedMinutes,
            seconds: parsedSeconds,
          };
        }

        // Si la valeur actuelle est plus récente ou égale, la garder
        return prev;
      });
    } else if (matchDetails.fixture.status.elapsed !== null) {
      // Fallback: utiliser elapsed si seconds n'est pas disponible
      const elapsedMinutes = Math.floor(matchDetails.fixture.status.elapsed);

      setCurrentTime((prev) => {
        // Si pas de valeur actuelle ou si elapsed a changé, mettre à jour
        if (!prev || prev.minutes !== elapsedMinutes) {
          return {
            minutes: elapsedMinutes,
            seconds: 0,
          };
        }
        // Sinon, garder la valeur actuelle
        return prev;
      });
    } else {
      setCurrentTime(null);
      return;
    }
  }, [
    matchDetails.isLive,
    matchDetails.fixture.status.elapsed,
    matchDetails.fixture.status.seconds,
  ]);

  // Incrémenter le temps chaque seconde
  useEffect(() => {
    if (!matchDetails.isLive || !currentTime) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (!prev) return null;

        let newSeconds = prev.seconds + 1;
        let newMinutes = prev.minutes;

        // Si on atteint 60 secondes, incrémenter les minutes et remettre les secondes à 0
        if (newSeconds >= 60) {
          newMinutes += 1;
          newSeconds = 0;
        }

        return {
          minutes: newMinutes,
          seconds: newSeconds,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [matchDetails.isLive, currentTime]);

  // Écouter les mises à jour Socket.IO pour les matchs en direct
  useEffect(() => {
    if (!socket || !matchDetails.isLive) return;

    const fixtureId = matchDetails.fixture.id;

    // S'abonner au match spécifique
    socket.emit("subscribe:fixture", fixtureId);

    const handleOddsUpdate = (data: any) => {
      if (data.fixtureId === fixtureId && data.odds) {
        setMatchDetails((prev) => ({
          ...prev,
          odds: data.odds,
        }));
      }
    };

    const handleFixtureUpdate = (data: any) => {
      if (data.fixtureId === fixtureId) {
        setMatchDetails((prev) => ({
          ...prev,
          fixture: {
            ...prev.fixture,
            status: {
              ...prev.fixture.status,
              elapsed:
                data.fixture?.status?.elapsed ?? prev.fixture.status.elapsed,
              short: data.fixture?.status?.short ?? prev.fixture.status.short,
              long: data.fixture?.status?.long ?? prev.fixture.status.long,
              seconds:
                data.fixture?.status?.seconds ?? prev.fixture.status.seconds,
            },
          },
          goals: {
            home: data.fixture?.score?.home ?? prev.goals.home,
            away: data.fixture?.score?.away ?? prev.goals.away,
          },
        }));
        // currentTime sera automatiquement mis à jour par le useEffect qui écoute fixture.status.seconds
      }
    };

    socket.on("oddsUpdate", handleOddsUpdate);
    socket.on("fixtureUpdate", handleFixtureUpdate);

    return () => {
      socket.off("oddsUpdate", handleOddsUpdate);
      socket.off("fixtureUpdate", handleFixtureUpdate);
      socket.emit("unsubscribe:fixture", fixtureId);
    };
  }, [socket, matchDetails.isLive, matchDetails.fixture.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format compact pour les matchs upcoming (jour + heure)
  const formatUpcomingDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const time = date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { day, time };
  };

  // Formater le temps en minutes:secondes
  // Utilise currentTime qui s'incrémente automatiquement chaque seconde
  const formatTime = (elapsed: number | null | undefined): string => {
    // Si currentTime est disponible (parsé depuis seconds du socket et incrémenté), l'utiliser
    if (currentTime) {
      return `${currentTime.minutes
        .toString()
        .padStart(2, "0")}:${currentTime.seconds.toString().padStart(2, "0")}`;
    }

    // Fallback: utiliser elapsed si currentTime n'est pas disponible
    if (elapsed === null || elapsed === undefined) return "00:00";
    const minutes = Math.floor(elapsed);
    return `${minutes.toString().padStart(2, "0")}:00`;
  };

  const getEventIcon = (type: string, detail: string) => {
    if (type === "Goal") {
      return "⚽";
    } else if (type === "Card") {
      if (detail.includes("Yellow")) return "🟨";
      if (detail.includes("Red")) return "🟥";
      return "🟨";
    } else if (type === "subst") {
      return "🔄";
    }
    return "•";
  };

  const toggleMarket = (marketKey: string) => {
    setExpandedMarkets((prev) => ({
      ...prev,
      [marketKey]: !prev[marketKey],
    }));
  };

  // Marchés par défaut (toujours affichés)
  const defaultMarkets = [
    { key: "_1x2", label: "1x2" },
    { key: "doubleChance", label: "Double Chance" },
    { key: "totalGoals", label: "Total Goals" },
    { key: "ggNg", label: "Both Teams Score" },
    { key: "pairImpaire", label: "Pair/Impaire" },
  ];

  // Extraire les marchés depuis les odds (comme dans MatchCard) - Mémorisé
  const rawMarketsArray = useMemo(() => {
    const isUpcoming = !matchDetails.isLive;

    if (!matchDetails.odds) {
      if (isUpcoming) {
        console.log("🔍 [UPCOMING] [MatchDetailsView] No odds in matchDetails");
      }
      return [];
    }

    // PRIORITÉ 1: Si odds._rawMarkets existe (marchés bruts sauvegardés après transformation)
    if (
      (matchDetails.odds as any)?._rawMarkets &&
      Array.isArray((matchDetails.odds as any)._rawMarkets)
    ) {
      if (isUpcoming) {
        console.log(
          "🔍 [UPCOMING] [MatchDetailsView] Found _rawMarkets array, length:",
          (matchDetails.odds as any)._rawMarkets.length
        );
      }
      return (matchDetails.odds as any)._rawMarkets;
    }

    // PRIORITÉ 2: Si odds est un tableau de marchés
    if (Array.isArray(matchDetails.odds)) {
      if (isUpcoming) {
        console.log(
          "🔍 [UPCOMING] [MatchDetailsView] Odds is array, length:",
          matchDetails.odds.length
        );
      }
      return matchDetails.odds;
    }

    // PRIORITÉ 3: Si odds a une structure avec odds.odds (format du backend: processedOdds)
    if (matchDetails.odds.odds && Array.isArray(matchDetails.odds.odds)) {
      if (isUpcoming) {
        console.log(
          "🔍 [UPCOMING] [MatchDetailsView] Found odds.odds array, length:",
          matchDetails.odds.odds.length
        );
      }
      return matchDetails.odds.odds;
    }

    // PRIORITÉ 4: Si odds.markets existe
    if (matchDetails.odds.markets && Array.isArray(matchDetails.odds.markets)) {
      if (isUpcoming) {
        console.log(
          "🔍 [UPCOMING] [MatchDetailsView] Found odds.markets array, length:",
          matchDetails.odds.markets.length
        );
      }
      return matchDetails.odds.markets;
    }

    if (isUpcoming) {
      console.log(
        "🔍 [UPCOMING] [MatchDetailsView] No markets found in odds structure:",
        {
          oddsType: typeof matchDetails.odds,
          isArray: Array.isArray(matchDetails.odds),
          hasOdds: !!(matchDetails.odds as any)?.odds,
          hasRawMarkets: !!(matchDetails.odds as any)?._rawMarkets,
          oddsKeys:
            typeof matchDetails.odds === "object"
              ? Object.keys(matchDetails.odds)
              : [],
        }
      );
    }
    return [];
  }, [matchDetails.odds, matchDetails.isLive]);

  // Vérifier si matchDetails.odds contient directement les marchés transformés
  // (comme _1x2, doubleChance, etc.) - format utilisé dans MatchCard
  // Note: Si odds.odds existe, c'est le format processedOdds du backend, donc on n'a pas de transformedOdds
  // Mais si _rawMarkets existe, cela signifie que les odds ont été transformés et on a les marchés transformés
  const hasTransformedOdds =
    matchDetails.odds &&
    typeof matchDetails.odds === "object" &&
    !Array.isArray(matchDetails.odds) &&
    !matchDetails.odds.odds && // Pas de champ odds (donc pas le format processedOdds)
    (matchDetails.odds._1x2 ||
      matchDetails.odds.doubleChance ||
      matchDetails.odds.totalGoals ||
      (matchDetails.odds as any)?._rawMarkets); // Si _rawMarkets existe, on a des odds transformés

  // Créer une liste de tous les marchés disponibles (odds transformés + rawMarkets)
  // Identique à MatchCard pour avoir tous les marchés y compris 1x2, etc.
  const getAllMarkets = () => {
    interface MarketItem {
      key: string;
      label: string;
      market: any;
      isFromOdds?: boolean;
      isFromRaw?: boolean;
    }

    const allMarkets: MarketItem[] = [];

    // 1. Ajouter les marchés transformés depuis matchDetails.odds (comme _1x2, doubleChance, etc.)
    // Vérifier si on a des marchés transformés directement (format MatchCard)
    if (hasTransformedOdds) {
      // Liste des clés à ignorer (ne sont pas des marchés)
      const invalidKeys = [
        "odds",
        "fixture",
        "league",
        "teams",
        "status",
        "goals",
        "score",
        "venue",
        "referee",
        "round",
        "events",
        "statistics",
        "lineups",
        "headToHead",
        "isLive",
        "source",
        "update",
      ];

      Object.keys(matchDetails.odds).forEach((key) => {
        // Ignorer les clés spéciales et les clés qui ne sont pas des marchés
        if (invalidKeys.includes(key.toLowerCase())) return;

        const oddsValue = (matchDetails.odds as any)[key];
        // Si c'est un objet (marché transformé comme _1x2: { _1: 1.5, X: 3.2, _2: 2.1 })
        if (
          oddsValue &&
          typeof oddsValue === "object" &&
          !Array.isArray(oddsValue)
        ) {
          const marketLabel =
            defaultMarkets.find((dm) => dm.key === key)?.label ||
            String(key)
              .replace(/([A-Z])/g, " $1")
              .trim();

          allMarkets.push({
            key,
            label: marketLabel,
            market: {
              market: key,
              name: marketLabel,
              values: Object.entries(oddsValue).map(([label, odd]) => ({
                label,
                odd,
                value: label,
              })),
            },
            isFromOdds: true,
          });
        }
      });
    }

    // 2. Ajouter les marchés depuis rawMarkets (tableau de marchés)
    rawMarketsArray.forEach((rawMarket: any) => {
      const marketKey = rawMarket.name || rawMarket.market || "";

      // Filtrer les clés qui ne sont pas des marchés valides
      const invalidKeys = [
        "fixture",
        "league",
        "teams",
        "status",
        "goals",
        "score",
        "venue",
        "referee",
        "round",
        "events",
        "statistics",
        "lineups",
        "headtohead",
        "headToHead",
        "isLive",
        "date",
        "timestamp",
        "timezone",
      ];

      // Ignorer les éléments invalides ou vides
      if (!marketKey || invalidKeys.includes(marketKey.toLowerCase())) {
        return;
      }

      // Vérifier aussi que le marché a des valeurs (c'est un vrai marché de paris)
      if (
        !rawMarket.values ||
        !Array.isArray(rawMarket.values) ||
        rawMarket.values.length === 0
      ) {
        return; // Ignorer les marchés sans valeurs
      }

      if (marketKey) {
        // Vérifier si ce marché n'existe pas déjà (pour éviter les doublons)
        const exists = allMarkets.some((m) => {
          // Mapping des équivalences
          const marketEquivalences: Record<string, string[]> = {
            _1x2: ["Match Winner", "Fulltime Result", "1x2"],
            doubleChance: ["Double Chance"],
            ggNg: ["Both Teams Score", "Both Teams To Score", "GG/NG"],
            pairImpaire: ["Odd/Even", "Goals Odd/Even", "Pair/Impaire"],
            totalGoals: [
              "Goals Over/Under",
              "Total Goals",
              "Match Goals",
              "Over/Under Line",
            ],
          };

          // Vérifier si le marché actuel correspond à un marché transformé
          for (const [transformedKey, equivalents] of Object.entries(
            marketEquivalences
          )) {
            if (m.key === transformedKey && equivalents.includes(marketKey)) {
              return true;
            }
            if (
              m.market?.market === marketKey &&
              equivalents.some((eq) => eq === m.market?.market)
            ) {
              return true;
            }
          }

          return m.key === marketKey || m.market?.market === marketKey;
        });

        if (!exists) {
          // Mapper le nom du marché vers un label plus lisible si nécessaire
          const marketLabelMap: Record<string, string> = {
            "Match Winner": "1x2",
            "Fulltime Result": "1x2",
            "Double Chance": "Double Chance",
            "Both Teams To Score": "Both Teams Score",
            "Both Teams Score": "Both Teams Score",
            "Odd/Even": "Pair/Impaire",
            "Goals Odd/Even": "Pair/Impaire",
            "Goals Over/Under": "Total Goals",
            "Total Goals": "Total Goals",
            "Match Goals": "Total Goals",
            "Over/Under Line": "Total Goals",
          };

          const displayLabel = marketLabelMap[marketKey] || marketKey;

          // Pour les marchés principaux, utiliser une clé normalisée pour faciliter le filtrage
          const normalizedKey =
            marketKey === "Fulltime Result"
              ? "_1x2"
              : marketKey === "Match Winner"
              ? "_1x2"
              : marketKey === "Both Teams To Score" ||
                marketKey === "Both Teams Score"
              ? "ggNg"
              : marketKey === "Goals Odd/Even" || marketKey === "Odd/Even"
              ? "pairImpaire"
              : marketKey === "Over/Under Line" ||
                marketKey === "Goals Over/Under" ||
                marketKey === "Total Goals" ||
                marketKey === "Match Goals"
              ? "totalGoals"
              : marketKey;

          allMarkets.push({
            key: normalizedKey !== marketKey ? normalizedKey : marketKey,
            label: displayLabel,
            market: rawMarket,
            isFromRaw: true,
          });
        }
      }
    });

    return allMarkets;
  };

  // Mémoriser getAllMarkets pour éviter les recalculs inutiles
  const allMarkets = useMemo(() => {
    const markets = getAllMarkets();
    const isUpcoming = !matchDetails.isLive;

    // Debug uniquement pour les matchs upcoming
    if (isUpcoming) {
      console.log("🔍 [UPCOMING] [MatchDetailsView] getAllMarkets result:", {
        marketsCount: markets.length,
        hasOdds: !!matchDetails.odds,
        oddsType: typeof matchDetails.odds,
        isArray: Array.isArray(matchDetails.odds),
        hasOddsOdds: !!(matchDetails.odds as any)?.odds,
        oddsOddsIsArray: Array.isArray((matchDetails.odds as any)?.odds),
        oddsOddsLength: Array.isArray((matchDetails.odds as any)?.odds)
          ? (matchDetails.odds as any).odds.length
          : 0,
        oddsKeys:
          matchDetails.odds && typeof matchDetails.odds === "object"
            ? Object.keys(matchDetails.odds)
            : [],
        rawMarketsArrayLength: rawMarketsArray.length,
        hasTransformedOdds,
        hasRawMarkets: !!(matchDetails.odds as any)?._rawMarkets,
        rawMarketsLength: (matchDetails.odds as any)?._rawMarkets?.length || 0,
        marketsKeys: markets.map((m) => m.key),
        markets: markets.map((m) => ({
          key: m.key,
          label: m.label,
          isFromOdds: m.isFromOdds,
          isFromRaw: m.isFromRaw,
        })),
      });
    }
    return markets;
  }, [
    matchDetails.odds,
    matchDetails.isLive,
    rawMarketsArray,
    hasTransformedOdds,
  ]);

  // Fonction pour obtenir les marchés filtrés (comme dans MatchCard)
  const getFilteredMarkets = () => {
    if (!allMarkets || allMarkets.length === 0) return [];

    interface MarketItem {
      key: string;
      label: string;
      market: any;
    }

    // Créer une liste unique de marchés
    const uniqueMarkets: MarketItem[] = allMarkets
      .map((market) => ({
        key: market.key,
        label: market.label,
        market: market.market,
      }))
      .filter(
        (market: MarketItem, index: number, self: MarketItem[]) =>
          index === self.findIndex((m: MarketItem) => m.key === market.key)
      );

    // Filtrer selon l'onglet actif
    let filteredMarkets: MarketItem[] = [];
    switch (marketsTab) {
      case "MY MARKETS":
        filteredMarkets = uniqueMarkets.filter((market: MarketItem) =>
          favoriteMarkets.includes(market.key)
        );
        break;
      case "MAIN":
        filteredMarkets = uniqueMarkets.filter((market: MarketItem) =>
          defaultMarkets.some((dm) => dm.key === market.key)
        );
        break;
      case "POPULAR":
        filteredMarkets = uniqueMarkets.filter(
          (market: MarketItem) =>
            market.label.toLowerCase().includes("winner") ||
            market.label.toLowerCase().includes("total") ||
            market.label.toLowerCase().includes("both teams")
        );
        break;
      case "1ST HALF":
        filteredMarkets = uniqueMarkets.filter(
          (market: MarketItem) =>
            market.label.toLowerCase().includes("first half") ||
            market.label.toLowerCase().includes("1st")
        );
        break;
      case "2ND HALF":
        filteredMarkets = uniqueMarkets.filter(
          (market: MarketItem) =>
            market.label.toLowerCase().includes("second half") ||
            market.label.toLowerCase().includes("2nd")
        );
        break;
      case "TEAMS":
        filteredMarkets = uniqueMarkets.filter(
          (market: MarketItem) =>
            market.label.toLowerCase().includes("home") ||
            market.label.toLowerCase().includes("away") ||
            market.label.toLowerCase().includes("team")
        );
        break;
      case "CORRECT SCORE":
        filteredMarkets = uniqueMarkets.filter(
          (market: MarketItem) =>
            market.label.toLowerCase().includes("score") ||
            market.key.toLowerCase().includes("score")
        );
        break;
      default:
        filteredMarkets = uniqueMarkets;
    }

    // Trier pour afficher les marchés principaux en premier
    const priorityMarkets = [
      "_1x2",
      "doubleChance",
      "totalGoals",
      "pairImpaire",
    ];

    return filteredMarkets.sort((a, b) => {
      const aIndex = priorityMarkets.indexOf(a.key);
      const bIndex = priorityMarkets.indexOf(b.key);

      // Si les deux sont dans la liste de priorité, trier par ordre de priorité
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // Si seul a est dans la liste de priorité, le mettre en premier
      if (aIndex !== -1) {
        return -1;
      }
      // Si seul b est dans la liste de priorité, le mettre en premier
      if (bIndex !== -1) {
        return 1;
      }
      // Sinon, garder l'ordre original
      return 0;
    });
  };

  const toggleFavorite = (marketKey: string) => {
    setFavoriteMarkets((prev) =>
      prev.includes(marketKey)
        ? prev.filter((key) => key !== marketKey)
        : [...prev, marketKey]
    );
  };

  // Helper pour créer un bet depuis les données du marché (identique à MatchCard)
  const createBetFromMarket = (
    marketName: string,
    selection: string,
    odd: number | string,
    handicap?: string | null
  ) => {
    const fixtureId = matchDetails.fixture.id;
    if (
      !fixtureId ||
      !matchDetails.teams.home?.name ||
      !matchDetails.teams.away?.name
    ) {
      betslipLogger.warn("Données manquantes pour créer le bet", {
        fixtureId,
        homeTeam: matchDetails.teams.home?.name,
        awayTeam: matchDetails.teams.away?.name,
      });
      return null;
    }

    // Mapper le nom du marché interne vers le format de l'API
    const marketNameMapping: Record<string, string> = {
      _1x2: "Match Winner",
      doubleChance: "Double Chance",
      ggNg: "Both Teams Score",
      pairImpaire: "Odd/Even",
      totalGoals: matchDetails.isLive ? "Over/Under Line" : "Goals Over/Under",
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
      homeTeam: matchDetails.teams.home.name,
      awayTeam: matchDetails.teams.away.name,
      leagueName: matchDetails.league.name || "",
      timestamp: new Date().toISOString(),
    };
  };

  // Fonction helper pour formater les labels d'affichage (identique à MatchCard)
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

  // Mode compact : affichage intégré dans la page
  if (isCompact) {
    return (
      <div
        className={`rounded-xl border shadow-lg overflow-hidden ${
          theme === "light"
            ? "bg-white border-gray-200"
            : "bg-[#1e1e1e] border-gray-800"
        }`}
      >
        {/* Header professionnel avec gradient */}
        <div
          className={`relative ${
            theme === "light"
              ? "bg-gradient-to-r from-gray-50 to-gray-100"
              : "bg-gradient-to-r from-[#2a2a2a] via-[#252525] to-[#2a2a2a]"
          } border-b ${
            theme === "light" ? "border-gray-200" : "border-gray-700"
          }`}
        >
          <div className="px-3 sm:px-6 py-3 sm:py-5">
            <div className="flex items-center justify-center relative mb-3 sm:mb-0">
              {/* Bouton fermer - Positionné en haut à droite sur mobile */}
              <button
                onClick={onBack}
                className={`absolute top-0 right-0 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  theme === "light"
                    ? "bg-gray-200 text-gray-800 hover:bg-gray-300 hover:shadow-md"
                    : "bg-gray-800 text-white hover:bg-gray-700 hover:shadow-lg"
                }`}
              >
                <span className="hidden sm:inline">✕ Fermer</span>
                <span className="sm:hidden">✕</span>
              </button>
            </div>

            {/* Section équipes et score - Adaptée mobile */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-8 justify-center mt-8 sm:mt-0">
              {/* Équipe domicile */}
              <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none max-w-[140px] sm:max-w-none">
                {matchDetails.teams.home.logo && (
                  <img
                    src={matchDetails.teams.home.logo}
                    alt={matchDetails.teams.home.name}
                    className="w-8 h-8 sm:w-12 sm:h-12 object-contain flex-shrink-0"
                  />
                )}
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-xs sm:text-sm font-medium hidden sm:block ${
                      theme === "light" ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    Domicile
                  </span>
                  <span
                    className={`text-sm sm:text-lg font-bold truncate ${
                      theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                    title={matchDetails.teams.home.name}
                  >
                    {matchDetails.teams.home.name}
                  </span>
                </div>
              </div>

              {/* Score central */}
              <div className="flex flex-col items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {matchDetails.isLive ? (
                  <>
                    <div
                      className={`text-2xl sm:text-4xl font-black tracking-tight ${
                        theme === "light" ? "text-gray-900" : "text-yellow-400"
                      }`}
                    >
                      {matchDetails.goals.home ?? 0} -{" "}
                      {matchDetails.goals.away ?? 0}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-red-600 text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg">
                      <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-full w-full bg-white"></span>
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold">
                        LIVE
                      </span>
                      <span className="text-[10px] sm:text-xs font-mono font-semibold">
                        {formatTime(matchDetails.fixture.status.elapsed)}
                      </span>
                    </div>
                  </>
                ) : (
                  (() => {
                    const upcomingDate = formatUpcomingDate(
                      matchDetails.fixture.date
                    );
                    return (
                      <>
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`text-lg sm:text-xl font-bold ${
                              theme === "light"
                                ? "text-gray-800"
                                : "text-blue-300"
                            }`}
                          >
                            {upcomingDate.day}
                          </div>
                          <div
                            className={`text-sm sm:text-base font-semibold flex items-center gap-1 ${
                              theme === "light"
                                ? "text-gray-700"
                                : "text-blue-400"
                            }`}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {upcomingDate.time}
                          </div>
                        </div>
                        <div
                          className={`text-[9px] sm:text-[10px] text-center mt-1 px-1.5 py-0.5 rounded ${
                            theme === "light"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-gray-800/50 text-gray-400"
                          }`}
                        >
                          {matchDetails.fixture.status.long || "À venir"}
                        </div>
                      </>
                    );
                  })()
                )}
              </div>

              {/* Équipe extérieure */}
              <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none max-w-[140px] sm:max-w-none justify-end sm:justify-start">
                {matchDetails.teams.away.logo && (
                  <img
                    src={matchDetails.teams.away.logo}
                    alt={matchDetails.teams.away.name}
                    className="w-8 h-8 sm:w-12 sm:h-12 object-contain flex-shrink-0 order-2 sm:order-1"
                  />
                )}
                <div className="flex flex-col text-right sm:text-left min-w-0 order-1 sm:order-2">
                  <span
                    className={`text-xs sm:text-sm font-medium hidden sm:block ${
                      theme === "light" ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    Extérieur
                  </span>
                  <span
                    className={`text-sm sm:text-lg font-bold truncate ${
                      theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                    title={matchDetails.teams.away.name}
                  >
                    {matchDetails.teams.away.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Informations supplémentaires - Centrées */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-700/50 flex-wrap">
              {matchDetails.league.flag && (
                <img
                  src={matchDetails.league.flag}
                  alt={matchDetails.league.country}
                  className="w-5 h-4 rounded"
                />
              )}
              <span
                className={`text-sm font-medium ${
                  theme === "light" ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {matchDetails.league.name}
              </span>
              {matchDetails.fixture.venue && (
                <>
                  <span
                    className={`text-sm ${
                      theme === "light" ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    •
                  </span>
                  <span
                    className={`text-sm ${
                      theme === "light" ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    {matchDetails.fixture.venue.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Onglets professionnels - AVANT les marchés */}
        <div
          className={`border-b ${
            theme === "light"
              ? "bg-gray-50 border-gray-200"
              : "bg-[#252525] border-gray-700"
          }`}
        >
          <div className="flex gap-0.5 sm:gap-1 px-2 sm:px-4 overflow-x-auto scrollbar-hide">
            {[
              {
                id: "overview",
                label: "Vue d'ensemble",
                icon: "📊",
                shortLabel: "Vue",
              },
              {
                id: "statistics",
                label: "Statistiques",
                icon: "📈",
                shortLabel: "Stats",
              },
              {
                id: "events",
                label: "Événements",
                icon: "⚽",
                shortLabel: "Évén.",
              },
              {
                id: "lineups",
                label: "Compositions",
                icon: "👥",
                shortLabel: "Comp.",
              },
              {
                id: "headtohead",
                label: "Historique",
                icon: "🕐",
                shortLabel: "Hist.",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  activeTab === tab.id
                    ? `${
                        theme === "light"
                          ? "text-red-600 bg-white"
                          : "text-white bg-[#1e1e1e]"
                      }`
                    : `${
                        theme === "light"
                          ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          : "text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                      }`
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-2">
                  <span className="text-sm sm:text-base">{tab.icon}</span>
                  <span className="hidden xs:inline">{tab.label}</span>
                  <span className="xs:hidden">{tab.shortLabel}</span>
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="p-3 sm:p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div
                  className={`p-4 rounded-lg ${
                    theme === "light"
                      ? "bg-gray-50 border border-gray-200"
                      : "bg-[#252525] border border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📊</span>
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        theme === "light" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      Statut
                    </span>
                  </div>
                  <p
                    className={`text-lg font-bold ${
                      theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                  >
                    {matchDetails.fixture.status.long}
                  </p>
                </div>
                {matchDetails.fixture.venue && (
                  <div
                    className={`p-4 rounded-lg ${
                      theme === "light"
                        ? "bg-gray-50 border border-gray-200"
                        : "bg-[#252525] border border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🏟️</span>
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          theme === "light" ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        Stade
                      </span>
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {matchDetails.fixture.venue.name}
                      {matchDetails.fixture.venue.city && (
                        <span
                          className={`text-sm font-normal ml-2 ${
                            theme === "light"
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          • {matchDetails.fixture.venue.city}
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {matchDetails.fixture.referee && (
                  <div
                    className={`p-4 rounded-lg ${
                      theme === "light"
                        ? "bg-gray-50 border border-gray-200"
                        : "bg-[#252525] border border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">👨‍⚖️</span>
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          theme === "light" ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        Arbitre
                      </span>
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {matchDetails.fixture.referee}
                    </p>
                  </div>
                )}
                {matchDetails.league.round && (
                  <div
                    className={`p-4 rounded-lg ${
                      theme === "light"
                        ? "bg-gray-50 border border-gray-200"
                        : "bg-[#252525] border border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📅</span>
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          theme === "light" ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        Journée
                      </span>
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {matchDetails.league.round}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "statistics" && (
            <div className="space-y-4">
              {(() => {
                const hasStatistics = !!matchDetails.statistics;
                const statisticsLength = matchDetails.statistics?.length || 0;
                const hasValidStats =
                  matchDetails.statistics?.some(
                    (stat) => stat.statistics && stat.statistics.length > 0
                  ) || false;

                if (
                  !hasStatistics ||
                  statisticsLength === 0 ||
                  !hasValidStats ||
                  !matchDetails.statistics
                ) {
                  return (
                    <div
                      className={`p-6 text-center rounded-lg ${
                        theme === "light"
                          ? "bg-gray-50 border border-gray-200"
                          : "bg-[#252525] border border-gray-700"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        Statistiques non disponibles pour ce match
                      </p>
                    </div>
                  );
                }

                // Trouver les deux équipes
                const homeTeam = matchDetails.statistics.find(
                  (stat) => stat.team.id === matchDetails.teams.home.id
                );
                const awayTeam = matchDetails.statistics.find(
                  (stat) => stat.team.id === matchDetails.teams.away.id
                );

                if (!homeTeam || !awayTeam) {
                  return (
                    <div
                      className={`p-6 text-center rounded-lg ${
                        theme === "light"
                          ? "bg-gray-50 border border-gray-200"
                          : "bg-[#252525] border border-gray-700"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        Statistiques incomplètes pour ce match
                      </p>
                    </div>
                  );
                }

                // Créer une liste de toutes les statistiques uniques
                const allStats = new Map<string, { home: any; away: any }>();
                homeTeam.statistics.forEach((stat) => {
                  allStats.set(stat.type, { home: stat, away: null });
                });
                awayTeam.statistics.forEach((stat) => {
                  const existing = allStats.get(stat.type);
                  if (existing) {
                    existing.away = stat;
                  } else {
                    allStats.set(stat.type, { home: null, away: stat });
                  }
                });

                return (
                  <div className="space-y-4">
                    {/* En-tête avec logos et noms des équipes */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 flex-1">
                        {matchDetails.teams.home.logo && (
                          <img
                            src={matchDetails.teams.home.logo}
                            alt={matchDetails.teams.home.name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                        <span
                          className={`text-sm font-semibold ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {matchDetails.teams.home.name}
                        </span>
                      </div>
                      <div className="flex-1 text-center">
                        <span
                          className={`text-xs font-medium ${
                            theme === "light"
                              ? "text-gray-500"
                              : "text-gray-400"
                          }`}
                        >
                          Statistiques
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span
                          className={`text-sm font-semibold ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {matchDetails.teams.away.name}
                        </span>
                        {matchDetails.teams.away.logo && (
                          <img
                            src={matchDetails.teams.away.logo}
                            alt={matchDetails.teams.away.name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                      </div>
                    </div>

                    {/* Liste des statistiques */}
                    <div className="space-y-3">
                      {Array.from(allStats.entries()).map(
                        ([statType, stats]) => {
                          const homeValue =
                            stats.home?.value !== null &&
                            stats.home?.value !== undefined
                              ? stats.home.value
                              : 0;
                          const awayValue =
                            stats.away?.value !== null &&
                            stats.away?.value !== undefined
                              ? stats.away.value
                              : 0;

                          // Calculer les pourcentages pour la barre
                          const total = Number(homeValue) + Number(awayValue);
                          const homePercent =
                            total > 0 ? (Number(homeValue) / total) * 100 : 50;
                          const awayPercent = 100 - homePercent;

                          return (
                            <div key={statType} className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                {/* Valeur équipe domicile */}
                                <div className="w-12 text-right">
                                  <span
                                    className={`text-sm font-bold ${
                                      theme === "light"
                                        ? "text-gray-900"
                                        : "text-white"
                                    }`}
                                  >
                                    {homeValue}
                                  </span>
                                </div>

                                {/* Barre de progression */}
                                <div className="flex-1 relative">
                                  <div
                                    className={`h-6 rounded ${
                                      theme === "light"
                                        ? "bg-gray-200"
                                        : "bg-gray-700"
                                    } flex overflow-hidden`}
                                  >
                                    {/* Partie équipe domicile */}
                                    <div
                                      className="bg-blue-500 flex items-center justify-end pr-2"
                                      style={{ width: `${homePercent}%` }}
                                    >
                                      {homePercent > 15 && (
                                        <span className="text-xs font-semibold text-white">
                                          {homeValue}
                                        </span>
                                      )}
                                    </div>
                                    {/* Partie équipe extérieure */}
                                    <div
                                      className="bg-red-500 flex items-center justify-start pl-2"
                                      style={{ width: `${awayPercent}%` }}
                                    >
                                      {awayPercent > 15 && (
                                        <span className="text-xs font-semibold text-white">
                                          {awayValue}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Valeur équipe extérieure */}
                                <div className="w-12 text-left">
                                  <span
                                    className={`text-sm font-bold ${
                                      theme === "light"
                                        ? "text-gray-900"
                                        : "text-white"
                                    }`}
                                  >
                                    {awayValue}
                                  </span>
                                </div>
                              </div>
                              {/* Nom de la statistique */}
                              <div className="text-center">
                                <span
                                  className={`text-xs font-medium ${
                                    theme === "light"
                                      ? "text-gray-600"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {statType}
                                </span>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === "events" && matchDetails.events && (
            <div className="space-y-2 text-sm">
              {matchDetails.events.map((event, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded ${
                    theme === "light" ? "bg-gray-50" : "bg-[#1a1a1a]"
                  }`}
                >
                  <span
                    className={`font-semibold text-xs min-w-[35px] ${
                      theme === "light" ? "text-gray-700" : "text-gray-300"
                    }`}
                  >
                    {event.time.elapsed}'
                  </span>
                  <span className="text-sm">
                    {getEventIcon(event.type, event.detail)}
                  </span>
                  <span
                    className={`font-semibold text-xs ${
                      event.team.id === matchDetails.teams.home.id
                        ? theme === "light"
                          ? "text-blue-700"
                          : "text-blue-400"
                        : theme === "light"
                        ? "text-red-700"
                        : "text-red-400"
                    }`}
                  >
                    {event.player.name}
                  </span>
                  <span
                    className={`text-xs ${
                      theme === "light" ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    {event.detail}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "lineups" && (
            <div className="space-y-6">
              {matchDetails.lineups &&
              matchDetails.lineups.length > 0 &&
              matchDetails.lineups.some(
                (lineup) =>
                  (lineup.startXI && lineup.startXI.length > 0) ||
                  (lineup.substitutes && lineup.substitutes.length > 0)
              ) ? (
                (() => {
                  const homeLineup = matchDetails.lineups.find(
                    (lineup) => lineup.team.id === matchDetails.teams.home.id
                  );
                  const awayLineup = matchDetails.lineups.find(
                    (lineup) => lineup.team.id === matchDetails.teams.away.id
                  );

                  return (
                    <div className="space-y-6">
                      {/* En-tête avec les deux équipes */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Équipe domicile */}
                        <div
                          className={`p-3 rounded-lg ${
                            theme === "light"
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-blue-900/20 border border-blue-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {matchDetails.teams.home.logo && (
                              <img
                                src={matchDetails.teams.home.logo}
                                alt={matchDetails.teams.home.name}
                                className="w-8 h-8 object-contain"
                              />
                            )}
                            <h4
                              className={`font-bold text-sm ${
                                theme === "light"
                                  ? "text-gray-900"
                                  : "text-white"
                              }`}
                            >
                              {matchDetails.teams.home.name}
                            </h4>
                          </div>
                          {homeLineup?.formation && (
                            <div className="mb-3">
                              <span
                                className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                  theme === "light"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-blue-800 text-blue-200"
                                }`}
                              >
                                {homeLineup.formation}
                              </span>
                            </div>
                          )}
                          {homeLineup?.coach && (
                            <p
                              className={`text-xs mb-3 ${
                                theme === "light"
                                  ? "text-gray-600"
                                  : "text-gray-400"
                              }`}
                            >
                              Entraîneur: {homeLineup.coach.name}
                            </p>
                          )}
                        </div>

                        {/* Équipe extérieure */}
                        <div
                          className={`p-3 rounded-lg ${
                            theme === "light"
                              ? "bg-red-50 border border-red-200"
                              : "bg-red-900/20 border border-red-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {matchDetails.teams.away.logo && (
                              <img
                                src={matchDetails.teams.away.logo}
                                alt={matchDetails.teams.away.name}
                                className="w-8 h-8 object-contain"
                              />
                            )}
                            <h4
                              className={`font-bold text-sm ${
                                theme === "light"
                                  ? "text-gray-900"
                                  : "text-white"
                              }`}
                            >
                              {matchDetails.teams.away.name}
                            </h4>
                          </div>
                          {awayLineup?.formation && (
                            <div className="mb-3">
                              <span
                                className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                  theme === "light"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-red-800 text-red-200"
                                }`}
                              >
                                {awayLineup.formation}
                              </span>
                            </div>
                          )}
                          {awayLineup?.coach && (
                            <p
                              className={`text-xs mb-3 ${
                                theme === "light"
                                  ? "text-gray-600"
                                  : "text-gray-400"
                              }`}
                            >
                              Entraîneur: {awayLineup.coach.name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Titulaires - Côte à côte */}
                      <div>
                        <h5
                          className={`text-sm font-bold mb-3 ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          Titulaires
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Titulaires équipe domicile */}
                          <div
                            className={`p-3 rounded-lg ${
                              theme === "light"
                                ? "bg-gray-50 border border-gray-200"
                                : "bg-[#1a1a1a] border border-gray-700"
                            }`}
                          >
                            {homeLineup?.startXI &&
                            homeLineup.startXI.length > 0 ? (
                              <div className="space-y-1.5">
                                {homeLineup.startXI.map((player, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-2"
                                  >
                                    <span
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        theme === "light"
                                          ? "bg-blue-500 text-white"
                                          : "bg-blue-600 text-white"
                                      }`}
                                    >
                                      {player.player.number || "-"}
                                    </span>
                                    <span
                                      className={`text-sm flex-1 ${
                                        theme === "light"
                                          ? "text-gray-900"
                                          : "text-white"
                                      }`}
                                    >
                                      {player.player.name}
                                    </span>
                                    {player.player.pos && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          theme === "light"
                                            ? "bg-gray-200 text-gray-600"
                                            : "bg-gray-700 text-gray-300"
                                        }`}
                                      >
                                        {player.player.pos}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p
                                className={`text-xs italic ${
                                  theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-500"
                                }`}
                              >
                                Aucun titulaire disponible
                              </p>
                            )}
                          </div>

                          {/* Titulaires équipe extérieure */}
                          <div
                            className={`p-3 rounded-lg ${
                              theme === "light"
                                ? "bg-gray-50 border border-gray-200"
                                : "bg-[#1a1a1a] border border-gray-700"
                            }`}
                          >
                            {awayLineup?.startXI &&
                            awayLineup.startXI.length > 0 ? (
                              <div className="space-y-1.5">
                                {awayLineup.startXI.map((player, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-2"
                                  >
                                    <span
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        theme === "light"
                                          ? "bg-red-500 text-white"
                                          : "bg-red-600 text-white"
                                      }`}
                                    >
                                      {player.player.number || "-"}
                                    </span>
                                    <span
                                      className={`text-sm flex-1 ${
                                        theme === "light"
                                          ? "text-gray-900"
                                          : "text-white"
                                      }`}
                                    >
                                      {player.player.name}
                                    </span>
                                    {player.player.pos && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          theme === "light"
                                            ? "bg-gray-200 text-gray-600"
                                            : "bg-gray-700 text-gray-300"
                                        }`}
                                      >
                                        {player.player.pos}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p
                                className={`text-xs italic ${
                                  theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-500"
                                }`}
                              >
                                Aucun titulaire disponible
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remplaçants - Côte à côte */}
                      <div>
                        <h5
                          className={`text-sm font-bold mb-3 ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          Remplaçants
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Remplaçants équipe domicile */}
                          <div
                            className={`p-3 rounded-lg ${
                              theme === "light"
                                ? "bg-gray-50 border border-gray-200"
                                : "bg-[#1a1a1a] border border-gray-700"
                            }`}
                          >
                            {homeLineup?.substitutes &&
                            homeLineup.substitutes.length > 0 ? (
                              <div className="space-y-1.5">
                                {homeLineup.substitutes.map((player, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-2"
                                  >
                                    <span
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        theme === "light"
                                          ? "bg-blue-500 text-white"
                                          : "bg-blue-600 text-white"
                                      }`}
                                    >
                                      {player.player.number || "-"}
                                    </span>
                                    <span
                                      className={`text-sm flex-1 ${
                                        theme === "light"
                                          ? "text-gray-900"
                                          : "text-white"
                                      }`}
                                    >
                                      {player.player.name}
                                    </span>
                                    {player.player.pos && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          theme === "light"
                                            ? "bg-gray-200 text-gray-600"
                                            : "bg-gray-700 text-gray-300"
                                        }`}
                                      >
                                        {player.player.pos}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p
                                className={`text-xs italic ${
                                  theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-500"
                                }`}
                              >
                                Aucun remplaçant disponible
                              </p>
                            )}
                          </div>

                          {/* Remplaçants équipe extérieure */}
                          <div
                            className={`p-3 rounded-lg ${
                              theme === "light"
                                ? "bg-gray-50 border border-gray-200"
                                : "bg-[#1a1a1a] border border-gray-700"
                            }`}
                          >
                            {awayLineup?.substitutes &&
                            awayLineup.substitutes.length > 0 ? (
                              <div className="space-y-1.5">
                                {awayLineup.substitutes.map((player, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-2"
                                  >
                                    <span
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        theme === "light"
                                          ? "bg-red-500 text-white"
                                          : "bg-red-600 text-white"
                                      }`}
                                    >
                                      {player.player.number || "-"}
                                    </span>
                                    <span
                                      className={`text-sm flex-1 ${
                                        theme === "light"
                                          ? "text-gray-900"
                                          : "text-white"
                                      }`}
                                    >
                                      {player.player.name}
                                    </span>
                                    {player.player.pos && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          theme === "light"
                                            ? "bg-gray-200 text-gray-600"
                                            : "bg-gray-700 text-gray-300"
                                        }`}
                                      >
                                        {player.player.pos}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p
                                className={`text-xs italic ${
                                  theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-500"
                                }`}
                              >
                                Aucun remplaçant disponible
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div
                  className={`p-6 text-center rounded-lg ${
                    theme === "light"
                      ? "bg-gray-50 border border-gray-200"
                      : "bg-[#252525] border border-gray-700"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      theme === "light" ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    Compositions non disponibles pour ce match
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "headtohead" && matchDetails.headToHead && (
            <div className="space-y-2 text-sm">
              {matchDetails.headToHead.slice(0, 3).map((h2h, index) => (
                <div
                  key={index}
                  className={`p-2 rounded border ${
                    theme === "light"
                      ? "bg-gray-50 border-gray-200"
                      : "bg-[#1a1a1a] border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {new Date(h2h.fixture.date).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold text-xs ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {h2h.teams.home.name}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        theme === "light" ? "text-gray-900" : "text-yellow-400"
                      }`}
                    >
                      {h2h.goals.home ?? 0} - {h2h.goals.away ?? 0}
                    </span>
                    <span
                      className={`font-semibold text-xs ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {h2h.teams.away.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Marchés supplémentaires - Affichés directement */}
        <div
          className={`mt-2 sm:mt-4 rounded-xl border shadow-inner p-2 sm:p-4 transition-all ${
            theme === "light"
              ? "bg-gray-100 border-gray-300"
              : "bg-[#2C2C2E] border-gray-700"
          }`}
        >
          {/* Boutons d'onglets */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4 justify-center">
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
                onClick={() => setMarketsTab(tab)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md font-semibold transition-colors whitespace-nowrap ${
                  marketsTab === tab
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
          <div className="space-y-2 sm:space-y-3">
            {(() => {
              const filtered = getFilteredMarkets();
              const allMarketsCount = allMarkets.length;

              if (filtered.length === 0) {
                // Si on est dans "MY MARKETS" et qu'il n'y a pas de favoris, afficher un message spécifique
                if (marketsTab === "MY MARKETS") {
                  return (
                    <div
                      className={`p-4 text-center rounded-lg ${
                        theme === "light"
                          ? "bg-gray-50 border border-gray-200"
                          : "bg-[#252525] border border-gray-700"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        Aucun marché favori. Cliquez sur l'étoile ⭐ pour
                        ajouter des favoris.
                      </p>
                    </div>
                  );
                }

                // Si aucun marché n'est disponible du tout
                if (allMarketsCount === 0) {
                  return (
                    <div
                      className={`p-4 text-center rounded-lg ${
                        theme === "light"
                          ? "bg-gray-50 border border-gray-200"
                          : "bg-[#252525] border border-gray-700"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        Aucun marché disponible pour ce match
                      </p>
                    </div>
                  );
                }

                // Si des marchés existent mais ne correspondent pas au filtre
                return (
                  <div
                    className={`p-4 text-center rounded-lg ${
                      theme === "light"
                        ? "bg-gray-50 border border-gray-200"
                        : "bg-[#252525] border border-gray-700"
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      Aucun marché ne correspond au filtre "{marketsTab}"
                    </p>
                    <button
                      onClick={() => setMarketsTab("ALL")}
                      className={`mt-2 px-3 py-1.5 text-xs rounded-md font-semibold transition-colors ${
                        theme === "light"
                          ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      Voir tous les marchés
                    </button>
                  </div>
                );
              }

              return filtered.map((market) => (
                <div
                  key={market.key}
                  className={`rounded-lg border overflow-hidden ${
                    theme === "light"
                      ? "bg-white border-gray-300"
                      : "bg-[#1C1C1E] border-gray-700"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between p-2 sm:p-3 border-b ${
                      theme === "light"
                        ? "bg-gray-50 border-gray-300"
                        : "bg-[#2C2C2E] border-gray-700"
                    }`}
                  >
                    <span
                      className={`font-medium flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}
                    >
                      <button
                        onClick={() => toggleFavorite(market.key)}
                        className="text-yellow-400 hover:text-yellow-300 transition-colors flex-shrink-0"
                      >
                        {favoriteMarkets.includes(market.key) ? (
                          <span className="text-yellow-400 text-sm sm:text-base">
                            ★
                          </span>
                        ) : (
                          <span
                            className={`text-sm sm:text-base ${
                              theme === "light"
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}
                          >
                            ☆
                          </span>
                        )}
                      </button>
                      <span className="truncate">{market.label}</span>
                    </span>
                    <button
                      onClick={() =>
                        setExpandedMarkets((prev) => ({
                          ...prev,
                          [market.key]: !prev[market.key],
                        }))
                      }
                      className={`px-1.5 sm:px-2 py-1 sm:py-1 rounded text-xs font-semibold transition-colors flex items-center justify-center flex-shrink-0 ${
                        expandedMarkets[market.key]
                          ? "bg-red-600 text-white"
                          : theme === "light"
                          ? "bg-gray-200 text-gray-700"
                          : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {expandedMarkets[market.key] ? (
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
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {expandedMarkets[market.key] && (
                    <div className="p-2 sm:p-3">
                      {/* Utiliser la même logique que MatchCard pour un affichage identique */}
                      {(() => {
                        // Mapping des équivalences pour retrouver le marché dans rawMarkets
                        // Pour Total Goals en live, utiliser "Over/Under Line"
                        const marketEquivalences: Record<string, string> = {
                          _1x2: "Match Winner",
                          doubleChance: "Double Chance",
                          ggNg: "Both Teams Score",
                          pairImpaire: "Odd/Even",
                          totalGoals: matchDetails.isLive
                            ? "Over/Under Line"
                            : "Goals Over/Under",
                        };

                        // Chercher d'abord avec le key exact, puis avec l'équivalent
                        const marketKeyInRaw =
                          marketEquivalences[market.key] || market.key;

                        // Détecter si c'est un marché Over/Under Line
                        const isOverUnderLineMarketName =
                          market.key === "totalGoals" ||
                          market.key === "Over/Under Line" ||
                          market.key.startsWith("Over/Under Line") ||
                          market.label === "Over/Under Line" ||
                          market.label?.startsWith("Over/Under Line");

                        // Pour Total Goals en live, chercher uniquement "Over/Under Line"
                        // Chercher d'abord dans allMarkets (qui contient les marchés transformés et raw)
                        let rawMarket: any = null;
                        let oddsForMarket: Record<
                          string,
                          number | string
                        > | null = null;

                        // Chercher dans allMarkets par key
                        const foundMarketInAll = allMarkets.find(
                          (m: any) => m.key === market.key
                        );
                        if (foundMarketInAll) {
                          // Si c'est un marché raw (avec values), utiliser directement
                          if (
                            foundMarketInAll.isFromRaw &&
                            foundMarketInAll.market &&
                            foundMarketInAll.market.values
                          ) {
                            rawMarket = foundMarketInAll.market;
                          }
                          // Si c'est un marché transformé (isFromOdds), extraire les données transformées
                          else if (
                            foundMarketInAll.isFromOdds &&
                            foundMarketInAll.market &&
                            foundMarketInAll.market.values
                          ) {
                            // Transformer le tableau values en objet { _1: 1.5, X: 3.2, _2: 2.1 }
                            if (Array.isArray(foundMarketInAll.market.values)) {
                              const transformedOdds: Record<
                                string,
                                number | string
                              > = {};
                              foundMarketInAll.market.values.forEach(
                                (valueItem: any) => {
                                  const label =
                                    valueItem.label || valueItem.value || "";
                                  const odd = valueItem.odd;
                                  // Les labels sont déjà dans le bon format (_1, X, _2) pour isFromOdds
                                  transformedOdds[label] = odd;
                                }
                              );
                              if (Object.keys(transformedOdds).length > 0) {
                                oddsForMarket = transformedOdds;
                              }
                            }
                          }
                        }

                        // Si pas trouvé, chercher dans rawMarketsArray directement
                        if (!rawMarket && !oddsForMarket) {
                          // Si c'est un marché Over/Under Line, chercher spécifiquement ce type
                          if (isOverUnderLineMarketName) {
                            rawMarket = rawMarketsArray.find(
                              (m: any) =>
                                m.market === "Over/Under Line" ||
                                m.market === "Over/Under Line (1st Half)" ||
                                m.name === "Over/Under Line" ||
                                m.name === "Over/Under Line (1st Half)" ||
                                m.market?.startsWith("Over/Under Line") ||
                                m.name?.startsWith("Over/Under Line")
                            );
                          } else {
                            // Pour les autres marchés, chercher normalement
                            rawMarket = rawMarketsArray.find(
                              (m: any) =>
                                m.market === market.key ||
                                m.market === marketKeyInRaw ||
                                m.name === market.key ||
                                m.name === marketKeyInRaw ||
                                m.market === "Match Winner" ||
                                m.market === "Fulltime Result" ||
                                m.name === "Match Winner" ||
                                m.name === "Fulltime Result"
                            );

                            // Si on trouve le marché pour _1x2, transformer les valeurs
                            if (
                              rawMarket &&
                              rawMarket.values &&
                              market.key === "_1x2"
                            ) {
                              const transformedOdds: Record<
                                string,
                                number | string
                              > = {};
                              rawMarket.values.forEach((valueItem: any) => {
                                const label =
                                  valueItem.label || valueItem.value || "";
                                const odd = valueItem.odd;
                                const labelLower = label.toLowerCase();
                                if (
                                  labelLower === "home" ||
                                  labelLower === "1"
                                ) {
                                  transformedOdds["_1"] = odd;
                                } else if (
                                  labelLower === "draw" ||
                                  labelLower === "x"
                                ) {
                                  transformedOdds["X"] = odd;
                                } else if (
                                  labelLower === "away" ||
                                  labelLower === "2"
                                ) {
                                  transformedOdds["_2"] = odd;
                                }
                              });
                              if (Object.keys(transformedOdds).length > 0) {
                                oddsForMarket = transformedOdds;
                                rawMarket = null; // Utiliser oddsForMarket au lieu de rawMarket
                              }
                            }
                          }
                        }

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
                              Marché "Over/Under Line" non trouvé dans les
                              données
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
                            const linesMap: Record<
                              string,
                              {
                                over?: string | number;
                                under?: string | number;
                              }
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

                              if (!line) return; // Ignorer si aucune ligne trouvée

                              // Déterminer si c'est Over ou Under
                              const valueStr = String(
                                item.value || item.label || ""
                              ).toLowerCase();
                              const labelStr = String(
                                item.label || item.value || ""
                              ).toLowerCase();

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

                              if (!isOver && !isUnder && line) {
                                return; // Ignorer si on ne peut pas déterminer
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
                              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
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
                                                fixtureId:
                                                  matchDetails.fixture.id,
                                                marketName: rawMarket.market,
                                                selection: "Over",
                                                line,
                                                odd: lineData.over,
                                              });
                                              // Vérifier si la cote est <= 1 (doit être verrouillée)
                                              const overValue =
                                                typeof lineData.over ===
                                                "string"
                                                  ? parseFloat(lineData.over)
                                                  : lineData.over;
                                              const isOverLocked =
                                                lineData.over === "locked" ||
                                                lineData.over === null ||
                                                lineData.over === undefined ||
                                                (overValue !== null &&
                                                  overValue !== undefined &&
                                                  typeof overValue ===
                                                    "number" &&
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
                                                }
                                              }
                                            }}
                                            isSelected={isBetInSlip(
                                              matchDetails.fixture.id,
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
                                                fixtureId:
                                                  matchDetails.fixture.id,
                                                marketName: rawMarket.market,
                                                selection: "Under",
                                                line,
                                                odd: lineData.under,
                                              });
                                              // Vérifier si la cote est <= 1 (doit être verrouillée)
                                              const underValue =
                                                typeof lineData.under ===
                                                "string"
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
                                                }
                                              }
                                            }}
                                            isSelected={isBetInSlip(
                                              matchDetails.fixture.id,
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
                              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
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
                                            fixtureId: matchDetails.fixture.id,
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
                                              item.handicap ||
                                                item.value ||
                                                null
                                            );
                                            if (bet) {
                                              betslipLogger.betCreated(bet);
                                              addBet(bet);
                                            }
                                          }
                                        }}
                                        isSelected={isBetInSlip(
                                          matchDetails.fixture.id,
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
                        } else if (
                          oddsForMarket &&
                          typeof oddsForMarket === "object" &&
                          !Array.isArray(oddsForMarket) &&
                          Object.keys(oddsForMarket).length > 0
                        ) {
                          // Utiliser les données transformées (oddsForMarket) pour afficher les cotes
                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                              {Object.entries(oddsForMarket).map(
                                ([label, value], index) => (
                                  <div key={index} className="w-full">
                                    <OddsButton
                                      value={
                                        typeof value === "string" ||
                                        typeof value === "number"
                                          ? value
                                          : "locked"
                                      }
                                      isExpanded={true}
                                      label={formatDisplayLabel(
                                        label,
                                        market.key
                                      )}
                                      onClick={() => {
                                        betslipLogger.click({
                                          fixtureId: matchDetails.fixture.id,
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
                                          totalGoals: matchDetails.isLive
                                            ? "Over/Under Line"
                                            : "Goals Over/Under",
                                        };
                                        return isBetInSlip(
                                          matchDetails.fixture.id,
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

                        return (
                          <div
                            className={`text-sm text-center py-2 ${
                              theme === "light"
                                ? "text-gray-500"
                                : "text-gray-400"
                            }`}
                          >
                            Aucune donnée disponible pour ce marché
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    );
  }

  // Mode plein écran (ancien comportement)
  return (
    <div
      className={`min-h-screen ${
        theme === "light" ? "bg-gray-50" : "bg-[#1a1a1a]"
      }`}
    >
      {/* Header avec bouton retour */}
      <div
        className={`sticky top-0 z-10 border-b ${
          theme === "light"
            ? "bg-white border-gray-200"
            : "bg-[#2a2a2a] border-gray-800"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={onBack}
            className={`px-4 py-2 rounded-md font-semibold transition-colors ${
              theme === "light"
                ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            ← Retour
          </button>
          <div className="flex-1">
            <h1
              className={`text-lg font-bold ${
                theme === "light" ? "text-gray-900" : "text-white"
              }`}
            >
              Détails du match
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* En-tête du match */}
        <div
          className={`rounded-lg border p-6 mb-6 ${
            theme === "light"
              ? "bg-white border-gray-200"
              : "bg-[#2a2a2a] border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {matchDetails.league.flag && (
                <img
                  src={matchDetails.league.flag}
                  alt={matchDetails.league.country}
                  className="w-6 h-4 rounded"
                />
              )}
              <span
                className={`text-sm ${
                  theme === "light" ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {matchDetails.league.name} • {matchDetails.league.country}
              </span>
            </div>
            {matchDetails.isLive ? (
              <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-full w-full bg-white"></span>
                </span>
                LIVE {matchDetails.fixture.status.elapsed}'
              </span>
            ) : (
              (() => {
                const upcomingDate = formatUpcomingDate(
                  matchDetails.fixture.date
                );
                return (
                  <span
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                      theme === "light"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-blue-900/30 text-blue-300 border border-blue-700/50"
                    }`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {upcomingDate.day} {upcomingDate.time}
                  </span>
                );
              })()
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 text-center">
              {matchDetails.teams.home.logo && (
                <img
                  src={matchDetails.teams.home.logo}
                  alt={matchDetails.teams.home.name}
                  className="w-16 h-16 mx-auto mb-2"
                />
              )}
              <h2
                className={`text-xl font-bold ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                {matchDetails.teams.home.name}
              </h2>
            </div>

            <div className="px-8">
              {matchDetails.isLive ? (
                <>
                  <div
                    className={`text-4xl font-bold ${
                      theme === "light" ? "text-gray-900" : "text-yellow-400"
                    }`}
                  >
                    {matchDetails.goals.home ?? 0} -{" "}
                    {matchDetails.goals.away ?? 0}
                  </div>
                  {matchDetails.fixture.status.short !== "NS" && (
                    <div
                      className={`text-sm text-center mt-2 ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {matchDetails.fixture.status.long}
                    </div>
                  )}
                </>
              ) : (
                (() => {
                  const upcomingDate = formatUpcomingDate(
                    matchDetails.fixture.date
                  );
                  return (
                    <>
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`text-2xl sm:text-3xl font-bold ${
                            theme === "light"
                              ? "text-gray-800"
                              : "text-blue-300"
                          }`}
                        >
                          {upcomingDate.day}
                        </div>
                        <div
                          className={`text-lg sm:text-xl font-semibold flex items-center gap-1.5 ${
                            theme === "light"
                              ? "text-gray-700"
                              : "text-blue-400"
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
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {upcomingDate.time}
                        </div>
                      </div>
                      <div
                        className={`text-xs sm:text-sm text-center mt-2 px-2 py-1 rounded ${
                          theme === "light"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-gray-800/50 text-gray-400"
                        }`}
                      >
                        {matchDetails.fixture.status.long || "À venir"}
                      </div>
                    </>
                  );
                })()
              )}
            </div>

            <div className="flex-1 text-center">
              {matchDetails.teams.away.logo && (
                <img
                  src={matchDetails.teams.away.logo}
                  alt={matchDetails.teams.away.name}
                  className="w-16 h-16 mx-auto mb-2"
                />
              )}
              <h2
                className={`text-xl font-bold ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                {matchDetails.teams.away.name}
              </h2>
            </div>
          </div>

          <div
            className={`text-sm text-center ${
              theme === "light" ? "text-gray-600" : "text-gray-400"
            }`}
          >
            {formatDate(matchDetails.fixture.date)}
            {matchDetails.fixture.venue && (
              <> • {matchDetails.fixture.venue.name}</>
            )}
            {matchDetails.fixture.referee && (
              <> • Arbitre: {matchDetails.fixture.referee}</>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: "overview", label: "Vue d'ensemble" },
            { id: "statistics", label: "Statistiques" },
            { id: "events", label: "Événements" },
            { id: "lineups", label: "Compositions" },
            { id: "odds", label: "Cotes" },
            { id: "headtohead", label: "Historique" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-red-600 text-white"
                  : theme === "light"
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu des onglets */}
        <div
          className={`rounded-lg border p-6 ${
            theme === "light"
              ? "bg-white border-gray-200"
              : "bg-[#2a2a2a] border-gray-800"
          }`}
        >
          {activeTab === "overview" && (
            <div className="space-y-4">
              <h3
                className={`text-xl font-bold mb-4 ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                Informations générales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span
                    className={`text-sm ${
                      theme === "light" ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    Statut:
                  </span>
                  <p
                    className={`font-semibold ${
                      theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                  >
                    {matchDetails.fixture.status.long}
                  </p>
                </div>
                {matchDetails.fixture.venue && (
                  <div>
                    <span
                      className={`text-sm ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      Stade:
                    </span>
                    <p
                      className={`font-semibold ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {matchDetails.fixture.venue.name},{" "}
                      {matchDetails.fixture.venue.city}
                    </p>
                  </div>
                )}
                {matchDetails.fixture.referee && (
                  <div>
                    <span
                      className={`text-sm ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      Arbitre:
                    </span>
                    <p
                      className={`font-semibold ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {matchDetails.fixture.referee}
                    </p>
                  </div>
                )}
                {matchDetails.league.round && (
                  <div>
                    <span
                      className={`text-sm ${
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      Journée:
                    </span>
                    <p
                      className={`font-semibold ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {matchDetails.league.round}
                    </p>
                  </div>
                )}
              </div>
              {matchDetails.score.halftime && (
                <div className="mt-4">
                  <span
                    className={`text-sm ${
                      theme === "light" ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    Score mi-temps:
                  </span>
                  <p
                    className={`font-semibold ${
                      theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                  >
                    {matchDetails.score.halftime.home} -{" "}
                    {matchDetails.score.halftime.away}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "statistics" && (
            <div className="space-y-4">
              {(() => {
                const hasStatistics = !!matchDetails.statistics;
                const statisticsLength = matchDetails.statistics?.length || 0;
                const hasValidStats =
                  matchDetails.statistics?.some(
                    (stat) => stat.statistics && stat.statistics.length > 0
                  ) || false;

                if (
                  !hasStatistics ||
                  statisticsLength === 0 ||
                  !hasValidStats ||
                  !matchDetails.statistics
                ) {
                  return (
                    <div
                      className={`p-6 text-center rounded-lg ${
                        theme === "light"
                          ? "bg-gray-50 border border-gray-200"
                          : "bg-[#252525] border border-gray-700"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        Statistiques non disponibles pour ce match
                      </p>
                    </div>
                  );
                }

                const homeTeam = matchDetails.statistics.find(
                  (stat) => stat.team.id === matchDetails.teams.home.id
                );
                const awayTeam = matchDetails.statistics.find(
                  (stat) => stat.team.id === matchDetails.teams.away.id
                );

                if (!homeTeam || !awayTeam) {
                  return (
                    <div
                      className={`p-6 text-center rounded-lg ${
                        theme === "light"
                          ? "bg-gray-50 border border-gray-200"
                          : "bg-[#252525] border border-gray-700"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        Statistiques incomplètes pour ce match
                      </p>
                    </div>
                  );
                }

                const allStats = new Map<string, { home: any; away: any }>();
                homeTeam.statistics.forEach((stat) => {
                  allStats.set(stat.type, { home: stat, away: null });
                });
                awayTeam.statistics.forEach((stat) => {
                  const existing = allStats.get(stat.type);
                  if (existing) {
                    existing.away = stat;
                  } else {
                    allStats.set(stat.type, { home: null, away: stat });
                  }
                });

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 flex-1">
                        {matchDetails.teams.home.logo && (
                          <img
                            src={matchDetails.teams.home.logo}
                            alt={matchDetails.teams.home.name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                        <span
                          className={`text-sm font-semibold ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {matchDetails.teams.home.name}
                        </span>
                      </div>
                      <div className="flex-1 text-center">
                        <span
                          className={`text-xs font-medium ${
                            theme === "light"
                              ? "text-gray-500"
                              : "text-gray-400"
                          }`}
                        >
                          Statistiques
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span
                          className={`text-sm font-semibold ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {matchDetails.teams.away.name}
                        </span>
                        {matchDetails.teams.away.logo && (
                          <img
                            src={matchDetails.teams.away.logo}
                            alt={matchDetails.teams.away.name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {Array.from(allStats.entries()).map(
                        ([statType, stats]) => {
                          const homeValue =
                            stats.home?.value !== null &&
                            stats.home?.value !== undefined
                              ? stats.home.value
                              : 0;
                          const awayValue =
                            stats.away?.value !== null &&
                            stats.away?.value !== undefined
                              ? stats.away.value
                              : 0;

                          const total = Number(homeValue) + Number(awayValue);
                          const homePercent =
                            total > 0 ? (Number(homeValue) / total) * 100 : 50;
                          const awayPercent = 100 - homePercent;

                          return (
                            <div key={statType} className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                <div className="w-12 text-right">
                                  <span
                                    className={`text-sm font-bold ${
                                      theme === "light"
                                        ? "text-gray-900"
                                        : "text-white"
                                    }`}
                                  >
                                    {homeValue}
                                  </span>
                                </div>

                                <div className="flex-1 relative">
                                  <div
                                    className={`h-6 rounded ${
                                      theme === "light"
                                        ? "bg-gray-200"
                                        : "bg-gray-700"
                                    } flex overflow-hidden`}
                                  >
                                    <div
                                      className="bg-blue-500 flex items-center justify-end pr-2"
                                      style={{ width: `${homePercent}%` }}
                                    >
                                      {homePercent > 15 && (
                                        <span className="text-xs font-semibold text-white">
                                          {homeValue}
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      className="bg-red-500 flex items-center justify-start pl-2"
                                      style={{ width: `${awayPercent}%` }}
                                    >
                                      {awayPercent > 15 && (
                                        <span className="text-xs font-semibold text-white">
                                          {awayValue}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="w-12 text-left">
                                  <span
                                    className={`text-sm font-bold ${
                                      theme === "light"
                                        ? "text-gray-900"
                                        : "text-white"
                                    }`}
                                  >
                                    {awayValue}
                                  </span>
                                </div>
                              </div>
                              <div className="text-center">
                                <span
                                  className={`text-xs font-medium ${
                                    theme === "light"
                                      ? "text-gray-600"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {statType}
                                </span>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === "events" && (
            <div>
              <h3
                className={`text-xl font-bold mb-4 ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                Chronologie des événements
              </h3>
              {matchDetails.events && matchDetails.events.length > 0 ? (
                <div className="space-y-3">
                  {matchDetails.events.map((event, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded ${
                        theme === "light" ? "bg-gray-50" : "bg-[#1a1a1a]"
                      }`}
                    >
                      <span
                        className={`font-semibold min-w-[40px] ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        }`}
                      >
                        {event.time.elapsed}'
                        {event.time.extra && `+${event.time.extra}`}
                      </span>
                      <span className="text-xl">
                        {getEventIcon(event.type, event.detail)}
                      </span>
                      <div className="flex-1">
                        <span
                          className={`font-semibold ${
                            event.team.id === matchDetails.teams.home.id
                              ? theme === "light"
                                ? "text-blue-700"
                                : "text-blue-400"
                              : theme === "light"
                              ? "text-red-700"
                              : "text-red-400"
                          }`}
                        >
                          {event.player.name}
                        </span>
                        {event.assist && (
                          <span
                            className={`text-sm ml-2 ${
                              theme === "light"
                                ? "text-gray-600"
                                : "text-gray-400"
                            }`}
                          >
                            (assist: {event.assist.name})
                          </span>
                        )}
                        <div
                          className={`text-sm ${
                            theme === "light"
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {event.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className={`text-center ${
                    theme === "light" ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  Aucun événement disponible
                </p>
              )}
            </div>
          )}

          {activeTab === "lineups" && (
            <div className="space-y-6">
              {matchDetails.lineups &&
              matchDetails.lineups.length > 0 &&
              matchDetails.lineups.some(
                (lineup) =>
                  (lineup.startXI && lineup.startXI.length > 0) ||
                  (lineup.substitutes && lineup.substitutes.length > 0)
              ) ? (
                (() => {
                  const homeLineup = matchDetails.lineups.find(
                    (lineup) => lineup.team.id === matchDetails.teams.home.id
                  );
                  const awayLineup = matchDetails.lineups.find(
                    (lineup) => lineup.team.id === matchDetails.teams.away.id
                  );

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={`p-3 rounded-lg ${
                            theme === "light"
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-blue-900/20 border border-blue-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {matchDetails.teams.home.logo && (
                              <img
                                src={matchDetails.teams.home.logo}
                                alt={matchDetails.teams.home.name}
                                className="w-8 h-8 object-contain"
                              />
                            )}
                            <h4
                              className={`font-bold text-sm ${
                                theme === "light"
                                  ? "text-gray-900"
                                  : "text-white"
                              }`}
                            >
                              {matchDetails.teams.home.name}
                            </h4>
                          </div>
                          {homeLineup?.formation && (
                            <div className="mb-3">
                              <span
                                className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                  theme === "light"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-blue-800 text-blue-200"
                                }`}
                              >
                                {homeLineup.formation}
                              </span>
                            </div>
                          )}
                          {homeLineup?.coach && (
                            <p
                              className={`text-xs mb-3 ${
                                theme === "light"
                                  ? "text-gray-600"
                                  : "text-gray-400"
                              }`}
                            >
                              Entraîneur: {homeLineup.coach.name}
                            </p>
                          )}
                        </div>

                        <div
                          className={`p-3 rounded-lg ${
                            theme === "light"
                              ? "bg-red-50 border border-red-200"
                              : "bg-red-900/20 border border-red-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {matchDetails.teams.away.logo && (
                              <img
                                src={matchDetails.teams.away.logo}
                                alt={matchDetails.teams.away.name}
                                className="w-8 h-8 object-contain"
                              />
                            )}
                            <h4
                              className={`font-bold text-sm ${
                                theme === "light"
                                  ? "text-gray-900"
                                  : "text-white"
                              }`}
                            >
                              {matchDetails.teams.away.name}
                            </h4>
                          </div>
                          {awayLineup?.formation && (
                            <div className="mb-3">
                              <span
                                className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                  theme === "light"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-red-800 text-red-200"
                                }`}
                              >
                                {awayLineup.formation}
                              </span>
                            </div>
                          )}
                          {awayLineup?.coach && (
                            <p
                              className={`text-xs mb-3 ${
                                theme === "light"
                                  ? "text-gray-600"
                                  : "text-gray-400"
                              }`}
                            >
                              Entraîneur: {awayLineup.coach.name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h5
                          className={`text-sm font-bold mb-3 ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          Titulaires
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div
                            className={`p-3 rounded-lg ${
                              theme === "light"
                                ? "bg-gray-50 border border-gray-200"
                                : "bg-[#1a1a1a] border border-gray-700"
                            }`}
                          >
                            {homeLineup?.startXI &&
                            homeLineup.startXI.length > 0 ? (
                              <div className="space-y-1.5">
                                {homeLineup.startXI.map((player, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-2"
                                  >
                                    <span
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        theme === "light"
                                          ? "bg-blue-500 text-white"
                                          : "bg-blue-600 text-white"
                                      }`}
                                    >
                                      {player.player.number || "-"}
                                    </span>
                                    <span
                                      className={`text-sm flex-1 ${
                                        theme === "light"
                                          ? "text-gray-900"
                                          : "text-white"
                                      }`}
                                    >
                                      {player.player.name}
                                    </span>
                                    {player.player.pos && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          theme === "light"
                                            ? "bg-gray-200 text-gray-600"
                                            : "bg-gray-700 text-gray-300"
                                        }`}
                                      >
                                        {player.player.pos}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p
                                className={`text-xs italic ${
                                  theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-500"
                                }`}
                              >
                                Aucun titulaire disponible
                              </p>
                            )}
                          </div>

                          <div
                            className={`p-3 rounded-lg ${
                              theme === "light"
                                ? "bg-gray-50 border border-gray-200"
                                : "bg-[#1a1a1a] border border-gray-700"
                            }`}
                          >
                            {awayLineup?.startXI &&
                            awayLineup.startXI.length > 0 ? (
                              <div className="space-y-1.5">
                                {awayLineup.startXI.map((player, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-2"
                                  >
                                    <span
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        theme === "light"
                                          ? "bg-red-500 text-white"
                                          : "bg-red-600 text-white"
                                      }`}
                                    >
                                      {player.player.number || "-"}
                                    </span>
                                    <span
                                      className={`text-sm flex-1 ${
                                        theme === "light"
                                          ? "text-gray-900"
                                          : "text-white"
                                      }`}
                                    >
                                      {player.player.name}
                                    </span>
                                    {player.player.pos && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          theme === "light"
                                            ? "bg-gray-200 text-gray-600"
                                            : "bg-gray-700 text-gray-300"
                                        }`}
                                      >
                                        {player.player.pos}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p
                                className={`text-xs italic ${
                                  theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-500"
                                }`}
                              >
                                Aucun titulaire disponible
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5
                          className={`text-sm font-bold mb-3 ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          Remplaçants
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div
                            className={`p-3 rounded-lg ${
                              theme === "light"
                                ? "bg-gray-50 border border-gray-200"
                                : "bg-[#1a1a1a] border border-gray-700"
                            }`}
                          >
                            {homeLineup?.substitutes &&
                            homeLineup.substitutes.length > 0 ? (
                              <div className="space-y-1.5">
                                {homeLineup.substitutes.map((player, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-2"
                                  >
                                    <span
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        theme === "light"
                                          ? "bg-blue-500 text-white"
                                          : "bg-blue-600 text-white"
                                      }`}
                                    >
                                      {player.player.number || "-"}
                                    </span>
                                    <span
                                      className={`text-sm flex-1 ${
                                        theme === "light"
                                          ? "text-gray-900"
                                          : "text-white"
                                      }`}
                                    >
                                      {player.player.name}
                                    </span>
                                    {player.player.pos && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          theme === "light"
                                            ? "bg-gray-200 text-gray-600"
                                            : "bg-gray-700 text-gray-300"
                                        }`}
                                      >
                                        {player.player.pos}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p
                                className={`text-xs italic ${
                                  theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-500"
                                }`}
                              >
                                Aucun remplaçant disponible
                              </p>
                            )}
                          </div>

                          <div
                            className={`p-3 rounded-lg ${
                              theme === "light"
                                ? "bg-gray-50 border border-gray-200"
                                : "bg-[#1a1a1a] border border-gray-700"
                            }`}
                          >
                            {awayLineup?.substitutes &&
                            awayLineup.substitutes.length > 0 ? (
                              <div className="space-y-1.5">
                                {awayLineup.substitutes.map((player, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex items-center gap-2"
                                  >
                                    <span
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        theme === "light"
                                          ? "bg-red-500 text-white"
                                          : "bg-red-600 text-white"
                                      }`}
                                    >
                                      {player.player.number || "-"}
                                    </span>
                                    <span
                                      className={`text-sm flex-1 ${
                                        theme === "light"
                                          ? "text-gray-900"
                                          : "text-white"
                                      }`}
                                    >
                                      {player.player.name}
                                    </span>
                                    {player.player.pos && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          theme === "light"
                                            ? "bg-gray-200 text-gray-600"
                                            : "bg-gray-700 text-gray-300"
                                        }`}
                                      >
                                        {player.player.pos}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p
                                className={`text-xs italic ${
                                  theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-500"
                                }`}
                              >
                                Aucun remplaçant disponible
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div
                  className={`p-6 text-center rounded-lg ${
                    theme === "light"
                      ? "bg-gray-50 border border-gray-200"
                      : "bg-[#252525] border border-gray-700"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      theme === "light" ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    Compositions non disponibles pour ce match
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "odds" && (
            <div>
              <h3
                className={`text-xl font-bold mb-4 ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                Cotes disponibles
              </h3>
              {rawMarketsArray.length > 0 ? (
                <div className="space-y-4">
                  {rawMarketsArray.map((market: any, index: number) => {
                    const marketKey =
                      market.name || market.market || `market-${index}`;
                    const isExpanded = expandedMarkets[marketKey];

                    return (
                      <div
                        key={index}
                        className={`border rounded-lg overflow-hidden ${
                          theme === "light"
                            ? "border-gray-200 bg-white"
                            : "border-gray-700 bg-[#1a1a1a]"
                        }`}
                      >
                        <button
                          onClick={() => toggleMarket(marketKey)}
                          className={`w-full p-4 flex items-center justify-between ${
                            theme === "light"
                              ? "bg-gray-50 hover:bg-gray-100"
                              : "bg-[#2a2a2a] hover:bg-[#333]"
                          }`}
                        >
                          <span
                            className={`font-semibold ${
                              theme === "light" ? "text-gray-900" : "text-white"
                            }`}
                          >
                            {market.name || market.market}
                          </span>
                          <svg
                            className={`w-5 h-5 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            } ${
                              theme === "light"
                                ? "text-gray-600"
                                : "text-gray-400"
                            }`}
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
                        </button>
                        {isExpanded && market.values && (
                          <div className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {market.values.map((value: any, vIdx: number) => {
                                // Vérifier si la cote est <= 1 (doit être verrouillée)
                                const oddValue =
                                  typeof value.odd === "string"
                                    ? parseFloat(value.odd)
                                    : value.odd;
                                const isOddLocked =
                                  value.suspended === true ||
                                  oddValue === null ||
                                  oddValue === undefined ||
                                  (typeof oddValue === "number" &&
                                    oddValue <= 1);

                                return (
                                  <button
                                    key={vIdx}
                                    onClick={() => {
                                      if (isOddLocked) return;
                                      const bet = {
                                        fixtureId: matchDetails.fixture.id,
                                        market: market.name || market.market,
                                        selection: value.value || value.label,
                                        odd: oddValue,
                                        handicap: value.handicap || null,
                                        homeTeam: matchDetails.teams.home.name,
                                        awayTeam: matchDetails.teams.away.name,
                                        leagueName: matchDetails.league.name,
                                        timestamp: new Date().toISOString(),
                                      };
                                      betslipLogger.betCreated(bet);
                                      addBet(bet);
                                    }}
                                    disabled={isOddLocked}
                                    className={`p-3 rounded text-center font-semibold transition-colors ${
                                      isOddLocked
                                        ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                                        : isBetInSlip(
                                            matchDetails.fixture.id,
                                            market.name || market.market,
                                            value.value || value.label
                                          )
                                        ? "bg-yellow-500 text-black"
                                        : theme === "light"
                                        ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                                        : "bg-gray-800 text-white hover:bg-gray-700"
                                    }`}
                                  >
                                    <div
                                      className={`text-xs mb-1 ${
                                        theme === "light"
                                          ? "text-gray-600"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {value.value || value.label}
                                    </div>
                                    <div className="text-lg">
                                      {isOddLocked
                                        ? "Verrouillé"
                                        : typeof value.odd === "string"
                                        ? parseFloat(value.odd).toFixed(2)
                                        : value.odd?.toFixed(2) || "N/A"}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p
                  className={`text-center ${
                    theme === "light" ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  Aucune cote disponible
                </p>
              )}
            </div>
          )}

          {activeTab === "headtohead" && (
            <div>
              <h3
                className={`text-xl font-bold mb-4 ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                Historique des confrontations
              </h3>
              {matchDetails.headToHead && matchDetails.headToHead.length > 0 ? (
                <div className="space-y-4">
                  {matchDetails.headToHead.slice(0, 5).map((h2h, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded border ${
                        theme === "light"
                          ? "bg-gray-50 border-gray-200"
                          : "bg-[#1a1a1a] border-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-sm ${
                            theme === "light"
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {new Date(h2h.fixture.date).toLocaleDateString(
                            "fr-FR"
                          )}
                        </span>
                        <span
                          className={`text-sm ${
                            theme === "light"
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {h2h.league.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-semibold ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {h2h.teams.home.name}
                        </span>
                        <span
                          className={`text-xl font-bold ${
                            theme === "light"
                              ? "text-gray-900"
                              : "text-yellow-400"
                          }`}
                        >
                          {h2h.goals.home ?? 0} - {h2h.goals.away ?? 0}
                        </span>
                        <span
                          className={`font-semibold ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {h2h.teams.away.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className={`text-center ${
                    theme === "light" ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  Historique non disponible
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchDetailsView;
