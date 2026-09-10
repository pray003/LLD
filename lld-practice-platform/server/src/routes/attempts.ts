import { Router } from "express";
import { nanoid } from "nanoid";
import { IAttemptRepository } from "../repositories/AttemptRepository.js";
import { IProblemRepository } from "../repositories/ProblemRepository.js";
import { ISubmissionRepository } from "../repositories/SubmissionRepository.js";
import { IEvaluationRepository } from "../repositories/EvaluationRepository.js";

export function attemptsRouter(
  attemptRepo: IAttemptRepository,
  problemRepo: IProblemRepository,
  submissionRepo: ISubmissionRepository,
  evaluationRepo: IEvaluationRepository
): Router {
  const router = Router();

  // Start a new attempt at a problem.
  router.post("/", (req, res) => {
    const { problemId, learnerId } = req.body as { problemId?: string; learnerId?: string };
    if (!problemId || !learnerId) return res.status(400).json({ error: "problemId and learnerId are required" });

    const problem = problemRepo.getById(problemId);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const now = new Date().toISOString();
    const attempt = {
      id: nanoid(),
      problemId,
      learnerId,
      status: "in_progress" as const,
      createdAt: now,
      updatedAt: now,
    };
    attemptRepo.create(attempt);
    res.status(201).json(attempt);
  });

  // History: all attempts for a learner, each with its submissions + evaluation summary.
  router.get("/", (req, res) => {
    const learnerId = req.query.learnerId as string | undefined;
    if (!learnerId) return res.status(400).json({ error: "learnerId query param is required" });

    const attempts = attemptRepo.getByLearner(learnerId);
    const withDetail = attempts.map((attempt) => {
      const submissions = submissionRepo.getByAttempt(attempt.id).map((s) => ({
        ...s,
        evaluation: evaluationRepo.getBySubmission(s.id),
      }));
      const problem = problemRepo.getById(attempt.problemId);
      return { ...attempt, problemTitle: problem?.title ?? "Unknown problem", submissions };
    });
    res.json(withDetail);
  });

  router.get("/:id", (req, res) => {
    const attempt = attemptRepo.getById(req.params.id);
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });
    const submissions = submissionRepo.getByAttempt(attempt.id).map((s) => ({
      ...s,
      evaluation: evaluationRepo.getBySubmission(s.id),
    }));
    res.json({ ...attempt, submissions });
  });

  return router;
}
