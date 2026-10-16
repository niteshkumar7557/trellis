import express from "express";
import {
  generateNewAccess,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const userRoutes = express.Router();

userRoutes.post("/register", registerUser);
userRoutes.post("/login", loginUser);
userRoutes.post("/refresh", generateNewAccess);
userRoutes.post("/logout", logoutUser);
userRoutes.get("/me", requireAuth, getCurrentUser);

export default userRoutes;