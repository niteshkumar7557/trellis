import express from "express";
import { listSubjects, showSubjectGraph } from "../controllers/subjects.controller.js";

const subjectRoutes = express.Router();

// Public on purpose: no requireAuth. The maps are the same for everyone, and the landing
// page can show them before anyone signs up.
subjectRoutes.get("/", listSubjects);
subjectRoutes.get("/:subjectId/graph", showSubjectGraph);

export default subjectRoutes;
