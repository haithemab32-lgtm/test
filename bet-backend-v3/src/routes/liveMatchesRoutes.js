import express from "express";
import liveMatchesController from "../controllers/LiveMatchesController.js";

const router = express.Router();

router.get(
  "/",
  liveMatchesController.getLiveMatchesWithOdds.bind(liveMatchesController)
);

router.get(
  "/stats",
  liveMatchesController.getLiveMatchesStats.bind(liveMatchesController)
);

export default router;
