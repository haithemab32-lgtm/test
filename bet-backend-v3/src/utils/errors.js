/**
 * Classes d'erreur personnalisées
 */

export class ApiError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class CacheError extends ApiError {
  constructor(message) {
    super(message, 503);
    this.name = "CacheError";
  }
}

export class ExternalApiError extends ApiError {
  constructor(message, statusCode = 502) {
    super(message, statusCode);
    this.name = "ExternalApiError";
  }
}

export class ValidationError extends ApiError {
  constructor(message) {
    super(message, 400);
    this.name = "ValidationError";
  }
}
