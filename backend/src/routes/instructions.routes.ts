import express from "express";
import { showInstructions } from "../controllers/instructions.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const instructionRoutes = express.Router();

instructionRoutes.get("/", requireAuth, showInstructions);

export default instructionRoutes;
