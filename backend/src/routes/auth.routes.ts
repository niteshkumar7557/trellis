import express from "express";
import {
  DesktopExchangeBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  desktopExchange,
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
// Sign in with Google. The start uses login's limiter, the same instance, so Google starts
// and password logins from one address share one count of 10 per 15 minutes (giving it
// its own makeLimiter() would count them apart). The callback isn't limited: it carries a
// one-time code that only Google can produce.
authRoutes.get("/google", loginLimiter, googleStart);
authRoutes.get("/google/callback", googleCallback);
// The desktop app's half of Google sign-in (docs/desktop.md §5). Login's limiter: a
// stream of guessed codes is a sign-in attempt like any other.
authRoutes.post("/desktop/exchange", loginLimiter, validateBody(DesktopExchangeBody), desktopExchange);
// Not limited: it only ever removes a session.
authRoutes.post("/logout", logout);

export default authRoutes;
