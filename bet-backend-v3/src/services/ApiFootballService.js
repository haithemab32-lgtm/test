import axios from "axios";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";
import { ExternalApiError } from "../utils/errors.js";
import cacheService from "./CacheService.js";
import oddsOptimizer from "./OddsOptimizer.js";

class ApiFootballService {
  constructor() {
    this.baseURL = config.apiFootball.baseURL;
    this.headers = config.apiFootball.headers;
    this.requestCount = 0;
    this.errorCount = 0;
    // Cache pour éviter les logs répétitifs
    this.noOddsLogged = new Set();
    this.rateLimitLogged = false; // Flag pour éviter les logs répétitifs de limite
    this.rateLimitReached = false; // Flag pour indiquer si la limite quotidienne est atteinte

    // Rate limiting pour respecter les limites de l'API Football
    // Par défaut : 10 requêtes/seconde (plan gratuit) ou 30-100 (plans payants)
    this.requestsPerSecond = config.apiFootball.rateLimit || 10;
    this.lastRequestTime = 0;
    this.minDelayBetweenRequests = 1000 / this.requestsPerSecond; // ms entre chaque requête
  }

  /**
   * Vérifie si la limite de requêtes quotidienne est atteinte
   */
  isRateLimitReached() {
    return this.rateLimitReached;
  }

  /**
   * Rate limiter : attendre le bon moment avant de faire une requête
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelayBetweenRequests) {
      const waitTime = this.minDelayBetweenRequests - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Fait une requête à l'API Football avec gestion du cache et rate limiting
   */
  async makeRequest(
    endpoint,
    params = {},
    cacheKey = null,
    ttl = null,
    retryCount = 0
  ) {
    try {
      // Essayer de récupérer depuis le cache
      if (cacheKey && cacheService.isAvailable()) {
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          // Log si le cache contient des résultats vides
          if (
            cached.success &&
            (!cached.data?.response || cached.data.response.length === 0)
          ) {
            logger.debug(
              `Cache hit but empty results for ${endpoint}, will refresh from API`
            );
            // Ne pas retourner le cache vide, forcer un appel API
            await cacheService.delete(cacheKey);
          } else {
            // Pour les statistiques et compositions, ne pas utiliser le cache si vide
            // car ces données peuvent ne pas être disponibles immédiatement
            if (
              (endpoint.includes("statistics") ||
                endpoint.includes("lineups")) &&
              cached.success &&
              (!cached.data?.response || cached.data.response.length === 0)
            ) {
              logger.debug(
                `Cache hit but empty results for ${endpoint} (statistics/lineups), will refresh from API`
              );
              await cacheService.delete(cacheKey);
            } else {
              return cached;
            }
          }
        }
      }

      // Vérifier que la clé API est configurée
      if (
        !this.headers["x-apisports-key"] ||
        this.headers["x-apisports-key"] === ""
      ) {
        const errorMsg =
          "API Football key is not configured. Please set API_FOOTBALL_KEY environment variable.";
        logger.error(errorMsg);
        throw new ExternalApiError(errorMsg, 500);
      }

      // Attendre pour respecter le rate limit
      await this.waitForRateLimit();

      // Faire l'appel API
      logger.debug(
        `API Football request: ${endpoint} with params:`,
        JSON.stringify(params)
      );
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: this.headers,
        params,
        timeout: 10000,
      });

      // Log de la réponse complète pour diagnostic (première fois seulement)
      if (
        response.data &&
        (!response.data.response || response.data.response.length === 0)
      ) {
        logger.debug(
          `API Football full response structure:`,
          JSON.stringify(
            {
              get: response.data.get || null,
              parameters: response.data.parameters || null,
              errors: response.data.errors || null,
              results: response.data.results || null,
              paging: response.data.paging || null,
            },
            null,
            2
          )
        );
      }

      this.requestCount++;

      const result = {
        success: true,
        data: response.data,
      };

      // Logger détaillé pour les statistiques et compositions
      if (endpoint.includes("statistics") || endpoint.includes("lineups")) {
        logger.info(
          `📊 [API Football] ${endpoint} response for params ${JSON.stringify(
            params
          )}:`,
          JSON.stringify(
            {
              success: result.success,
              hasData: !!result.data,
              results: result.data?.results || 0,
              hasResponse: !!result.data?.response,
              responseType: result.data?.response
                ? Array.isArray(result.data?.response)
                  ? "array"
                  : typeof result.data?.response
                : "undefined",
              responseLength: result.data?.response?.length || 0,
              responseSample: result.data?.response
                ? Array.isArray(result.data.response) &&
                  result.data.response.length > 0
                  ? {
                      firstItem: {
                        hasTeam: !!result.data.response[0]?.team,
                        hasStatistics: !!result.data.response[0]?.statistics,
                        statisticsLength:
                          result.data.response[0]?.statistics?.length || 0,
                        hasStartXI: !!result.data.response[0]?.startXI,
                        startXILength:
                          result.data.response[0]?.startXI?.length || 0,
                        keys: Object.keys(result.data.response[0] || {}),
                      },
                    }
                  : result.data.response
                : null,
              errors: result.data?.errors || null,
            },
            null,
            2
          )
        );
      }

      // Log détaillé pour diagnostic (uniquement si résultat vide)
      if (
        response.data &&
        (!response.data.response || response.data.response.length === 0)
      ) {
        const errors = response.data.errors || {};
        const hasRateLimitError = Object.values(errors).some(
          (err) => typeof err === "string" && err.includes("request limit")
        );

        if (hasRateLimitError) {
          // Marquer que la limite est atteinte
          this.rateLimitReached = true;

          // Ne pas logger en boucle si la limite est atteinte
          if (!this.rateLimitLogged) {
            logger.error(
              `🚨 API Football: Rate limit reached for the day! All requests will fail until tomorrow.`
            );
            logger.error(
              `   Upgrade your plan at: https://dashboard.api-football.com`
            );
            logger.warn(
              `   RefreshService will skip API calls until the limit resets.`
            );
            this.rateLimitLogged = true;
          }
        } else {
          // Réinitialiser le flag si on a des résultats (limite peut avoir été réinitialisée)
          this.rateLimitReached = false;
          const debugInfo = {
            endpoint,
            params,
            results: response.data.results || 0,
            paging: response.data.paging || {},
            errors: errors,
            get: response.data.get || null,
            responseLength: response.data.response?.length || 0,
          };
          logger.warn(`API Football empty response for ${endpoint}`);
          logger.warn(`  Params: ${JSON.stringify(params)}`);
          logger.warn(`  Results: ${debugInfo.results}`);
          logger.warn(`  Errors: ${JSON.stringify(debugInfo.errors)}`);
          logger.warn(`  Get: ${debugInfo.get || "N/A"}`);
          logger.warn(`  Response length: ${debugInfo.responseLength}`);
        }
      } else {
        // Réinitialiser le flag si on a des résultats
        this.rateLimitLogged = false;
      }

      // Mettre en cache si possible
      if (cacheKey && cacheService.isAvailable() && ttl) {
        await cacheService.set(cacheKey, result, ttl);
      }

      return result;
    } catch (error) {
      this.errorCount++;

      // Gestion spéciale pour les erreurs 429 (Too Many Requests)
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers["retry-after"]
          ? parseInt(error.response.headers["retry-after"], 10) * 1000
          : Math.min(60000, (retryCount + 1) * 5000); // Backoff exponentiel, max 60s

        if (retryCount < 3) {
          logger.warn(
            `API Football rate limit hit (${endpoint}). Retrying after ${retryAfter}ms (attempt ${
              retryCount + 1
            }/3)`
          );
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          return this.makeRequest(
            endpoint,
            params,
            cacheKey,
            ttl,
            retryCount + 1
          );
        } else {
          logger.error(
            `API Football rate limit exceeded (${endpoint}). Max retries reached.`
          );
        }
      }

      if (error.response) {
        logger.error(
          `API Football error (${endpoint}): ${error.response.status} ${error.response.statusText}`
        );
      } else {
        logger.error(`API Football error (${endpoint}): ${error.message}`);
      }

      // Si on a une erreur mais qu'on a des données en cache, les retourner
      if (cacheKey && cacheService.isAvailable()) {
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          logger.warn(`Using cached data due to API error: ${endpoint}`);
          return cached;
        }
      }

      const errorMessage = error.response?.data?.message || error.message;
      throw new ExternalApiError(
        `API Football request failed: ${errorMessage}`,
        error.response?.status || 502
      );
    }
  }

  /**
   * Récupère les matchs en direct
   */
  async getLiveFixtures() {
    const cacheKey = cacheService.generateKey("live:fixtures");
    const result = await this.makeRequest(
      "/fixtures",
      { live: "all" },
      cacheKey,
      config.cache.ttl.liveMatches
    );

    // Log pour diagnostic
    if (result.success && result.data?.response) {
      logger.info(
        `API Football: Found ${result.data.response.length} live fixtures`
      );
    } else if (
      result.success &&
      (!result.data?.response || result.data.response.length === 0)
    ) {
      logger.warn(
        "API Football: No live fixtures returned (this may be normal if no matches are currently live)"
      );
    } else {
      logger.error(
        `API Football: Error fetching live fixtures - ${
          result.error || "Unknown error"
        }`
      );
    }

    return result;
  }

  /**
   * Récupère les cotes pour un match spécifique
   * VERSION 3 : Pour les matchs live, utilise EXCLUSIVEMENT /odds/live (pas de fallback)
   */
  async getOddsByFixture(fixtureId, isLive = false, forceRefresh = false) {
    const params = {};
    let endpoint = "/odds";

    // VERSION 3 : Pour les matchs live, utiliser EXCLUSIVEMENT /odds/live
    if (isLive) {
      endpoint = "/odds/live";
      params.fixture = fixtureId;
    } else {
      // Pour les matchs pré-match, utiliser l'endpoint standard
      params.fixture = fixtureId;
    }

    const cacheKey = cacheService.generateKey("odds:fixture", {
      fixture: fixtureId,
      live: isLive,
    });

    // Si forceRefresh est activé, supprimer le cache avant
    if (forceRefresh && cacheService.isAvailable()) {
      await cacheService.delete(cacheKey);
    }

    const ttl = isLive
      ? config.cache.ttl.liveOdds
      : config.cache.ttl.upcomingMatches;

    const result = await this.makeRequest(endpoint, params, cacheKey, ttl);

    // Pour les matchs live, filtrer par fixture ID si nécessaire
    if (
      isLive &&
      result.success &&
      result.data.response &&
      Array.isArray(result.data.response)
    ) {
      const filteredResponse = result.data.response.filter(
        (item) => item.fixture && item.fixture.id === fixtureId
      );

      if (filteredResponse.length > 0) {
        return {
          ...result,
          data: {
            ...result.data,
            response: filteredResponse,
          },
        };
      } else if (result.data.response.length > 0) {
        // Aucun match correspondant trouvé
        if (!this.noOddsLogged.has(fixtureId)) {
          this.noOddsLogged.add(fixtureId);
          logger.warn(
            `Fixture ${fixtureId}: No matching live odds found in /odds/live`
          );
        }
        return {
          ...result,
          data: {
            ...result.data,
            response: [],
          },
        };
      }
    }

    return result;
  }

  /**
   * Récupère les matchs à venir
   * Utilise "next" pour les 10 prochains matchs, mais peut aussi utiliser des dates si nécessaire
   */
  async getUpcomingFixtures(leagueId = null, limit = null) {
    const params = {};
    if (leagueId) params.league = leagueId;
    if (limit) params.limit = limit;

    // Essayer d'abord avec "next" (plus rapide)
    const cacheKey = cacheService.generateKey("upcoming:fixtures", params);
    let result = await this.makeRequest(
      "/fixtures",
      { ...params, next: "10" },
      cacheKey,
      config.cache.ttl.upcomingMatches
    );

    // Si aucun résultat avec "next", essayer avec des dates (plus fiable)
    if (
      result.success &&
      (!result.data?.response || result.data.response.length === 0)
    ) {
      logger.info(
        "No results with 'next' parameter, trying with date range..."
      );
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const startDateStr = now.toISOString().split("T")[0];
      const endDateStr = tomorrow.toISOString().split("T")[0];

      const dateCacheKey = cacheService.generateKey("upcoming:fixtures:date", {
        ...params,
        from: startDateStr,
        to: endDateStr,
      });

      result = await this.makeRequest(
        "/fixtures",
        { ...params, from: startDateStr, to: endDateStr },
        dateCacheKey,
        config.cache.ttl.upcomingMatches
      );
    }

    // Log pour diagnostic
    if (result.success && result.data?.response) {
      logger.info(
        `API Football: Found ${result.data.response.length} upcoming fixtures`
      );
    } else if (
      result.success &&
      (!result.data?.response || result.data.response.length === 0)
    ) {
      logger.warn(
        "API Football: No upcoming fixtures returned (this may be normal if no matches are scheduled)"
      );
    } else {
      logger.error(
        `API Football: Error fetching upcoming fixtures - ${
          result.error || "Unknown error"
        }`
      );
    }

    return result;
  }

  /**
   * Récupère les matchs dans les prochaines heures
   * Utilise des dates spécifiques au lieu de "next" pour plus de fiabilité
   */
  async getUpcomingFixturesInHours(hours = 8, limit = null) {
    // Calculer les dates de début et fin
    const now = new Date();
    const endDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

    // Formater les dates au format YYYY-MM-DD
    const startDateStr = now.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    const params = {};
    if (limit) params.limit = limit;

    // Utiliser directement date (plus fiable que next selon les erreurs API)
    // L'API Football accepte date=YYYY-MM-DD pour une date unique
    const cacheKey = cacheService.generateKey("upcoming:fixtures:hours", {
      hours,
      limit,
      date: startDateStr,
    });

    // Essayer avec la date d'aujourd'hui
    let result = await this.makeRequest(
      "/fixtures",
      { ...params, date: startDateStr },
      cacheKey,
      config.cache.ttl.upcomingMatches
    );

    // Filtrer les résultats par heure (garder seulement ceux dans les prochaines X heures)
    if (result.success && result.data?.response) {
      const nowTimestamp = now.getTime();
      const endTimestamp = endDate.getTime();
      result.data.response = result.data.response.filter((fixture) => {
        const fixtureDate = new Date(fixture.fixture.date);
        const fixtureTimestamp = fixtureDate.getTime();
        return (
          fixtureTimestamp >= nowTimestamp && fixtureTimestamp <= endTimestamp
        );
      });

      if (limit && result.data.response.length > limit) {
        result.data.response = result.data.response.slice(0, limit);
      }
    }

    // Si on a besoin de plusieurs jours et qu'on n'a pas assez de résultats,
    // essayer aussi avec la date de demain
    if (
      startDateStr !== endDateStr &&
      result.success &&
      result.data?.response &&
      result.data.response.length < (limit || 50)
    ) {
      logger.info(
        `Trying with next day date: ${endDateStr} to get more fixtures...`
      );

      const tomorrowCacheKey = cacheService.generateKey(
        "upcoming:fixtures:hours",
        {
          hours,
          limit,
          date: endDateStr,
        }
      );

      const tomorrowResult = await this.makeRequest(
        "/fixtures",
        { ...params, date: endDateStr },
        tomorrowCacheKey,
        config.cache.ttl.upcomingMatches
      );

      // Combiner les résultats des deux jours
      if (
        tomorrowResult.success &&
        tomorrowResult.data?.response &&
        tomorrowResult.data.response.length > 0
      ) {
        const combinedFixtures = [
          ...(result.data?.response || []),
          ...tomorrowResult.data.response,
        ];

        // Filtrer les doublons et limiter si nécessaire
        const uniqueFixtures = combinedFixtures.filter(
          (fixture, index, self) =>
            index === self.findIndex((f) => f.fixture.id === fixture.fixture.id)
        );

        // Filtrer aussi par heure (garder seulement ceux dans les prochaines X heures)
        const nowTimestamp = now.getTime();
        const endTimestamp = endDate.getTime();
        const filteredByTime = uniqueFixtures.filter((fixture) => {
          const fixtureDate = new Date(fixture.fixture.date);
          const fixtureTimestamp = fixtureDate.getTime();
          return (
            fixtureTimestamp >= nowTimestamp && fixtureTimestamp <= endTimestamp
          );
        });

        if (limit) {
          result.data.response = filteredByTime.slice(0, limit);
        } else {
          result.data.response = filteredByTime;
        }

        logger.info(
          `Combined ${result.data.response.length} fixtures from ${startDateStr} and ${endDateStr} (filtered by ${hours}h window)`
        );
      }
    }

    // Log pour diagnostic
    const dateRange =
      startDateStr === endDateStr
        ? startDateStr
        : `${startDateStr} to ${endDateStr}`;
    if (result.success && result.data?.response) {
      logger.info(
        `API Football: Found ${result.data.response.length} upcoming fixtures in next ${hours}h (date range: ${dateRange})`
      );
    } else if (
      result.success &&
      (!result.data?.response || result.data.response.length === 0)
    ) {
      const resultsCount = result.data?.results || 0;
      const errors = result.data?.errors || [];

      // Vérifier si c'est une erreur de limite de requêtes
      const hasRateLimitError =
        errors &&
        Object.values(errors).some(
          (err) => typeof err === "string" && err.includes("request limit")
        );

      if (hasRateLimitError) {
        logger.error(
          `API Football: Rate limit reached! Cannot fetch upcoming fixtures. Please upgrade your plan or wait until tomorrow.`
        );
      } else {
        logger.warn(
          `API Football: No upcoming fixtures in next ${hours}h (date range: ${dateRange}) - Results: ${resultsCount}, Errors: ${
            errors.length > 0 ? JSON.stringify(errors) : "none"
          }`
        );
      }

      // Si c'est un problème de cache, essayer de forcer un refresh (sauf si limite atteinte)
      // Note: cacheKey peut ne pas être défini si on a utilisé le fallback avec dates
      // On ne nettoie pas le cache ici car on veut garder les résultats précédents
    } else {
      logger.error(
        `API Football: Error fetching upcoming fixtures in hours - ${
          result.error || "Unknown error"
        }`
      );
    }

    return result;
  }

  /**
   * Récupère les matchs pour une date spécifique
   */
  async getFixturesByDate(start, end = null, leagueId = null, season = null) {
    const params = { date: start };
    if (end) params.date = `${start}-${end}`;
    if (leagueId) params.league = leagueId;
    if (season) params.season = season;

    const cacheKey = cacheService.generateKey("fixtures:date", params);
    return this.makeRequest(
      "/fixtures",
      params,
      cacheKey,
      config.cache.ttl.dailyMatches
    );
  }

  /**
   * Récupère les matchs d'une ligue spécifique
   */
  async getFixturesByLeague(leagueId, season = null, next = 10) {
    const params = { league: leagueId, next: next.toString() };
    if (season) params.season = season;

    const cacheKey = cacheService.generateKey("fixtures:league", params);
    return this.makeRequest(
      "/fixtures",
      params,
      cacheKey,
      config.cache.ttl.leagueMatches
    );
  }

  /**
   * Récupère les détails d'un match spécifique
   */
  async getFixtureDetails(fixtureId) {
    const cacheKey = cacheService.generateKey("fixture:details", {
      fixture: fixtureId,
    });
    return this.makeRequest(
      "/fixtures",
      { id: fixtureId },
      cacheKey,
      config.cache.ttl.liveMatches
    );
  }

  /**
   * Récupère les statistiques d'un match
   */
  async getFixtureStatistics(fixtureId) {
    const cacheKey = cacheService.generateKey("fixture:statistics", {
      fixture: fixtureId,
    });

    // Pour les statistiques, ne pas utiliser le cache pour forcer un appel API à chaque fois
    // car les statistiques peuvent ne pas être disponibles immédiatement et changent pendant le match
    const result = await this.makeRequest(
      "/fixtures/statistics",
      { fixture: fixtureId },
      null, // Ne pas utiliser le cache pour forcer un appel API
      config.cache.ttl.liveMatches
    );

    // Logger la réponse pour débogage
    if (result) {
      if (result.success) {
        logger.info(
          `✅ Statistics API response for fixture ${fixtureId}:`,
          JSON.stringify({
            hasData: !!result.data,
            hasResponse: !!result.data?.response,
            responseLength: result.data?.response?.length || 0,
            results: result.data?.results || 0,
            responseStructure: result.data?.response
              ? result.data.response.map((stat) => ({
                  teamId: stat.team?.id,
                  teamName: stat.team?.name,
                  statsCount: stat.statistics?.length || 0,
                }))
              : null,
          })
        );
      } else {
        logger.warn(
          `❌ Statistics API failed for fixture ${fixtureId}:`,
          JSON.stringify({
            success: result.success,
            errors: result.data?.errors || result.errors || "Unknown error",
          })
        );
      }
    }

    return result;
  }

  /**
   * Récupère les événements d'un match (buts, cartons, remplacements)
   */
  async getFixtureEvents(fixtureId) {
    const cacheKey = cacheService.generateKey("fixture:events", {
      fixture: fixtureId,
    });
    return this.makeRequest(
      "/fixtures/events",
      { fixture: fixtureId },
      cacheKey,
      config.cache.ttl.liveMatches
    );
  }

  /**
   * Récupère les compositions d'équipes
   */
  async getFixtureLineups(fixtureId) {
    const cacheKey = cacheService.generateKey("fixture:lineups", {
      fixture: fixtureId,
    });

    // Pour les compositions, ne pas utiliser le cache pour forcer un appel API à chaque fois
    // car les compositions peuvent ne pas être disponibles immédiatement
    const result = await this.makeRequest(
      "/fixtures/lineups",
      { fixture: fixtureId },
      null, // Ne pas utiliser le cache pour forcer un appel API
      config.cache.ttl.liveMatches
    );

    // Logger la réponse pour débogage
    if (result && result.success) {
      logger.debug(
        `Lineups API response for fixture ${fixtureId}:`,
        JSON.stringify({
          hasData: !!result.data,
          hasResponse: !!result.data?.response,
          responseLength: result.data?.response?.length || 0,
          results: result.data?.results || 0,
        })
      );
    }

    return result;
  }

  /**
   * Récupère les statistiques par joueur
   */
  async getFixturePlayers(fixtureId) {
    const cacheKey = cacheService.generateKey("fixture:players", {
      fixture: fixtureId,
    });
    return this.makeRequest(
      "/fixtures/players",
      { fixture: fixtureId },
      cacheKey,
      config.cache.ttl.liveMatches
    );
  }

  /**
   * Récupère l'historique des confrontations entre deux équipes
   */
  async getHeadToHead(team1Id, team2Id) {
    const cacheKey = cacheService.generateKey("fixture:headtohead", {
      h2h: `${team1Id}-${team2Id}`,
    });
    return this.makeRequest(
      "/fixtures/headtohead",
      { h2h: `${team1Id}-${team2Id}` },
      cacheKey,
      config.cache.ttl.leagueMatches
    );
  }

  /**
   * Récupère les joueurs suspendus/blessés
   */
  async getSidelinedPlayers(fixtureId) {
    const cacheKey = cacheService.generateKey("fixture:sidelined", {
      fixture: fixtureId,
    });
    return this.makeRequest(
      "/fixtures/players/sidelined",
      { fixture: fixtureId },
      cacheKey,
      config.cache.ttl.upcomingMatches
    );
  }

  /**
   * Formate un match avec ses cotes
   * VERSION 3 : Pour les matchs live, retourne la réponse brute de /odds/live
   *            Pour les matchs upcoming, sélectionne Bet365 → 1xBet → sinon ignoré
   */
  async formatFixtureWithOdds(fixture, includeOdds = true) {
    const formatted = {
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
    };

    if (includeOdds) {
      const isLive =
        fixture.fixture.status.short !== "NS" &&
        fixture.fixture.status.short !== "TBD" &&
        fixture.fixture.status.short !== "PST";

      try {
        const oddsResponse = await this.getOddsByFixture(
          fixture.fixture.id,
          isLive,
          isLive // Force refresh pour les matchs en direct
        );

        // VERSION 3 : Pour les matchs live, utiliser EXCLUSIVEMENT /odds/live
        // Si pas de cotes live, le match est ignoré (pas de fallback)
        if (
          isLive &&
          (!oddsResponse.success ||
            !oddsResponse.data.response ||
            oddsResponse.data.response.length === 0)
        ) {
          if (!this.noOddsLogged.has(fixture.fixture.id)) {
            this.noOddsLogged.add(fixture.fixture.id);
            logger.warn(
              `Fixture ${fixture.fixture.id}: No live odds available from /odds/live - match will be ignored`
            );
          }
          formatted.odds = null;
          formatted.source = null;
          return formatted;
        }

        if (
          oddsResponse.success &&
          oddsResponse.data.response &&
          oddsResponse.data.response.length > 0
        ) {
          // Utiliser le nouveau processOdds avec isLive
          const processedOdds = oddsOptimizer.processOdds(
            oddsResponse.data,
            isLive
          );

          if (processedOdds) {
            // Pour les matchs live : retourner la réponse brute
            // Pour les matchs upcoming : retourner les cotes du bookmaker sélectionné
            formatted.odds = processedOdds;
            formatted.source = processedOdds.source || (isLive ? "live" : null);
          } else {
            formatted.odds = null;
            formatted.source = null;
          }
        } else {
          formatted.odds = null;
          formatted.source = null;
        }
      } catch (error) {
        logger.warn(
          `Failed to fetch odds for fixture ${fixture.fixture.id}: ${error.message}`
        );
        formatted.odds = null;
        formatted.source = null;
      }
    }

    return formatted;
  }
}

export default new ApiFootballService();
