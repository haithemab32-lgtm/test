import { logger } from "../config/logger.js";
import apiFootballService from "./ApiFootballService.js";
import oddsOptimizer from "./OddsOptimizer.js";
import cacheService from "./CacheService.js";
import { config } from "../config/index.js";

/**
 * Codes de réponse pour la validation
 */
export const VALIDATION_CODES = {
  ACCEPTED: "ACCEPTED",
  REJECTED_MATCH_FINISHED: "REJECTED_MATCH_FINISHED",
  REJECTED_MATCH_CANCELLED: "REJECTED_MATCH_CANCELLED",
  REJECTED_MATCH_POSTPONED: "REJECTED_MATCH_POSTPONED",
  REJECTED_MARKET_CLOSED: "REJECTED_MARKET_CLOSED",
  REJECTED_MARKET_SUSPENDED: "REJECTED_MARKET_SUSPENDED",
  ODDS_CHANGED: "ODDS_CHANGED",
  REJECTED_CRITICAL_EVENT: "REJECTED_CRITICAL_EVENT",
  REJECTED_LIVE_DELAY: "REJECTED_LIVE_DELAY",
  REJECTED_TICKET_EXPIRED: "REJECTED_TICKET_EXPIRED",
  ERROR: "ERROR",
};

/**
 * Statuts de match non pariables
 */
const NON_BETTABLE_STATUSES = [
  "FT", // Full Time
  "AET", // After Extra Time
  "PEN", // Penalties
  "PST", // Postponed
  "CANC", // Cancelled
  "SUSP", // Suspended
  "INT", // Interrupted
  "ABAN", // Abandoned
  "AWD", // Awarded
];

/**
 * Statuts de match instables (suspendus temporairement)
 */
const UNSTABLE_STATUSES = ["HT", "BREAK", "LIVE"]; // Peut nécessiter un lock temporaire

/**
 * Délai de lock après un événement critique (en secondes)
 */
const CRITICAL_EVENT_LOCK_DURATION = 5; // 5 secondes

/**
 * Tolérance pour les changements de cotes (en pourcentage)
 */
const ODDS_CHANGE_TOLERANCE = 0.01; // 1% ou 0.01 en valeur absolue

/**
 * Délai live (latency) pour les paris en direct (en secondes)
 */
const LIVE_DELAY_SECONDS = 3; // 3 secondes de délai pour les paris live

class BetSlipService {
  /**
   * Valide les cotes d'un ticket en comparant avec les cotes actuelles de l'API
   * @param {Array} bets - Tableau de paris à valider
   * @param {Object} options - Options de validation
   * @returns {Object} Résultat de la validation
   */
  async validateOdds(bets, options = {}) {
    const {
      code = null, // Code du ticket partagé
      checkExpiration = true, // Vérifier l'expiration du ticket
    } = options;

    const results = {
      valid: true,
      code: VALIDATION_CODES.ACCEPTED,
      changes: [],
      closed: [],
      errors: [],
      matchInfo: {}, // Informations des matchs (score, statut, etc.)
      rejected: [], // Paris rejetés avec raison
    };

    if (!bets || bets.length === 0) {
      return {
        valid: false,
        code: VALIDATION_CODES.ERROR,
        message: "Aucun pari à valider",
        ...results,
      };
    }

    // Vérifier l'expiration du ticket partagé si un code est fourni
    if (code && checkExpiration) {
      const expirationCheck = await this.checkTicketExpiration(code);
      if (!expirationCheck.valid) {
        return {
          valid: false,
          code: VALIDATION_CODES.REJECTED_TICKET_EXPIRED,
          message: expirationCheck.message,
          ...results,
        };
      }
    }

    // Grouper les paris par fixtureId pour optimiser les appels API
    const betsByFixture = {};
    bets.forEach((bet) => {
      if (!betsByFixture[bet.fixtureId]) {
        betsByFixture[bet.fixtureId] = [];
      }
      betsByFixture[bet.fixtureId].push(bet);
    });

    // Valider chaque fixture
    for (const [fixtureId, fixtureBets] of Object.entries(betsByFixture)) {
      try {
        const validation = await this.validateFixtureOdds(
          parseInt(fixtureId, 10),
          fixtureBets
        );

        if (!validation.valid) {
          results.valid = false;
          // Mettre à jour le code de validation si nécessaire
          if (
            validation.code &&
            validation.code !== VALIDATION_CODES.ACCEPTED
          ) {
            results.code = validation.code;
          }
        }

        results.changes.push(...validation.changes);
        results.closed.push(...validation.closed);
        results.errors.push(...validation.errors);
        results.rejected.push(...validation.rejected);

        // Ajouter les informations du match (score, statut, etc.)
        if (validation.matchInfo) {
          results.matchInfo[fixtureId] = validation.matchInfo;
        }
      } catch (error) {
        logger.error(
          `Erreur lors de la validation des cotes pour fixture ${fixtureId}:`,
          error
        );
        results.valid = false;
        results.code = VALIDATION_CODES.ERROR;
        results.errors.push({
          fixtureId: parseInt(fixtureId, 10),
          error: error.message,
          code: VALIDATION_CODES.ERROR,
        });
      }
    }

    // Déterminer le code final si plusieurs problèmes
    if (!results.valid) {
      if (results.rejected.length > 0) {
        // Prioriser les rejets (match terminé, etc.)
        const rejectionCodes = results.rejected.map((r) => r.code);
        if (rejectionCodes.includes(VALIDATION_CODES.REJECTED_MATCH_FINISHED)) {
          results.code = VALIDATION_CODES.REJECTED_MATCH_FINISHED;
        } else if (
          rejectionCodes.includes(VALIDATION_CODES.REJECTED_CRITICAL_EVENT)
        ) {
          results.code = VALIDATION_CODES.REJECTED_CRITICAL_EVENT;
        } else if (
          rejectionCodes.includes(VALIDATION_CODES.REJECTED_MARKET_CLOSED)
        ) {
          results.code = VALIDATION_CODES.REJECTED_MARKET_CLOSED;
        }
      }
    }

    // Logger la validation
    this.logValidation(bets, results);

    return {
      valid:
        results.valid &&
        results.changes.length === 0 &&
        results.closed.length === 0 &&
        results.rejected.length === 0,
      code: results.code,
      message: this.generateValidationMessage(results),
      ...results,
    };
  }

  /**
   * Vérifie l'expiration d'un ticket partagé
   * @param {String} code - Code du ticket
   * @returns {Object} Résultat de la vérification
   */
  async checkTicketExpiration(code) {
    try {
      const BetSlip = (await import("../models/BetSlip.js")).default;
      const betSlip = await BetSlip.findOne({ code });

      if (!betSlip) {
        return {
          valid: false,
          message: "Ticket introuvable",
        };
      }

      if (betSlip.isExpired()) {
        return {
          valid: false,
          message: "Ticket expiré",
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error(
        `Erreur lors de la vérification de l'expiration: ${error.message}`
      );
      return {
        valid: false,
        message: "Erreur lors de la vérification de l'expiration",
      };
    }
  }

  /**
   * Valide les cotes pour une fixture spécifique
   * @param {Number} fixtureId - ID de la fixture
   * @param {Array} bets - Paries pour cette fixture
   * @returns {Object} Résultat de la validation
   */
  async validateFixtureOdds(fixtureId, bets) {
    const result = {
      valid: true,
      code: VALIDATION_CODES.ACCEPTED,
      changes: [],
      closed: [],
      errors: [],
      rejected: [],
      matchInfo: null,
    };

    try {
      // 1. Récupérer les détails du match (avec cache)
      const matchStatus = await this.getMatchStatus(fixtureId);

      if (!matchStatus) {
        result.valid = false;
        result.code = VALIDATION_CODES.ERROR;
        result.errors.push({
          fixtureId,
          error: "Impossible de récupérer le statut du match",
          code: VALIDATION_CODES.ERROR,
        });
        return result;
      }

      // 2. Vérifier le statut du match
      const statusCheck = this.checkMatchStatus(matchStatus.status);
      if (!statusCheck.valid) {
        result.valid = false;
        result.code = statusCheck.code;
        result.rejected.push({
          fixtureId,
          code: statusCheck.code,
          message: statusCheck.message,
          status: matchStatus.status,
        });
        // Logger le rejet
        logger.warn(
          `[VALIDATION] Match ${fixtureId} rejeté: ${statusCheck.code} - ${statusCheck.message}`
        );
        return result;
      }

      // 3. Vérifier les événements critiques (lock après but, etc.)
      const criticalEventCheck = await this.checkCriticalEvents(fixtureId);
      if (!criticalEventCheck.valid) {
        result.valid = false;
        result.code = VALIDATION_CODES.REJECTED_CRITICAL_EVENT;
        result.rejected.push({
          fixtureId,
          code: VALIDATION_CODES.REJECTED_CRITICAL_EVENT,
          message: criticalEventCheck.message,
          lockUntil: criticalEventCheck.lockUntil,
        });
        logger.warn(
          `[VALIDATION] Match ${fixtureId} bloqué par événement critique jusqu'à ${criticalEventCheck.lockUntil}`
        );
        return result;
      }

      // 4. Vérifier le délai live si le match est en cours
      if (matchStatus.isLive) {
        const liveDelayCheck = this.checkLiveDelay(matchStatus.status);
        if (!liveDelayCheck.valid) {
          result.valid = false;
          result.code = VALIDATION_CODES.REJECTED_LIVE_DELAY;
          result.rejected.push({
            fixtureId,
            code: VALIDATION_CODES.REJECTED_LIVE_DELAY,
            message: liveDelayCheck.message,
          });
          return result;
        }
      }

      // 5. Récupérer les cotes (avec cache)
      const oddsData = await this.getOddsWithCache(
        fixtureId,
        matchStatus.isLive
      );

      // Vérifier la présence des cotes (structure différente pour live vs upcoming)
      if (!oddsData || !oddsData.processedOdds) {
        result.valid = false;
        result.code = VALIDATION_CODES.REJECTED_MARKET_CLOSED;
        result.closed.push({
          fixtureId,
          market: "all",
          message: "Impossible de traiter les cotes",
          code: VALIDATION_CODES.REJECTED_MARKET_CLOSED,
        });
        return result;
      }

      // Pour les matchs live : vérifier processedOdds.odds
      // Pour les matchs upcoming : vérifier processedOdds.bookmaker.bets
      const hasOdds = matchStatus.isLive
        ? oddsData.processedOdds.odds &&
          Array.isArray(oddsData.processedOdds.odds) &&
          oddsData.processedOdds.odds.length > 0
        : oddsData.processedOdds.bookmaker &&
          oddsData.processedOdds.bookmaker.bets &&
          Array.isArray(oddsData.processedOdds.bookmaker.bets) &&
          oddsData.processedOdds.bookmaker.bets.length > 0;

      if (!hasOdds) {
        result.valid = false;
        result.code = VALIDATION_CODES.REJECTED_MARKET_CLOSED;
        result.closed.push({
          fixtureId,
          market: "all",
          message: "Impossible de traiter les cotes",
          code: VALIDATION_CODES.REJECTED_MARKET_CLOSED,
        });
        return result;
      }

      // 6. Extraire les informations du match
      const matchInfo = {
        fixtureId: matchStatus.fixtureId || fixtureId,
        status: matchStatus.status,
        score: matchStatus.score,
        teams: matchStatus.teams,
        league: matchStatus.league,
        isLive: matchStatus.isLive,
      };

      // 7. Valider chaque pari
      for (const bet of bets) {
        const validation = this.validateBet(
          bet,
          oddsData.processedOdds,
          matchStatus.isLive
        );

        if (!validation.valid) {
          result.valid = false;

          if (validation.rejected) {
            result.rejected.push({
              fixtureId,
              market: bet.market,
              selection: bet.selection,
              code: validation.code,
              message: validation.message,
            });
          } else if (validation.closed) {
            result.closed.push({
              fixtureId,
              market: bet.market,
              selection: bet.selection,
              message: validation.message,
              code: validation.code || VALIDATION_CODES.REJECTED_MARKET_CLOSED,
            });
          } else if (validation.changed) {
            result.changes.push({
              fixtureId,
              market: bet.market,
              selection: bet.selection,
              handicap: bet.handicap || null,
              oldOdd: bet.odd,
              newOdd: validation.newOdd,
              changePercent: validation.changePercent,
              code: VALIDATION_CODES.ODDS_CHANGED,
            });
          }
        }
      }

      // Ajouter les informations du match au résultat
      result.matchInfo = matchInfo;
    } catch (error) {
      logger.error(
        `Erreur lors de la validation de la fixture ${fixtureId}:`,
        error
      );
      result.valid = false;
      result.code = VALIDATION_CODES.ERROR;
      result.errors.push({
        fixtureId,
        error: error.message,
        code: VALIDATION_CODES.ERROR,
      });
    }

    return result;
  }

  /**
   * Récupère le statut du match avec cache
   * @param {Number} fixtureId - ID de la fixture
   * @returns {Object|null} Statut du match
   */
  async getMatchStatus(fixtureId) {
    const cacheKey = cacheService.generateKey("fixture:status", {
      fixture: fixtureId,
    });

    // Essayer de récupérer depuis le cache
    if (cacheService.isAvailable()) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`[CACHE HIT] Match status for fixture ${fixtureId}`);
        return cached;
      }
    }

    // Si pas en cache, récupérer depuis l'API
    try {
      const response = await apiFootballService.getFixtureDetails(fixtureId);

      if (
        !response.success ||
        !response.data.response ||
        response.data.response.length === 0
      ) {
        return null;
      }

      const fixtureData = response.data.response[0];
      const status = fixtureData.fixture?.status || {};
      const isLive =
        status.short &&
        status.short !== "NS" &&
        status.short !== "TBD" &&
        status.short !== "PST" &&
        !NON_BETTABLE_STATUSES.includes(status.short);

      const matchStatus = {
        fixtureId: fixtureData.fixture?.id || fixtureId,
        status: status,
        score: fixtureData.goals || null,
        teams: fixtureData.teams || null,
        league: fixtureData.league || null,
        isLive: isLive,
        timestamp: Date.now(),
      };

      // Mettre en cache (TTL court pour les matchs live, plus long pour les autres)
      if (cacheService.isAvailable()) {
        const ttl = isLive ? 10 : 60; // 10s pour live, 60s pour pré-match
        await cacheService.set(cacheKey, matchStatus, ttl);
      }

      return matchStatus;
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération du statut du match ${fixtureId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Vérifie le statut du match
   * @param {Object} status - Statut du match
   * @returns {Object} Résultat de la vérification
   */
  checkMatchStatus(status) {
    if (!status || !status.short) {
      return {
        valid: false,
        code: VALIDATION_CODES.ERROR,
        message: "Statut du match inconnu",
      };
    }

    const statusShort = status.short;

    // Vérifier si le match est terminé
    if (NON_BETTABLE_STATUSES.includes(statusShort)) {
      let code = VALIDATION_CODES.REJECTED_MATCH_FINISHED;
      let message = "Le match est terminé";

      if (statusShort === "CANC") {
        code = VALIDATION_CODES.REJECTED_MATCH_CANCELLED;
        message = "Le match a été annulé";
      } else if (statusShort === "PST") {
        code = VALIDATION_CODES.REJECTED_MATCH_POSTPONED;
        message = "Le match a été reporté";
      } else if (statusShort === "SUSP" || statusShort === "INT") {
        code = VALIDATION_CODES.REJECTED_MATCH_CANCELLED;
        message = "Le match est suspendu";
      }

      return {
        valid: false,
        code,
        message,
      };
    }

    return { valid: true };
  }

  /**
   * Vérifie les événements critiques (lock après but, etc.)
   * @param {Number} fixtureId - ID de la fixture
   * @returns {Object} Résultat de la vérification
   */
  async checkCriticalEvents(fixtureId) {
    const lockKey = `critical_event_lock:${fixtureId}`;

    // Vérifier si un lock est actif dans le cache
    if (cacheService.isAvailable()) {
      const lockData = await cacheService.get(lockKey);
      if (lockData && lockData.lockUntil > Date.now()) {
        const remainingSeconds = Math.ceil(
          (lockData.lockUntil - Date.now()) / 1000
        );
        return {
          valid: false,
          message: `Pari temporairement bloqué après un événement critique. Réessayez dans ${remainingSeconds} seconde(s)`,
          lockUntil: new Date(lockData.lockUntil).toISOString(),
        };
      }
    }

    // Vérifier les événements récents du match
    try {
      const eventsResponse = await apiFootballService.getFixtureEvents(
        fixtureId
      );

      if (
        eventsResponse.success &&
        eventsResponse.data.response &&
        eventsResponse.data.response.length > 0
      ) {
        const events = eventsResponse.data.response;
        const now = Date.now();

        // Vérifier s'il y a un événement critique récent (but, penalty, carton rouge)
        const criticalEvents = events.filter((event) => {
          const eventTime = event.time?.elapsed || 0;
          const eventTimestamp = now - eventTime * 1000; // Approximation

          // Événements critiques : but, penalty, carton rouge
          const isCritical =
            event.type === "Goal" ||
            event.type === "Penalty" ||
            (event.type === "Card" && event.detail === "Red Card");

          // Vérifier si l'événement est récent (dans les dernières 5 secondes)
          return (
            isCritical &&
            eventTimestamp > now - CRITICAL_EVENT_LOCK_DURATION * 1000
          );
        });

        if (criticalEvents.length > 0) {
          // Créer un lock dans le cache
          const lockUntil = Date.now() + CRITICAL_EVENT_LOCK_DURATION * 1000;
          if (cacheService.isAvailable()) {
            await cacheService.set(
              lockKey,
              {
                lockUntil,
                events: criticalEvents.map((e) => ({
                  type: e.type,
                  time: e.time,
                })),
              },
              CRITICAL_EVENT_LOCK_DURATION
            );
          }

          return {
            valid: false,
            message: `Pari temporairement bloqué après un événement critique (${criticalEvents[0].type}). Réessayez dans ${CRITICAL_EVENT_LOCK_DURATION} seconde(s)`,
            lockUntil: new Date(lockUntil).toISOString(),
          };
        }
      }
    } catch (error) {
      logger.warn(
        `Erreur lors de la vérification des événements critiques pour ${fixtureId}: ${error.message}`
      );
      // En cas d'erreur, on accepte (ne pas bloquer inutilement)
    }

    return { valid: true };
  }

  /**
   * Vérifie le délai live (latency)
   * @param {Object} status - Statut du match
   * @returns {Object} Résultat de la vérification
   */
  checkLiveDelay(status) {
    // Pour l'instant, on accepte toujours
    // Cette fonction peut être étendue pour vérifier un délai spécifique
    // basé sur le timestamp du statut vs l'heure actuelle
    return { valid: true };
  }

  /**
   * Récupère les cotes avec cache
   * @param {Number} fixtureId - ID de la fixture
   * @param {Boolean} isLive - Si le match est en direct
   * @returns {Object|null} Données des cotes
   */
  async getOddsWithCache(fixtureId, isLive) {
    const cacheKey = cacheService.generateKey("fixture:odds", {
      fixture: fixtureId,
      live: isLive ? "true" : "false",
    });

    // Essayer de récupérer depuis le cache
    if (cacheService.isAvailable()) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`[CACHE HIT] Odds for fixture ${fixtureId}`);
        return cached;
      }
    }

    // Si pas en cache, récupérer depuis l'API
    try {
      let oddsResponse = await apiFootballService.getOddsByFixture(
        fixtureId,
        isLive,
        false // Ne pas forcer le refresh
      );

      // Si pas de cotes live, essayer les cotes pré-match
      if (
        !oddsResponse.success ||
        !oddsResponse.data.response ||
        oddsResponse.data.response.length === 0
      ) {
        if (isLive) {
          oddsResponse = await apiFootballService.getOddsByFixture(
            fixtureId,
            false,
            false
          );
        }
      }

      if (
        !oddsResponse.success ||
        !oddsResponse.data.response ||
        oddsResponse.data.response.length === 0
      ) {
        return null;
      }

      const fixtureData = oddsResponse.data.response[0];
      const processedOdds = oddsOptimizer.processOdds(
        oddsResponse.data,
        isLive
      );

      const oddsData = {
        processedOdds,
        fixtureData,
        timestamp: Date.now(),
      };

      // Mettre en cache (TTL court pour les matchs live)
      if (cacheService.isAvailable()) {
        const ttl = isLive ? 10 : 60; // 10s pour live, 60s pour pré-match
        await cacheService.set(cacheKey, oddsData, ttl);
      }

      return oddsData;
    } catch (error) {
      logger.error(
        `Erreur lors de la récupération des cotes pour ${fixtureId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Valide un pari individuel contre les cotes actuelles
   * @param {Object} bet - Pari à valider
   * @param {Object} processedOdds - Cotes traitées de l'API
   * @param {Boolean} isLive - Si le match est en direct
   * @returns {Object} Résultat de la validation
   */
  validateBet(bet, processedOdds, isLive = false) {
    const result = {
      valid: true,
      changed: false,
      closed: false,
      rejected: false,
      newOdd: null,
      changePercent: null,
      message: null,
      code: null,
    };

    // Pour les matchs live : structure processedOdds.odds
    // Pour les matchs upcoming : structure processedOdds.bookmaker.bets
    let markets = [];
    if (isLive) {
      // Pour les matchs live, normaliser la structure pour s'assurer que suspended est présent
      markets = (processedOdds.odds || []).map((market) => ({
        ...market,
        suspended: market.suspended || false,
        values: (market.values || []).map((v) => ({
          ...v,
          suspended: v.suspended || false,
        })),
      }));
    } else {
      // Pour upcoming, convertir bookmaker.bets en format similaire à odds
      if (
        processedOdds.bookmaker &&
        processedOdds.bookmaker.bets &&
        Array.isArray(processedOdds.bookmaker.bets)
      ) {
        markets = processedOdds.bookmaker.bets.map((betMarket) => ({
          id: betMarket.id,
          name: betMarket.name,
          // Normaliser les values : utiliser value si disponible, sinon label
          values: (betMarket.values || []).map((v) => ({
            value: v.value || v.label || "",
            label: v.label || v.value || "",
            odd: v.odd,
            handicap: v.handicap,
            suspended: v.suspended || false,
          })),
          suspended: betMarket.suspended || false,
        }));
      }
    }

    // Mapping des noms de marchés (l'API peut utiliser différents noms)
    const marketNameMapping = {
      "Match Winner": ["Match Winner", "Fulltime Result", "1x2", "1X2"],
      "Double Chance": ["Double Chance", "Double Chance Result"],
      "Both Teams Score": ["Both Teams Score", "Both Teams To Score", "GG/NG"],
      "Odd/Even": ["Odd/Even", "Pair/Impaire"],
      "Goals Over/Under": [
        "Goals Over/Under",
        "Total Goals",
        "Over/Under Line",
      ],
    };

    // Obtenir les noms possibles pour ce marché
    const possibleMarketNames = marketNameMapping[bet.market] || [bet.market];

    // Trouver le marché correspondant
    const market = markets.find(
      (m) =>
        possibleMarketNames.includes(m.name) ||
        m.id === parseInt(bet.market, 10)
    );

    if (!market || !market.values || market.values.length === 0) {
      result.valid = false;
      result.closed = true;
      result.code = VALIDATION_CODES.REJECTED_MARKET_CLOSED;
      result.message = `Le marché "${bet.market}" n'est plus disponible`;
      return result;
    }

    // Vérifier si le marché est suspendu
    if (market.suspended === true) {
      result.valid = false;
      result.closed = true;
      result.code = VALIDATION_CODES.REJECTED_MARKET_SUSPENDED;
      result.message = `Le marché "${bet.market}" est temporairement suspendu`;
      return result;
    }

    // Trouver la sélection correspondante
    let selectedValue = null;

    // Mapping pour gérer les différentes valeurs possibles de l'API
    const selectionMapping = {
      // Match Winner (1x2)
      Home: ["Home", "1"],
      Draw: ["Draw", "X"],
      Away: ["Away", "2"],
      // Double Chance
      "Home or Draw": ["Home or Draw", "1X", "Home/Draw", "Home Draw"],
      "Home or Away": ["Home or Away", "12", "Home/Away", "Home Away"],
      "Draw or Away": ["Draw or Away", "X2", "Draw/Away", "Draw Away"],
      // Both Teams Score
      Yes: ["Yes", "GG"],
      No: ["No", "NG"],
      // Odd/Even
      Even: ["Even", "Pair"],
      Odd: ["Odd", "Impaire"],
      // Over/Under
      Over: ["Over"],
      Under: ["Under"],
    };

    // Obtenir les valeurs possibles pour cette sélection
    const possibleValues = selectionMapping[bet.selection] || [bet.selection];

    if (bet.handicap) {
      // Pour les cotes avec handicap (Over/Under, Asian Handicap, etc.)
      selectedValue = market.values.find((v) => {
        // Vérifier à la fois v.value et v.label (l'API peut utiliser l'un ou l'autre)
        const valueMatch =
          possibleValues.includes(v.value) || possibleValues.includes(v.label);
        return (
          valueMatch && v.handicap === bet.handicap && v.suspended === false
        );
      });
    } else {
      // Pour les cotes sans handicap (1x2, etc.)
      selectedValue = market.values.find((v) => {
        // Vérifier à la fois v.value et v.label (l'API peut utiliser l'un ou l'autre)
        const valueMatch =
          possibleValues.includes(v.value) || possibleValues.includes(v.label);
        return valueMatch && v.suspended === false;
      });
    }

    if (!selectedValue) {
      result.valid = false;
      result.closed = true;
      result.code = VALIDATION_CODES.REJECTED_MARKET_CLOSED;
      result.message = `La sélection "${bet.selection}" n'est plus disponible pour le marché "${bet.market}"`;
      return result;
    }

    // Vérifier si la sélection est suspendue
    if (selectedValue.suspended === true) {
      result.valid = false;
      result.closed = true;
      result.code = VALIDATION_CODES.REJECTED_MARKET_SUSPENDED;
      result.message = `La sélection "${bet.selection}" est temporairement suspendue`;
      return result;
    }

    // Comparer les cotes
    const currentOdd = parseFloat(selectedValue.odd);
    const betOdd = parseFloat(bet.odd);

    if (isNaN(currentOdd) || isNaN(betOdd)) {
      result.valid = false;
      result.closed = true;
      result.code = VALIDATION_CODES.ERROR;
      result.message = "Cote invalide";
      return result;
    }

    // Vérifier si la cote a changé (tolérance)
    const difference = Math.abs(currentOdd - betOdd);
    const percentChange = (difference / betOdd) * 100;

    if (difference > ODDS_CHANGE_TOLERANCE || percentChange > 1) {
      // Tolérance : 0.01 en valeur absolue OU 1% en pourcentage
      result.valid = false;
      result.changed = true;
      result.newOdd = currentOdd;
      result.changePercent = percentChange.toFixed(2);
      result.code = VALIDATION_CODES.ODDS_CHANGED;
      result.message = `La cote a changé de ${betOdd} à ${currentOdd} (${result.changePercent}%)`;
    }

    return result;
  }

  /**
   * Génère un message de validation basé sur les résultats
   * @param {Object} results - Résultats de la validation
   * @returns {String} Message
   */
  generateValidationMessage(results) {
    if (results.valid) {
      return "Toutes les cotes sont valides";
    }

    const messages = [];

    if (results.rejected.length > 0) {
      const matchFinished = results.rejected.filter(
        (r) => r.code === VALIDATION_CODES.REJECTED_MATCH_FINISHED
      ).length;
      const criticalEvents = results.rejected.filter(
        (r) => r.code === VALIDATION_CODES.REJECTED_CRITICAL_EVENT
      ).length;

      if (matchFinished > 0) {
        messages.push(`${matchFinished} match(s) terminé(s)`);
      }
      if (criticalEvents > 0) {
        messages.push(
          `${criticalEvents} pari(s) bloqué(s) après événement critique`
        );
      }
    }

    if (results.closed.length > 0) {
      messages.push(
        `${results.closed.length} marché(s) fermé(s) ou indisponible(s)`
      );
    }

    if (results.changes.length > 0) {
      messages.push(`${results.changes.length} cote(s) modifiée(s)`);
    }

    if (results.errors.length > 0) {
      messages.push(`${results.errors.length} erreur(s) de validation`);
    }

    return messages.join(". ");
  }

  /**
   * Log les résultats de validation
   * @param {Array} bets - Paris validés
   * @param {Object} results - Résultats de la validation
   */
  logValidation(bets, results) {
    const logData = {
      timestamp: new Date().toISOString(),
      betsCount: bets.length,
      valid: results.valid,
      code: results.code,
      rejectedCount: results.rejected.length,
      closedCount: results.closed.length,
      changesCount: results.changes.length,
      errorsCount: results.errors.length,
      rejected: results.rejected.map((r) => ({
        fixtureId: r.fixtureId,
        code: r.code,
        message: r.message,
      })),
      closed: results.closed.map((c) => ({
        fixtureId: c.fixtureId,
        market: c.market,
        code: c.code,
      })),
      changes: results.changes.map((ch) => ({
        fixtureId: ch.fixtureId,
        market: ch.market,
        oldOdd: ch.oldOdd,
        newOdd: ch.newOdd,
        changePercent: ch.changePercent,
      })),
    };

    if (results.valid) {
      logger.info(`[VALIDATION SUCCESS] ${JSON.stringify(logData)}`);
    } else {
      logger.warn(`[VALIDATION FAILED] ${JSON.stringify(logData)}`);
    }
  }
}

export default new BetSlipService();
