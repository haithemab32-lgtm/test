import dotenv from "dotenv";

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || "development",
    timeout: parseInt(process.env.SERVER_TIMEOUT || "120000", 10), // 2 minutes par défaut
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxMemory: process.env.REDIS_MAX_MEMORY || "256mb",
    compressionThreshold: parseInt(
      process.env.REDIS_COMPRESSION_THRESHOLD || "10240",
      10
    ),
  },
  apiFootball: {
    baseURL:
      process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io",
    apiKey: process.env.API_FOOTBALL_KEY || "",
    headers: {
      "x-apisports-key": process.env.API_FOOTBALL_KEY || "",
    },
    // Rate limit de l'API Football (requêtes par seconde)
    // Plan gratuit : 10 req/s, Plan payant : 30-100 req/s
    rateLimit: parseInt(process.env.API_FOOTBALL_RATE_LIMIT || "10", 10),
  },
  cache: {
    ttl: {
      liveMatches: parseInt(process.env.CACHE_TTL_LIVE_MATCHES || "30", 10),
      upcomingMatches: parseInt(
        process.env.CACHE_TTL_UPCOMING_MATCHES || "300",
        10
      ),
      dailyMatches: parseInt(process.env.CACHE_TTL_DAILY_MATCHES || "600", 10),
      leagueMatches: parseInt(
        process.env.CACHE_TTL_LEAGUE_MATCHES || "600",
        10
      ),
      liveOdds: parseInt(process.env.CACHE_TTL_LIVE_ODDS || "10", 10),
    },
  },
  refresh: {
    liveMatchesInterval: parseInt(
      process.env.LIVE_MATCHES_REFRESH_INTERVAL || "5",
      10
    ),
    liveOddsInterval: parseInt(
      process.env.LIVE_ODDS_REFRESH_INTERVAL || "5",
      10
    ),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
  },
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/bet-backend",
    options: {
      // Options dépréciées supprimées (Mongoose 6+)
      // useNewUrlParser et useUnifiedTopology ne sont plus nécessaires
    },
  },
  betslip: {
    codeLength: parseInt(process.env.BETSLIP_CODE_LENGTH || "6", 10),
    expirationHours: parseInt(process.env.BETSLIP_EXPIRATION_HOURS || "24", 10),
  },
};
