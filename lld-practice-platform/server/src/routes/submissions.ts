import { Router } from "express";
import { nanoid } from "nanoid";
import { IAttemptRepository } from "../repositories/AttemptRepository.js";
import { IProblemRepository } from "../repositories/ProblemRepository.js";
import { ISubmissionRepository } from "../repositories/SubmissionRepository.js";
import { IEvaluationRepository } from "../repositories/EvaluationRepository.js";
import { EvaluationService } from "../services/EvaluationService.js";

export function submissionsRouter(
  attemptRepo: IAttemptRepository,
  problemRepo: IProblemRepository,
  submissionRepo: ISubmissionRepository,
  evaluationRepo: IEvaluationRepository,
  evaluationService: EvaluationService
): Router {
  const router = Router();

  // Submit a solution for an attempt. Returns immediately with deterministic
  // findings; the LLM pass continues in the background (poll GET /:id for updates).
  router.post("/", async (req, res) => {
    const { attemptId, format, content } = req.body as {
      attemptId?: string;
      format?: "text" | "code" | "diagram";
      content?: string;
    };
    if (!attemptId || !format || !content) {
      return res.status(400).json({ error: "attemptId, format, and content are required" });
    }
    if (!["text", "code", "diagram"].includes(format)) {
      return res.status(400).json({ error: "format must be one of: text, code, diagram" });
    }

    const attempt = attemptRepo.getById(attemptId);
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });
    const problem = problemRepo.getById(attempt.problemId);
    if (!problem) return res.status(404).json({ error: "Problem for this attempt no longer exists" });

    const submission = {
      id: nanoid(),
      attemptId,
      format,
      content,
      status: "submitted" as const,
      createdAt: new Date().toISOString(),
    };
    submissionRepo.create(submission);
    attemptRepo.updateStatus(attemptId, "submitted");

    const evaluation = await evaluationService.startEvaluation(problem, submission);
    res.status(201).json({ submission, evaluation });
  });

  router.get("/:id", (req, res) => {
    const submission = submissionRepo.getById(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    const evaluation = evaluationRepo.getBySubmission(submission.id);
    res.json({ submission, evaluation });
  });

  // Retry just the AI pass (e.g. after a timeout/failure), without re-submitting content.
  router.post("/:id/retry-evaluation", async (req, res) => {
    const submission = submissionRepo.getById(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    const attempt = attemptRepo.getById(submission.attemptId);
    const problem = attempt ? problemRepo.getById(attempt.problemId) : null;
    if (!attempt || !problem) return res.status(404).json({ error: "Related attempt/problem not found" });

    const evaluation = await evaluationService.retryLlm(problem, submission);
    res.json({ submission, evaluation });
  });

  return router;
}
