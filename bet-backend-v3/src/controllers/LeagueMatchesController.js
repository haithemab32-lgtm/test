import apiFootballService from "../services/ApiFootballService.js";
import { formatSuccessResponse } from "../utils/response.js";
import { logger } from "../config/logger.js";
import { ValidationError } from "../utils/errors.js";

class LeagueMatchesController {
  async getLeagueMatches(req, res, next) {
    try {
      const { leagueId, season, next: nextCount } = req.query;

      if (!leagueId) {
        throw new ValidationError("leagueId is required");
      }

      const parsedLeagueId = parseInt(leagueId, 10);
      const parsedSeason = season ? parseInt(season, 10) : null;
      const parsedNext = nextCount ? parseInt(nextCount, 10) : 10;

      if (isNaN(parsedLeagueId)) {
        throw new ValidationError("leagueId must be a valid number");
      }

      if (parsedSeason && isNaN(parsedSeason)) {
        throw new ValidationError("season must be a valid number");
      }

      if (isNaN(parsedNext) || parsedNext < 1) {
        throw new ValidationError("next must be a positive number");
      }

      const fixturesResponse = await apiFootballService.getFixturesByLeague(
        parsedLeagueId,
        parsedSeason,
        parsedNext
      );

      if (!fixturesResponse.success || !fixturesResponse.data.response) {
        return res.json(formatSuccessResponse([], 0));
      }

      const fixtures = fixturesResponse.data.response;
      logger.info(
        `Found ${fixtures.length} matches for league ${parsedLeagueId}`
      );

      const batchSize = 5;
      const fixturesWithOdds = [];

      for (let i = 0; i < fixtures.length; i += batchSize) {
        const batch = fixtures.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(
          batch.map((fixture) =>
            apiFootballService.formatFixtureWithOdds(fixture, true)
          )
        );

        batchResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            fixturesWithOdds.push(result.value);
          }
        });

        if (i + batchSize < fixtures.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      const validFixtures = fixturesWithOdds.filter(
        (fixture) => fixture.odds !== null && fixture.source !== null
      );

      res.json(formatSuccessResponse(validFixtures, validFixtures.length));
    } catch (error) {
      logger.error(`Error in getLeagueMatches: ${error.message}`);
      next(error);
    }
  }
}

export default new LeagueMatchesController();
