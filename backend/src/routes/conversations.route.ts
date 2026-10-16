import express from "express";
import {
  addMessageToConversation,
  createConversation,
  getConversationById,
  getConversations,
} from "../controllers/conversations.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const conversationsRoutes = express.Router();

conversationsRoutes.use(requireAuth);

conversationsRoutes.get("/", getConversations);
conversationsRoutes.get("/:id", getConversationById);
conversationsRoutes.post("/", createConversation);
conversationsRoutes.post("/:id/messages", addMessageToConversation);

export default conversationsRoutes;