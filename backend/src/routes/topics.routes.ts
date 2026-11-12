import express from "express";
import { showPathTo } from "../controllers/topics.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const topicRoutes = express.Router();

topicRoutes.get("/:topicId/path-to/:targetId", requireAuth, showPathTo);

export default topicRoutes;
