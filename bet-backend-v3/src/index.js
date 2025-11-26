import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { config } from "./config/index.js";
import { logger } from "./config/logger.js";
import cacheService from "./services/CacheService.js";
import refreshService from "./services/RefreshService.js";
import socketService from "./services/SocketService.js";
import databaseService from "./services/DatabaseService.js";
import betSlipExpirationService from "./services/BetSlipExpirationService.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { globalRateLimiter } from "./middleware/rateLimiter.js";

import liveMatchesRoutes from "./routes/liveMatchesRoutes.js";
import upcomingMatchesRoutes from "./routes/upcomingMatchesRoutes.js";
import dailyMatchesRoutes from "./routes/dailyMatchesRoutes.js";
import leagueMatchesRoutes from "./routes/leagueMatchesRoutes.js";
import betslipRoutes from "./routes/betslipRoutes.js";
import matchDetailsRoutes from "./routes/matchDetailsRoutes.js";

const app = express();

// Augmenter le timeout pour les requêtes longues (traitement de nombreux matchs)
app.timeout = config.server.timeout;

// Configuration Helmet pour la sécurité
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Désactivé pour Socket.io
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Configuration CORS sécurisée
const corsOptions = {
  origin: (origin, callback) => {
    // En développement, permettre les requêtes sans origin (Postman, curl, etc.)
    if (config.server.env === "development" && !origin) {
      return callback(null, true);
    }

    // Si CORS_ORIGIN est "*", ne permettre aucune origine en production
    if (config.cors.origin === "*") {
      if (config.server.env === "production") {
        return callback(
          new Error("CORS: All origins not allowed in production")
        );
      }
      // En développement, permettre toutes les origines si "*"
      return callback(null, true);
    }

    // Parser les origines autorisées (séparées par des virgules)
    const allowedOrigins = config.cors.origin
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // 24 heures
};

app.use(cors(corsOptions));
app.use(compression());

// Limiter la taille des requêtes JSON pour prévenir les attaques DoS
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(globalRateLimiter);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    cache: cacheService.isAvailable(),
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Bet Backend API v3",
    version: "3.0.0",
    endpoints: {
      liveMatches: "/api/live-matches",
      upcomingMatches: "/api/upcoming-matches",
      dailyMatches: "/api/daily-matches",
      leagueMatches: "/api/league-matches",
      betslip: "/api/betslip",
      matchDetails: "/api/match-details/:fixtureId",
    },
  });
});

app.use("/api/live-matches", liveMatchesRoutes);
app.use("/api/upcoming-matches", upcomingMatchesRoutes);
app.use("/api/daily-matches", dailyMatchesRoutes);
app.use("/api/league-matches", leagueMatchesRoutes);
app.use("/api/betslip", betslipRoutes);
app.use("/api/match-details", matchDetailsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    // Connexion à MongoDB (non-bloquante avec timeout)
    logger.info("Connecting to MongoDB...");
    databaseService.connect().catch((error) => {
      logger.warn(`⚠️ MongoDB connection failed: ${error.message}`);
      logger.warn(
        "Application will continue without database (BetSlip features disabled)"
      );
    });

    // Connexion à Redis
    logger.info("Connecting to Redis...");
    try {
      await cacheService.connect();
      logger.info("✅ Redis connected successfully");
    } catch (error) {
      logger.warn(`⚠️ Redis connection failed: ${error.message}`);
      logger.warn("Application will continue without cache");
    }

    // Démarrer les services
    if (cacheService.isAvailable()) {
      refreshService.start();
      logger.info("✅ Refresh service started");
    } else {
      logger.warn("⚠️ Refresh service not started (Redis not available)");
    }

    // Vérifier MongoDB après un court délai (connexion asynchrone)
    setTimeout(() => {
      if (databaseService.isAvailable()) {
        betSlipExpirationService.start();
        logger.info("✅ BetSlip expiration service started");
      } else {
        logger.warn(
          "⚠️ BetSlip expiration service not started (MongoDB not available)"
        );
      }
    }, 1000);

    const apiKey = config.apiFootball.apiKey;
    if (!apiKey || apiKey === "") {
      logger.warn("⚠️  WARNING: API_FOOTBALL_KEY is not set!");
    } else {
      const apiKeyPreview = apiKey.substring(0, 10) + "...";
      logger.info(`🔑 API Football key configured: ${apiKeyPreview}`);
    }

    const server = http.createServer(app);
    const port = config.server.port;

    // Configurer le timeout du serveur HTTP
    server.timeout = config.server.timeout;
    server.keepAliveTimeout = 65000; // 65 secondes
    server.headersTimeout = 66000; // 66 secondes

    socketService.initialize(server);

    server.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📝 Environment: ${config.server.env}`);
      logger.info(`🔗 API available at http://localhost:${port}`);
      logger.info(`🔌 Socket.io enabled for real-time updates`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  refreshService.stop();
  betSlipExpirationService.stop();
  await cacheService.disconnect();
  await databaseService.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT signal received: closing HTTP server");
  refreshService.stop();
  betSlipExpirationService.stop();
  await cacheService.disconnect();
  await databaseService.disconnect();
  process.exit(0);
});

startServer();

export default app;
