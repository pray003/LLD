import cors from "cors";
import express from "express";
import { SqliteAttemptRepository } from "./repositories/AttemptRepository.js";
import { SqliteEvaluationRepository } from "./repositories/EvaluationRepository.js";
import { SqliteProblemRepository } from "./repositories/ProblemRepository.js";
import { SqliteSubmissionRepository } from "./repositories/SubmissionRepository.js";
import { DeterministicEvaluator } from "./evaluators/DeterministicEvaluator.js";
import { LLMEvaluator } from "./evaluators/LLMEvaluator.js";
import { EvaluationService } from "./services/EvaluationService.js";
import { attemptsRouter } from "./routes/attempts.js";
import { problemsRouter } from "./routes/problems.js";
import { submissionsRouter } from "./routes/submissions.js";
import { seedProblems } from "./seedData.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const problemRepo = new SqliteProblemRepository();
const attemptRepo = new SqliteAttemptRepository();
const submissionRepo = new SqliteSubmissionRepository();
const evaluationRepo = new SqliteEvaluationRepository();

// Idempotent: ensures the demo has problems even if `npm run seed` wasn't run separately.
for (const problem of seedProblems) problemRepo.upsert(problem);

const evaluationService = new EvaluationService(
  new DeterministicEvaluator(),
  new LLMEvaluator(),
  evaluationRepo,
  submissionRepo
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/problems", problemsRouter(problemRepo));
app.use("/api/attempts", attemptsRouter(attemptRepo, problemRepo, submissionRepo, evaluationRepo));
app.use(
  "/api/submissions",
  submissionsRouter(attemptRepo, problemRepo, submissionRepo, evaluationRepo, evaluationService)
);

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`LLD Practice Platform API listening on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "ANTHROPIC_API_KEY is not set — AI feedback will fall back to deterministic-only results (status 'evaluated_partial')."
    );
  }
});
