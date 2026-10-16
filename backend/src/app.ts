import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import pool from "./db/index.js";
import { makeHealthHandler } from "./utils/health.js";
import userRoutes from "./routes/user.routes.js";
import cookieParser from "cookie-parser";
import conversationsRoutes from "./routes/conversations.route.js";

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
app.use("/conversations", conversationsRoutes);

export default app;