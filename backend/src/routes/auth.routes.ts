import express from "express";
import {
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  googleCallback,
  googleStart,
  login,
  logout,
  refresh,
  register,
  resetPassword,
} from "../controllers/auth.controller.js";
import { loginLimiter, refreshLimiter, registerLimiter, resetLimiter } from "../middlewares/rate-limit.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const authRoutes = express.Router();

// The limiter runs before validation on purpose: a flood of bad bodies is still a flood.
authRoutes.post("/register", registerLimiter, validateBody(RegisterBody), register);
authRoutes.post("/login", loginLimiter, validateBody(LoginBody), login);
authRoutes.post("/refresh", refreshLimiter, refresh);
authRoutes.post("/reset-password", resetLimiter, validateBody(ResetPasswordBody), resetPassword);
// Sign in with Google. The start is limited like login; the callback carries a one-time
// code that only Google can produce.
authRoutes.get("/google", loginLimiter, googleStart);
authRoutes.get("/google/callback", googleCallback);
// Not limited: it only ever removes a session.
authRoutes.post("/logout", logout);

export default authRoutes;
