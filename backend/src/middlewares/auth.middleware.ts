import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import type { UserPayload } from "../types/index.js";

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing access token" });
  }

  const token = authHeader.split(" ")[1];
  if (!token || !config.jwt_secret) {
    return res.status(401).json({ error: "Unauthorized: Missing access token" });
  }

  try {
    const decoded = jwt.verify(
      token,
      config.jwt_secret,
    ) as unknown as UserPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}
