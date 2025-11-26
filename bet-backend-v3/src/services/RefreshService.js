import { config } from "../config/index.js";
import { logger } from "../config/logger.js";
import apiFootballService from "./ApiFootballService.js";
import cacheService from "./CacheService.js";
import oddsChangeDetector from "./OddsChangeDetector.js";
import socketService from "./SocketService.js";
import oddsOptimizer from "./OddsOptimizer.js";

class RefreshService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn("RefreshService is already running");
      return;
    }

    this.isRunning = true;

    const liveMatchesInterval = config.refresh.liveMatchesInterval;
    const liveMatchesJob = setInterval(async () => {
      try {
        await this.refreshLiveMatches();
      } catch (error) {
        logger.error(`Error refreshing live matches: ${error.message}`);
      }
    }, liveMatchesInterval * 1000);

    this.jobs.push({ name: "liveMatches", job: liveMatchesJob });

    // Rafraîchir les matchs upcoming moins fréquemment (toutes les 5 minutes)
    const upcomingMatchesInterval = parseInt(
      process.env.UPCOMING_MATCHES_REFRESH_INTERVAL || "300",
      10
    );
    const upcomingMatchesJob = setInterval(async () => {
      try {
        await this.refreshUpcomingMatches();
      } catch (error) {
        logger.error(`Error refreshing upcoming matches: ${error.message}`);
      }
    }, upcomingMatchesInterval * 1000);

    this.jobs.push({ name: "upcomingMatches", job: upcomingMatchesJob });

    logger.info(
      `RefreshService started - Live matches refresh every ${liveMatchesInterval}s, Upcoming matches every ${upcomingMatchesInterval}s`
    );
  }

  stop() {
    this.jobs.forEach(({ name, job }) => {
      if (typeof job === "number") {
        clearInterval(job);
      }
      logger.info(`Stopped refresh job: ${name}`);
    });

    this.jobs = [];
    this.isRunning = false;
    logger.info("RefreshService stopped");
  }

  async refreshLiveMatches() {
    if (!cacheService.isAvailable()) {
      logger.warn("Cache not available, skipping live matches refresh");
      return;
    }

    // Vérifier si la limite API est atteinte (éviter de gaspiller des requêtes)
    if (apiFootballService.isRateLimitReached()) {
      logger.warn("API rate limit reached, skipping live matches refresh");
      return;
    }

    try {
      const result = await apiFootballService.getLiveFixtures();

      if (result.success && result.data.response) {
        const fixtures = result.data.response;
        let totalChanges = 0;
        const formattedFixtures = []; // Cache pour les matchs formatés

        // Limiter drastiquement le nombre de matchs traités pour éviter le rate limit
        const maxFixtures = parseInt(process.env.MAX_LIVE_FIXTURES || "50", 10);
        const fixturesToProcess = fixtures.slice(0, maxFixtures);

        if (fixtures.length > maxFixtures) {
          logger.info(
            `RefreshService: Limiting to ${maxFixtures} fixtures out of ${fixtures.length} to avoid rate limit`
          );
        }

        for (const fixture of fixturesToProcess) {
          const isLive =
            fixture.fixture.status.short !== "NS" &&
            fixture.fixture.status.short !== "TBD" &&
            fixture.fixture.status.short !== "PST";

          if (isLive) {
            try {
              const oddsResponse = await apiFootballService.getOddsByFixture(
                fixture.fixture.id,
                true,
                true
              );

              // Extraire seconds depuis oddsResponse si disponible
              let secondsValue = null;
              if (
                oddsResponse.success &&
                oddsResponse.data.response &&
                oddsResponse.data.response.length > 0
              ) {
                const oddsData = oddsResponse.data.response[0];
                if (
                  oddsData.fixture?.status?.seconds &&
                  typeof oddsData.fixture.status.seconds === "string"
                ) {
                  secondsValue = oddsData.fixture.status.seconds;
                }
              }

              // Préparer les données de mise à jour avec seconds si disponible
              const fixtureStatus = { ...fixture.fixture.status };
              if (secondsValue) {
                fixtureStatus.seconds = secondsValue;
              } else if (fixtureStatus.elapsed !== null) {
                // Fallback: calculer seconds au format "MM:SS" à partir de elapsed
                const minutes = Math.floor(fixtureStatus.elapsed || 0);
                fixtureStatus.seconds = `${minutes
                  .toString()
                  .padStart(2, "0")}:00`;
              }

              socketService.emitFixtureUpdate(fixture.fixture.id, {
                fixture: {
                  id: fixture.fixture.id,
                  status: fixtureStatus,
                  score: fixture.goals,
                  time: fixture.fixture.date,
                  elapsed: fixture.fixture.status.elapsed,
                },
                teams: fixture.teams,
                league: fixture.league,
              });

              if (oddsResponse.success && oddsResponse.data.response) {
                // VERSION 3 : Utiliser processOdds avec isLive = true
                const processedOdds = oddsOptimizer.processOdds(
                  oddsResponse.data,
                  true
                );

                if (processedOdds) {
                  // Formater le match manuellement pour éviter un appel API redondant
                  const formattedFixture = {
                    fixtureId: fixture.fixture.id,
                    league: {
                      id: fixture.league.id,
                      name: fixture.league.name,
                      country: fixture.league.country,
                      flag: fixture.league.flag,
                    },
                    teams: {
                      home: fixture.teams.home.name,
                      away: fixture.teams.away.name,
                      logoHome: fixture.teams.home.logo,
                      logoAway: fixture.teams.away.logo,
                    },
                    score: {
                      home: fixture.goals.home,
                      away: fixture.goals.away,
                    },
                    time: {
                      date: fixture.fixture.date,
                      timestamp: fixture.fixture.timestamp,
                      elapsed: fixture.fixture.status.elapsed,
                      short: fixture.fixture.status.short,
                      long: fixture.fixture.status.long,
                    },
                    status: fixture.fixture.status.short,
                    odds: processedOdds,
                    source: processedOdds.source || "live",
                  };

                  // Stocker dans le cache uniquement si le match a des cotes
                  if (formattedFixture && formattedFixture.odds !== null) {
                    formattedFixtures.push(formattedFixture);
                  }

                  const changes = await oddsChangeDetector.detectChanges(
                    fixture.fixture.id,
                    processedOdds
                  );

                  if (changes.length > 0) {
                    totalChanges += changes.length;

                    const changesByMarket = this.groupChangesByMarket(changes);

                    socketService.emitOddsUpdate(fixture.fixture.id, {
                      fixtureId: fixture.fixture.id,
                      changes: changesByMarket,
                      allChanges: changes,
                      odds: processedOdds, // Inclut le champ 'suspended' pour chaque valeur
                      timestamp: new Date().toISOString(),
                    });

                    logger.info(
                      `Fixture ${fixture.fixture.id}: ${changes.length} odds change(s) detected`
                    );
                  }
                }
              }

              // Délai augmenté pour respecter le rate limit de l'API
              // Le rate limiter dans ApiFootballService gère déjà les délais
              // Ici on ajoute un délai supplémentaire pour éviter de surcharger
              // Avec 10 req/s max, on doit attendre au moins 100ms entre chaque requête
              await new Promise((resolve) => setTimeout(resolve, 300));
            } catch (error) {
              logger.warn(
                `Failed to refresh odds for fixture ${fixture.fixture.id}: ${error.message}`
              );
            }
          }
        }

        // Mettre en cache la liste complète des matchs formatés
        if (formattedFixtures.length > 0) {
          const cacheKey = "live:matches:formatted";
          await cacheService.set(
            cacheKey,
            formattedFixtures,
            config.cache.ttl.liveMatches
          );
          logger.info(
            `Cached ${formattedFixtures.length} formatted live matches`
          );
        }
      }
    } catch (error) {
      logger.error(`Error in refreshLiveMatches: ${error.message}`);
    }
  }

  async refreshUpcomingMatches() {
    if (!cacheService.isAvailable()) {
      logger.warn("Cache not available, skipping upcoming matches refresh");
      return;
    }

    // Vérifier si la limite API est atteinte (éviter de gaspiller des requêtes)
    if (apiFootballService.isRateLimitReached()) {
      logger.warn("API rate limit reached, skipping upcoming matches refresh");
      return;
    }

    try {
      const result = await apiFootballService.getUpcomingFixtures(null, 50);

      if (result.success && result.data.response) {
        const fixtures = result.data.response;
        const formattedFixtures = [];

        // Limiter le nombre de matchs traités
        const maxFixtures = parseInt(
          process.env.MAX_UPCOMING_FIXTURES || "50",
          10
        );
        const fixturesToProcess = fixtures.slice(0, maxFixtures);

        logger.info(
          `RefreshService: Processing ${fixturesToProcess.length} upcoming matches for cache`
        );

        const batchSize = 3;
        for (let i = 0; i < fixturesToProcess.length; i += batchSize) {
          const batch = fixturesToProcess.slice(i, i + batchSize);

          const batchResults = await Promise.allSettled(
            batch.map((fixture) =>
              apiFootballService.formatFixtureWithOdds(fixture, true)
            )
          );

          batchResults.forEach((result) => {
            if (
              result.status === "fulfilled" &&
              result.value &&
              result.value.odds !== null &&
              result.value.source !== null
            ) {
              formattedFixtures.push(result.value);
            }
          });

          // Délai pour respecter le rate limit
          if (i + batchSize < fixturesToProcess.length) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        // Mettre en cache
        if (formattedFixtures.length > 0) {
          const cacheKey = cacheService.generateKey(
            "upcoming:matches:formatted",
            {
              leagueId: "all",
              limit: "all",
            }
          );
          await cacheService.set(
            cacheKey,
            formattedFixtures,
            config.cache.ttl.upcomingMatches
          );
          logger.info(
            `Cached ${formattedFixtures.length} formatted upcoming matches`
          );
        }
      }
    } catch (error) {
      logger.error(`Error in refreshUpcomingMatches: ${error.message}`);
    }
  }

  groupChangesByMarket(changes) {
    const grouped = {};

    changes.forEach((change) => {
      if (!grouped[change.market]) {
        grouped[change.market] = [];
      }
      grouped[change.market].push(change);
    });

    return grouped;
  }
}

export default new RefreshService();
