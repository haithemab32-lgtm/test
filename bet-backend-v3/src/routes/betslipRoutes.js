import express from "express";
import betSlipController from "../controllers/BetSlipController.js";

const router = express.Router();

/**
 * POST /betslip/save
 * Crée un nouveau ticket de pari
 * Body: { bets: [...], userId?: string }
 */
router.post("/save", betSlipController.saveBetSlip.bind(betSlipController));

/**
 * GET /betslip/:code
 * Récupère un ticket par son code
 */
router.get("/:code", betSlipController.getBetSlip.bind(betSlipController));

/**
 * POST /betslip/validate
 * Valide les cotes actuelles d'un ticket
 * Body: { bets?: [...], code?: string }
 */
router.post(
  "/validate",
  betSlipController.validateBetSlip.bind(betSlipController)
);

/**
 * POST /betslip/place
 * Place un pari (fonctionnalité future)
 * Body: { code: string }
 */
router.post("/place", betSlipController.placeBetSlip.bind(betSlipController));

export default router;

