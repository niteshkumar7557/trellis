import express from "express";
import { PostMessageBody, getMessages, postMessage } from "../controllers/helper.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { SaveBody, cancelProposal, saveProposal, undoProposal } from "../controllers/proposals.controller.js";
import { helperLimiter } from "../middlewares/rate-limit.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const helperRoutes = express.Router();

helperRoutes.get("/:subjectId/messages", requireAuth, getMessages);
// The limiter comes after requireAuth because it counts per student (req.userId).
helperRoutes.post("/:subjectId/messages", requireAuth, helperLimiter, validateBody(PostMessageBody), postMessage);

// Save, Cancel and Undo on a confirm card. Addressed by the proposal's id, never by a
// message id and card position (a card's position could shift).
helperRoutes.post("/proposals/:id/save", requireAuth, validateBody(SaveBody), saveProposal);
helperRoutes.post("/proposals/:id/cancel", requireAuth, cancelProposal);
helperRoutes.post("/proposals/:id/undo", requireAuth, undoProposal);

export default helperRoutes;
