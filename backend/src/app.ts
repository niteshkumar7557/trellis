import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import pool from "./db/index.js";
import { makeHealthHandler } from "./lib/health.js";
import apiRoutes from "./routes/api.routes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.client_url,
    credentials: true,
  }),
);

app.use(express.json());

app.get("/health", makeHealthHandler(() => pool.query("SELECT 1")));

// app.use("/user", userRoutes);
app.use("/api", apiRoutes);

export default app;