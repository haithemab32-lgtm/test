import apiFootballService from "../services/ApiFootballService.js";
import cacheService from "../services/CacheService.js";
import { formatSuccessResponse } from "../utils/response.js";
import { logger } from "../config/logger.js";
import { ValidationError } from "../utils/errors.js";
import { config } from "../config/index.js";

class UpcomingMatchesController {
  async getUpcomingMatches(req, res, next) {
    try {
      const { leagueId, limit } = req.query;

      const parsedLeagueId = leagueId ? parseInt(leagueId, 10) : null;
      const parsedLimit = limit ? parseInt(limit, 10) : null;

      if (parsedLeagueId && isNaN(parsedLeagueId)) {
        throw new ValidationError("leagueId must be a valid number");
      }

      if (parsedLimit && (isNaN(parsedLimit) || parsedLimit < 1)) {
        throw new ValidationError("limit must be a positive number");
      }

      // OPTIMISATION : Essayer d'abord de récupérer depuis le cache
      const cacheKey = cacheService.generateKey("upcoming:matches:formatted", {
        leagueId: parsedLeagueId || "all",
        limit: parsedLimit || "all",
      });

      if (cacheService.isAvailable()) {
        const cachedMatches = await cacheService.get(cacheKey);
        if (
          cachedMatches &&
          Array.isArray(cachedMatches) &&
          cachedMatches.length > 0
        ) {
          logger.info(
            `Returning ${cachedMatches.length} upcoming matches from cache (fast response)`
          );
          return res.json(
            formatSuccessResponse(cachedMatches, cachedMatches.length)
          );
        }
      }

      // Si pas de cache, fallback vers l'API
      logger.info("Cache miss, fetching upcoming matches from API (slower)");

      const fixturesResponse = await apiFootballService.getUpcomingFixtures(
        parsedLeagueId,
        parsedLimit
      );

      if (!fixturesResponse.success || !fixturesResponse.data.response) {
        return res.json(formatSuccessResponse([], 0));
      }

      const fixtures = fixturesResponse.data.response;
      logger.info(`Found ${fixtures.length} upcoming matches`);

      // Limiter le nombre de matchs traités pour éviter le rate limit
      const maxFixtures = parseInt(
        process.env.MAX_UPCOMING_FIXTURES || "50",
        10
      );
      const fixturesToProcess = fixtures.slice(0, maxFixtures);

      if (fixtures.length > maxFixtures) {
        logger.info(
          `Limiting to ${maxFixtures} fixtures out of ${fixtures.length} to avoid rate limit`
        );
      }

      const batchSize = 3; // Batch plus petit pour éviter le rate limit
      const fixturesWithOdds = [];

      for (let i = 0; i < fixturesToProcess.length; i += batchSize) {
        const batch = fixturesToProcess.slice(i, i + batchSize);

        // Timeout par batch pour éviter les blocages
        const batchPromise = Promise.allSettled(
          batch.map((fixture) =>
            apiFootballService.formatFixtureWithOdds(fixture, true)
          )
        );

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

        // Délai augmenté pour respecter le rate limit
        if (i + batchSize < fixturesToProcess.length) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      // VERSION 3 : Filtrer uniquement les matchs avec des cotes de Bet365 ou 1xBet
      const validFixtures = fixturesWithOdds.filter(
        (fixture) => fixture.odds !== null && fixture.source !== null
      );

      logger.info(
        `Returning ${validFixtures.length} upcoming matches with odds (from ${fixtures.length} total)`
      );

      // Mettre en cache pour les prochaines requêtes
      if (cacheService.isAvailable() && validFixtures.length > 0) {
        await cacheService.set(
          cacheKey,
          validFixtures,
          config.cache.ttl.upcomingMatches
        );
      }

      res.json(formatSuccessResponse(validFixtures, validFixtures.length));
    } catch (error) {
      logger.error(`Error in getUpcomingMatches: ${error.message}`);
      next(error);
    }
  }

  async getUpcomingMatchesInHours(req, res, next) {
    try {
      const { hours = 8, limit } = req.query;

      const parsedHours = parseInt(hours, 10);
      const parsedLimit = limit ? parseInt(limit, 10) : null;

      if (isNaN(parsedHours) || parsedHours < 1) {
        throw new ValidationError("hours must be a positive number");
      }

      if (parsedLimit && (isNaN(parsedLimit) || parsedLimit < 1)) {
        throw new ValidationError("limit must be a positive number");
      }

      // OPTIMISATION : Essayer d'abord de récupérer depuis le cache
      const cacheKey = cacheService.generateKey("upcoming:matches:in-hours", {
        hours: parsedHours,
        limit: parsedLimit || "all",
      });

      logger.info(
        `[UpcomingMatchesInHours] Request: hours=${parsedHours}, limit=${
          parsedLimit || "none"
        }, cacheKey=${cacheKey}`
      );

      if (cacheService.isAvailable()) {
        const cachedMatches = await cacheService.get(cacheKey);
        if (
          cachedMatches &&
          Array.isArray(cachedMatches) &&
          cachedMatches.length > 0
        ) {
          logger.info(
            `[UpcomingMatchesInHours] Cache HIT: Returning ${cachedMatches.length} upcoming matches (${parsedHours}h) from cache`
          );
          return res.json(
            formatSuccessResponse(cachedMatches, cachedMatches.length)
          );
        } else {
          logger.info(
            `[UpcomingMatchesInHours] Cache MISS: No cached data found (cache exists: ${!!cachedMatches})`
          );
        }
      } else {
        logger.warn(
          `[UpcomingMatchesInHours] Cache not available, will fetch from API`
        );
      }

      // Vérifier si la limite API est atteinte
      const isRateLimitReached = apiFootballService.isRateLimitReached();
      logger.info(
        `[UpcomingMatchesInHours] Rate limit check: ${
          isRateLimitReached ? "REACHED" : "OK"
        }`
      );

      if (isRateLimitReached) {
        logger.warn(
          `[UpcomingMatchesInHours] API rate limit reached, returning empty result`
        );
        return res.json(formatSuccessResponse([], 0));
      }

      // Si pas de cache, fallback vers l'API
      logger.info(
        `[UpcomingMatchesInHours] Fetching upcoming matches (${parsedHours}h) from API`
      );

      const fixturesResponse =
        await apiFootballService.getUpcomingFixturesInHours(
          parsedHours,
          parsedLimit
        );

      logger.info(
        `[UpcomingMatchesInHours] API Response: success=${
          fixturesResponse.success
        }, hasData=${!!fixturesResponse.data?.response}, dataLength=${
          fixturesResponse.data?.response?.length || 0
        }`
      );

      if (!fixturesResponse.success || !fixturesResponse.data.response) {
        logger.warn(
          `[UpcomingMatchesInHours] No fixtures returned from API: success=${
            fixturesResponse.success
          }, hasResponse=${!!fixturesResponse.data?.response}`
        );
        return res.json(formatSuccessResponse([], 0));
      }

      const fixtures = fixturesResponse.data.response;
      logger.info(
        `[UpcomingMatchesInHours] Found ${fixtures.length} raw fixtures from API in next ${parsedHours}h`
      );

      // Limiter le nombre de matchs traités pour éviter le rate limit
      const maxFixtures = parseInt(
        process.env.MAX_UPCOMING_FIXTURES || "50",
        10
      );
      const fixturesToProcess = fixtures.slice(0, maxFixtures);

      if (fixtures.length > maxFixtures) {
        logger.info(
          `[UpcomingMatchesInHours] Limiting to ${maxFixtures} fixtures out of ${fixtures.length} to avoid rate limit`
        );
      }

      logger.info(
        `[UpcomingMatchesInHours] Processing ${fixturesToProcess.length} fixtures to fetch odds...`
      );

      const batchSize = 3; // Batch plus petit pour éviter le rate limit
      const fixturesWithOdds = [];
      let fixturesWithoutOdds = 0;
      let fixturesRejected = 0;

      for (let i = 0; i < fixturesToProcess.length; i += batchSize) {
        const batch = fixturesToProcess.slice(i, i + batchSize);

        // Timeout par batch pour éviter les blocages
        const batchPromise = Promise.allSettled(
          batch.map((fixture) =>
            apiFootballService.formatFixtureWithOdds(fixture, true)
          )
        );

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve("timeout"), 15000)
        );

        const batchResults = await Promise.race([batchPromise, timeoutPromise]);

        if (batchResults === "timeout") {
          logger.warn(
            `[UpcomingMatchesInHours] Batch ${i} timed out, skipping ${batch.length} fixtures`
          );
          fixturesRejected += batch.length;
          continue;
        }

        batchResults.forEach((result, idx) => {
          if (result.status === "fulfilled" && result.value) {
            fixturesWithOdds.push(result.value);
          } else if (result.status === "rejected") {
            logger.warn(
              `[UpcomingMatchesInHours] Fixture ${
                batch[idx]?.fixture?.id
              } failed: ${result.reason?.message || "Unknown error"}`
            );
            fixturesRejected++;
          } else if (result.status === "fulfilled" && !result.value) {
            fixturesWithoutOdds++;
          }
        });

        // Délai augmenté pour respecter le rate limit
        if (i + batchSize < fixturesToProcess.length) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      logger.info(
        `[UpcomingMatchesInHours] Odds processing complete: ${fixturesWithOdds.length} with odds, ${fixturesWithoutOdds} without odds, ${fixturesRejected} rejected/failed`
      );

      // Filtrer uniquement les matchs avec des cotes de Bet365 ou 1xBet
      const validFixtures = fixturesWithOdds.filter(
        (fixture) => fixture.odds !== null && fixture.source !== null
      );

      const filteredOut = fixturesWithOdds.length - validFixtures.length;

      logger.info(
        `[UpcomingMatchesInHours] Final result: ${validFixtures.length} valid fixtures (${filteredOut} filtered out due to missing Bet365/1xBet odds) from ${fixtures.length} total fixtures`
      );

      // Mettre en cache pour les prochaines requêtes
      if (cacheService.isAvailable() && validFixtures.length > 0) {
        await cacheService.set(
          cacheKey,
          validFixtures,
          config.cache.ttl.upcomingMatches
        );
      }

      res.json(formatSuccessResponse(validFixtures, validFixtures.length));
    } catch (error) {
      logger.error(`Error in getUpcomingMatchesInHours: ${error.message}`);
      next(error);
    }
  }
}

export default new UpcomingMatchesController();
