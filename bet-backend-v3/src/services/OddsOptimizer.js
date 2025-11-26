import { logger } from "../config/logger.js";

/**
 * Service de gestion des cotes - Version 3
 *
 * Pour les matchs live : Retourne la réponse brute de /odds/live (pas de sélection de bookmaker)
 * Pour les matchs upcoming : Sélectionne Bet365 → 1xBet → sinon ignoré
 */
class OddsOptimizer {
  constructor() {
    // Ordre de priorité pour les matchs upcoming (Bet365 en priorité, puis 1xBet)
    this.priorityBookmakers = [
      "Bet365", // 1️⃣ Principal pour les matchs upcoming
      "1xBet", // 2️⃣ Fallback pour les matchs upcoming
    ];
  }

  /**
   * Vérifie si un bookmaker est dans la liste des prioritaires
   */
  isPriorityBookmaker(bookmakerName) {
    return this.priorityBookmakers.includes(bookmakerName);
  }

  /**
   * Retourne l'index de priorité d'un bookmaker (plus bas = plus prioritaire)
   */
  getBookmakerPriority(bookmakerName) {
    const priorityIndex = this.priorityBookmakers.indexOf(bookmakerName);
    if (priorityIndex !== -1) return priorityIndex;
    return 999; // Bookmaker inconnu = très faible priorité
  }

  /**
   * Traite les cotes pour les matchs LIVE
   * Retourne la réponse brute de /odds/live sans modification
   *
   * @param {Object} oddsResponse - Réponse de l'API /odds/live
   * @returns {Object|null} - Réponse brute ou null si pas de données
   */
  processLiveOdds(oddsResponse) {
    if (
      !oddsResponse ||
      !oddsResponse.response ||
      oddsResponse.response.length === 0
    ) {
      return null;
    }

    // Pour les matchs live, on retourne la réponse brute telle quelle
    // L'endpoint /odds/live retourne directement les cotes sans bookmakers
    const liveOddsData = oddsResponse.response[0];

    if (!liveOddsData.odds || liveOddsData.odds.length === 0) {
      return null;
    }

    // Retourner la structure brute de /odds/live
    return {
      fixture: liveOddsData.fixture,
      league: liveOddsData.league,
      teams: liveOddsData.teams,
      status: liveOddsData.status,
      update: liveOddsData.update,
      odds: liveOddsData.odds, // Cotes brutes de /odds/live
      isLive: true,
      source: "live",
    };
  }

  /**
   * Traite les cotes pour les matchs UPCOMING
   * Sélectionne Bet365 → 1xBet → sinon ignoré
   *
   * @param {Object} oddsResponse - Réponse de l'API /odds
   * @returns {Object|null} - Cotes du bookmaker sélectionné ou null
   */
  processUpcomingOdds(oddsResponse) {
    if (
      !oddsResponse ||
      !oddsResponse.response ||
      oddsResponse.response.length === 0
    ) {
      return null;
    }

    const oddsData = oddsResponse.response[0];

    if (!oddsData.bookmakers || oddsData.bookmakers.length === 0) {
      return null;
    }

    // Vérifier la présence de bookmakers prioritaires
    const availableBookmakers = oddsData.bookmakers.map((bm) => bm.name);
    const hasPriorityBookmaker = this.priorityBookmakers.some((bm) =>
      availableBookmakers.includes(bm)
    );

    if (!hasPriorityBookmaker) {
      logger.warn(
        `No priority bookmaker (Bet365/1xBet) found. Available: ${availableBookmakers.join(
          ", "
        )}`
      );
      return null; // Ignorer le match
    }

    // Sélectionner le bookmaker prioritaire (Bet365 en priorité, puis 1xBet)
    const priorityBookmakersOnly = oddsData.bookmakers.filter((bookmaker) =>
      this.isPriorityBookmaker(bookmaker.name)
    );

    if (priorityBookmakersOnly.length === 0) {
      return null;
    }

    // Trier par priorité : Bet365 d'abord, puis 1xBet
    priorityBookmakersOnly.sort((a, b) => {
      const priorityA = this.getBookmakerPriority(a.name);
      const priorityB = this.getBookmakerPriority(b.name);
      return priorityA - priorityB;
    });

    // Prendre le premier bookmaker (le plus prioritaire)
    const selectedBookmaker = priorityBookmakersOnly[0];

    // Formater les cotes du bookmaker sélectionné
    return {
      fixture: oddsData.fixture,
      league: oddsData.league,
      teams: oddsData.teams,
      bookmaker: {
        id: selectedBookmaker.id,
        name: selectedBookmaker.name,
        bets: selectedBookmaker.bets || [],
      },
      isLive: false,
      source: selectedBookmaker.name,
    };
  }

  /**
   * Point d'entrée principal pour traiter les cotes
   *
   * @param {Object} oddsResponse - Réponse de l'API
   * @param {boolean} isLive - Si true, utilise processLiveOdds, sinon processUpcomingOdds
   * @returns {Object|null} - Cotes traitées ou null
   */
  processOdds(oddsResponse, isLive = false) {
    if (isLive) {
      return this.processLiveOdds(oddsResponse);
    } else {
      return this.processUpcomingOdds(oddsResponse);
    }
  }
}

export default new OddsOptimizer();
