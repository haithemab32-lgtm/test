import { logger } from "../config/logger.js";
import { formatErrorResponse } from "../utils/response.js";
import { ApiError } from "../utils/errors.js";

/**
 * Middleware de gestion des erreurs
 */
export const errorHandler = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Si l'erreur est déjà une ApiError
  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json(formatErrorResponse(err.message, err, err.statusCode));
  }

  // Erreur de validation
  if (err.name === "ValidationError" || err.name === "CastError") {
    return res
      .status(400)
      .json(formatErrorResponse("Validation error", err, 400));
  }

  // Erreur par défaut
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json(formatErrorResponse(message, err, statusCode));
};

/**
 * Middleware pour gérer les routes non trouvées
 */
export const notFoundHandler = (req, res) => {
  res
    .status(404)
    .json(
      formatErrorResponse(
        `Route ${req.method} ${req.path} not found`,
        null,
        404
      )
    );
};
