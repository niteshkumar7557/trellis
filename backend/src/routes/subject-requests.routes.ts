import express from "express";
import { PostSubjectRequestBody, postSubjectRequest } from "../controllers/subject-requests.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";

const subjectRequestRoutes = express.Router();

// Signed in: the form is on /start, after sign-up. It also means a bot can't fill the
// table without an account.
subjectRequestRoutes.post("/", requireAuth, validateBody(PostSubjectRequestBody), postSubjectRequest);

export default subjectRequestRoutes;
