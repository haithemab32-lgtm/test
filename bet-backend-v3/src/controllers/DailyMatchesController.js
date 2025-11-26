import apiFootballService from "../services/ApiFootballService.js";
import { formatSuccessResponse } from "../utils/response.js";
import { logger } from "../config/logger.js";
import { ValidationError } from "../utils/errors.js";

class DailyMatchesController {
  async getDailyMatches(req, res, next) {
    try {
      const { start, end, leagueId, season } = req.query;

      if (!start) {
        throw new ValidationError(
          "start date is required (format: YYYY-MM-DD)"
        );
      }

      const parsedLeagueId = leagueId ? parseInt(leagueId, 10) : null;
      const parsedSeason = season ? parseInt(season, 10) : null;

      if (parsedLeagueId && isNaN(parsedLeagueId)) {
        throw new ValidationError("leagueId must be a valid number");
      }

      if (parsedSeason && isNaN(parsedSeason)) {
        throw new ValidationError("season must be a valid number");
      }

      const fixturesResponse = await apiFootballService.getFixturesByDate(
        start,
        end,
        parsedLeagueId,
        parsedSeason
      );

      if (!fixturesResponse.success || !fixturesResponse.data.response) {
        return res.json(formatSuccessResponse([], 0));
      }

      const fixtures = fixturesResponse.data.response;
      logger.info(`Found ${fixtures.length} matches for date ${start}`);

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
      logger.error(`Error in getDailyMatches: ${error.message}`);
      next(error);
    }
  }
}

export default new DailyMatchesController();
