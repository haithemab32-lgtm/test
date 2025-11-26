import { logger } from "../config/logger.js";
import cacheService from "./CacheService.js";

class OddsChangeDetector {
  constructor() {
    this.memoryCache = new Map();
    this.minChangeThreshold = 0.01; // Seuil minimum de changement (1%)
  }

  /**
   * Compare les anciennes et nouvelles cotes et détecte les changements
   * Adapté pour la V3 : supporte les structures live et upcoming
   */
  async detectChanges(fixtureId, newOdds) {
    if (!newOdds) {
      return [];
    }

    // Récupérer les anciennes cotes
    const oldOdds = await this.getOldOdds(fixtureId);

    // Si pas d'anciennes cotes, sauvegarder les nouvelles et retourner vide
    if (!oldOdds) {
      await this.saveOdds(fixtureId, newOdds);
      return [];
    }

    const changes = [];

    // Pour les matchs live : comparer les cotes brutes
    if (newOdds.isLive && oldOdds.isLive) {
      changes.push(...this.compareLiveOdds(oldOdds, newOdds, fixtureId));
    } else if (!newOdds.isLive && !oldOdds.isLive) {
      // Pour les matchs upcoming : comparer les cotes du bookmaker
      changes.push(...this.compareUpcomingOdds(oldOdds, newOdds, fixtureId));
    }

    // Sauvegarder les nouvelles cotes
    await this.saveOdds(fixtureId, newOdds);

    return changes;
  }

  /**
   * Compare les cotes live (structure brute de /odds/live)
   */
  compareLiveOdds(oldOdds, newOdds, fixtureId) {
    const changes = [];

    if (!oldOdds.odds || !newOdds.odds) {
      return changes;
    }

    // Créer un map des anciennes cotes par ID
    const oldOddsMap = new Map();
    oldOdds.odds.forEach((odd) => {
      oldOddsMap.set(odd.id, odd);
    });

    // Comparer chaque cote
    newOdds.odds.forEach((newOdd) => {
      const oldOdd = oldOddsMap.get(newOdd.id);
      if (!oldOdd) return;

      // Comparer chaque valeur
      // Pour les cotes avec handicaps (Over/Under), comparer par handicap + value plutôt que par index
      if (oldOdd.values && newOdd.values) {
        // Créer un map des anciennes valeurs par clé unique (handicap + value)
        const oldValuesMap = new Map();
        oldOdd.values.forEach((oldValue) => {
          const key = `${oldValue.handicap || "null"}_${oldValue.value}`;
          oldValuesMap.set(key, oldValue);
        });

        // Comparer avec les nouvelles valeurs
        newOdd.values.forEach((newValue) => {
          if (!newValue) return;

          // Ignorer les cotes suspendues (suspended: true)
          if (newValue.suspended === true) {
            return; // Ne pas traiter cette cote si elle est suspendue
          }

          // Trouver l'ancienne valeur correspondante par handicap + value
          const key = `${newValue.handicap || "null"}_${newValue.value}`;
          const oldValue = oldValuesMap.get(key);

          if (!oldValue) {
            return; // Nouvelle cote, pas de comparaison possible
          }

          // Ignorer aussi si l'ancienne valeur était suspendue
          if (oldValue.suspended === true) {
            return;
          }

          const oldOddVal = parseFloat(oldValue.odd);
          const newOddVal = parseFloat(newValue.odd);

          // Vérifier que les valeurs sont valides
          if (isNaN(oldOddVal) || isNaN(newOddVal)) {
            return;
          }

          const change = Math.abs(newOddVal - oldOddVal);
          const changePercent = (change / oldOddVal) * 100;

          if (change >= this.minChangeThreshold || changePercent >= 1) {
            changes.push({
              market: newOdd.name,
              option: newValue.value,
              type: "changed",
              oldValue: oldOddVal,
              newValue: newOddVal,
              direction: newOddVal > oldOddVal ? "increased" : "decreased",
              change: change.toFixed(3),
              changePercent: changePercent.toFixed(2),
              suspended: false, // Explicitement marquer comme non suspendue
              handicap: newValue.handicap || null, // ✅ Inclure le handicap
              main: newValue.main || false, // ✅ Inclure le flag main
            });
          }
        });
      }
    });

    return changes;
  }

  /**
   * Compare les cotes upcoming (structure avec bookmaker)
   */
  compareUpcomingOdds(oldOdds, newOdds, fixtureId) {
    const changes = [];

    if (!oldOdds.bookmaker || !newOdds.bookmaker) {
      return changes;
    }

    // Comparer les bets du bookmaker
    const oldBets = oldOdds.bookmaker.bets || [];
    const newBets = newOdds.bookmaker.bets || [];

    const oldBetsMap = new Map();
    oldBets.forEach((bet) => {
      oldBetsMap.set(bet.id, bet);
    });

    newBets.forEach((newBet) => {
      const oldBet = oldBetsMap.get(newBet.id);
      if (!oldBet) return;

      // Comparer les values
      if (oldBet.values && newBet.values) {
        oldBet.values.forEach((oldValue, index) => {
          const newValue = newBet.values[index];
          if (newValue) {
            const oldOddVal = parseFloat(oldValue.odd);
            const newOddVal = parseFloat(newValue.odd);
            const change = Math.abs(newOddVal - oldOddVal);
            const changePercent = (change / oldOddVal) * 100;

            if (change >= this.minChangeThreshold || changePercent >= 1) {
              changes.push({
                market: newBet.name,
                option: newValue.value,
                type: "changed",
                oldValue: oldOddVal,
                newValue: newOddVal,
                bookmaker: newOdds.bookmaker.name,
                direction: newOddVal > oldOddVal ? "increased" : "decreased",
                change: change.toFixed(3),
                changePercent: changePercent.toFixed(2),
              });
            }
          }
        });
      }
    });

    return changes;
  }

  /**
   * Récupère les anciennes cotes d'un match
   */
  async getOldOdds(fixtureId) {
    const cacheKey = `odds:previous:${fixtureId}`;

    if (cacheService.isAvailable()) {
      try {
        return await cacheService.get(cacheKey);
      } catch (error) {
        logger.warn(`Failed to get old odds from Redis: ${error.message}`);
      }
    }

    return this.memoryCache.get(cacheKey) || null;
  }

  /**
   * Sauvegarde les cotes d'un match
   */
  async saveOdds(fixtureId, odds) {
    const cacheKey = `odds:previous:${fixtureId}`;

    if (cacheService.isAvailable()) {
      try {
        await cacheService.set(cacheKey, odds, 86400);
        return;
      } catch (error) {
        logger.warn(`Failed to save odds to Redis: ${error.message}`);
      }
    }

    this.memoryCache.set(cacheKey, odds);

    if (this.memoryCache.size > 1000) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
  }

  /**
   * Nettoie les anciennes cotes pour un match
   */
  async clearOdds(fixtureId) {
    const cacheKey = `odds:previous:${fixtureId}`;

    if (cacheService.isAvailable()) {
      try {
        await cacheService.delete(cacheKey);
      } catch (error) {
        logger.warn(`Failed to delete odds from Redis: ${error.message}`);
      }
    }

    this.memoryCache.delete(cacheKey);
  }
}

export default new OddsChangeDetector();
