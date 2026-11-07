import type { Request, Response } from "express";
import { listInstructions } from "../repos/instructions.repo.js";

/** GET /api/instructions: the frontend assembles prompts itself, with no round trip per card. */
export async function showInstructions(_req: Request, res: Response) {
  res.json(await listInstructions());
}
