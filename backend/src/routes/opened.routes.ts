import express from "express";
import { PostOpenedBody, postOpened } from "../controllers/opened.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const openedRoutes = express.Router();

openedRoutes.post("/", requireAuth, validateBody(PostOpenedBody), postOpened);

export default openedRoutes;
