import express from "express";
import { showUsage } from "../controllers/usage.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const usageRoutes = express.Router();

usageRoutes.get("/", requireAuth, showUsage);

export default usageRoutes;
