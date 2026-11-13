import express from "express";
import { PatchExperienceBody, patchExperience, removeExperience } from "../controllers/experiences.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const experienceRoutes = express.Router();

// No GET (GET /api/state has them all) and no POST (only saving a proposal makes one).
experienceRoutes.patch("/:id", requireAuth, validateBody(PatchExperienceBody), patchExperience);
experienceRoutes.delete("/:id", requireAuth, removeExperience);

export default experienceRoutes;
