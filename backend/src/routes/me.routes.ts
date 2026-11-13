import express from "express";
import { DeleteMeBody, PatchMeBody, deleteMe, patchMe, showMe } from "../controllers/me.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { deleteAccountLimiter } from "../middlewares/rate-limit.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const meRoutes = express.Router();

meRoutes.get("/", requireAuth, showMe);
meRoutes.patch("/", requireAuth, validateBody(PatchMeBody), patchMe);
meRoutes.delete("/", requireAuth, deleteAccountLimiter, validateBody(DeleteMeBody), deleteMe);

export default meRoutes;
