import express from "express";
import { PostPromptTakeBody, postPromptTake } from "../controllers/prompt-takes.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const promptTakeRoutes = express.Router();

promptTakeRoutes.post("/", requireAuth, validateBody(PostPromptTakeBody), postPromptTake);

export default promptTakeRoutes;
