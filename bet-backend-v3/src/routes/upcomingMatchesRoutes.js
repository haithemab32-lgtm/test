import express from "express";
import upcomingMatchesController from "../controllers/UpcomingMatchesController.js";

const router = express.Router();

router.get(
  "/",
  upcomingMatchesController.getUpcomingMatches.bind(upcomingMatchesController)
);

router.get(
  "/in-hours",
  upcomingMatchesController.getUpcomingMatchesInHours.bind(
    upcomingMatchesController
  )
);

export default router;
