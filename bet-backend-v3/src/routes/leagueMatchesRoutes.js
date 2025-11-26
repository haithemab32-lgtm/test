import express from "express";
import leagueMatchesController from "../controllers/LeagueMatchesController.js";

const router = express.Router();

router.get(
  "/",
  leagueMatchesController.getLeagueMatches.bind(leagueMatchesController)
);

export default router;
