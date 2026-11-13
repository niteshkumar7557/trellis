import express from "express";
import { listSubjects, showSubjectGraph } from "../controllers/subjects.controller.js";
import { requireGraph } from "../middlewares/graph.middleware.js";

const subjectRoutes = express.Router();

// Public on purpose: no requireAuth. The maps are the same for everyone, and the landing
// page can show them before anyone signs up.
// requireGraph: these read Neo4j, so they answer 503 while it is down (graph.middleware.ts).
subjectRoutes.get("/", requireGraph, listSubjects);
subjectRoutes.get("/:subjectId/graph", requireGraph, showSubjectGraph);

export default subjectRoutes;
