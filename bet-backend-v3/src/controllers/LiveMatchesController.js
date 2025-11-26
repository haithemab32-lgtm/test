import apiFootballService from "../services/ApiFootballService.js";
import cacheService from "../services/CacheService.js";
import { formatSuccessResponse } from "../utils/response.js";
import { logger } from "../config/logger.js";
import { config } from "../config/index.js";

class LiveMatchesController {
  async getLiveMatchesWithOdds(req, res, next) {
    try {
      // OPTIMISATION : Essayer d'abord de récupérer depuis le cache (mis à jour par RefreshService)
      const cacheKey = "live:matches:formatted";
      if (cacheService.isAvailable()) {
        const cachedMatches = await cacheService.get(cacheKey);
        if (
          cachedMatches &&
          Array.isArray(cachedMatches) &&
          cachedMatches.length > 0
        ) {
          logger.info(
            `Returning ${cachedMatches.length} live matches from cache (fast response)`
          );
          return res.json(
            formatSuccessResponse(cachedMatches, cachedMatches.length)
          );
        }
      }

      // Si pas de cache, fallback vers l'ancienne méthode (mais limitée)
      logger.info("Cache miss, fetching live matches from API (slower)");

      const fixturesResponse = await apiFootballService.getLiveFixtures();

      if (!fixturesResponse.success || !fixturesResponse.data.response) {
        return res
          .status(200)
          .json(
            formatSuccessResponse([], 0, "Aucun match en direct actuellement")
          );
      }

      const fixtures = fixturesResponse.data.response;
      logger.info(`Found ${fixtures.length} live matches`);

      // Limiter drastiquement le nombre de matchs traités pour éviter les timeouts
      const maxFixtures = parseInt(process.env.MAX_LIVE_FIXTURES || "50", 10);
      const fixturesToProcess = fixtures.slice(0, maxFixtures);

      if (fixtures.length > maxFixtures) {
        logger.info(
          `Limiting to ${maxFixtures} fixtures out of ${fixtures.length} to avoid timeout`
        );
      }

      const batchSize = 3; // Batch plus petit
      const fixturesWithOdds = [];

      // Traiter par batch avec timeout pour éviter les blocages
      for (let i = 0; i < fixturesToProcess.length; i += batchSize) {
        const batch = fixturesToProcess.slice(i, i + batchSize);

        // Ajouter un timeout par batch pour éviter les blocages
        const batchPromise = Promise.allSettled(
          batch.map((fixture) =>
            apiFootballService.formatFixtureWithOdds(fixture, true)
          )
        );

        // Timeout de 15 secondes par batch (réduit)
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve("timeout"), 15000)
        );

        const batchResults = await Promise.race([batchPromise, timeoutPromise]);

        if (batchResults === "timeout") {
          logger.warn(`Batch ${i} timed out, skipping`);
          continue;
        }

        batchResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            fixturesWithOdds.push(result.value);
          }
        });

        // Délai réduit car le rate limiter gère déjà l'espacement
        if (i + batchSize < fixturesToProcess.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // VERSION 3 : Filtrer uniquement les matchs avec des cotes live (odds !== null)
      const validFixtures = fixturesWithOdds.filter(
        (fixture) => fixture.odds !== null
      );

      logger.info(
        `Returning ${validFixtures.length} live matches with odds (from ${fixtures.length} total)`
      );

      res.json(formatSuccessResponse(validFixtures, validFixtures.length));
    } catch (error) {
      logger.error(`Error in getLiveMatchesWithOdds: ${error.message}`);
      next(error);
    }
  }

  async getLiveMatchesStats(req, res, next) {
    try {
      const fixturesResponse = await apiFootballService.getLiveFixtures();

      if (!fixturesResponse.success || !fixturesResponse.data.response) {
        return res.json(
          formatSuccessResponse({
            total: 0,
            byLeague: {},
            byStatus: {},
          })
        );
      }

      const fixtures = fixturesResponse.data.response;
      const stats = {
        total: fixtures.length,
        byLeague: {},
        byStatus: {},
      };

      fixtures.forEach((fixture) => {
        const leagueName = fixture.league.name;
        stats.byLeague[leagueName] = (stats.byLeague[leagueName] || 0) + 1;

        const status = fixture.fixture.status.short;
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      });

      res.json(formatSuccessResponse(stats));
    } catch (error) {
      logger.error(`Error in getLiveMatchesStats: ${error.message}`);
      next(error);
    }
  }
}

export default new LiveMatchesController();
