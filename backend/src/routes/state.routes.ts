import express from "express";
import { exportAll, showState } from "../controllers/state.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

// Mounted at /api: two whole-record reads that belong to no single table's area.
const stateRoutes = express.Router();

stateRoutes.get("/state", requireAuth, showState);
stateRoutes.get("/export", requireAuth, exportAll);

export default stateRoutes;
