import apiFootballService from "../services/ApiFootballService.js";
import oddsOptimizer from "../services/OddsOptimizer.js";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/response.js";
import { logger } from "../config/logger.js";
import { validateFixtureId } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";

class MatchDetailsController {
  async getMatchDetails(req, res, next) {
    try {
      const { fixtureId } = req.params;

      // Valider et sanitizer le fixtureId pour prévenir les injections
      let fixtureIdNum;
      try {
        fixtureIdNum = validateFixtureId(fixtureId);
      } catch (error) {
        return res
          .status(400)
          .json(formatErrorResponse("Invalid fixtureId", error, 400));
      }

      logger.info(`Fetching details for fixture ${fixtureIdNum}`);

      // Récupérer toutes les données en parallèle pour optimiser
      const [
        fixtureDetailsResponse,
        statisticsResponse,
        eventsResponse,
        lineupsResponse,
        playersResponse,
        oddsResponse,
      ] = await Promise.allSettled([
        apiFootballService.getFixtureDetails(fixtureIdNum),
        apiFootballService.getFixtureStatistics(fixtureIdNum),
        apiFootballService.getFixtureEvents(fixtureIdNum),
        apiFootballService.getFixtureLineups(fixtureIdNum),
        apiFootballService.getFixturePlayers(fixtureIdNum),
        apiFootballService.getOddsByFixture(fixtureIdNum, false, false),
      ]);

      // Logger les résultats pour le débogage
      if (statisticsResponse.status === "rejected") {
        logger.warn(
          `Statistics request failed for fixture ${fixtureIdNum}: ${
            statisticsResponse.reason?.message || "Unknown error"
          }`
        );
      } else if (
        statisticsResponse.value.success &&
        statisticsResponse.value.data.response
      ) {
        logger.info(
          `Statistics for fixture ${fixtureIdNum}: ${statisticsResponse.value.data.response.length} teams`
        );
        // Logger la structure complète pour débogage
        if (statisticsResponse.value.data.response.length > 0) {
          logger.debug(
            `Statistics structure sample for fixture ${fixtureIdNum}:`,
            JSON.stringify(
              {
                firstItemKeys: Object.keys(
                  statisticsResponse.value.data.response[0] || {}
                ),
                hasTeam: !!statisticsResponse.value.data.response[0]?.team,
                hasStatistics:
                  !!statisticsResponse.value.data.response[0]?.statistics,
                statisticsIsArray: Array.isArray(
                  statisticsResponse.value.data.response[0]?.statistics
                ),
                statisticsLength:
                  statisticsResponse.value.data.response[0]?.statistics
                    ?.length || 0,
                firstStatType:
                  statisticsResponse.value.data.response[0]?.statistics?.[0]
                    ?.type || null,
              },
              null,
              2
            )
          );
        }
      } else {
        logger.warn(
          `No statistics available for fixture ${fixtureIdNum}. Success: ${
            statisticsResponse.value?.success
          }, Response: ${JSON.stringify(
            statisticsResponse.value?.data?.response || "null"
          )}`
        );
      }

      if (lineupsResponse.status === "rejected") {
        logger.warn(
          `Lineups request failed for fixture ${fixtureIdNum}: ${
            lineupsResponse.reason?.message || "Unknown error"
          }`
        );
      } else if (
        lineupsResponse.value.success &&
        lineupsResponse.value.data.response
      ) {
        logger.info(
          `Lineups for fixture ${fixtureIdNum}: ${lineupsResponse.value.data.response.length} teams`
        );
      } else {
        logger.warn(
          `No lineups available for fixture ${fixtureIdNum}. Success: ${
            lineupsResponse.value?.success
          }, Response: ${JSON.stringify(
            lineupsResponse.value?.data?.response || "null"
          )}`
        );
      }

      // Extraire les données avec gestion d'erreur
      const fixtureDetails =
        fixtureDetailsResponse.status === "fulfilled" &&
        fixtureDetailsResponse.value.success &&
        fixtureDetailsResponse.value.data.response &&
        fixtureDetailsResponse.value.data.response.length > 0
          ? fixtureDetailsResponse.value.data.response[0]
          : null;

      if (!fixtureDetails) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Fixture not found",
          },
        });
      }

      // Déterminer si le match est en direct
      const isLive =
        fixtureDetails.fixture.status.short !== "NS" &&
        fixtureDetails.fixture.status.short !== "TBD" &&
        fixtureDetails.fixture.status.short !== "PST" &&
        fixtureDetails.fixture.status.short !== "FT" &&
        fixtureDetails.fixture.status.short !== "AWD" &&
        fixtureDetails.fixture.status.short !== "CANC";

      // Si le match est en direct, récupérer les cotes live
      let processedOdds = null;
      if (isLive) {
        const liveOddsResponse = await apiFootballService.getOddsByFixture(
          fixtureIdNum,
          true,
          true
        );
        if (
          liveOddsResponse.success &&
          liveOddsResponse.data.response &&
          liveOddsResponse.data.response.length > 0
        ) {
          processedOdds = oddsOptimizer.processOdds(
            liveOddsResponse.data,
            true
          );
        }
      } else if (
        oddsResponse.status === "fulfilled" &&
        oddsResponse.value.success
      ) {
        processedOdds = oddsOptimizer.processOdds(
          oddsResponse.value.data,
          false
        );
      }

      // Récupérer l'historique des confrontations si on a les IDs des équipes
      let headToHead = null;
      if (
        fixtureDetails.teams &&
        fixtureDetails.teams.home.id &&
        fixtureDetails.teams.away.id
      ) {
        try {
          const h2hResponse = await apiFootballService.getHeadToHead(
            fixtureDetails.teams.home.id,
            fixtureDetails.teams.away.id
          );
          if (
            h2hResponse.success &&
            h2hResponse.data.response &&
            h2hResponse.data.response.length > 0
          ) {
            headToHead = h2hResponse.data.response;
          }
        } catch (error) {
          logger.warn(`Failed to fetch head-to-head: ${error.message}`);
        }
      }

      // Récupérer les joueurs suspendus/blessés
      let sidelined = null;
      try {
        const sidelinedResponse = await apiFootballService.getSidelinedPlayers(
          fixtureIdNum
        );
        if (
          sidelinedResponse.success &&
          sidelinedResponse.data.response &&
          sidelinedResponse.data.response.length > 0
        ) {
          sidelined = sidelinedResponse.data.response;
        }
      } catch (error) {
        logger.warn(`Failed to fetch sidelined players: ${error.message}`);
      }

      // Construire la réponse complète
      const matchDetails = {
        fixture: {
          id: fixtureDetails.fixture.id,
          date: fixtureDetails.fixture.date,
          timestamp: fixtureDetails.fixture.timestamp,
          timezone: fixtureDetails.fixture.timezone,
          venue: fixtureDetails.fixture.venue
            ? {
                id: fixtureDetails.fixture.venue.id,
                name: fixtureDetails.fixture.venue.name,
                city: fixtureDetails.fixture.venue.city,
              }
            : null,
          referee: fixtureDetails.fixture.referee,
          status: {
            long: fixtureDetails.fixture.status.long,
            short: fixtureDetails.fixture.status.short,
            elapsed: fixtureDetails.fixture.status.elapsed,
            seconds: fixtureDetails.fixture.status.seconds || null,
          },
        },
        league: {
          id: fixtureDetails.league.id,
          name: fixtureDetails.league.name,
          country: fixtureDetails.league.country,
          logo: fixtureDetails.league.logo,
          flag: fixtureDetails.league.flag,
          season: fixtureDetails.league.season,
          round: fixtureDetails.league.round,
        },
        teams: {
          home: {
            id: fixtureDetails.teams.home.id,
            name: fixtureDetails.teams.home.name,
            logo: fixtureDetails.teams.home.logo,
            winner: fixtureDetails.teams.home.winner,
          },
          away: {
            id: fixtureDetails.teams.away.id,
            name: fixtureDetails.teams.away.name,
            logo: fixtureDetails.teams.away.logo,
            winner: fixtureDetails.teams.away.winner,
          },
        },
        goals: {
          home: fixtureDetails.goals.home,
          away: fixtureDetails.goals.away,
        },
        score: {
          halftime: fixtureDetails.score.halftime
            ? {
                home: fixtureDetails.score.halftime.home,
                away: fixtureDetails.score.halftime.away,
              }
            : null,
          fulltime: fixtureDetails.score.fulltime
            ? {
                home: fixtureDetails.score.fulltime.home,
                away: fixtureDetails.score.fulltime.away,
              }
            : null,
          extratime: fixtureDetails.score.extratime
            ? {
                home: fixtureDetails.score.extratime.home,
                away: fixtureDetails.score.extratime.away,
              }
            : null,
          penalty: fixtureDetails.score.penalty
            ? {
                home: fixtureDetails.score.penalty.home,
                away: fixtureDetails.score.penalty.away,
              }
            : null,
        },
        statistics: (() => {
          // Gérer les statistiques avec une logique plus robuste
          if (statisticsResponse.status === "fulfilled") {
            const statsValue = statisticsResponse.value;

            // Vérifier si la réponse est valide
            if (statsValue && statsValue.success) {
              // Vérifier différentes structures de réponse possibles
              let statsData = null;

              // Format 1: data.response (format standard API Football)
              if (
                statsValue.data &&
                statsValue.data.response &&
                Array.isArray(statsValue.data.response) &&
                statsValue.data.response.length > 0
              ) {
                statsData = statsValue.data.response;
              }
              // Format 2: data directement (si la structure est différente)
              else if (
                statsValue.data &&
                Array.isArray(statsValue.data) &&
                statsValue.data.length > 0
              ) {
                statsData = statsValue.data;
              }
              // Format 3: response directement
              else if (
                statsValue.response &&
                Array.isArray(statsValue.response) &&
                statsValue.response.length > 0
              ) {
                statsData = statsValue.response;
              }

              if (statsData) {
                // Vérifier que chaque élément a bien la structure attendue (team + statistics)
                const validStats = statsData.filter(
                  (stat) =>
                    stat.team &&
                    stat.statistics &&
                    Array.isArray(stat.statistics) &&
                    stat.statistics.length > 0
                );

                if (validStats.length > 0) {
                  logger.info(
                    `✅ Statistics found for fixture ${fixtureIdNum}: ${validStats.length} team(s) with valid statistics`
                  );
                  // Logger un exemple de statistiques pour vérification
                  if (validStats[0].statistics.length > 0) {
                    logger.debug(
                      `Example statistics for ${validStats[0].team.name}:`,
                      validStats[0].statistics
                        .slice(0, 5)
                        .map((s) => `${s.type}: ${s.value}`)
                        .join(", ")
                    );
                  }
                  return validStats;
                } else {
                  logger.warn(
                    `⚠️ Statistics data found but invalid structure for fixture ${fixtureIdNum}`
                  );
                }
              } else {
                logger.warn(
                  `Statistics response structure for fixture ${fixtureIdNum}:`,
                  JSON.stringify({
                    success: statsValue.success,
                    hasData: !!statsValue.data,
                    hasResponse: !!statsValue.data?.response,
                    responseType: statsValue.data?.response
                      ? Array.isArray(statsValue.data.response)
                        ? "array"
                        : typeof statsValue.data.response
                      : "undefined",
                    responseLength: statsValue.data?.response?.length || 0,
                    fullDataKeys: statsValue.data
                      ? Object.keys(statsValue.data)
                      : [],
                  })
                );
              }
            } else {
              logger.warn(
                `Statistics request failed for fixture ${fixtureIdNum}: success=false`
              );
            }
          } else if (statisticsResponse.status === "rejected") {
            logger.error(
              `Statistics request rejected for fixture ${fixtureIdNum}:`,
              statisticsResponse.reason?.message || "Unknown error"
            );
          }

          return null;
        })(),
        events:
          eventsResponse.status === "fulfilled" &&
          eventsResponse.value.success &&
          eventsResponse.value.data.response &&
          eventsResponse.value.data.response.length > 0
            ? eventsResponse.value.data.response
            : null,
        lineups: (() => {
          // Gérer les compositions avec une logique plus robuste
          if (lineupsResponse.status === "fulfilled") {
            const lineupsValue = lineupsResponse.value;

            // Vérifier si la réponse est valide
            if (lineupsValue && lineupsValue.success) {
              // Vérifier différentes structures de réponse possibles
              let lineupsData = null;

              // Format 1: data.response (format standard API Football)
              if (
                lineupsValue.data &&
                lineupsValue.data.response &&
                Array.isArray(lineupsValue.data.response) &&
                lineupsValue.data.response.length > 0
              ) {
                lineupsData = lineupsValue.data.response;
              }
              // Format 2: data directement
              else if (
                lineupsValue.data &&
                Array.isArray(lineupsValue.data) &&
                lineupsValue.data.length > 0
              ) {
                lineupsData = lineupsValue.data;
              }
              // Format 3: response directement
              else if (
                lineupsValue.response &&
                Array.isArray(lineupsValue.response) &&
                lineupsValue.response.length > 0
              ) {
                lineupsData = lineupsValue.response;
              }

              if (lineupsData) {
                logger.info(
                  `Lineups found for fixture ${fixtureIdNum}: ${lineupsData.length} team(s)`
                );
                return lineupsData;
              } else {
                logger.warn(
                  `Lineups response structure for fixture ${fixtureIdNum}:`,
                  JSON.stringify({
                    success: lineupsValue.success,
                    hasData: !!lineupsValue.data,
                    hasResponse: !!lineupsValue.data?.response,
                    responseType: lineupsValue.data?.response
                      ? Array.isArray(lineupsValue.data.response)
                        ? "array"
                        : typeof lineupsValue.data.response
                      : "undefined",
                    responseLength: lineupsValue.data?.response?.length || 0,
                  })
                );
              }
            } else {
              logger.warn(
                `Lineups request failed for fixture ${fixtureIdNum}: success=false`
              );
            }
          } else if (lineupsResponse.status === "rejected") {
            logger.error(
              `Lineups request rejected for fixture ${fixtureIdNum}:`,
              lineupsResponse.reason?.message || "Unknown error"
            );
          }

          return null;
        })(),
        players:
          playersResponse.status === "fulfilled" &&
          playersResponse.value.success &&
          playersResponse.value.data.response &&
          playersResponse.value.data.response.length > 0
            ? playersResponse.value.data.response
            : null,
        odds: processedOdds,
        headToHead: headToHead,
        sidelined: sidelined,
        isLive: isLive,
      };

      logger.info(`Successfully fetched details for fixture ${fixtureIdNum}`);
      res.json(formatSuccessResponse(matchDetails));
    } catch (error) {
      logger.error(`Error in getMatchDetails: ${error.message}`);
      next(error);
    }
  }
}

export default new MatchDetailsController();
