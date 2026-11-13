import express from "express";
import { PatchCheckInBody, patchCheckIn, removeCheckIn, showCheckIns } from "../controllers/check-ins.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const checkInRoutes = express.Router();

// No POST: check-ins are created only by saving a helper proposal (M4.3).
checkInRoutes.get("/", requireAuth, showCheckIns);
checkInRoutes.patch("/:id", requireAuth, validateBody(PatchCheckInBody), patchCheckIn);
checkInRoutes.delete("/:id", requireAuth, removeCheckIn);

export default checkInRoutes;
