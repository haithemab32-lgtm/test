import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useBetSlip } from "../contexts/BetSlipContext";
import { useOddsFormat } from "../contexts/OddsFormatContext";
import { formatOdds } from "../utils/oddsFormatters";
import { formatDateTime } from "../utils/dateFormatters";
import { Bet, MatchInfo } from "../types/betslip";
import { betslipLogger } from "../utils/betslipLogger";
import ValidationModal from "./ValidationModal";
import { fetchMatchDetails } from "../services/api/matchDetails";
import { isLiveMatch } from "../utils/matchTransformers";

export default function Copon() {
  const { theme } = useTheme();
  const { oddsFormat } = useOddsFormat();
  const {
    bets,
    totalOdds,
    stake,
    potentialWin,
    shareCode,
    status,
    validationResult,
    clearBets,
    setStake,
    shareBetSlip,
    removeBet,
    validateBetSlip,
    updateOddsAfterValidation,
  } = useBetSlip();

  // Log pour voir les bets (uniquement en développement)
  useEffect(() => {
    betslipLogger.currentBets(bets);
  }, [bets]);

  // Récupérer les informations des matchs pour affichage avant validation
  useEffect(() => {
    const fetchMatchesInfo = async () => {
      const fixtureIds = [...new Set(bets.map((bet) => bet.fixtureId))];
      const newMatchesInfo: Record<number, MatchInfo | null> = {};

      await Promise.all(
        fixtureIds.map(async (fixtureId) => {
          // Ne pas récupérer si déjà en cache ou si déjà dans validationResult
          if (
            matchesInfo[fixtureId] ||
            validationResult?.matchInfo?.[fixtureId]
          ) {
            return;
          }

          try {
            const matchDetails = await fetchMatchDetails(fixtureId);
            const isLive = isLiveMatch(
              matchDetails.fixture.status?.short || ""
            );

            newMatchesInfo[fixtureId] = {
              fixtureId,
              isLive,
              status: {
                short: matchDetails.fixture.status?.short || "NS",
                long: matchDetails.fixture.status?.long || "Not Started",
                elapsed: matchDetails.fixture.status?.elapsed || null,
              },
              score: matchDetails.goals
                ? {
                    home: matchDetails.goals.home || 0,
                    away: matchDetails.goals.away || 0,
                  }
                : null,
              teams: {
                home: {
                  id: matchDetails.teams.home.id,
                  name: matchDetails.teams.home.name,
                  logo: matchDetails.teams.home.logo || null,
                },
                away: {
                  id: matchDetails.teams.away.id,
                  name: matchDetails.teams.away.name,
                  logo: matchDetails.teams.away.logo || null,
                },
              },
              league: {
                id: matchDetails.league.id,
                name: matchDetails.league.name,
                country: matchDetails.league.country,
              },
            };
          } catch (error) {
            console.error(
              `Erreur lors de la récupération des détails du match ${fixtureId}:`,
              error
            );
            newMatchesInfo[fixtureId] = null;
          }
        })
      );

      if (Object.keys(newMatchesInfo).length > 0) {
        setMatchesInfo((prev) => ({ ...prev, ...newMatchesInfo }));
      }
    };

    if (bets.length > 0) {
      fetchMatchesInfo();
    }
  }, [bets, validationResult]);

  const [localStake, setLocalStake] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pendingValidationResult, setPendingValidationResult] =
    useState<any>(null);
  const [matchesInfo, setMatchesInfo] = useState<
    Record<number, MatchInfo | null>
  >({});

  const handleShare = async () => {
    if (bets.length === 0) return;
    setIsValidating(true);
    const code = await shareBetSlip();
    setIsValidating(false);
    if (code) {
      setShowShareModal(true);
    }
  };

  const handleValidate = async () => {
    if (bets.length === 0) return;
    setIsValidating(true);
    const result = await validateBetSlip();
    setIsValidating(false);

    if (result) {
      // Afficher la modal avec les résultats de validation
      setPendingValidationResult(result);
      setShowValidationModal(true);
    }
  };

  const handleConfirmValidation = async () => {
    if (!pendingValidationResult) return;

    // Vérifier s'il y a des changements de cotes à appliquer
    const hasChanges =
      pendingValidationResult.changes &&
      pendingValidationResult.changes.length > 0;

    if (hasChanges) {
      // Il y a des changements de cotes, mettre à jour
      setIsValidating(true);
      try {
        updateOddsAfterValidation(pendingValidationResult.changes);
        betslipLogger.log(
          "Cotes mises à jour après validation",
          pendingValidationResult.changes
        );
      } catch (error) {
        console.error("Erreur lors de la mise à jour des cotes:", error);
      } finally {
        setIsValidating(false);
      }
    }

    // Fermer la modal dans tous les cas
    setShowValidationModal(false);
    setPendingValidationResult(null);
  };

  const handleCancelValidation = () => {
    setShowValidationModal(false);
    setPendingValidationResult(null);
  };

  const handleStakeChange = (value: string) => {
    setLocalStake(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setStake(numValue);
    } else if (value === "") {
      setStake(0);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optionnel: afficher un toast de confirmation
  };

  const formatMarketName = (market: string): string => {
    const marketMap: Record<string, string> = {
      "Match Winner": "1x2",
      "Over/Under Line": "Total Goals",
      "Both Teams To Score": "BTTS",
      "Double Chance": "Double Chance",
      "Odd/Even": "Pair/Impaire",
    };
    return marketMap[market] || market;
  };

  const formatSelection = (
    selection: string,
    handicap?: string | null
  ): string => {
    if (handicap) {
      return `${selection} ${handicap}`;
    }
    const selectionMap: Record<string, string> = {
      Home: "1",
      Draw: "X",
      Away: "2",
      Yes: "Oui",
      No: "Non",
      Over: "Over",
      Under: "Under",
      Even: "Pair",
      Odd: "Impaire",
    };
    return selectionMap[selection] || selection;
  };

  return (
    <div
      className={`flex flex-col rounded-md shadow-md w-full p-3 ${
        theme === "light"
          ? "bg-white text-gray-900"
          : "bg-[#2a2a2a] text-accent"
      }`}
    >
      <p
        className={`text-lg font-semibold uppercase mb-2 ${
          theme === "light" ? "text-gray-900" : "text-accent"
        }`}
      >
        Coupon de pari
      </p>
      <div
        className={`w-full h-px my-2 ${
          theme === "light" ? "bg-gray-200" : "bg-black"
        }`}
      ></div>

      {bets.length === 0 ? (
        <p
          className={`text-sm ${
            theme === "light" ? "text-gray-700" : "text-white"
          }`}
        >
          Vous n'avez aucun ticket de pari ouvert
        </p>
      ) : (
        <div className="space-y-3">
          {/* Liste des paris - Groupés par match */}
          <div className="space-y-3">
            {(() => {
              // Grouper les paris par fixtureId
              const betsByMatch = bets.reduce((acc, bet) => {
                if (!acc[bet.fixtureId]) {
                  acc[bet.fixtureId] = [];
                }
                acc[bet.fixtureId].push(bet);
                return acc;
              }, {} as Record<number, Bet[]>);

              return Object.entries(betsByMatch).map(
                ([fixtureId, matchBets]) => {
                  const firstBet = matchBets[0];
                  // Utiliser validationResult si disponible, sinon utiliser matchesInfo
                  const matchInfo =
                    validationResult?.matchInfo?.[fixtureId] ||
                    matchesInfo[parseInt(fixtureId)];
                  const isLive = matchInfo?.isLive || false;
                  const score = matchInfo?.score;
                  const status = matchInfo?.status;
                  const teams = matchInfo?.teams;

                  // Identifier les bets fermés pour ce match
                  const closedBetsForThisMatch =
                    validationResult?.closed?.filter(
                      (closed) => closed.fixtureId === parseInt(fixtureId)
                    ) || [];

                  // Vérifier si le match est fermé/terminé
                  const isMatchFinished =
                    status?.short &&
                    [
                      "FT",
                      "AET",
                      "PEN",
                      "CANC",
                      "SUSP",
                      "INT",
                      "ABAN",
                      "AWD",
                    ].includes(status.short);
                  const isMatchPostponed = status?.short === "PST";
                  const isMatchUpcoming =
                    status?.short && ["NS", "TBD"].includes(status.short);

                  return (
                    <div
                      key={fixtureId}
                      className={`rounded ${
                        theme === "light" ? "bg-gray-50" : "bg-[#1a1a1a]"
                      } ${
                        isLive
                          ? "border-l-2 border-red-500"
                          : isMatchFinished
                          ? "border-l-2 border-gray-500 opacity-75"
                          : isMatchPostponed
                          ? "border-l-2 border-orange-500"
                          : ""
                      }`}
                    >
                      {/* En-tête du match */}
                      <div
                        className={`p-2 border-b ${
                          theme === "light"
                            ? "border-gray-300"
                            : "border-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {/* Logos des équipes si disponibles */}
                          {teams?.home.logo && teams?.away.logo && (
                            <div className="flex items-center gap-1">
                              <img
                                src={teams.home.logo}
                                alt={teams.home.name}
                                className="w-4 h-4 object-contain"
                              />
                              <span className="text-[10px] text-gray-400">
                                vs
                              </span>
                              <img
                                src={teams.away.logo}
                                alt={teams.away.name}
                                className="w-4 h-4 object-contain"
                              />
                            </div>
                          )}
                          <p
                            className={`text-xs font-semibold truncate ${
                              theme === "light" ? "text-gray-900" : "text-white"
                            }`}
                          >
                            {teams?.home.name || firstBet.homeTeam} vs{" "}
                            {teams?.away.name || firstBet.awayTeam}
                          </p>
                          {isLive && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${
                                theme === "light"
                                  ? "bg-red-500 text-white"
                                  : "bg-red-600 text-white"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                              LIVE
                            </span>
                          )}
                          {isMatchFinished && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                theme === "light"
                                  ? "bg-gray-400 text-white"
                                  : "bg-gray-600 text-white"
                              }`}
                            >
                              TERMINÉ
                            </span>
                          )}
                          {isMatchPostponed && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                theme === "light"
                                  ? "bg-orange-400 text-white"
                                  : "bg-orange-600 text-white"
                              }`}
                            >
                              REPORTÉ
                            </span>
                          )}
                          {status?.short === "CANC" && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                theme === "light"
                                  ? "bg-red-400 text-white"
                                  : "bg-red-700 text-white"
                              }`}
                            >
                              ANNULÉ
                            </span>
                          )}
                        </div>

                        {/* Score et statut si match live */}
                        {isLive && (
                          <div className="flex items-center gap-2 mb-1">
                            {score ? (
                              <p
                                className={`text-sm font-bold ${
                                  theme === "light"
                                    ? "text-gray-900"
                                    : "text-yellow-400"
                                }`}
                              >
                                {score.home} - {score.away}
                              </p>
                            ) : null}
                            {status && status.elapsed !== null ? (
                              <p
                                className={`text-xs font-semibold ${
                                  theme === "light"
                                    ? "text-gray-700"
                                    : "text-gray-300"
                                }`}
                              >
                                {status.elapsed}'
                              </p>
                            ) : null}
                            {status && status.short ? (
                              <p
                                className={`text-[10px] ${
                                  theme === "light"
                                    ? "text-gray-600"
                                    : "text-gray-400"
                                }`}
                              >
                                {status.short}
                              </p>
                            ) : null}
                          </div>
                        )}

                        {/* Score final si match terminé */}
                        {isMatchFinished && score && (
                          <div className="flex items-center gap-2 mb-1">
                            <p
                              className={`text-xs font-bold ${
                                theme === "light"
                                  ? "text-gray-700"
                                  : "text-gray-400"
                              }`}
                            >
                              Score final: {score.home} - {score.away}
                            </p>
                            {status && (
                              <p
                                className={`text-[10px] ${
                                  theme === "light"
                                    ? "text-gray-500"
                                    : "text-gray-500"
                                }`}
                              >
                                {status.long || status.short}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Date et heure pour les matchs à venir */}
                        {(isMatchUpcoming ||
                          (!isLive && !isMatchFinished && !isMatchPostponed)) &&
                          firstBet.timestamp && (
                            <div className="flex items-center gap-2 mb-1">
                              {(() => {
                                const dateInfo = formatDateTime(
                                  firstBet.timestamp
                                );
                                if (
                                  dateInfo.day === "N/A" ||
                                  dateInfo.time === "N/A"
                                )
                                  return null;
                                return (
                                  <p
                                    className={`text-[10px] flex items-center gap-1 ${
                                      theme === "light"
                                        ? "text-blue-600"
                                        : "text-blue-400"
                                    }`}
                                  >
                                    <svg
                                      className="w-3 h-3"
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
                                    {dateInfo.day} à {dateInfo.time}
                                  </p>
                                );
                              })()}
                            </div>
                          )}

                        {/* Ligue si disponible */}
                        {matchInfo?.league && (
                          <p
                            className={`text-[10px] ${
                              theme === "light"
                                ? "text-gray-500"
                                : "text-gray-500"
                            }`}
                          >
                            {matchInfo.league.name}
                          </p>
                        )}
                      </div>

                      {/* Liste des paris pour ce match */}
                      <div className="p-2 space-y-2">
                        {matchBets.map((bet: Bet, betIndex: number) => {
                          // Vérifier si ce bet est fermé
                          const isBetClosed = closedBetsForThisMatch.some(
                            (closed) =>
                              (closed.market === "all" ||
                                closed.market === bet.market) &&
                              (closed.selection === "all" ||
                                closed.selection === bet.selection)
                          );

                          return (
                            <div
                              key={betIndex}
                              className={`flex justify-between items-start p-1 rounded ${
                                isBetClosed
                                  ? theme === "light"
                                    ? "bg-red-50 border border-red-200"
                                    : "bg-red-900/20 border border-red-700"
                                  : ""
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                {/* Marché et sélection */}
                                <div className="flex items-center gap-2">
                                  <p
                                    className={`text-xs ${
                                      theme === "light"
                                        ? "text-gray-600"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {formatMarketName(bet.market)} -{" "}
                                    {formatSelection(
                                      bet.selection,
                                      bet.handicap
                                    )}
                                  </p>
                                  {isBetClosed && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                        theme === "light"
                                          ? "bg-red-200 text-red-800"
                                          : "bg-red-800 text-red-200"
                                      }`}
                                    >
                                      Fermé
                                    </span>
                                  )}
                                </div>

                                {/* Cote */}
                                <p
                                  className={`text-xs mt-1 font-bold ${
                                    isBetClosed
                                      ? theme === "light"
                                        ? "text-red-600"
                                        : "text-red-400"
                                      : theme === "light"
                                      ? "text-gray-900"
                                      : "text-yellow-400"
                                  }`}
                                >
                                  Cote: {formatOdds(bet.odd, oddsFormat)}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  removeBet(
                                    bet.fixtureId,
                                    bet.market,
                                    bet.selection
                                  )
                                }
                                className={`ml-2 text-red-500 hover:text-red-700 text-sm`}
                                title="Retirer"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              );
            })()}
          </div>

          {/* Total des cotes */}
          <div
            className={`p-2 rounded ${
              theme === "light" ? "bg-gray-100" : "bg-[#1a1a1a]"
            }`}
          >
            <div className="flex justify-between items-center">
              <span
                className={`text-sm ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Cote totale:
              </span>
              <span
                className={`text-sm font-bold ${
                  theme === "light" ? "text-gray-900" : "text-yellow-400"
                }`}
              >
                {formatOdds(totalOdds, oddsFormat)}
              </span>
            </div>
          </div>

          {/* Mise */}
          <div>
            <label
              className={`block text-xs mb-1 ${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Mise (€)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={localStake}
              onChange={(e) => handleStakeChange(e.target.value)}
              placeholder="0.00"
              className={`w-full px-2 py-1 rounded text-sm ${
                theme === "light"
                  ? "bg-white text-gray-900 border border-gray-300"
                  : "bg-[#1a1a1a] text-white border border-gray-600"
              }`}
            />
          </div>

          {/* Gain potentiel */}
          {stake > 0 && (
            <div
              className={`p-2 rounded ${
                theme === "light" ? "bg-yellow-50" : "bg-yellow-900/20"
              }`}
            >
              <div className="flex justify-between items-center">
                <span
                  className={`text-sm ${
                    theme === "light" ? "text-gray-700" : "text-gray-300"
                  }`}
                >
                  Gain potentiel:
                </span>
                <span
                  className={`text-sm font-bold ${
                    theme === "light" ? "text-yellow-600" : "text-yellow-400"
                  }`}
                >
                  {potentialWin.toFixed(2)} €
                </span>
              </div>
            </div>
          )}

          {/* Résultat de validation */}
          {validationResult &&
            (validationResult.closed.length > 0 ||
              validationResult.changes.length > 0 ||
              (validationResult.rejected &&
                validationResult.rejected.length > 0) ||
              !validationResult.valid) && (
              <div
                className={`p-2 rounded ${
                  theme === "light" ? "bg-red-50" : "bg-red-900/20"
                }`}
              >
                {validationResult.closed.length > 0 && (
                  <p
                    className={`text-xs font-semibold mb-1 ${
                      theme === "light" ? "text-red-700" : "text-red-400"
                    }`}
                  >
                    {validationResult.closed.length} marché(s) fermé(s) ou
                    indisponible(s)
                  </p>
                )}
                {validationResult.rejected &&
                  validationResult.rejected.length > 0 && (
                    <div className="mb-2">
                      <p
                        className={`text-xs font-semibold mb-1 ${
                          theme === "light" ? "text-red-700" : "text-red-400"
                        }`}
                      >
                        {validationResult.rejected.length} pari(s) bloqué(s)
                        après événement critique
                      </p>
                      <div className="space-y-1">
                        {validationResult.rejected.map((rejected, idx) => {
                          // Récupérer les informations du match (validationResult ou matchesInfo)
                          const matchInfoForRejected =
                            validationResult.matchInfo?.[rejected.fixtureId] ||
                            matchesInfo[rejected.fixtureId];
                          const matchName = matchInfoForRejected?.teams
                            ? `${matchInfoForRejected.teams.home.name} vs ${matchInfoForRejected.teams.away.name}`
                            : `Match #${rejected.fixtureId}`;

                          return (
                            <div
                              key={idx}
                              className={`p-2 rounded mb-1 ${
                                theme === "light"
                                  ? "bg-orange-50 border border-orange-200"
                                  : "bg-orange-900/20 border border-orange-700"
                              }`}
                            >
                              <p
                                className={`text-xs font-semibold mb-1 ${
                                  theme === "light"
                                    ? "text-orange-800"
                                    : "text-orange-300"
                                }`}
                              >
                                {matchName}
                              </p>
                              <p
                                className={`text-[10px] ${
                                  theme === "light"
                                    ? "text-orange-700"
                                    : "text-orange-400"
                                }`}
                              >
                                {rejected.message ||
                                  "Pari temporairement bloqué après un événement critique"}
                              </p>
                              {rejected.lockUntil && (
                                <p
                                  className={`text-[10px] mt-1 ${
                                    theme === "light"
                                      ? "text-orange-600"
                                      : "text-orange-500"
                                  }`}
                                >
                                  Réessayez après:{" "}
                                  {new Date(
                                    rejected.lockUntil
                                  ).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                {validationResult.message &&
                  validationResult.closed.length === 0 &&
                  (!validationResult.rejected ||
                    validationResult.rejected.length === 0) && (
                    <p
                      className={`text-xs font-semibold mb-1 ${
                        theme === "light" ? "text-red-700" : "text-red-400"
                      }`}
                    >
                      {validationResult.message}
                    </p>
                  )}
                {validationResult.changes.length > 0 && (
                  <div className="text-xs mt-1">
                    <p
                      className={`mb-1 ${
                        theme === "light"
                          ? "text-yellow-700"
                          : "text-yellow-400"
                      }`}
                    >
                      {validationResult.changes.length} cote(s) modifiée(s)
                    </p>
                  </div>
                )}
                {validationResult.closed.length > 0 && (
                  <div className="text-xs mt-1 space-y-1">
                    {validationResult.closed.map((closed, idx) => {
                      // Récupérer les informations du match pour afficher le nom (validationResult ou matchesInfo)
                      const matchInfoForClosed =
                        validationResult.matchInfo?.[closed.fixtureId] ||
                        matchesInfo[closed.fixtureId];
                      const matchName = matchInfoForClosed?.teams
                        ? `${matchInfoForClosed.teams.home.name} vs ${matchInfoForClosed.teams.away.name}`
                        : `Match #${closed.fixtureId}`;

                      // Déterminer le type de problème
                      const isMatchFinished =
                        matchInfoForClosed?.status?.short &&
                        [
                          "FT",
                          "AET",
                          "PEN",
                          "CANC",
                          "SUSP",
                          "INT",
                          "ABAN",
                          "AWD",
                        ].includes(matchInfoForClosed.status.short);
                      const isMatchPostponed =
                        matchInfoForClosed?.status?.short === "PST";

                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded mb-1 ${
                            theme === "light"
                              ? "bg-red-50 border border-red-200"
                              : "bg-red-900/20 border border-red-700"
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold mb-1 ${
                              theme === "light"
                                ? "text-red-800"
                                : "text-red-300"
                            }`}
                          >
                            {matchName}
                          </p>
                          {isMatchFinished && (
                            <p
                              className={`text-[10px] mb-1 ${
                                theme === "light"
                                  ? "text-red-700"
                                  : "text-red-400"
                              }`}
                            >
                              Match terminé
                              {matchInfoForClosed?.status?.long &&
                                ` (${matchInfoForClosed.status.long})`}
                            </p>
                          )}
                          {isMatchPostponed && (
                            <p
                              className={`text-[10px] mb-1 ${
                                theme === "light"
                                  ? "text-orange-700"
                                  : "text-orange-400"
                              }`}
                            >
                              Match reporté
                            </p>
                          )}
                          <p
                            className={`text-[10px] ${
                              theme === "light"
                                ? "text-red-600"
                                : "text-red-400"
                            }`}
                          >
                            {closed.market && closed.market !== "all" ? (
                              <>
                                {formatMarketName(closed.market)}
                                {closed.selection &&
                                  closed.selection !== "all" && (
                                    <> - {formatSelection(closed.selection)}</>
                                  )}
                                {closed.message && <>: {closed.message}</>}
                              </>
                            ) : (
                              closed.message ||
                              "Impossible de traiter les cotes"
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleValidate}
              disabled={isValidating || bets.length === 0}
              className={`px-3 py-2 rounded text-sm font-semibold ${
                theme === "light"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isValidating ? "Validation..." : "Valider les cotes"}
            </button>
            <button
              onClick={handleShare}
              disabled={isValidating || bets.length === 0}
              className={`px-3 py-2 rounded text-sm font-semibold ${
                theme === "light"
                  ? "bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                  : "bg-yellow-500 hover:bg-yellow-600 text-gray-900"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isValidating ? "Partage..." : "Partager mon ticket"}
            </button>
            <button
              onClick={clearBets}
              className={`px-3 py-2 rounded text-sm font-semibold ${
                theme === "light"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              Effacer
            </button>
          </div>

          {/* Code de partage */}
          {shareCode && (
            <div
              className={`p-2 rounded ${
                theme === "light" ? "bg-green-50" : "bg-green-900/20"
              }`}
            >
              <p
                className={`text-xs mb-1 ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Code de partage:
              </p>
              <div className="flex items-center gap-2">
                <code
                  className={`text-sm font-bold ${
                    theme === "light" ? "text-green-700" : "text-green-400"
                  }`}
                >
                  {shareCode}
                </code>
                <button
                  onClick={() => copyToClipboard(shareCode)}
                  className={`text-xs px-2 py-1 rounded ${
                    theme === "light"
                      ? "bg-green-200 hover:bg-green-300 text-green-800"
                      : "bg-green-800 hover:bg-green-700 text-green-200"
                  }`}
                >
                  Copier
                </button>
              </div>
            </div>
          )}

          {/* Statut */}
          {status === "expired" && (
            <div
              className={`p-2 rounded ${
                theme === "light" ? "bg-red-50" : "bg-red-900/20"
              }`}
            >
              <p
                className={`text-xs ${
                  theme === "light" ? "text-red-700" : "text-red-400"
                }`}
              >
                ⚠️ Ce ticket est expiré
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de partage */}
      {showShareModal && shareCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`p-6 rounded-lg max-w-md w-full mx-4 ${
              theme === "light" ? "bg-white" : "bg-[#2a2a2a]"
            }`}
          >
            <h3
              className={`text-lg font-bold mb-4 ${
                theme === "light" ? "text-gray-900" : "text-white"
              }`}
            >
              Ticket partagé !
            </h3>
            <p
              className={`text-sm mb-4 ${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Partagez ce code avec vos amis :
            </p>
            <div className="flex items-center gap-2 mb-4">
              <code
                className={`flex-1 px-3 py-2 rounded text-lg font-bold text-center ${
                  theme === "light"
                    ? "bg-gray-100 text-gray-900"
                    : "bg-[#1a1a1a] text-yellow-400"
                }`}
              >
                {shareCode}
              </code>
              <button
                onClick={() => {
                  copyToClipboard(shareCode);
                  setShowShareModal(false);
                }}
                className={`px-4 py-2 rounded font-semibold ${
                  theme === "light"
                    ? "bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                    : "bg-yellow-500 hover:bg-yellow-600 text-gray-900"
                }`}
              >
                Copier
              </button>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className={`w-full px-4 py-2 rounded font-semibold ${
                theme === "light"
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-900"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal de validation */}
      <ValidationModal
        isOpen={showValidationModal}
        onClose={handleCancelValidation}
        onConfirm={handleConfirmValidation}
        validationResult={pendingValidationResult}
        isLoading={isValidating}
        bets={bets}
      />
    </div>
  );
}
