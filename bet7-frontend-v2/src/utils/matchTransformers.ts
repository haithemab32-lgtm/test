/**
 * Utilitaires pour transformer les données de l'API en format Match
 */

import { Match } from "../components/matchCard/type";
import type {
  ApiMatchResponse,
  ApiBookmaker,
  ApiMarket,
  OddsComparison,
} from "../types/api";
import { formatDateTime } from "./dateFormatters";

/**
 * Détermine si un match est terminé
 * @param status - Le statut du match (ex: "FT", "ET", "P", "AWD", "CANC", "ABAN")
 * @returns true si le match est terminé, false sinon
 */
export function isFinishedMatch(status: string | undefined): boolean {
  if (!status) return false;
  const finishedStatuses = ["FT", "ET", "P", "AWD", "CANC", "ABAN"];
  return finishedStatuses.includes(status);
}

/**
 * Détermine si un match est en direct
 * @param status - Le statut du match (ex: "1H", "2H", "HT", "LIVE")
 * @returns true si le match est en direct, false sinon
 */
export function isLiveMatch(status: string | undefined): boolean {
  if (!status) return false;
  const liveStatuses = ["LIVE", "1H", "2H", "HT"];
  return liveStatuses.includes(status);
}

/**
 * Valide une cote et la convertit en "locked" si elle est invalide (<= 1, null, undefined, etc.)
 * @param odd - La cote à valider (peut être un nombre, une string, null, undefined, ou "locked")
 * @returns La cote validée ou "locked" si invalide
 */
export function validateOdd(
  odd: number | string | null | undefined
): number | string {
  // Si c'est déjà "locked", null, undefined, ou une chaîne vide, retourner "locked"
  if (
    odd === "locked" ||
    odd === null ||
    odd === undefined ||
    odd === "" ||
    (typeof odd === "string" && odd.trim() === "") ||
    odd === "—" ||
    odd === "-"
  ) {
    return "locked";
  }

  // Si c'est un nombre, vérifier s'il est valide (> 1)
  if (typeof odd === "number") {
    if (isNaN(odd) || !isFinite(odd) || odd <= 1) {
      // DEBUG: Log seulement pour les valeurs vraiment problématiques (< 1, pas = 1)
      // Les cotes = 1.00 sont normales et attendues, on les convertit silencieusement
      if (odd < 1 && odd > 0 && process.env.NODE_ENV === "development") {
        console.warn(
          "🔒 [validateOdd] Cote < 1 détectée et convertie en 'locked':",
          odd
        );
      }
      return "locked";
    }
    return odd;
  }

  // Si c'est une string, essayer de la convertir
  if (typeof odd === "string") {
    const cleanedValue = odd.trim();

    // Si c'est "locked" ou vide après nettoyage
    if (cleanedValue === "locked" || cleanedValue === "") {
      return "locked";
    }

    // Essayer de parser en nombre
    const parsed = parseFloat(cleanedValue);
    if (isNaN(parsed) || !isFinite(parsed) || parsed <= 1) {
      // DEBUG: Log seulement en mode développement et pour les valeurs vraiment problématiques (< 1, pas = 1)
      // Les cotes = 1.00 sont normales et attendues, on les convertit silencieusement
      if (parsed < 1 && parsed > 0 && process.env.NODE_ENV === "development") {
        console.warn(
          "🔒 [validateOdd] Cote < 1 détectée (string) et convertie en 'locked':",
          odd,
          "->",
          parsed
        );
      }
      return "locked";
    }
    return parsed;
  }

  // Par défaut, retourner "locked"
  return "locked";
}

/**
 * Valide toutes les cotes d'un objet Match pour s'assurer qu'aucune cote <= 1 n'est présente
 * Cette fonction peut être appelée après des mises à jour socket ou lors de la réhydratation des données
 */
export function validateAllOddsInMatch(match: any): any {
  if (!match || !match.odds) {
    return match;
  }

  const validatedMatch = { ...match };
  validatedMatch.odds = { ...match.odds };

  // Valider _1x2
  if (validatedMatch.odds._1x2) {
    validatedMatch.odds._1x2 = {
      _1: validateOdd(validatedMatch.odds._1x2._1),
      X: validateOdd(validatedMatch.odds._1x2.X),
      _2: validateOdd(validatedMatch.odds._1x2._2),
    };
  }

  // Valider doubleChance
  if (validatedMatch.odds.doubleChance) {
    validatedMatch.odds.doubleChance = {
      _1X: validateOdd(validatedMatch.odds.doubleChance._1X),
      _12: validateOdd(validatedMatch.odds.doubleChance._12),
      X2: validateOdd(validatedMatch.odds.doubleChance.X2),
    };
  }

  // Valider totalGoals
  if (validatedMatch.odds.totalGoals) {
    validatedMatch.odds.totalGoals = {
      ...validatedMatch.odds.totalGoals,
      over: validateOdd(validatedMatch.odds.totalGoals.over),
      under: validateOdd(validatedMatch.odds.totalGoals.under),
      allLines: validatedMatch.odds.totalGoals.allLines
        ? Object.fromEntries(
            Object.entries(validatedMatch.odds.totalGoals.allLines).map(
              ([line, data]: [string, any]) => [
                line,
                {
                  over: validateOdd(data.over),
                  under: validateOdd(data.under),
                },
              ]
            )
          )
        : undefined,
    };
  }

  // Valider ggNg
  if (validatedMatch.odds.ggNg) {
    validatedMatch.odds.ggNg = {
      GG: validateOdd(validatedMatch.odds.ggNg.GG),
      NG: validateOdd(validatedMatch.odds.ggNg.NG),
    };
  }

  // Valider pairImpaire
  if (validatedMatch.odds.pairImpaire) {
    validatedMatch.odds.pairImpaire = {
      Pair: validateOdd(validatedMatch.odds.pairImpaire.Pair),
      Impaire: validateOdd(validatedMatch.odds.pairImpaire.Impaire),
    };
  }

  // Valider aussi rawMarkets si présent
  if (validatedMatch.rawMarkets && Array.isArray(validatedMatch.rawMarkets)) {
    validatedMatch.rawMarkets = validatedMatch.rawMarkets.map(
      (market: any) => ({
        ...market,
        values: (market.values || []).map((v: any) => ({
          ...v,
          odd: validateOdd(v.odd),
        })),
      })
    );
  }

  return validatedMatch;
}

/**
 * Convertit une OddsComparison en format utilisable pour oddsChanges
 */
export function mapOddsComparisonToChanges(
  comparison: OddsComparison
): Record<string, Record<string, "up" | "down">> {
  const changes: Record<string, Record<string, "up" | "down">> = {};

  if (!comparison.changes || comparison.changes.length === 0) {
    return changes;
  }

  comparison.changes.forEach((change) => {
    // Ignorer les nouvelles cotes ou les cotes supprimées (on ne veut que up/down)
    if (change.direction !== "up" && change.direction !== "down") {
      return;
    }

    const market = change.market;
    const label = change.label;

    if (!market || !label) {
      return;
    }

    if (!changes[market]) {
      changes[market] = {};
    }

    changes[market][label] = change.direction;
  });

  return changes;
}

/**
 * Extrait et transforme les cotes depuis optimizedOdds (nouveau format)
 */
function extractOddsFromOptimized(optimizedOdds: any): Match["odds"] {
  if (!optimizedOdds || typeof optimizedOdds !== "object") {
    console.warn(
      "extractOddsFromOptimized: optimizedOdds is invalid",
      optimizedOdds
    );
    return {
      _1x2: { _1: "locked", X: "locked", _2: "locked" },
      doubleChance: { _1X: "locked", _12: "locked", X2: "locked" },
      totalGoals: { value: "2.5", over: "locked", under: "locked" },
      ggNg: { GG: "locked", NG: "locked" },
      pairImpaire: { Pair: "locked", Impaire: "locked" },
    };
  }

  const odds: Record<string, any> = {};

  // Traitement du marché 1x2
  if (optimizedOdds["1x2"]) {
    const market1x2 = optimizedOdds["1x2"];
    const odd1 = market1x2["1"];
    const oddX = market1x2["X"];
    const odd2 = market1x2["2"];

    odds._1x2 = {
      _1: validateOdd(odd1?.odd),
      X: validateOdd(oddX?.odd),
      _2: validateOdd(odd2?.odd),
    };
  }

  // Traitement du marché Double Chance
  if (optimizedOdds["Double Chance"]) {
    const marketDC = optimizedOdds["Double Chance"];
    odds.doubleChance = {
      _1X: validateOdd(marketDC["1X"]?.odd),
      _12: validateOdd(marketDC["12"]?.odd),
      X2: validateOdd(marketDC["X2"]?.odd),
    };
  }

  // NE PAS utiliser optimizedOdds["Goals"] car il ne contient que quelques lignes (1, 2.5, 3)
  // Total Goals sera extrait depuis le format simple (apiData.odds) qui contient toutes les lignes
  // On ne l'initialise pas ici, il sera extrait depuis apiData.odds

  // Traitement GG/NG si présent
  if (optimizedOdds["Both Teams Score"] || optimizedOdds["GG/NG"]) {
    const ggngMarket =
      optimizedOdds["Both Teams Score"] || optimizedOdds["GG/NG"];
    const ggOdd = ggngMarket?.Yes?.odd ?? ggngMarket?.GG?.odd;
    const ngOdd = ggngMarket?.No?.odd ?? ggngMarket?.NG?.odd;
    odds.ggNg = {
      GG: validateOdd(ggOdd),
      NG: validateOdd(ngOdd),
    };
  }

  // Traitement Pair/Impaire si présent
  if (optimizedOdds["Odd/Even"] || optimizedOdds["Pair/Impaire"]) {
    const pairMarket =
      optimizedOdds["Odd/Even"] || optimizedOdds["Pair/Impaire"];
    const pairOdd = pairMarket?.Even?.odd ?? pairMarket?.Pair?.odd;
    const impaireOdd = pairMarket?.Odd?.odd ?? pairMarket?.Impaire?.odd;
    odds.pairImpaire = {
      Pair: validateOdd(pairOdd),
      Impaire: validateOdd(impaireOdd),
    };
  }

  // Valeurs par défaut si manquantes
  if (!odds._1x2) {
    odds._1x2 = { _1: "locked", X: "locked", _2: "locked" };
  }
  if (!odds.doubleChance) {
    odds.doubleChance = { _1X: "locked", _12: "locked", X2: "locked" };
  }
  if (!odds.totalGoals) {
    odds.totalGoals = { value: "2.5", over: "locked", under: "locked" };
  }
  if (!odds.ggNg) {
    odds.ggNg = { GG: "locked", NG: "locked" };
  }
  if (!odds.pairImpaire) {
    odds.pairImpaire = { Pair: "locked", Impaire: "locked" };
  }

  return odds;
}

/**
 * Extrait et transforme les cotes depuis le tableau markets (format alternatif)
 */
function extractOddsFromMarkets(
  markets: ApiMarket[] | undefined
): Match["odds"] {
  if (!markets || !Array.isArray(markets) || markets.length === 0) {
    return {
      _1x2: { _1: "locked", X: "locked", _2: "locked" },
      doubleChance: { _1X: "locked", _12: "locked", X2: "locked" },
      totalGoals: { value: "2.5", over: "locked", under: "locked" },
      ggNg: { GG: "locked", NG: "locked" },
      pairImpaire: { Pair: "locked", Impaire: "locked" },
    };
  }

  const odds: Record<string, any> = {};

  markets.forEach((market: ApiMarket) => {
    if (!market.values || !Array.isArray(market.values)) {
      return;
    }

    const marketName = String(market.market || "");
    const marketValues: Record<string, number | string> = {};

    market.values.forEach((v) => {
      const label = String(v.label || "");
      // Vérifier si la cote est suspendue (suspended: true = afficher "locked")
      // Valider aussi que la cote est > 1
      marketValues[label] =
        v.suspended === true ? "locked" : validateOdd(v.odd);
    });

    // Transformation pour les marchés standards
    switch (marketName) {
      case "Match Winner":
      case "1x2":
        odds._1x2 = {
          _1: marketValues["Home"] ?? marketValues["1"] ?? "locked",
          X: marketValues["Draw"] ?? marketValues["X"] ?? "locked",
          _2: marketValues["Away"] ?? marketValues["2"] ?? "locked",
        };
        break;

      case "Double Chance":
        odds.doubleChance = {
          _1X:
            marketValues["1X"] ??
            marketValues["Home Draw"] ??
            marketValues["Home/Draw"] ??
            "locked",
          _12:
            marketValues["12"] ??
            marketValues["Home Away"] ??
            marketValues["Home/Away"] ??
            "locked",
          X2:
            marketValues["X2"] ??
            marketValues["Draw Away"] ??
            marketValues["Draw/Away"] ??
            "locked",
        };
        break;

      case "Goals Over/Under":
      case "Total Goals": {
        // Chercher Over 2.5 et Under 2.5
        const overKey = Object.keys(marketValues).find(
          (key) => key.toLowerCase().includes("over") && key.includes("2.5")
        );
        const underKey = Object.keys(marketValues).find(
          (key) => key.toLowerCase().includes("under") && key.includes("2.5")
        );

        odds.totalGoals = {
          value: "2.5",
          over: overKey ? marketValues[overKey] : "locked",
          under: underKey ? marketValues[underKey] : "locked",
        };
        break;
      }

      case "Both Teams To Score":
      case "GG/NG":
        odds.ggNg = {
          GG: marketValues["Yes"] ?? marketValues["GG"] ?? "locked",
          NG: marketValues["No"] ?? marketValues["NG"] ?? "locked",
        };
        break;

      case "Odd/Even":
      case "Pair/Impaire":
        odds.pairImpaire = {
          Pair: marketValues["Even"] ?? marketValues["Pair"] ?? "locked",
          Impaire: marketValues["Odd"] ?? marketValues["Impaire"] ?? "locked",
        };
        break;
    }
  });

  // Valeurs par défaut si manquantes
  if (!odds._1x2) {
    odds._1x2 = { _1: "locked", X: "locked", _2: "locked" };
  }
  if (!odds.doubleChance) {
    odds.doubleChance = { _1X: "locked", _12: "locked", X2: "locked" };
  }
  if (!odds.totalGoals) {
    odds.totalGoals = { value: "2.5", over: "locked", under: "locked" };
  }
  if (!odds.ggNg) {
    odds.ggNg = { GG: "locked", NG: "locked" };
  }
  if (!odds.pairImpaire) {
    odds.pairImpaire = { Pair: "locked", Impaire: "locked" };
  }

  return odds;
}

/**
 * Extrait et transforme les cotes depuis un bookmaker (ancien format)
 */
function extractOdds(bestBookmaker: ApiBookmaker | undefined): Match["odds"] {
  if (
    !bestBookmaker ||
    !bestBookmaker.markets ||
    !Array.isArray(bestBookmaker.markets)
  ) {
    return {
      _1x2: { _1: "locked", X: "locked", _2: "locked" },
      doubleChance: { _1X: "locked", _12: "locked", X2: "locked" },
      totalGoals: { value: "2.5", over: "locked", under: "locked" },
      ggNg: { GG: "locked", NG: "locked" },
      pairImpaire: { Pair: "locked", Impaire: "locked" },
    };
  }

  const odds: Record<string, any> = {};

  bestBookmaker.markets.forEach((market: ApiMarket) => {
    if (market.values && Array.isArray(market.values)) {
      const marketName = String(market.market || "");
      odds[marketName] = {};

      market.values.forEach((v) => {
        const label = String(v.label || "");
        // Valider la cote avant de l'assigner
        odds[marketName][label] = validateOdd(v.odd);
      });

      // Transformation pour les marchés standards
      switch (market.market) {
        case "Match Winner":
        case "1x2":
          odds._1x2 = {
            _1: validateOdd(odds[marketName]?.Home || odds[marketName]?.["1"]),
            X: validateOdd(odds[marketName]?.Draw || odds[marketName]?.X),
            _2: validateOdd(odds[marketName]?.Away || odds[marketName]?.["2"]),
          };
          break;

        case "Double Chance":
          const dcOdds = odds[marketName] || {};
          odds.doubleChance = {
            _1X: validateOdd(
              dcOdds["Home Draw"] ||
                dcOdds["1X"] ||
                dcOdds["Home/Draw"] ||
                dcOdds["1 X"]
            ),
            _12: validateOdd(
              dcOdds["Home Away"] ||
                dcOdds["12"] ||
                dcOdds["Home/Away"] ||
                dcOdds["1 2"]
            ),
            X2: validateOdd(
              dcOdds["Draw Away"] ||
                dcOdds["X2"] ||
                dcOdds["Draw/Away"] ||
                dcOdds["X 2"]
            ),
          };
          break;

        case "Goals Over/Under":
        case "Total Goals": {
          // Trouver les cotes pour 2.5
          const overKey = Object.keys(odds[marketName] || {}).find(
            (key) => key.includes("Over") && key.includes("2.5")
          );
          const underKey = Object.keys(odds[marketName] || {}).find(
            (key) => key.includes("Under") && key.includes("2.5")
          );

          odds.totalGoals = {
            value: "2.5",
            over: overKey ? validateOdd(odds[marketName][overKey]) : "locked",
            under: underKey
              ? validateOdd(odds[marketName][underKey])
              : "locked",
          };
          break;
        }

        case "Both Teams Score":
        case "GG/NG":
          odds.ggNg = {
            GG: validateOdd(odds[marketName]?.Yes || odds[marketName]?.GG),
            NG: validateOdd(odds[marketName]?.No || odds[marketName]?.NG),
          };
          break;

        case "Odd/Even":
        case "Pair/Impaire":
          odds.pairImpaire = {
            Pair: validateOdd(odds[marketName]?.Even || odds[marketName]?.Pair),
            Impaire: validateOdd(
              odds[marketName]?.Odd || odds[marketName]?.Impaire
            ),
          };
          break;
      }
    }
  });

  return odds;
}

/**
 * Extrait les cotes depuis le format simple de l'API (nouveau format)
 * Format: apiData.odds.odds = [{ id: 59, name: 'Fulltime Result', values: [...] }, ...]
 */
function extractOddsFromSimpleFormat(
  marketsArray: ApiMarket[],
  isLive: boolean = false
): Match["odds"] {
  const defaultLockedOdds = { _1: "locked", X: "locked", _2: "locked" };
  const defaultLockedDoubleChance = {
    _1X: "locked",
    _12: "locked",
    X2: "locked",
  };
  const defaultLockedTotalGoals = {
    value: "2.5",
    over: "locked",
    under: "locked",
  };
  const defaultLockedGgNg = { GG: "locked", NG: "locked" };
  const defaultLockedPairImpaire = { Pair: "locked", Impaire: "locked" };

  let odds: Match["odds"] = {
    _1x2: defaultLockedOdds,
    doubleChance: defaultLockedDoubleChance,
    totalGoals: defaultLockedTotalGoals,
    ggNg: defaultLockedGgNg,
    pairImpaire: defaultLockedPairImpaire,
  };

  if (
    !marketsArray ||
    !Array.isArray(marketsArray) ||
    marketsArray.length === 0
  ) {
    console.warn(
      "extractOddsFromSimpleFormat: Invalid or empty markets array",
      marketsArray
    );
    return odds;
  }

  // Helper pour obtenir le nom du marché (supporte name et market)
  const getMarketName = (m: ApiMarket) => m.name || m.market || "";

  // Trouver le marché 1x2 (souvent nommé "Match Winner", "Fulltime Result" ou "1x2")
  const fulltimeResultMarket = marketsArray.find((m) => {
    const name = getMarketName(m);
    return (
      name === "Match Winner" ||
      name === "Fulltime Result" ||
      name === "1x2" ||
      name === "1x2 - 20 minutes" ||
      name === "1x2 (1st Half)"
    );
  });

  if (fulltimeResultMarket && fulltimeResultMarket.values) {
    const _1Value = fulltimeResultMarket.values.find(
      (v) => v.value === "Home" || v.value === "1"
    );
    const _1 =
      _1Value?.suspended === true ? "locked" : validateOdd(_1Value?.odd);

    const XValue = fulltimeResultMarket.values.find(
      (v) => v.value === "Draw" || v.value === "X"
    );
    const X = XValue?.suspended === true ? "locked" : validateOdd(XValue?.odd);

    const _2Value = fulltimeResultMarket.values.find(
      (v) => v.value === "Away" || v.value === "2"
    );
    const _2 =
      _2Value?.suspended === true ? "locked" : validateOdd(_2Value?.odd);

    odds._1x2 = { _1, X, _2 };
  }

  // Trouver le marché Double Chance
  const doubleChanceMarket = marketsArray.find(
    (m) => getMarketName(m) === "Double Chance"
  );
  if (doubleChanceMarket && doubleChanceMarket.values) {
    // Helper pour vérifier si une valeur correspond (vérifie value et label)
    const findValue = (patterns: string[]) => {
      const found = doubleChanceMarket.values!.find((v) => {
        const valueStr = String(v.value || "").toLowerCase();
        const labelStr = String((v as any).label || "").toLowerCase();
        return patterns.some(
          (pattern) =>
            valueStr === pattern.toLowerCase() ||
            labelStr === pattern.toLowerCase() ||
            valueStr.includes(pattern.toLowerCase()) ||
            labelStr.includes(pattern.toLowerCase())
        );
      });
      // Vérifier si la cote est suspendue (suspended: true = afficher "locked")
      // Valider aussi que la cote est > 1
      return found?.suspended === true ? "locked" : validateOdd(found?.odd);
    };

    // Gérer différents formats de labels: "1X", "Home or Draw", "Home/Draw", etc.
    const _1X = findValue([
      "1X",
      "1x",
      "Home or Draw",
      "Home/Draw",
      "Home Draw",
      "HomeDraw",
    ]);
    const _12 = findValue([
      "12",
      "Home or Away",
      "Home/Away",
      "Home Away",
      "HomeAway",
    ]);
    const X2 = findValue([
      "X2",
      "x2",
      "Away or Draw",
      "Away/Draw",
      "Away Draw",
      "AwayDraw",
      "Draw or Away",
      "Draw/Away",
      "Draw Away",
      "DrawAway",
    ]);
    odds.doubleChance = { _1X, _12, X2 };
  }

  // Trouver le marché Total Goals
  // Pour les matchs live, utiliser UNIQUEMENT "Over/Under Line"
  // Pour les matchs à venir, utiliser n'importe quel marché disponible
  const totalGoalsMarket = isLive
    ? // Pour les matchs live : prioriser uniquement "Over/Under Line"
      marketsArray.find((m) => {
        const name = getMarketName(m);
        return (
          name === "Over/Under Line" || name === "Over/Under Line (1st Half)"
        );
      })
    : // Pour les matchs à venir : utiliser n'importe quel marché disponible
      marketsArray.find((m) => {
        const name = getMarketName(m);
        return (
          name === "Goals Over/Under" ||
          name === "Over/Under Line" ||
          name === "Match Goals" ||
          name === "Over/Under (1st Half)" ||
          name === "Over/Under Line (1st Half)"
        );
      });
  if (totalGoalsMarket && totalGoalsMarket.values) {
    const allLines: Record<
      string,
      { over: number | string; under: number | string }
    > = {};
    let defaultLineValue: string | undefined;

    totalGoalsMarket.values.forEach((v: any) => {
      // Utiliser directement le champ handicap si disponible, sinon extraire depuis le label
      const handicap = v.handicap ? String(v.handicap) : null;

      // Si pas de handicap, essayer d'extraire depuis le label (fallback)
      let line: string | null = handicap;
      if (!line) {
        const valueStr = String(v.value || "").toLowerCase();
        const overMatch = valueStr.match(/over\s*\/?\s*([\d.]+)/);
        const underMatch = valueStr.match(/under\s*\/?\s*([\d.]+)/);
        line = overMatch ? overMatch[1] : underMatch ? underMatch[1] : null;
      }

      if (!line) return; // Ignorer si aucune ligne trouvée

      const valueStr = String(v.value || "").toLowerCase();
      const isOver = valueStr.includes("over");
      const isUnder = valueStr.includes("under");

      // Vérifier si la cote est suspendue (suspended: true = afficher "locked")
      // Valider aussi que la cote est > 1
      const oddValue = v.suspended === true ? "locked" : validateOdd(v.odd);

      if (!allLines[line]) {
        allLines[line] = { over: "locked", under: "locked" };
      }

      if (isOver) {
        allLines[line].over = oddValue;
        // Utiliser la ligne avec main: true comme valeur par défaut, sinon 2.5
        if (!defaultLineValue || v.main === true || line === "2.5") {
          defaultLineValue = line;
        }
      } else if (isUnder) {
        allLines[line].under = oddValue;
        // Utiliser la ligne avec main: true comme valeur par défaut, sinon 2.5
        if (!defaultLineValue || v.main === true || line === "2.5") {
          defaultLineValue = line;
        }
      }
    });

    // Si "2.5" n'est pas trouvé, prendre la première ligne disponible par défaut
    if (!defaultLineValue && Object.keys(allLines).length > 0) {
      defaultLineValue = Object.keys(allLines)[0];
    }

    if (defaultLineValue) {
      odds.totalGoals = {
        value: defaultLineValue,
        over: allLines[defaultLineValue]?.over ?? "locked",
        under: allLines[defaultLineValue]?.under ?? "locked",
        allLines: allLines,
      };
    } else {
      console.warn(
        "🔍 [Transform] Aucune ligne Total Goals trouvée dans format simple!"
      );
    }
  }

  // Trouver le marché Both Teams To Score
  const ggNgMarket = marketsArray.find((m) => {
    const name = getMarketName(m);
    return (
      name === "Both Teams to Score" ||
      name === "Both Teams To Score (1st Half)"
    );
  });
  if (ggNgMarket && ggNgMarket.values) {
    const GGValue = ggNgMarket.values.find((v) => v.value === "Yes");
    const GG =
      GGValue?.suspended === true ? "locked" : validateOdd(GGValue?.odd);

    const NGValue = ggNgMarket.values.find((v) => v.value === "No");
    const NG =
      NGValue?.suspended === true ? "locked" : validateOdd(NGValue?.odd);

    odds.ggNg = { GG, NG };
  }

  // Trouver le marché Pair/Impaire (Goals Odd/Even)
  const pairImpaireMarket = marketsArray.find(
    (m) => getMarketName(m) === "Goals Odd/Even"
  );
  if (pairImpaireMarket && pairImpaireMarket.values) {
    const PairValue = pairImpaireMarket.values.find((v) => v.value === "Even");
    const Pair =
      PairValue?.suspended === true ? "locked" : validateOdd(PairValue?.odd);

    const ImpaireValue = pairImpaireMarket.values.find(
      (v) => v.value === "Odd"
    );
    const Impaire =
      ImpaireValue?.suspended === true
        ? "locked"
        : validateOdd(ImpaireValue?.odd);

    odds.pairImpaire = { Pair, Impaire };
  }

  return odds;
}

/**
 * Transforme une réponse API en objet Match
 */
export function transformApiDataToMatch(
  apiData: ApiMatchResponse,
  oddsChanges?: Record<string, Record<string, "up" | "down">>
): Match {
  // Déterminer la date à utiliser
  const dateToUse =
    apiData.time?.date ||
    apiData.date ||
    apiData.fixtureDate ||
    apiData.fixture?.date;

  const dateTime = formatDateTime(dateToUse);

  // Adapter fixtureId
  const fixtureId = apiData.fixtureId || (apiData.fixture as any)?.id;

  // Adapter status
  const statusFromFixture = (apiData.fixture as any)?.status?.short;
  const status = statusFromFixture || apiData.status || "UPCOMING";

  // Déterminer si c'est un match live, terminé ou à venir
  const isLive = isLiveMatch(status);
  const isFinished = isFinishedMatch(status);
  const matchStatus = isLive
    ? status || "LIVE"
    : isFinished
    ? status
    : "UPCOMING";

  // Extraire les cotes - NOUVELLE PRIORITÉ:
  // 1. optimizedOdds (format avancé)
  // 2. bestBookmaker (format alternatif)
  // 3. markets (format alternatif)
  // 4. odds (NOUVEAU - format simple de l'API)
  let odds: Match["odds"];

  const optimizedOddsValue = (apiData as any).optimizedOdds;
  // Vérifier si optimizedOdds existe et n'est pas null
  const hasOptimizedOdds =
    optimizedOddsValue !== null && optimizedOddsValue !== undefined;

  // PRIORITÉ 1: optimizedOdds (format avancé) - SAUF pour Total Goals
  if (hasOptimizedOdds) {
    odds = extractOddsFromOptimized((apiData as any).optimizedOdds);

    // Log désactivé pour réduire le bruit dans la console
    // console.log("📊 [Transform] Marchés disponibles dans optimizedOdds:", {
    //   fixtureId: apiData.fixtureId || (apiData.fixture as any)?.id,
    //   optimizedOddsKeys: Object.keys((apiData as any).optimizedOdds || {}),
    //   optimizedOdds: (apiData as any).optimizedOdds,
    // });

    // Pour Total Goals, TOUJOURS utiliser le format simple (apiData.odds) car
    // optimizedOdds["Goals"] ne contient que quelques lignes (1, 2.5, 3) au lieu de toutes (0.5, 1.5, 2.5, 3.5, etc.)
    if (apiData.odds) {
      let marketsArray: ApiMarket[] | undefined;

      if (Array.isArray(apiData.odds)) {
        marketsArray = apiData.odds;
      } else if (
        typeof apiData.odds === "object" &&
        (apiData.odds as any).bookmaker &&
        (apiData.odds as any).bookmaker.bets &&
        Array.isArray((apiData.odds as any).bookmaker.bets)
      ) {
        marketsArray = (apiData.odds as any).bookmaker.bets;
      } else if (
        typeof apiData.odds === "object" &&
        (apiData.odds as any).odds &&
        Array.isArray((apiData.odds as any).odds)
      ) {
        marketsArray = (apiData.odds as any).odds;
      }

      // Log désactivé pour réduire le bruit dans la console
      // if (marketsArray) {
      //   console.log(
      //     "📊 [Transform] Marchés disponibles dans apiData.odds (format simple):",
      //     {
      //       fixtureId: apiData.fixtureId || (apiData.fixture as any)?.id,
      //       marketsCount: marketsArray.length,
      //       marketsNames: marketsArray.map(
      //         (m) => m.name || m.market || "UNKNOWN"
      //       ),
      //       markets: marketsArray.map((m) => ({
      //         name: m.name || m.market || "UNKNOWN",
      //         id: m.id,
      //         valuesCount: m.values?.length || 0,
      //         values: m.values?.map((v) => ({
      //           value: v.value,
      //           label: v.label,
      //           odd: v.odd,
      //         })),
      //       })),
      //     }
      //   );
      // }

      // Log désactivé pour réduire le bruit dans la console
      // else {
      //   console.log(
      //     "📊 [Transform] apiData.odds n'est pas un tableau de marchés:",
      //     {
      //       fixtureId: apiData.fixtureId || (apiData.fixture as any)?.id,
      //       oddsType: typeof apiData.odds,
      //       oddsIsArray: Array.isArray(apiData.odds),
      //       odds: apiData.odds,
      //     }
      //   );
      // }

      // Extraire Total Goals depuis le format simple
      // Pour les matchs live, utiliser uniquement "Over/Under Line"
      if (marketsArray) {
        const totalGoalsFromSimple = extractOddsFromSimpleFormat(
          marketsArray,
          isLive
        );

        // Stocker aussi rawMarkets pour l'affichage
        const rawMarketsForDisplay = marketsArray.map((market) => ({
          market: market.name || market.market || "",
          values: (market.values || []).map((v) => ({
            label: v.label || v.value || "",
            odd: validateOdd(v.odd),
            value: v.value || v.label || "",
          })),
        }));
        (apiData as any)._allMarketsFromOdds = rawMarketsForDisplay;

        // TOUJOURS utiliser le format simple pour Total Goals
        if (totalGoalsFromSimple.totalGoals) {
          odds.totalGoals = totalGoalsFromSimple.totalGoals;
        }
      }
    } else {
      console.log("📊 [Transform] apiData.odds n'existe pas:", {
        fixtureId: apiData.fixtureId || (apiData.fixture as any)?.id,
      });
    }
  }
  // PRIORITÉ 2: bestBookmaker (format alternatif)
  else if (apiData.bestBookmaker) {
    odds = extractOdds(apiData.bestBookmaker);
  }
  // PRIORITÉ 3: markets (format alternatif)
  else if (
    apiData.markets &&
    Array.isArray(apiData.markets) &&
    apiData.markets.length > 0
  ) {
    odds = extractOddsFromMarkets(apiData.markets);
  }
  // PRIORITÉ 4: odds simple (NOUVEAU - format simple de l'API)
  // L'API peut retourner soit un tableau de marchés directement, soit un objet contenant un tableau odds
  // Format pour matchs à venir: odds.bookmaker.bets (tableau de marchés)
  else if (apiData.odds) {
    let marketsArray: ApiMarket[] | undefined;

    // Vérifier si c'est un tableau directement
    if (Array.isArray(apiData.odds)) {
      marketsArray = apiData.odds;
    }
    // Format pour matchs à venir: odds.bookmaker.bets
    else if (
      typeof apiData.odds === "object" &&
      (apiData.odds as any).bookmaker &&
      (apiData.odds as any).bookmaker.bets &&
      Array.isArray((apiData.odds as any).bookmaker.bets)
    ) {
      marketsArray = (apiData.odds as any).bookmaker.bets;
    }
    // Sinon, vérifier si c'est un objet avec une propriété odds qui est un tableau
    else if (
      typeof apiData.odds === "object" &&
      (apiData.odds as any).odds &&
      Array.isArray((apiData.odds as any).odds)
    ) {
      marketsArray = (apiData.odds as any).odds;
    }

    // Log désactivé pour réduire le bruit dans la console
    // if (marketsArray) {
    //   console.log(
    //     "📊 [Transform] Marchés disponibles dans apiData.odds (PRIORITÉ 4):",
    //     {
    //       fixtureId: apiData.fixtureId || (apiData.fixture as any)?.id,
    //       marketsCount: marketsArray.length,
    //       marketsNames: marketsArray.map(
    //         (m) => m.name || m.market || "UNKNOWN"
    //       ),
    //       markets: marketsArray.map((m) => ({
    //         name: m.name || m.market || "UNKNOWN",
    //         id: m.id,
    //         valuesCount: m.values?.length || 0,
    //         values: m.values?.map((v) => ({
    //           value: v.value,
    //           label: v.label,
    //           odd: v.odd,
    //         })),
    //       })),
    //     }
    //   );
    // }

    if (marketsArray) {
      odds = extractOddsFromSimpleFormat(marketsArray, isLive);
      // Stocker TOUS les marchés dans rawMarkets pour qu'ils soient disponibles pour l'affichage
      // Convertir le format ApiMarket[] en format attendu par rawMarkets
      // Le format attendu est: { market: string, values: Array<{ label: string, odd: number | string, handicap?: string | number, suspended?: boolean, main?: boolean }> }
      const rawMarketsForDisplay = marketsArray.map((market) => ({
        market: market.name || market.market || "",
        values: (market.values || []).map((v) => ({
          label: v.label || v.value || "",
          odd: validateOdd(v.odd),
          value: v.value || v.label || "",
          // Copier les champs importants pour Over/Under Line
          handicap: v.handicap !== undefined ? v.handicap : undefined,
          suspended: v.suspended !== undefined ? v.suspended : undefined,
          main: v.main !== undefined ? v.main : undefined,
        })),
      }));
      // On stockera cela plus tard dans le return
      (apiData as any)._allMarketsFromOdds = rawMarketsForDisplay;
    } else {
      // Format non reconnu, initialiser des cotes "locked" pour éviter les erreurs
      odds = {
        _1x2: { _1: "locked", X: "locked", _2: "locked" },
        doubleChance: { _1X: "locked", _12: "locked", X2: "locked" },
        totalGoals: { value: "2.5", over: "locked", under: "locked" },
        ggNg: { GG: "locked", NG: "locked" },
        pairImpaire: { Pair: "locked", Impaire: "locked" },
      };
    }
  }
  // Fallback: aucune cote disponible
  else {
    odds = {
      _1x2: { _1: "locked", X: "locked", _2: "locked" },
      doubleChance: { _1X: "locked", _12: "locked", X2: "locked" },
      totalGoals: { value: "2.5", over: "locked", under: "locked" },
      ggNg: { GG: "locked", NG: "locked" },
      pairImpaire: { Pair: "locked", Impaire: "locked" },
    };
  }

  // S'assurer que odds n'est jamais undefined
  if (!odds || Object.keys(odds).length === 0) {
    odds = {
      _1x2: { _1: "locked", X: "locked", _2: "locked" },
      doubleChance: { _1X: "locked", _12: "locked", X2: "locked" },
      totalGoals: { value: "2.5", over: "locked", under: "locked" },
      ggNg: { GG: "locked", NG: "locked" },
      pairImpaire: { Pair: "locked", Impaire: "locked" },
    };
  }

  // Adapter time
  const time =
    apiData.time ||
    ((apiData.fixture as any)?.status
      ? {
          elapsed: (apiData.fixture as any).status.elapsed ?? 0,
          short: (apiData.fixture as any).status.short || "HT",
          long: (apiData.fixture as any).status.long || "Half Time",
        }
      : undefined);

  // Adapter teams
  const homeTeamName =
    typeof apiData.teams?.home === "string"
      ? apiData.teams.home
      : (apiData.teams?.home as any)?.name || "Équipe domicile";

  const awayTeamName =
    typeof apiData.teams?.away === "string"
      ? apiData.teams.away
      : (apiData.teams?.away as any)?.name || "Équipe extérieure";

  // Adapter score
  const homeScore =
    apiData.score?.home ??
    apiData.goals?.home ??
    (apiData.fixture as any)?.score?.home ??
    0;

  const awayScore =
    apiData.score?.away ??
    apiData.goals?.away ??
    (apiData.fixture as any)?.score?.away ??
    0;

  const result: Match = {
    id: fixtureId?.toString() || String(Date.now()),
    status: matchStatus,
    minute:
      time?.elapsed ?? (apiData.fixture as any)?.status?.elapsed ?? undefined,
    time: time
      ? {
          elapsed: time.elapsed ?? 0,
          short: time.short,
          long: time.long,
        }
      : {
          elapsed: 0,
          short: "HT",
          long: "Half Time",
        },
    date: dateToUse || undefined,
    dateTime,
    league: {
      id: apiData.league?.id,
      name: apiData.league?.name || "Ligue inconnue",
      country: apiData.league?.country || "Pays inconnu",
      flag: apiData.league?.flag || "https://flagcdn.com/w20/xx.png",
    },
    homeTeam: {
      name: homeTeamName,
      score: isLive ? homeScore : 0,
    },
    awayTeam: {
      name: awayTeamName,
      score: isLive ? awayScore : 0,
    },
    odds,
    bestBookmakerName:
      (apiData as any).source || apiData.bestBookmaker?.name || "Unknown",
    fixtureDate: dateToUse || null,
    rawMarkets:
      (apiData as any)._allMarketsFromOdds || // Marchés extraits du format simple
      apiData.markets ||
      apiData.bestBookmaker?.markets ||
      [],
    hasMoreOptions: true,
    venue: (apiData.fixture as any)?.venue?.name || "Stade inconnu",
    referee: (apiData.fixture as any)?.referee || "Arbitre inconnu",
    round: apiData.league?.name || null,
    oddsChanges,
  };

  // VALIDATION FINALE: S'assurer que toutes les cotes dans odds sont validées
  if (result.odds) {
    // Valider toutes les cotes dans _1x2
    if (result.odds._1x2) {
      result.odds._1x2 = {
        _1: validateOdd(result.odds._1x2._1),
        X: validateOdd(result.odds._1x2.X),
        _2: validateOdd(result.odds._1x2._2),
      };
    }

    // Valider toutes les cotes dans doubleChance
    if (result.odds.doubleChance) {
      result.odds.doubleChance = {
        _1X: validateOdd(result.odds.doubleChance._1X),
        _12: validateOdd(result.odds.doubleChance._12),
        X2: validateOdd(result.odds.doubleChance.X2),
      };
    }

    // Valider toutes les cotes dans totalGoals
    if (result.odds.totalGoals) {
      result.odds.totalGoals = {
        ...result.odds.totalGoals,
        over: validateOdd(result.odds.totalGoals.over),
        under: validateOdd(result.odds.totalGoals.under),
        // Valider aussi toutes les lignes dans allLines
        allLines: result.odds.totalGoals.allLines
          ? Object.fromEntries(
              Object.entries(result.odds.totalGoals.allLines).map(
                ([line, data]) => [
                  line,
                  {
                    over: validateOdd(data.over),
                    under: validateOdd(data.under),
                  },
                ]
              )
            )
          : undefined,
      };
    }

    // Valider toutes les cotes dans ggNg
    if (result.odds.ggNg) {
      result.odds.ggNg = {
        GG: validateOdd(result.odds.ggNg.GG),
        NG: validateOdd(result.odds.ggNg.NG),
      };
    }

    // Valider toutes les cotes dans pairImpaire
    if (result.odds.pairImpaire) {
      result.odds.pairImpaire = {
        Pair: validateOdd(result.odds.pairImpaire.Pair),
        Impaire: validateOdd(result.odds.pairImpaire.Impaire),
      };
    }
  }

  return result;
}

/**
 * Transforme les odds d'un MatchDetails pour qu'ils soient dans le même format que les Match
 * Cette fonction est utilisée pour transformer les données de fetchMatchDetails
 */
export function transformMatchDetailsOdds(matchDetails: any): any {
  const isUpcoming = !matchDetails?.isLive;

  if (!matchDetails || !matchDetails.odds) {
    if (isUpcoming) {
      console.log(
        "🔍 [UPCOMING] [transformMatchDetailsOdds] No odds in matchDetails"
      );
    }
    return matchDetails;
  }

  // Si odds est déjà dans le format transformé (comme _1x2, doubleChance, etc.), le retourner tel quel
  if (
    matchDetails.odds &&
    typeof matchDetails.odds === "object" &&
    !Array.isArray(matchDetails.odds) &&
    !matchDetails.odds.odds &&
    (matchDetails.odds._1x2 ||
      matchDetails.odds.doubleChance ||
      matchDetails.odds.totalGoals)
  ) {
    if (isUpcoming) {
      console.log(
        "🔍 [UPCOMING] [transformMatchDetailsOdds] Odds already transformed"
      );
    }
    return matchDetails;
  }

  // Si odds est un tableau de marchés ou odds.odds est un tableau
  let marketsArray: any[] = [];

  // PRIORITÉ 1: Vérifier si odds est directement un tableau
  if (Array.isArray(matchDetails.odds)) {
    if (isUpcoming) {
      console.log(
        "🔍 [UPCOMING] [transformMatchDetailsOdds] Odds is array, length:",
        matchDetails.odds.length
      );
    }
    marketsArray = matchDetails.odds;
  }
  // PRIORITÉ 2: Vérifier odds.odds (format processedOdds du backend)
  else if (matchDetails.odds.odds && Array.isArray(matchDetails.odds.odds)) {
    if (isUpcoming) {
      console.log(
        "🔍 [UPCOMING] [transformMatchDetailsOdds] Found odds.odds array, length:",
        matchDetails.odds.odds.length
      );
    }
    marketsArray = matchDetails.odds.odds;
  }
  // PRIORITÉ 3: Vérifier odds.markets
  else if (
    matchDetails.odds.markets &&
    Array.isArray(matchDetails.odds.markets)
  ) {
    if (isUpcoming) {
      console.log(
        "🔍 [UPCOMING] [transformMatchDetailsOdds] Found odds.markets array, length:",
        matchDetails.odds.markets.length
      );
    }
    marketsArray = matchDetails.odds.markets;
  }
  // PRIORITÉ 4: Vérifier si odds contient des données de bookmaker avec des marchés
  else if (matchDetails.odds.bookmaker) {
    if (isUpcoming) {
      const bookmaker = matchDetails.odds.bookmaker as any;
      console.log(
        "🔍 [UPCOMING] [transformMatchDetailsOdds] Found bookmaker, structure:",
        {
          hasMarkets: !!bookmaker?.markets,
          hasBets: !!bookmaker?.bets,
          marketsIsArray: Array.isArray(bookmaker?.markets),
          betsIsArray: Array.isArray(bookmaker?.bets),
          bookmakerKeys:
            typeof bookmaker === "object" && bookmaker !== null
              ? Object.keys(bookmaker)
              : [],
          bookmakerType: typeof bookmaker,
          bookmakerIsArray: Array.isArray(bookmaker),
          // Afficher la structure complète pour debug
          bookmakerStructure: JSON.stringify(bookmaker, null, 2).substring(
            0,
            500
          ),
        }
      );
    }

    // PRIORITÉ 4a: Vérifier bookmaker.bets (format pour matchs upcoming)
    if (
      (matchDetails.odds.bookmaker as any)?.bets &&
      Array.isArray((matchDetails.odds.bookmaker as any).bets)
    ) {
      if (isUpcoming) {
        console.log(
          "🔍 [UPCOMING] [transformMatchDetailsOdds] Found odds.bookmaker.bets array, length:",
          (matchDetails.odds.bookmaker as any).bets.length
        );
      }
      marketsArray = (matchDetails.odds.bookmaker as any).bets;
    }
    // PRIORITÉ 4b: Vérifier si bookmaker.markets existe et est un tableau
    else if (
      (matchDetails.odds.bookmaker as any)?.markets &&
      Array.isArray((matchDetails.odds.bookmaker as any).markets)
    ) {
      if (isUpcoming) {
        console.log(
          "🔍 [UPCOMING] [transformMatchDetailsOdds] Found odds.bookmaker.markets array, length:",
          (matchDetails.odds.bookmaker as any).markets.length
        );
      }
      marketsArray = (matchDetails.odds.bookmaker as any).markets;
    }
    // PRIORITÉ 4c: Vérifier si bookmaker est directement un tableau
    else if (Array.isArray(matchDetails.odds.bookmaker)) {
      // Si bookmaker est un tableau, prendre le premier qui a des marchés
      const bookmakerWithMarkets = matchDetails.odds.bookmaker.find(
        (b: any) =>
          (b.markets && Array.isArray(b.markets) && b.markets.length > 0) ||
          (b.bets && Array.isArray(b.bets) && b.bets.length > 0)
      );
      if (bookmakerWithMarkets) {
        const markets =
          bookmakerWithMarkets.markets || bookmakerWithMarkets.bets;
        if (markets && Array.isArray(markets) && markets.length > 0) {
          if (isUpcoming) {
            console.log(
              "🔍 [UPCOMING] [transformMatchDetailsOdds] Found bookmaker in array with markets/bets, length:",
              markets.length
            );
          }
          marketsArray = markets;
        }
      }
    }
  }
  // PRIORITÉ 5: Vérifier si odds contient un tableau de bookmakers
  else if (Array.isArray(matchDetails.odds.bookmakers)) {
    if (isUpcoming) {
      console.log(
        "🔍 [UPCOMING] [transformMatchDetailsOdds] Found bookmakers array, length:",
        matchDetails.odds.bookmakers.length
      );
    }
    // Prendre le premier bookmaker qui a des marchés ou bets
    const bookmakerWithMarkets = matchDetails.odds.bookmakers.find(
      (b: any) =>
        (b.markets && Array.isArray(b.markets) && b.markets.length > 0) ||
        (b.bets && Array.isArray(b.bets) && b.bets.length > 0)
    );
    if (bookmakerWithMarkets) {
      const markets = bookmakerWithMarkets.markets || bookmakerWithMarkets.bets;
      if (markets && Array.isArray(markets) && markets.length > 0) {
        if (isUpcoming) {
          console.log(
            "🔍 [UPCOMING] [transformMatchDetailsOdds] Found bookmaker with markets/bets, length:",
            markets.length
          );
        }
        marketsArray = markets;
      }
    }
  }
  // PRIORITÉ 6: Vérifier si les données sont dans matchDetails directement (pas dans odds)
  else if (matchDetails.markets && Array.isArray(matchDetails.markets)) {
    if (isUpcoming) {
      console.log(
        "🔍 [UPCOMING] [transformMatchDetailsOdds] Found matchDetails.markets array, length:",
        matchDetails.markets.length
      );
    }
    marketsArray = matchDetails.markets;
  } else {
    if (isUpcoming) {
      console.log(
        "🔍 [UPCOMING] [transformMatchDetailsOdds] No markets array found, odds structure:",
        {
          oddsType: typeof matchDetails.odds,
          isArray: Array.isArray(matchDetails.odds),
          hasOdds: !!(matchDetails.odds as any)?.odds,
          hasMarkets: !!(matchDetails.odds as any)?.markets,
          hasBookmaker: !!(matchDetails.odds as any)?.bookmaker,
          hasBookmakers: !!(matchDetails.odds as any)?.bookmakers,
          hasMatchDetailsMarkets: !!(matchDetails as any)?.markets,
          oddsKeys:
            typeof matchDetails.odds === "object"
              ? Object.keys(matchDetails.odds)
              : [],
          matchDetailsKeys:
            typeof matchDetails === "object"
              ? Object.keys(matchDetails).filter((k) => k !== "odds")
              : [],
        }
      );
    }
  }

  // Si on a des marchés, les transformer comme pour les matchs normaux
  if (marketsArray.length > 0) {
    const isLive = matchDetails.isLive || false;
    if (isUpcoming) {
      console.log(
        "🔍 [UPCOMING] [transformMatchDetailsOdds] Transforming markets, isLive:",
        isLive,
        "markets count:",
        marketsArray.length
      );
    }
    const transformedOdds = extractOddsFromSimpleFormat(marketsArray, isLive);

    if (isUpcoming) {
      console.log(
        "🔍 [UPCOMING] [transformMatchDetailsOdds] Transformed odds:",
        {
          has1x2: !!transformedOdds._1x2,
          hasDoubleChance: !!transformedOdds.doubleChance,
          hasTotalGoals: !!transformedOdds.totalGoals,
          hasGgNg: !!transformedOdds.ggNg,
          hasPairImpaire: !!transformedOdds.pairImpaire,
          transformedOddsKeys: Object.keys(transformedOdds),
        }
      );
    }

    // Créer un nouvel objet matchDetails avec les odds transformés
    return {
      ...matchDetails,
      odds: {
        ...transformedOdds,
        // Garder aussi les marchés bruts pour référence
        _rawMarkets: marketsArray,
      },
    };
  }

  // Si aucune transformation n'est possible, retourner tel quel
  if (isUpcoming) {
    console.log(
      "🔍 [UPCOMING] [transformMatchDetailsOdds] No transformation possible, returning as is"
    );
  }
  return matchDetails;
}
