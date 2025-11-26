import { useState, useEffect, useCallback, useRef } from "react";
import Header from "./components/Header";
import ConfigurationModal from "./components/ConfigurationModal";
import { useTheme } from "./contexts/ThemeContext";
import Copon from "./components/Copon";
import DateCarousel from "./components/DateCarousel";
import Meilleuresligues from "./components/Meilleuresligues";
import Recherche from "./components/Recherche";
import SportsCarousel from "./components/SportsCarousel";
import UpcomingMatches from "./components/UpcomingMatches";

// Composants de vues
import LiveMatchesSection from "./components/matches/LiveMatchesSection";
import LeagueView from "./components/matches/LeagueView";
import DateView from "./components/matches/DateView";

// Types
import { Match } from "./components/matchCard/type";

// Services et utilitaires
import {
  fetchLiveMatches,
  fetchLeagueMatches,
  fetchMatchesByDate,
} from "./services/api/matches";
import {
  transformApiDataToMatch,
  validateOdd,
  validateAllOddsInMatch,
  transformMatchDetailsOdds,
  isLiveMatch,
} from "./utils/matchTransformers";
import { ApiMatchResponse } from "./types/api";
import { fetchMatchDetails } from "./services/api/matchDetails";
import { MatchDetails } from "./types/api";
import MatchDetailsView from "./components/MatchDetailsView";

// Hooks personnalisés
import { useFavoriteLeagues } from "./hooks/useFavoriteLeagues";
import { useCollapsedLeagues } from "./hooks/useCollapsedLeagues";
import {
  useSocket,
  OddsUpdateEvent,
  MatchStartedEvent,
} from "./hooks/useSocket";

function App() {
  const [viewType, setViewType] = useState<"LIVE" | "UPCOMING">("LIVE");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedLiveCount, setDisplayedLiveCount] = useState(5);
  const [showAllLive, setShowAllLive] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [leagueMatches, setLeagueMatches] = useState<Match[]>([]);
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateMatches, setDateMatches] = useState<Match[]>([]);
  const [dateLoading, setDateLoading] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [matchDetailsLoading, setMatchDetailsLoading] = useState(false);

  // État pour le modal de configuration
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Utiliser le contexte de thème
  const { theme } = useTheme();

  // Map pour stocker temporairement les directions de changement pour les animations
  const oddsChangeDirections = useRef<Map<string, Map<string, "up" | "down">>>(
    new Map()
  );

  // Hooks personnalisés
  const { favoriteLeagues, toggleFavoriteLeague } = useFavoriteLeagues();
  const { collapsedLeagues, toggleLeagueCollapse, setCollapsedLeagues } =
    useCollapsedLeagues();

  /**
   * Gère les mises à jour de cotes en temps réel via Socket.io
   */
  const handleOddsUpdate = useCallback((update: OddsUpdateEvent) => {
    setMatches((prevMatches) => {
      const matchId = update.matchId.toString();
      const fixtureId = update.fixtureId?.toString();

      // Trouver le match à mettre à jour - essayer plusieurs formats d'ID
      const matchIndex = prevMatches.findIndex((m) => {
        const mId = m.id.toString();
        const mFixtureId = m.id.toString();
        return (
          mId === matchId ||
          mId === fixtureId ||
          (fixtureId && mFixtureId === fixtureId) ||
          mId.includes(matchId) ||
          (fixtureId && mId.includes(fixtureId))
        );
      });

      if (matchIndex === -1) {
        return prevMatches;
      }

      const updatedMatches = [...prevMatches];
      // Créer une nouvelle référence du match pour que React détecte le changement
      const match = { ...updatedMatches[matchIndex] };
      updatedMatches[matchIndex] = match;

      // Mettre à jour le status et le temps elapsed si présents dans la mise à jour
      // Les données du socket peuvent inclure: status: { "short": "1H", "elapsed": 25 }
      if ((update as any).status) {
        const statusData = (update as any).status;
        if (statusData.short) {
          match.status = statusData.short;
        }
        if (statusData.elapsed !== null && statusData.elapsed !== undefined) {
          // Créer une nouvelle référence de time pour que React détecte le changement
          if (!match.time) {
            match.time = {
              elapsed: statusData.elapsed,
              short: statusData.short || match.status || "",
              long: statusData.long || match.status || "",
            };
          } else {
            match.time = {
              ...match.time,
              elapsed: statusData.elapsed,
              short: statusData.short || match.time.short || match.status || "",
              long: statusData.long || match.time.long || match.status || "",
            };
          }
        }
      }

      // Créer ou mettre à jour oddsChanges (nouvelle référence)
      if (!match.oddsChanges) {
        match.oddsChanges = {};
      }

      // S'assurer que odds existe et créer une nouvelle référence si nécessaire
      if (!match.odds) {
        match.odds = {
          _1x2: { _1: "locked", X: "locked", _2: "locked" },
          doubleChance: { _1X: "locked", _12: "locked", X2: "locked" },
          totalGoals: { value: "2.5", over: "locked", under: "locked" },
          ggNg: { GG: "locked", NG: "locked" },
          pairImpaire: { Pair: "locked", Impaire: "locked" },
        };
      } else {
        // Créer une nouvelle référence de odds pour que React détecte le changement
        match.odds = { ...match.odds };
      }

      // Déterminer le marché et le label
      const market = (update.market || "").toLowerCase();
      let marketKey = "_1x2"; // Par défaut
      let label = update.market;

      // Mapper les marchés selon la structure des cotes
      // 1x2 Market - Gérer plusieurs formats possibles
      // Le backend peut envoyer soit le nom du marché ("Match Winner", "Fulltime Result")
      // soit directement le label ("Home", "Draw", "Away", "1", "X", "2")
      // Note: market est déjà en lowercase
      if (
        market === "home" ||
        market === "1" ||
        market === "match winner" ||
        market === "fulltime result" ||
        market === "1x2" ||
        market.includes("home team")
      ) {
        marketKey = "_1x2";
        label = "_1";
      } else if (market === "draw" || market === "x" || market === "tie") {
        marketKey = "_1x2";
        label = "X";
      } else if (
        market === "away" ||
        market === "2" ||
        market.includes("away team")
      ) {
        marketKey = "_1x2";
        label = "_2";
      }
      // Double Chance Market
      else if (market === "1x" || market === "home/draw") {
        marketKey = "doubleChance";
        label = "_1X";
      } else if (market === "12" || market === "home/away") {
        marketKey = "doubleChance";
        label = "_12";
      } else if (market === "x2" || market === "draw/away") {
        marketKey = "doubleChance";
        label = "X2";
      }
      // Total Goals Market - Gérer plusieurs formats possibles
      // Le backend peut envoyer: "Over 2.5", "over 2.5", "Over/2.5", "Over 2.5 Goals", etc.
      else if (
        market.includes("over") ||
        market.includes("+") ||
        market.startsWith("o") ||
        (market.includes("goals") && market.includes("over"))
      ) {
        marketKey = "totalGoals";
        // Extraire la ligne si présente (ex: "over 2.5" -> "2.5", "over/2.5" -> "2.5")
        const lineMatch = market.match(/(\d+\.?\d*)/);
        const line = lineMatch ? lineMatch[1] : "2.5";
        label = `over_${line}`;

        // S'assurer que totalGoals existe
        if (!match.odds.totalGoals) {
          match.odds.totalGoals = {
            value: line,
            over: "locked",
            under: "locked",
            allLines: {},
          };
        } else {
          // Créer une nouvelle référence pour totalGoals
          match.odds.totalGoals = { ...match.odds.totalGoals };
        }

        // Mettre à jour la ligne par défaut si nécessaire
        if (!match.odds.totalGoals.value) {
          match.odds.totalGoals.value = line;
        }

        // Initialiser allLines si nécessaire
        if (!match.odds.totalGoals.allLines) {
          match.odds.totalGoals.allLines = {};
        }

        // Mettre à jour dans allLines (créer une nouvelle référence pour l'immutabilité)
        const existingLine = match.odds.totalGoals.allLines[line];
        // Vérifier si la cote est suspendue (suspended: true = afficher "locked")
        // Valider aussi que la cote est > 1
        const overValue =
          update.suspended === true ? "locked" : validateOdd(update.newOdd);
        match.odds.totalGoals.allLines = {
          ...match.odds.totalGoals.allLines,
          [line]: {
            over: overValue,
            under: existingLine?.under || "locked",
          },
        };

        // Mettre à jour la cote principale si c'est la ligne par défaut
        if (match.odds.totalGoals.value === line) {
          match.odds.totalGoals.over = overValue;
        }
      } else if (
        market.includes("under") ||
        market.includes("-") ||
        market.startsWith("u") ||
        (market.includes("goals") && market.includes("under"))
      ) {
        marketKey = "totalGoals";
        // Extraire la ligne si présente (ex: "under 2.5" -> "2.5", "under/2.5" -> "2.5")
        const lineMatch = market.match(/(\d+\.?\d*)/);
        const line = lineMatch ? lineMatch[1] : "2.5";
        label = `under_${line}`;

        // S'assurer que totalGoals existe
        if (!match.odds.totalGoals) {
          match.odds.totalGoals = {
            value: line,
            over: "locked",
            under: "locked",
            allLines: {},
          };
        } else {
          // Créer une nouvelle référence pour totalGoals
          match.odds.totalGoals = { ...match.odds.totalGoals };
        }

        // Mettre à jour la ligne par défaut si nécessaire
        if (!match.odds.totalGoals.value) {
          match.odds.totalGoals.value = line;
        }

        // Initialiser allLines si nécessaire
        if (!match.odds.totalGoals.allLines) {
          match.odds.totalGoals.allLines = {};
        }

        // Mettre à jour dans allLines (créer une nouvelle référence pour l'immutabilité)
        const existingLine = match.odds.totalGoals.allLines[line];
        // Vérifier si la cote est suspendue (suspended: true = afficher "locked")
        // Valider aussi que la cote est > 1
        const underValue =
          update.suspended === true ? "locked" : validateOdd(update.newOdd);
        match.odds.totalGoals.allLines = {
          ...match.odds.totalGoals.allLines,
          [line]: {
            over: existingLine?.over || "locked",
            under: underValue,
          },
        };

        // Mettre à jour la cote principale si c'est la ligne par défaut
        if (match.odds.totalGoals.value === line) {
          match.odds.totalGoals.under = underValue;
        }
      }
      // GG/NG Market
      else if (
        market === "yes" ||
        market === "gg" ||
        market === "both teams to score"
      ) {
        marketKey = "ggNg";
        label = "GG";
      } else if (
        market === "no" ||
        market === "ng" ||
        market === "not both teams to score"
      ) {
        marketKey = "ggNg";
        label = "NG";
      }
      // Pair/Impaire Market
      else if (market === "even" || market === "pair") {
        marketKey = "pairImpaire";
        label = "Pair";
      } else if (market === "odd" || market === "impaire") {
        marketKey = "pairImpaire";
        label = "Impaire";
      }

      // Créer une nouvelle référence de oddsChanges pour que React détecte le changement
      if (!match.oddsChanges) {
        match.oddsChanges = {};
      }
      match.oddsChanges = { ...match.oddsChanges };

      if (!match.oddsChanges[marketKey]) {
        match.oddsChanges[marketKey] = {};
      }
      match.oddsChanges[marketKey] = { ...match.oddsChanges[marketKey] };

      // Enregistrer la direction du changement
      match.oddsChanges[marketKey][label] = update.trend;

      // Mettre à jour la cote dans odds
      if (match.odds && match.odds[marketKey]) {
        // Créer une nouvelle référence du marketKey pour que React détecte le changement
        const oddsObj = match.odds[marketKey] as any;
        match.odds[marketKey] = { ...oddsObj };

        // Pour totalGoals, on a déjà mis à jour dans le bloc précédent
        if (
          marketKey === "totalGoals" &&
          (label.startsWith("over_") || label.startsWith("under_"))
        ) {
          // Déjà géré ci-dessus
        } else if (oddsObj[label] !== undefined) {
          // Vérifier si la cote est suspendue (suspended: true = afficher "locked")
          // Valider aussi que la cote est > 1
          (match.odds[marketKey] as any)[label] =
            update.suspended === true ? "locked" : validateOdd(update.newOdd);
        } else {
          // Essayer de trouver le label avec différentes variations
          const labelVariations = [
            label,
            label.toLowerCase(),
            label.toUpperCase(),
            label.replace("_", ""),
          ];

          let foundLabel = null;
          for (const variation of labelVariations) {
            if (oddsObj[variation] !== undefined) {
              foundLabel = variation;
              break;
            }
          }

          if (foundLabel) {
            // Vérifier si la cote est suspendue (suspended: true = afficher "locked")
            // Valider aussi que la cote est > 1
            (match.odds[marketKey] as any)[foundLabel] =
              update.suspended === true ? "locked" : validateOdd(update.newOdd);
          }
        }
      }

      // Mettre à jour aussi dans rawMarkets si disponible (pour les marchés supplémentaires)
      if (match.rawMarkets && Array.isArray(match.rawMarkets)) {
        // Déterminer si le match est live
        const isLive = isLiveMatch(match.status);

        // Trouver le marché correspondant dans rawMarkets
        // Pour Total Goals en live, utiliser UNIQUEMENT "Over/Under Line"
        const marketNameMap: Record<string, string[]> = {
          _1x2: ["Fulltime Result", "1x2", "Match Winner"],
          doubleChance: ["Double Chance"],
          totalGoals: isLive
            ? ["Over/Under Line", "Over/Under Line (1st Half)"] // Pour les matchs live, uniquement "Over/Under Line"
            : ["Over/Under Line", "Match Goals", "Goals Over/Under"], // Pour les matchs à venir, tous les marchés
          ggNg: ["Both Teams to Score", "Both Teams To Score"],
          pairImpaire: ["Goals Odd/Even", "Odd/Even"],
        };

        const possibleMarketNames = marketNameMap[marketKey] || [];
        const rawMarket = match.rawMarkets.find((m: any) =>
          possibleMarketNames.some((name) => m.market === name)
        );

        if (rawMarket && rawMarket.values && Array.isArray(rawMarket.values)) {
          // Trouver la valeur correspondante
          const valueMap: Record<string, string[]> = {
            _1: ["Home", "1"],
            X: ["Draw", "X"],
            _2: ["Away", "2"],
            _1X: ["1X", "Home Draw"],
            _12: ["12", "Home Away"],
            X2: ["X2", "Draw Away"],
            GG: ["Yes", "GG"],
            NG: ["No", "NG"],
            Pair: ["Even", "Pair"],
            Impaire: ["Odd", "Impaire"],
          };

          const possibleValues = valueMap[label] || [label];
          const value = rawMarket.values.find((v: any) =>
            possibleValues.some(
              (pv) =>
                (v.value && v.value.toLowerCase() === pv.toLowerCase()) ||
                (v.label && v.label.toLowerCase() === pv.toLowerCase())
            )
          );

          if (value) {
            // Vérifier si la cote est suspendue (suspended: true = afficher "locked")
            // Valider aussi que la cote est > 1
            value.odd =
              update.suspended === true ? "locked" : validateOdd(update.newOdd);
          }
        }
      }

      // Stocker la direction pour les animations (sera réinitialisée après l'animation)
      const matchKey = match.id;
      if (!oddsChangeDirections.current.has(matchKey)) {
        oddsChangeDirections.current.set(matchKey, new Map());
      }
      const changeKey = `${marketKey}_${label}`;
      oddsChangeDirections.current.get(matchKey)!.set(changeKey, update.trend);

      // Réinitialiser la direction après l'animation (5 secondes)
      setTimeout(() => {
        oddsChangeDirections.current.get(matchKey)?.delete(changeKey);
        setMatches((currentMatches) => {
          const newMatches = [...currentMatches];
          const idx = newMatches.findIndex((m) => m.id === matchKey);
          if (idx !== -1 && newMatches[idx].oddsChanges?.[marketKey]?.[label]) {
            delete newMatches[idx].oddsChanges[marketKey][label];
            if (
              Object.keys(newMatches[idx].oddsChanges[marketKey]).length === 0
            ) {
              delete newMatches[idx].oddsChanges[marketKey];
            }
            if (Object.keys(newMatches[idx].oddsChanges || {}).length === 0) {
              delete newMatches[idx].oddsChanges;
            }
          }
          return newMatches;
        });
      }, 5000);

      // VALIDATION FINALE: Valider toutes les cotes après mise à jour socket
      const finalValidatedMatches = updatedMatches.map(validateAllOddsInMatch);
      return finalValidatedMatches;
    });
  }, []);

  /**
   * Gère les matchs qui commencent (passent de upcoming à live)
   */
  const handleMatchStarted = useCallback(
    async (event: MatchStartedEvent) => {
      const matchId = event.matchId?.toString();
      const fixtureId = event.fixtureId?.toString();

      if (!matchId && !fixtureId) {
        return;
      }

      // Vérifier si le match n'est pas déjà dans la liste live
      const isAlreadyInLive = matches.some((m) => {
        const mId = m.id.toString();
        return (
          mId === matchId ||
          mId === fixtureId ||
          (fixtureId && mId.includes(fixtureId)) ||
          (matchId && mId.includes(matchId))
        );
      });

      if (isAlreadyInLive) {
        return;
      }

      // Si le socket a envoyé les données complètes du match, les utiliser
      if (event.match) {
        try {
          const transformedMatch = transformApiDataToMatch(
            event.match as ApiMatchResponse
          );
          // VALIDATION FINALE: Valider toutes les cotes du match transformé
          const validatedMatch = validateAllOddsInMatch(transformedMatch);
          setMatches((prevMatches) => {
            // Vérifier à nouveau pour éviter les doublons
            const exists = prevMatches.some(
              (m) => m.id.toString() === validatedMatch.id.toString()
            );
            if (exists) {
              return prevMatches;
            }
            return [validatedMatch, ...prevMatches];
          });
          return;
        } catch (error) {
          console.error(
            "❌ [App] Erreur lors de la transformation du match:",
            error
          );
        }
      }

      // Retirer le match de leagueMatches et dateMatches s'il y est
      setLeagueMatches((prevLeagueMatches) => {
        return prevLeagueMatches.filter((m) => {
          const mId = m.id.toString();
          return (
            mId !== matchId &&
            mId !== fixtureId &&
            !(fixtureId && mId.includes(fixtureId)) &&
            !(matchId && mId.includes(matchId))
          );
        });
      });

      setDateMatches((prevDateMatches) => {
        return prevDateMatches.filter((m) => {
          const mId = m.id.toString();
          return (
            mId !== matchId &&
            mId !== fixtureId &&
            !(fixtureId && mId.includes(fixtureId)) &&
            !(matchId && mId.includes(matchId))
          );
        });
      });

      // Sinon, recharger les matchs live de manière silencieuse
      try {
        const result = await fetchLiveMatches();
        // VALIDATION FINALE: S'assurer que toutes les cotes sont validées
        const validatedMatches = result.matches.map(validateAllOddsInMatch);
        setMatches(validatedMatches);
      } catch (error) {
        console.error(
          "❌ [App] Erreur lors du rechargement des matchs live:",
          error
        );
      }
    },
    [matches]
  );

  // Connexion Socket.io pour les mises à jour en temps réel
  const { connected: socketConnected } = useSocket({
    onOddsUpdate: handleOddsUpdate,
    onMatchStarted: handleMatchStarted,
    autoConnect: true,
  });

  // Fonction pour récupérer les données de l'API (chargement initial uniquement)
  const loadMatches = async (silent: boolean = false) => {
    if (loading && !silent) {
      return;
    }

    let loadingTimeout: NodeJS.Timeout | null = null;

    try {
      if (!silent) {
        setLoading(true);
        loadingTimeout = setTimeout(() => {
          setLoading(false);
          setError("Timeout: Le serveur ne répond pas");
          // Ne pas vider les matchs déjà chargés en cas de timeout
          // setMatches([]);
        }, 25000); // Augmenté à 25 secondes pour correspondre au timeout API
      }
      setError(null);

      const result = await fetchLiveMatches();

      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }

      // VALIDATION FINALE: S'assurer que toutes les cotes sont validées
      const validatedMatches = result.matches.map(validateAllOddsInMatch);
      setMatches(validatedMatches);

      if (!silent) {
        setShowAllLive(false);
        setShowAllUpcoming(false);
      }
    } catch (err) {
      console.error("Error loading matches:", err);

      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }

      if (!silent) {
        // Afficher un message d'erreur plus clair à l'utilisateur
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "Une erreur est survenue lors du chargement des matchs. Veuillez réessayer."
          );
        }
        setMatches([]);
        setLoading(false);
      }
    } finally {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadLeagueMatches = async (leagueId: number, leagueName: string) => {
    try {
      setLeagueLoading(true);
      setError(null);
      setSelectedLeague(leagueName);

      // Récupérer les matchs à venir de la ligue
      const upcomingResult = await fetchLeagueMatches(leagueId);

      // Récupérer aussi les matchs live et filtrer par ligue
      let liveMatchesForLeague: Match[] = [];
      try {
        const liveResult = await fetchLiveMatches();
        // Filtrer les matchs live pour ne garder que ceux de cette ligue
        liveMatchesForLeague = liveResult.matches.filter((match) => {
          if (typeof match.league === "object" && match.league.id) {
            return match.league.id === leagueId;
          } else if (typeof match.league === "object" && match.league.name) {
            return match.league.name === leagueName;
          }
          return false;
        });
      } catch (liveErr) {
        // Continuer même si la récupération des matchs live échoue
      }

      // Combiner les matchs : live en premier, puis à venir
      const allMatches = [...liveMatchesForLeague, ...upcomingResult.matches];
      setLeagueMatches(allMatches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setLeagueMatches([]);
    } finally {
      setLeagueLoading(false);
    }
  };

  const loadMatchesByDate = async (
    date: string,
    endDate?: string,
    leagueId?: number,
    season?: number
  ) => {
    try {
      setDateLoading(true);
      setError(null);
      setSelectedDate(date);

      const result = await fetchMatchesByDate(date, endDate, leagueId, season);
      setDateMatches(result.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setDateMatches([]);
    } finally {
      setDateLoading(false);
    }
  };

  const handleLeagueClick = (leagueId: number, leagueName: string) => {
    loadLeagueMatches(leagueId, leagueName);
  };

  const handleBackToMain = () => {
    setSelectedLeague(null);
    setLeagueMatches([]);
    setSelectedDate(null);
    setDateMatches([]);
  };

  const handleResetToInitial = () => {
    // Réinitialiser tous les états de navigation
    setSelectedLeague(null);
    setLeagueMatches([]);
    setSelectedDate(null);
    setDateMatches([]);
    setSelectedMatchId(null);
    setMatchDetails(null);
    setShowAllLive(false);
    setShowAllUpcoming(false);
    setViewType("LIVE");

    // Recharger les matchs live et upcoming pour restaurer la vue initiale
    loadMatches(false);
  };

  const handleDateSelect = (date: string | null) => {
    if (date) {
      loadMatchesByDate(date);
    } else {
      handleBackToMain();
    }
  };

  const handleMatchClick = async (matchId: number) => {
    setSelectedMatchId(matchId);
    setMatchDetailsLoading(true);
    try {
      const details = await fetchMatchDetails(matchId);
      // Transformer les odds pour qu'ils soient dans le même format que les matchs
      const transformedDetails = transformMatchDetailsOdds(details);
      setMatchDetails(transformedDetails);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Erreur lors du chargement des détails"
      );
      setSelectedMatchId(null);
    } finally {
      setMatchDetailsLoading(false);
    }
  };

  const handleBackFromDetails = () => {
    setSelectedMatchId(null);
    setMatchDetails(null);
  };

  // Chargement initial uniquement (plus de polling grâce à Socket.io)
  useEffect(() => {
    setLoading(false);
    if (!selectedLeague && !selectedDate) {
      loadMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeague, selectedDate]);

  // Écouter les événements personnalisés pour les matchs qui commencent depuis UpcomingMatches
  useEffect(() => {
    const handleMatchStartedFromUpcoming = async (event: Event) => {
      const customEvent = event as CustomEvent<{ matchIds: string[] }>;
      const { matchIds } = customEvent.detail;

      // Recharger les matchs live de manière silencieuse pour inclure les nouveaux matchs
      try {
        const result = await fetchLiveMatches();
        // VALIDATION FINALE: S'assurer que toutes les cotes sont validées
        const validatedMatches = result.matches.map(validateAllOddsInMatch);
        setMatches(validatedMatches);
      } catch (error) {
        console.error(
          "❌ [App] Erreur lors du rechargement des matchs live après détection depuis UpcomingMatches:",
          error
        );
      }
    };

    window.addEventListener(
      "matchStartedFromUpcoming",
      handleMatchStartedFromUpcoming
    );

    return () => {
      window.removeEventListener(
        "matchStartedFromUpcoming",
        handleMatchStartedFromUpcoming
      );
    };
  }, []);

  // Afficher le statut de connexion Socket.io
  useEffect(() => {}, [socketConnected]);

  return (
    <div
      className={`min-h-screen w-full overflow-x-hidden ${
        theme === "light" ? "bg-white text-gray-900" : "bg-[#0a0a0a] text-white"
      }`}
    >
      {/* MOBILE LAYOUT */}
      <div className="desktop:hidden flex flex-col gap-4 w-full">
        {/* Header - Toujours affiché en premier */}
        <div className="px-4 sm:px-6">
          <Header
            onReset={handleResetToInitial}
            onSettingsClick={() => setIsConfigModalOpen(true)}
          />
        </div>

        {/* DateCarousel et SportsCarousel - Toujours affichés */}
        {!showAllLive &&
          !showAllUpcoming &&
          !selectedLeague &&
          !selectedDate && (
            <>
              <div className="w-full px-4 sm:px-6">
                <DateCarousel onDateSelect={handleDateSelect} />
              </div>
              <div className="w-full px-4 sm:px-6 py-2">
                <SportsCarousel />
              </div>
            </>
          )}

        <div className="px-4 sm:px-6">
          <Recherche />
        </div>
        <div className="px-4 sm:px-6">
          <Copon />
        </div>

        {/* Meilleures ligues - Affichée avant les matchs en mode mobile */}
        {!selectedLeague && !selectedDate && (
          <div className="px-4 sm:px-6">
            <Meilleuresligues onLeagueClick={handleLeagueClick} />
          </div>
        )}

        {/* Affichage des détails du match si sélectionné */}
        {selectedMatchId && matchDetails && (
          <div className="px-4 sm:px-6 mb-4">
            <MatchDetailsView
              matchDetails={matchDetails}
              onBack={handleBackFromDetails}
              isCompact={true}
            />
          </div>
        )}

        {matchDetailsLoading && (
          <div className="px-4 sm:px-6 mb-4">
            <div
              className={`p-6 rounded-lg text-center ${
                theme === "light"
                  ? "bg-white border border-gray-200"
                  : "bg-[#2a2a2a] border border-gray-800"
              }`}
            >
              <p className={theme === "light" ? "text-gray-900" : "text-white"}>
                Chargement des détails...
              </p>
            </div>
          </div>
        )}

        <div
          className={`py-4 px-4 sm:px-6 ${
            theme === "light" ? "bg-white" : "bg-[#2e2e2e]"
          }`}
        >
          {selectedLeague ? (
            <LeagueView
              leagueName={selectedLeague}
              matches={leagueMatches}
              loading={leagueLoading}
              onBack={handleBackToMain}
              isMobile={true}
              onMatchClick={handleMatchClick}
            />
          ) : selectedDate ? (
            <DateView
              date={selectedDate}
              matches={dateMatches}
              loading={dateLoading}
              onBack={handleBackToMain}
              favoriteLeagues={favoriteLeagues}
              collapsedLeagues={collapsedLeagues}
              onToggleFavorite={toggleFavoriteLeague}
              onToggleCollapse={toggleLeagueCollapse}
              isMobile={true}
              onMatchClick={handleMatchClick}
            />
          ) : loading ? (
            <div className="text-center py-8">
              <div className="text-yellow-400 text-lg">
                Chargement des matchs...
              </div>
              <div className="text-gray-400 text-sm mt-2">
                {socketConnected
                  ? "Connexion Socket.io active"
                  : "Connexion au serveur..."}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 text-lg">Erreur: {error}</div>
            </div>
          ) : (
            <>
              {matches.length > 0 && !showAllUpcoming && (
                <LiveMatchesSection
                  matches={matches}
                  showAllLive={showAllLive}
                  displayedLiveCount={displayedLiveCount}
                  onShowAll={() => setShowAllLive(true)}
                  favoriteLeagues={favoriteLeagues}
                  collapsedLeagues={collapsedLeagues}
                  onToggleFavorite={toggleFavoriteLeague}
                  onToggleCollapse={toggleLeagueCollapse}
                  setCollapsedLeagues={setCollapsedLeagues}
                  onMatchClick={handleMatchClick}
                />
              )}
              {!showAllLive && (
                <>
                  <div
                    className={`text-yellow-400 font-bold text-xl px-4 py-2 mb-4 mt-8 ${
                      theme === "light" ? "bg-gray-900" : "bg-[#2a2a2a]"
                    }`}
                  >
                    Match à venir
                  </div>
                  <UpcomingMatches
                    showAllUpcoming={showAllUpcoming}
                    setShowAllUpcoming={setShowAllUpcoming}
                    onMatchClick={handleMatchClick}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden desktop:flex flex-row gap-4 desktop:gap-6 w-full px-4 desktop:px-6 overflow-x-hidden">
        <div className="flex-none w-64 desktop:w-72 min-w-[200px]">
          <Meilleuresligues onLeagueClick={handleLeagueClick} />
        </div>

        <div className="flex flex-row gap-2 desktop:gap-4 flex-1 min-w-0 overflow-hidden">
          <div className="flex flex-col gap-4 flex-1 min-w-0 overflow-hidden">
            {/* Header - Toujours affiché en premier */}
            <Header
              onReset={handleResetToInitial}
              onSettingsClick={() => setIsConfigModalOpen(true)}
            />

            {/* DateCarousel et SportsCarousel - Affichés seulement si aucun match sélectionné */}
            {!selectedMatchId &&
              !showAllLive &&
              !showAllUpcoming &&
              !selectedLeague &&
              !selectedDate && (
                <>
                  <div className="w-full">
                    <DateCarousel onDateSelect={handleDateSelect} />
                  </div>
                  <div className="w-full py-2">
                    <SportsCarousel />
                  </div>
                </>
              )}

            {/* Affichage des détails du match si sélectionné - Desktop */}
            {selectedMatchId && matchDetails && (
              <div className="mb-4">
                <MatchDetailsView
                  matchDetails={matchDetails}
                  onBack={handleBackFromDetails}
                  isCompact={true}
                />
              </div>
            )}

            {matchDetailsLoading && (
              <div className="mb-4">
                <div
                  className={`p-6 rounded-lg text-center ${
                    theme === "light"
                      ? "bg-white border border-gray-200"
                      : "bg-[#2a2a2a] border border-gray-800"
                  }`}
                >
                  <p
                    className={
                      theme === "light" ? "text-gray-900" : "text-white"
                    }
                  >
                    Chargement des détails...
                  </p>
                </div>
              </div>
            )}

            <div className="py-4 overflow-x-hidden">
              {selectedLeague ? (
                <LeagueView
                  leagueName={selectedLeague}
                  matches={leagueMatches}
                  loading={leagueLoading}
                  onBack={handleBackToMain}
                  isMobile={false}
                  onMatchClick={handleMatchClick}
                />
              ) : selectedDate ? (
                <DateView
                  date={selectedDate}
                  matches={dateMatches}
                  loading={dateLoading}
                  onBack={handleBackToMain}
                  favoriteLeagues={favoriteLeagues}
                  collapsedLeagues={collapsedLeagues}
                  onToggleFavorite={toggleFavoriteLeague}
                  onToggleCollapse={toggleLeagueCollapse}
                  isMobile={false}
                  onMatchClick={handleMatchClick}
                />
              ) : selectedMatchId ? null : loading ? (
                <div className="text-center py-8">
                  <div className="text-yellow-400 text-lg">
                    Chargement des matchs...
                  </div>
                  <div className="text-gray-400 text-sm mt-2">
                    {socketConnected
                      ? "Connexion Socket.io active"
                      : "Connexion au serveur..."}
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-red-400 text-lg">Erreur: {error}</div>
                </div>
              ) : (
                <>
                  {matches.length > 0 && !showAllUpcoming && (
                    <LiveMatchesSection
                      matches={matches}
                      showAllLive={showAllLive}
                      displayedLiveCount={displayedLiveCount}
                      onShowAll={() => setShowAllLive(true)}
                      favoriteLeagues={favoriteLeagues}
                      collapsedLeagues={collapsedLeagues}
                      onToggleFavorite={toggleFavoriteLeague}
                      onToggleCollapse={toggleLeagueCollapse}
                      setCollapsedLeagues={setCollapsedLeagues}
                      onMatchClick={handleMatchClick}
                    />
                  )}
                  {!showAllLive && (
                    <>
                      <div
                        className={`text-yellow-400 font-bold text-xl px-4 py-2 mb-4 mt-8 ${
                          theme === "light" ? "bg-gray-900" : "bg-[#2a2a2a]"
                        }`}
                      >
                        Match à venir
                      </div>
                      <UpcomingMatches
                        showAllUpcoming={showAllUpcoming}
                        setShowAllUpcoming={setShowAllUpcoming}
                        onMatchClick={handleMatchClick}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex-none w-56 desktop:w-64 min-w-[180px] flex-shrink-0 flex flex-col gap-4">
            <Recherche />
            <Copon />
          </div>
        </div>
      </div>

      {/* Modal de Configuration */}
      <ConfigurationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
}

export default App;
