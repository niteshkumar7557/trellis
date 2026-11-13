import express from "express";
import { PatchMeBody, patchMe, showMe } from "../controllers/me.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const meRoutes = express.Router();

meRoutes.get("/", requireAuth, showMe);
meRoutes.patch("/", requireAuth, validateBody(PatchMeBody), patchMe);

export default meRoutes;
