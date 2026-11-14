// The Express app: middleware first, then the routes, then the 404 and error handlers.
// Order matters: a request goes down this list until something answers it.
// src/index.ts starts it; the tests import it without starting a server.

import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import config from "./config/index.js";
import pool from "./db/index.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";
import { graphState } from "./middlewares/graph.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import checkInRoutes from "./routes/check-ins.routes.js";
import claimRoutes from "./routes/claims.routes.js";
import experienceRoutes from "./routes/experiences.routes.js";
import goalRoutes from "./routes/goals.routes.js";
import helperRoutes from "./routes/helper.routes.js";
import instructionRoutes from "./routes/instructions.routes.js";
import meRoutes from "./routes/me.routes.js";
import openedRoutes from "./routes/opened.routes.js";
import promptTakeRoutes from "./routes/prompt-takes.routes.js";
import subjectRequestRoutes from "./routes/subject-requests.routes.js";
import stateRoutes from "./routes/state.routes.js";
import subjectRoutes from "./routes/subjects.routes.js";
import topicRoutes from "./routes/topics.routes.js";
import { makeHealthHandler } from "./utils/health.js";

const app = express();

// In production Caddy sits in front and passes the visitor's address in X-Forwarded-For.
// "1" means: trust exactly one proxy hop. Without it, req.ip is Caddy's address for every
// visitor, and the rate limits would treat the whole site as one person. Not set locally,
// where a forged X-Forwarded-For header would otherwise be believed.
if (config.is_production) app.set("trust proxy", 1);

app.use(helmet());

// No CORS: the browser reaches the API on the same origin as the pages (Caddy in
// production, Next's rewrite in development; backend-design.md §2). With no CORS headers
// the browser refuses cross-site reads, which is what we want.

// 100 KB is far above any real body (the largest is a helper message of 2,000
// characters). A bigger one answers 413 too_large (error.middleware.ts).
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", makeHealthHandler(() => pool.query("SELECT 1"), () => graphState()));

app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/opened", openedRoutes);
app.use("/api/subject-requests", subjectRequestRoutes);
app.use("/api/check-ins", checkInRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/prompt-takes", promptTakeRoutes);
app.use("/api/helper", helperRoutes);
app.use("/api", stateRoutes); // /api/state and /api/export
app.use("/api/subjects", subjectRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/instructions", instructionRoutes);

// Last, after every route: the 404 for unknown paths, then the one error handler.
app.use(notFound);
app.use(errorHandler);

export default app;
