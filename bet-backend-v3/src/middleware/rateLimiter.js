import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";

/**
 * Rate limiter global
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter pour les endpoints de matchs en direct (plus strict)
 */
export const liveMatchesRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 30, // 30 requêtes par minute
  message: {
    success: false,
    error: "Too many requests for live matches, please try again later.",
  },
});
