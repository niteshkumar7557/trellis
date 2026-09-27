import type { Request, Response } from "express";

export function makeHealthHandler(ping: () => Promise<unknown>) {
  return async (_req: Request, res: Response) => {
    try {
      await ping();
      res.sendStatus(200);
    } catch {
      res.sendStatus(503);
    }
  };
}