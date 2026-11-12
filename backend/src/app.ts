import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import pool from "./db/index.js";
import { makeHealthHandler } from "./utils/health.js";
import userRoutes from "./routes/user.routes.js";
import subjectRoutes from "./routes/subjects.routes.js";
import topicRoutes from "./routes/topics.routes.js";
import instructionRoutes from "./routes/instructions.routes.js";
import cookieParser from "cookie-parser";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.client_url,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", makeHealthHandler(() => pool.query("SELECT 1")));

app.use("/user", userRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/instructions", instructionRoutes);

// Last, after every route: the 404 for unknown paths, then the one error handler.
app.use(notFound);
app.use(errorHandler);

export default app;