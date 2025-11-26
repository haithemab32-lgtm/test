/**
 * Utilitaires pour formater les réponses API
 */

export const formatSuccessResponse = (data, count = null, message = null) => {
  const response = {
    success: true,
    data,
  };

  if (count !== null) {
    response.count = count;
  }

  if (message) {
    response.message = message;
  }

  return response;
};

export const formatErrorResponse = (
  message,
  error = null,
  statusCode = 500
) => {
  const response = {
    success: false,
    error: message,
    statusCode,
  };

  // Ne jamais exposer les détails en production
  // Vérifier explicitement l'environnement pour éviter les fuites
  const isDevelopment =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev";

  if (isDevelopment && error) {
    // En développement, on peut exposer le message d'erreur
    response.details = error.message;
    // Stack trace seulement si explicitement activé
    if (process.env.LOG_STACK_TRACES === "true") {
      response.stack = error.stack;
    }
  }

  // En production, ne jamais exposer les stack traces ou détails sensibles
  // Le message d'erreur générique est suffisant

  return response;
};
