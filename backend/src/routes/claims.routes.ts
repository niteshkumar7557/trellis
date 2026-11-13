import express from "express";
import { PostClaimsBody, postClaims } from "../controllers/claims.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const claimRoutes = express.Router();

claimRoutes.post("/", requireAuth, validateBody(PostClaimsBody), postClaims);

export default claimRoutes;
