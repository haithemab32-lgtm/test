/**
 * Utilitaires de validation et sanitization pour prévenir les injections NoSQL et autres attaques
 */

import { ValidationError } from "./errors.js";

/**
 * Sanitize une string pour prévenir les injections
 * @param {string} input - La string à sanitizer
 * @param {number} maxLength - Longueur maximale autorisée
 * @returns {string} - La string sanitizée
 */
export function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== "string") {
    throw new ValidationError("Input must be a string");
  }

  // Retirer les caractères dangereux pour NoSQL
  let sanitized = input
    .trim()
    .replace(/[$]/g, "") // Retirer $ (opérateur MongoDB)
    .replace(/[{}]/g, "") // Retirer { } (opérateurs MongoDB)
    .replace(/\.\./g, "") // Retirer .. (path traversal)
    .substring(0, maxLength);

  return sanitized;
}

/**
 * Valide et sanitize un code betslip
 * @param {string} code - Le code à valider
 * @returns {string} - Le code sanitizé
 */
export function validateAndSanitizeCode(code) {
  if (!code || typeof code !== "string") {
    throw new ValidationError("Code must be a non-empty string");
  }

  // Un code betslip ne doit contenir que des caractères alphanumériques
  if (!/^[A-Z0-9]+$/.test(code)) {
    throw new ValidationError("Code contains invalid characters");
  }

  // Limiter la longueur
  if (code.length > 20) {
    throw new ValidationError("Code is too long");
  }

  return code.toUpperCase().trim();
}

/**
 * Valide et convertit un fixtureId en nombre
 * @param {any} fixtureId - L'ID à valider
 * @returns {number} - L'ID validé comme nombre
 */
export function validateFixtureId(fixtureId) {
  // Convertir en nombre
  const num = Number(fixtureId);

  // Vérifier que c'est un nombre valide, positif et entier
  if (
    isNaN(num) ||
    !isFinite(num) ||
    num <= 0 ||
    !Number.isInteger(num) ||
    num > Number.MAX_SAFE_INTEGER
  ) {
    throw new ValidationError("fixtureId must be a positive integer");
  }

  return num;
}

/**
 * Valide et sanitize un market name
 * @param {any} market - Le market à valider
 * @returns {string} - Le market sanitizé
 */
export function validateMarket(market) {
  if (!market || typeof market !== "string") {
    throw new ValidationError("Market must be a non-empty string");
  }

  const sanitized = sanitizeString(market, 100);

  if (sanitized.length === 0) {
    throw new ValidationError("Market cannot be empty");
  }

  return sanitized;
}

/**
 * Valide et sanitize une sélection
 * @param {any} selection - La sélection à valider
 * @returns {string} - La sélection sanitizée
 */
export function validateSelection(selection) {
  if (!selection || typeof selection !== "string") {
    throw new ValidationError("Selection must be a non-empty string");
  }

  const sanitized = sanitizeString(selection, 100);

  if (sanitized.length === 0) {
    throw new ValidationError("Selection cannot be empty");
  }

  return sanitized;
}

/**
 * Valide une cote (odd)
 * @param {any} odd - La cote à valider
 * @returns {number} - La cote validée
 */
export function validateOdd(odd) {
  const num = Number(odd);

  if (
    isNaN(num) ||
    !isFinite(num) ||
    num <= 1 ||
    num > 1000 // Limite raisonnable pour une cote
  ) {
    throw new ValidationError(
      "Odd must be a number greater than 1 and less than 1000"
    );
  }

  return num;
}

/**
 * Valide un objet bet complet
 * @param {any} bet - L'objet bet à valider
 * @returns {Object} - L'objet bet validé et sanitizé
 */
export function validateBet(bet) {
  if (!bet || typeof bet !== "object" || Array.isArray(bet)) {
    throw new ValidationError("Bet must be an object");
  }

  // Valider les champs requis
  const fixtureId = validateFixtureId(bet.fixtureId);
  const market = validateMarket(bet.market);
  const selection = validateSelection(bet.selection);
  const odd = validateOdd(bet.odd);

  // Valider les champs optionnels
  let bookmaker = null;
  if (bet.bookmaker !== undefined && bet.bookmaker !== null) {
    if (typeof bet.bookmaker !== "string") {
      throw new ValidationError("Bookmaker must be a string or null");
    }
    bookmaker = sanitizeString(bet.bookmaker, 100);
  }

  let handicap = null;
  if (bet.handicap !== undefined && bet.handicap !== null) {
    if (typeof bet.handicap !== "string") {
      throw new ValidationError("Handicap must be a string or null");
    }
    handicap = sanitizeString(bet.handicap, 50);
  }

  return {
    fixtureId,
    market,
    selection,
    odd,
    bookmaker,
    handicap,
    timestamp: new Date(),
  };
}

/**
 * Valide un tableau de bets
 * @param {any} bets - Le tableau de bets à valider
 * @param {number} maxBets - Nombre maximum de bets autorisés
 * @returns {Array} - Le tableau de bets validé
 */
export function validateBetsArray(bets, maxBets = 50) {
  if (!Array.isArray(bets)) {
    throw new ValidationError("Bets must be an array");
  }

  if (bets.length === 0) {
    throw new ValidationError("Bets array cannot be empty");
  }

  if (bets.length > maxBets) {
    throw new ValidationError(`Maximum ${maxBets} bets allowed per betslip`);
  }

  // Valider chaque bet
  return bets.map((bet, index) => {
    try {
      return validateBet(bet);
    } catch (error) {
      throw new ValidationError(
        `Bet at index ${index} is invalid: ${error.message}`
      );
    }
  });
}

/**
 * Valide et sanitize un userId (optionnel)
 * @param {any} userId - L'ID utilisateur à valider
 * @returns {string|null} - L'ID utilisateur validé ou null
 */
export function validateUserId(userId) {
  if (userId === null || userId === undefined) {
    return null;
  }

  if (typeof userId !== "string") {
    throw new ValidationError("UserId must be a string or null");
  }

  const sanitized = sanitizeString(userId, 100);

  if (sanitized.length === 0) {
    return null;
  }

  return sanitized;
}




