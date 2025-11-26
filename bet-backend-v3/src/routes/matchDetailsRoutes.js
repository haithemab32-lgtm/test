import express from "express";
import matchDetailsController from "../controllers/MatchDetailsController.js";

const router = express.Router();

router.get(
  "/:fixtureId",
  matchDetailsController.getMatchDetails.bind(matchDetailsController)
);

export default router;
