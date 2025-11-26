import express from "express";
import dailyMatchesController from "../controllers/DailyMatchesController.js";

const router = express.Router();

router.get(
  "/",
  dailyMatchesController.getDailyMatches.bind(dailyMatchesController)
);

export default router;
