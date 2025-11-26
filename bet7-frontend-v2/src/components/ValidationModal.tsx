import { useTheme } from "../contexts/ThemeContext";
import { useOddsFormat } from "../contexts/OddsFormatContext";
import { formatOdds } from "../utils/oddsFormatters";
import { BetSlipValidationResponse } from "../types/betslip";

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validationResult: BetSlipValidationResponse | null;
  isLoading?: boolean;
  bets?: Array<{
    fixtureId: number;
    market: string;
    selection: string;
    handicap?: string | null;
  }>;
}

export default function ValidationModal({
  isOpen,
  onClose,
  onConfirm,
  validationResult,
  isLoading = false,
  bets = [],
}: ValidationModalProps) {
  const { theme } = useTheme();
  const { oddsFormat } = useOddsFormat();

  if (!isOpen || !validationResult) return null;

  const hasChanges =
    validationResult.changes && validationResult.changes.length > 0;
  const hasClosed =
    validationResult.closed && validationResult.closed.length > 0;
  const hasErrors =
    validationResult.errors && validationResult.errors.length > 0;

  // Calculer le nouveau total des cotes
  // const calculateNewTotalOdds = () => {
  //   if (!validationResult.changes || validationResult.changes.length === 0) {
  //     return null;
  //   }
  //   // Cette fonction devrait être dans le contexte pour calculer avec les nouvelles cotes
  //   // Pour l'instant, on affiche juste les changements
  //   return null;
  // };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className={`w-full max-w-2xl mx-4 rounded-lg shadow-xl ${
          theme === "light" ? "bg-white" : "bg-[#2a2a2a]"
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b ${
            theme === "light" ? "border-gray-200" : "border-gray-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2
              className={`text-xl font-bold ${
                theme === "light" ? "text-gray-900" : "text-white"
              }`}
            >
              Confirmation des cotes
            </h2>
            <button
              onClick={onClose}
              className={`text-gray-400 hover:text-gray-600 ${
                theme === "light" ? "hover:text-gray-900" : "hover:text-white"
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Message général - seulement si pas de changements ou fermetures */}
          {validationResult.message && !hasChanges && !hasClosed && (
            <div
              className={`mb-4 p-3 rounded-md ${
                validationResult.valid
                  ? theme === "light"
                    ? "bg-green-50 text-green-800"
                    : "bg-green-900/20 text-green-400"
                  : theme === "light"
                  ? "bg-red-50 text-red-800"
                  : "bg-red-900/20 text-red-400"
              }`}
            >
              <p className="text-sm font-medium">{validationResult.message}</p>
            </div>
          )}

          {/* Changements de cotes */}
          {hasChanges && (
            <div className="mb-4">
              <h3
                className={`text-sm font-semibold mb-2 ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                ⚠️ Cotes modifiées ({validationResult.changes.length})
              </h3>
              <div className="space-y-2">
                {validationResult.changes.map((change, index) => {
                  const isIncrease = change.newOdd > change.oldOdd;
                  // Récupérer les informations du match
                  const matchInfoForChange =
                    validationResult.matchInfo?.[change.fixtureId];
                  const matchName = matchInfoForChange?.teams
                    ? `${matchInfoForChange.teams.home.name} vs ${matchInfoForChange.teams.away.name}`
                    : `Match #${change.fixtureId}`;

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-md border ${
                        theme === "light"
                          ? "bg-yellow-50 border-yellow-200"
                          : "bg-yellow-900/20 border-yellow-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p
                            className={`text-xs font-semibold mb-1 ${
                              theme === "light" ? "text-gray-900" : "text-white"
                            }`}
                          >
                            {matchName}
                          </p>
                          <p
                            className={`text-xs font-medium mb-1 ${
                              theme === "light"
                                ? "text-gray-700"
                                : "text-gray-300"
                            }`}
                          >
                            {change.market} - {change.selection}
                            {change.handicap && ` (${change.handicap})`}
                          </p>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs ${
                                theme === "light"
                                  ? "text-gray-600"
                                  : "text-gray-400"
                              }`}
                            >
                              Ancienne cote:
                            </span>
                            <span
                              className={`text-sm font-bold ${
                                theme === "light"
                                  ? "text-gray-900"
                                  : "text-white"
                              }`}
                            >
                              {formatOdds(change.oldOdd, oddsFormat)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span
                              className={`text-sm font-bold ${
                                isIncrease
                                  ? theme === "light"
                                    ? "text-red-600"
                                    : "text-red-400"
                                  : theme === "light"
                                  ? "text-green-600"
                                  : "text-green-400"
                              }`}
                            >
                              {formatOdds(change.newOdd, oddsFormat)}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                isIncrease
                                  ? theme === "light"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-red-900/30 text-red-400"
                                  : theme === "light"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-green-900/30 text-green-400"
                              }`}
                            >
                              {isIncrease ? "+" : ""}
                              {change.changePercent}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Marchés fermés */}
          {hasClosed && (
            <div className="mb-4">
              <div
                className={`p-3 rounded-md mb-3 ${
                  theme === "light"
                    ? "bg-red-50 border border-red-200"
                    : "bg-red-900/30 border border-red-700"
                }`}
              >
                <h3
                  className={`text-sm font-bold mb-1 ${
                    theme === "light" ? "text-red-800" : "text-red-400"
                  }`}
                >
                  ⚠️ {validationResult.closed.length} marché(s) fermé(s) ou
                  indisponible(s)
                </h3>
                <p
                  className={`text-xs mt-1 ${
                    theme === "light" ? "text-red-700" : "text-red-300"
                  }`}
                >
                  Certains paris de votre ticket ne sont plus disponibles. Vous
                  pouvez les retirer ou confirmer avec les autres paris valides.
                </p>
              </div>
              <div className="space-y-2">
                {validationResult.closed.map((closed, index) => {
                  // Si market ou selection est "all", trouver les bets correspondants
                  const affectedBets = bets.filter(
                    (bet) =>
                      bet.fixtureId === closed.fixtureId &&
                      (closed.market === "all" ||
                        bet.market === closed.market) &&
                      (closed.selection === "all" ||
                        bet.selection === closed.selection)
                  );

                  // Récupérer les informations du match
                  const matchInfoForClosed =
                    validationResult.matchInfo?.[closed.fixtureId];
                  const matchName = matchInfoForClosed?.teams
                    ? `${matchInfoForClosed.teams.home.name} vs ${matchInfoForClosed.teams.away.name}`
                    : `Match #${closed.fixtureId}`;

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-md border ${
                        theme === "light"
                          ? "bg-red-50 border-red-200"
                          : "bg-red-900/20 border-red-700"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p
                            className={`text-xs font-semibold mb-1 ${
                              theme === "light" ? "text-gray-900" : "text-white"
                            }`}
                          >
                            {matchName}
                            {closed.market && closed.market !== "all" ? (
                              <>
                                {" - "}
                                {closed.market}
                                {closed.selection &&
                                  closed.selection !== "all" && (
                                    <> - {closed.selection}</>
                                  )}
                              </>
                            ) : affectedBets.length > 0 ? (
                              <>
                                {" - "}
                                {affectedBets.map((bet, idx) => (
                                  <span key={idx}>
                                    {bet.market} - {bet.selection}
                                    {idx < affectedBets.length - 1 && ", "}
                                  </span>
                                ))}
                              </>
                            ) : (
                              " - Marché(s) indisponible(s)"
                            )}
                          </p>
                          <p
                            className={`text-xs ${
                              theme === "light"
                                ? "text-gray-600"
                                : "text-gray-400"
                            }`}
                          >
                            {closed.message ||
                              "Ce marché n'est plus disponible pour ce match. Veuillez le retirer de votre ticket."}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paris rejetés (bloqués après événement critique) */}
          {validationResult.rejected &&
            validationResult.rejected.length > 0 && (
              <div className="mb-4">
                <div
                  className={`p-3 rounded-md mb-3 ${
                    theme === "light"
                      ? "bg-orange-50 border border-orange-200"
                      : "bg-orange-900/30 border border-orange-700"
                  }`}
                >
                  <h3
                    className={`text-sm font-bold mb-1 ${
                      theme === "light" ? "text-orange-800" : "text-orange-400"
                    }`}
                  >
                    ⚠️ {validationResult.rejected.length} pari(s) bloqué(s)
                    après événement critique
                  </h3>
                  <p
                    className={`text-xs mt-1 ${
                      theme === "light" ? "text-orange-700" : "text-orange-300"
                    }`}
                  >
                    Certains paris sont temporairement bloqués après un
                    événement critique (but, penalty, carton rouge). Réessayez
                    dans quelques secondes.
                  </p>
                </div>
                <div className="space-y-2">
                  {validationResult.rejected.map((rejected, index) => {
                    // Récupérer les informations du match
                    const matchInfoForRejected =
                      validationResult.matchInfo?.[rejected.fixtureId];
                    const matchName = matchInfoForRejected?.teams
                      ? `${matchInfoForRejected.teams.home.name} vs ${matchInfoForRejected.teams.away.name}`
                      : `Match #${rejected.fixtureId}`;

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-md border ${
                          theme === "light"
                            ? "bg-orange-50 border-orange-200"
                            : "bg-orange-900/20 border-orange-700"
                        }`}
                      >
                        <p
                          className={`text-xs font-semibold mb-1 ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {matchName}
                          {rejected.market && rejected.selection && (
                            <>
                              {" - "}
                              {rejected.market} - {rejected.selection}
                            </>
                          )}
                        </p>
                        <p
                          className={`text-xs ${
                            theme === "light"
                              ? "text-gray-600"
                              : "text-gray-400"
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
                            {new Date(rejected.lockUntil).toLocaleTimeString(
                              "fr-FR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              }
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Erreurs */}
          {hasErrors && (
            <div className="mb-4">
              <h3
                className={`text-sm font-semibold mb-2 ${
                  theme === "light" ? "text-red-600" : "text-red-400"
                }`}
              >
                ⚠️ Erreurs ({validationResult.errors.length})
              </h3>
              <div className="space-y-2">
                {validationResult.errors.map((error, index) => {
                  // Récupérer les informations du match
                  const matchInfoForError =
                    validationResult.matchInfo?.[error.fixtureId];
                  const matchName = matchInfoForError?.teams
                    ? `${matchInfoForError.teams.home.name} vs ${matchInfoForError.teams.away.name}`
                    : `Match #${error.fixtureId}`;

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-md border ${
                        theme === "light"
                          ? "bg-red-50 border-red-200"
                          : "bg-red-900/20 border-red-700"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold mb-1 ${
                          theme === "light" ? "text-gray-900" : "text-white"
                        }`}
                      >
                        {matchName}
                      </p>
                      <p
                        className={`text-xs ${
                          theme === "light" ? "text-gray-700" : "text-gray-300"
                        }`}
                      >
                        {error.error}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aucun changement */}
          {!hasChanges &&
            !hasClosed &&
            !hasErrors &&
            validationResult.valid && (
              <div
                className={`p-4 rounded-md ${
                  theme === "light"
                    ? "bg-green-50 text-green-800"
                    : "bg-green-900/20 text-green-400"
                }`}
              >
                <p className="text-sm font-medium">
                  ✅ Toutes les cotes sont à jour. Vous pouvez confirmer votre
                  pari.
                </p>
              </div>
            )}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-4 border-t flex justify-end gap-3 ${
            theme === "light" ? "border-gray-200" : "border-gray-700"
          }`}
        >
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              theme === "light"
                ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                : "bg-gray-700 text-white hover:bg-gray-600"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || (hasErrors && !hasChanges && !hasClosed)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              theme === "light"
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-green-700 text-white hover:bg-green-600"
            } ${
              isLoading || (hasErrors && !hasChanges && !hasClosed)
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {isLoading
              ? "Validation..."
              : hasChanges
              ? "Valider les nouvelles cotes"
              : "Fermer"}
          </button>
        </div>
      </div>
    </div>
  );
}
