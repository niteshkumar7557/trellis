import express from "express";
import { PutGoalBody, putGoal } from "../controllers/goals.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const goalRoutes = express.Router();

goalRoutes.put("/:subjectId", requireAuth, validateBody(PutGoalBody), putGoal);

export default goalRoutes;
