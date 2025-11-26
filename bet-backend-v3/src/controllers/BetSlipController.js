import { nanoid } from "nanoid";
import { logger } from "../config/logger.js";
import { config } from "../config/index.js";
import BetSlip from "../models/BetSlip.js";
import betSlipService from "../services/BetSlipService.js";
import {
  formatSuccessResponse,
  formatErrorResponse,
} from "../utils/response.js";
import { ValidationError } from "../utils/errors.js";
import {
  validateBetsArray,
  validateUserId,
  validateAndSanitizeCode,
} from "../utils/validation.js";

class BetSlipController {
  /**
   * POST /betslip/save
   * Crée un nouveau ticket de pari
   */
  async saveBetSlip(req, res, next) {
    try {
      const { bets, userId } = req.body;

      // Validation et sanitization stricte pour prévenir les injections NoSQL
      const validatedBets = validateBetsArray(bets);
      const validatedUserId = validateUserId(userId);

      // Générer un code unique
      const codeLength = config.betslip.codeLength || 6;
      let code;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        code = nanoid(codeLength).toUpperCase();
        const existing = await BetSlip.findOne({ code });
        if (!existing) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new Error("Impossible de générer un code unique");
      }

      // Calculer la date d'expiration
      const expirationHours = config.betslip.expirationHours || 24;
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

      // Créer le ticket avec les données validées
      const betSlip = new BetSlip({
        code,
        userId: validatedUserId,
        bets: validatedBets, // Utiliser les bets validés et sanitizés
        status: "active",
        expiresAt,
      });

      await betSlip.save();

      logger.info(`BetSlip créé: ${code} (${bets.length} paris)`);

      return res.json(
        formatSuccessResponse({
          code: betSlip.code,
          expiresAt: betSlip.expiresAt.toISOString(),
          createdAt: betSlip.createdAt.toISOString(),
        })
      );
    } catch (error) {
      logger.error("Erreur lors de la création du BetSlip:", error);
      next(error);
    }
  }

  /**
   * GET /betslip/:code
   * Récupère un ticket par son code
   */
  async getBetSlip(req, res, next) {
    try {
      const { code } = req.params;

      // Valider et sanitizer le code pour prévenir les injections NoSQL
      const sanitizedCode = validateAndSanitizeCode(code);

      // Utiliser le code sanitizé dans la requête MongoDB
      const betSlip = await BetSlip.findOne({ code: sanitizedCode });

      if (!betSlip) {
        return res
          .status(404)
          .json(formatErrorResponse("Ticket introuvable", null, 404));
      }

      // Vérifier si le ticket est expiré
      if (betSlip.isExpired()) {
        // Marquer comme expiré si ce n'est pas déjà fait
        if (betSlip.status === "active") {
          await betSlip.markAsExpired();
        }
        return res
          .status(410)
          .json(formatErrorResponse("Ticket expiré", null, 410));
      }

      return res.json(
        formatSuccessResponse({
          code: betSlip.code,
          bets: betSlip.bets,
          status: betSlip.status,
          createdAt: betSlip.createdAt.toISOString(),
          expiresAt: betSlip.expiresAt.toISOString(),
        })
      );
    } catch (error) {
      logger.error("Erreur lors de la récupération du BetSlip:", error);
      next(error);
    }
  }

  /**
   * POST /betslip/validate
   * Valide les cotes actuelles d'un ticket
   */
  async validateBetSlip(req, res, next) {
    try {
      const { bets, code } = req.body;

      // Si un code est fourni, récupérer les paris depuis la base
      let betsToValidate = bets;
      let sanitizedCode = null;

      if (code) {
        // Valider et sanitizer le code pour prévenir les injections NoSQL
        sanitizedCode = validateAndSanitizeCode(code);
        const betSlip = await BetSlip.findOne({ code: sanitizedCode });
        if (!betSlip) {
          throw new ValidationError("Ticket introuvable");
        }

        if (betSlip.isExpired()) {
          return res
            .status(410)
            .json(formatErrorResponse("Ticket expiré", null, 410));
        }

        betsToValidate = betSlip.bets;
      }

      // Valider les bets si fournis directement
      if (betsToValidate) {
        betsToValidate = validateBetsArray(betsToValidate);
      } else {
        throw new ValidationError("Aucun pari à valider");
      }

      // Valider les cotes avec les nouvelles fonctionnalités
      const validation = await betSlipService.validateOdds(betsToValidate, {
        code: sanitizedCode,
        checkExpiration: true,
      });

      // Retourner la réponse avec les codes de validation
      return res.json(
        formatSuccessResponse({
          valid: validation.valid,
          code: validation.code,
          message: validation.message,
          changes: validation.changes,
          closed: validation.closed,
          rejected: validation.rejected || [],
          errors: validation.errors,
          matchInfo: validation.matchInfo || {}, // Informations des matchs (score, statut, etc.)
        })
      );
    } catch (error) {
      logger.error("Erreur lors de la validation du BetSlip:", error);
      next(error);
    }
  }

  /**
   * POST /betslip/place
   * Place un pari (fonctionnalité future)
   * Pour l'instant, valide une dernière fois et retourne un message
   */
  async placeBetSlip(req, res, next) {
    try {
      const { code } = req.body;

      // Valider et sanitizer le code pour prévenir les injections NoSQL
      const sanitizedCode = validateAndSanitizeCode(code);

      const betSlip = await BetSlip.findOne({ code: sanitizedCode });

      if (!betSlip) {
        throw new ValidationError("Ticket introuvable");
      }

      if (betSlip.isExpired()) {
        return res
          .status(410)
          .json(formatErrorResponse("Ticket expiré", null, 410));
      }

      if (betSlip.status === "used") {
        return res
          .status(409)
          .json(formatErrorResponse("Ticket déjà utilisé", null, 409));
      }

      // Dernière validation des cotes
      const validation = await betSlipService.validateOdds(betSlip.bets);

      if (!validation.valid) {
        return res.json(
          formatSuccessResponse({
            valid: false,
            message: validation.message,
            changes: validation.changes,
            closed: validation.closed,
            errors: validation.errors,
            canPlace: false,
          })
        );
      }

      // TODO: Implémenter la logique de placement réel du pari
      // Pour l'instant, on retourne juste une confirmation

      return res.json(
        formatSuccessResponse({
          valid: true,
          message: "Ticket validé et prêt à être placé",
          canPlace: true,
          code: betSlip.code,
        })
      );
    } catch (error) {
      logger.error("Erreur lors du placement du BetSlip:", error);
      next(error);
    }
  }
}

export default new BetSlipController();
