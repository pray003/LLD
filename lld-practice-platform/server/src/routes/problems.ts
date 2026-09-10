import { Router } from "express";
import { IProblemRepository } from "../repositories/ProblemRepository.js";

export function problemsRouter(problemRepo: IProblemRepository): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const problems = problemRepo.getAll().map((p) => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      tags: p.tags,
      statement: p.statement,
    }));
    res.json(problems);
  });

  router.get("/:id", (req, res) => {
    const problem = problemRepo.getById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    res.json(problem);
  });

  return router;
}
