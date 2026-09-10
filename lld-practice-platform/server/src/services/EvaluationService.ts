import { nanoid } from "nanoid";
import { DimensionScore, EvaluationResult, Problem, Submission } from "../domain/types.js";
import { formatHandlers } from "../formats/SubmissionFormatHandler.js";
import { Evaluator } from "../evaluators/Evaluator.js";
import { IEvaluationRepository } from "../repositories/EvaluationRepository.js";
import { ISubmissionRepository } from "../repositories/SubmissionRepository.js";

/**
 * Orchestrates evaluation of a submission.
 *
 * Flow:
 *  1. Run the deterministic evaluator synchronously — it's fast and free,
 *     so the caller can persist an immediate "evaluating" result with
 *     partial findings rather than a blank loading state.
 *  2. Kick off the LLM evaluator asynchronously (fire-and-forget from the
 *     HTTP handler's point of view — the route returns as soon as step 1
 *     is done). When it resolves, merge its dimension scores/strengths/
 *     improvements in and mark the submission "evaluated".
 *  3. If the LLM evaluator throws (timeout, missing API key, malformed
 *     response) the submission is marked "evaluated_partial": the learner
 *     still gets the deterministic findings and a clear note that AI
 *     feedback wasn't available, instead of an indefinite spinner or a
 *     hard failure. A retry endpoint lets them ask for the AI pass again.
 *
 * This intentionally stays in-process (no message queue, no worker
 * cluster) per the assignment's scope boundary — a single Node process
 * handling a background async call is enough for this MVP. If load or
 * evaluation latency grew, the natural next step is to move step 2 behind
 * a real job queue (e.g. BullMQ/Redis); nothing about this interface would
 * need to change, since the route already treats evaluation as
 * fire-and-forget.
 */
export class EvaluationService {
  constructor(
    private readonly deterministic: Evaluator,
    private readonly llm: Evaluator,
    private readonly evaluationRepo: IEvaluationRepository,
    private readonly submissionRepo: ISubmissionRepository
  ) {}

  /** Runs the fast deterministic pass and persists an initial result. Returns immediately. */
  async startEvaluation(problem: Problem, submission: Submission): Promise<EvaluationResult> {
    const handler = formatHandlers[submission.format];
    const normalized = handler.normalize(submission.content);

    const detOutput = await this.deterministic.evaluate(problem, normalized);

    const initial: EvaluationResult = {
      id: nanoid(),
      submissionId: submission.id,
      status: "evaluating",
      deterministicFindings: detOutput.findings,
      dimensionScores: detOutput.dimensionScores,
      overallScore: null,
      strengths: detOutput.strengths,
      improvements: detOutput.improvements,
      llmError: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this.evaluationRepo.upsert(initial);
    this.submissionRepo.updateStatus(submission.id, "evaluating");

    // Fire-and-forget: don't await this from the route handler.
    this.runLlmPass(problem, submission, normalized, initial).catch((err) => {
      // Should be unreachable (runLlmPass catches internally) — belt-and-suspenders logging.
      console.error("Unexpected error in LLM evaluation pass", err);
    });

    return initial;
  }

  /** Re-runs just the LLM pass, e.g. after a timeout/failure, without discarding deterministic findings. */
  async retryLlm(problem: Problem, submission: Submission): Promise<EvaluationResult> {
    const existing = this.evaluationRepo.getBySubmission(submission.id);
    const handler = formatHandlers[submission.format];
    const normalized = handler.normalize(submission.content);
    const base: EvaluationResult =
      existing ?? {
        id: nanoid(),
        submissionId: submission.id,
        status: "evaluating",
        deterministicFindings: [],
        dimensionScores: [],
        overallScore: null,
        strengths: [],
        improvements: [],
        llmError: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
    this.submissionRepo.updateStatus(submission.id, "evaluating");
    await this.runLlmPass(problem, submission, normalized, base);
    return this.evaluationRepo.getBySubmission(submission.id)!;
  }

  private async runLlmPass(
    problem: Problem,
    submission: Submission,
    normalized: ReturnType<(typeof formatHandlers)["text"]["normalize"]>,
    base: EvaluationResult
  ): Promise<void> {
    try {
      const llmOutput = await this.llm.evaluate(problem, normalized);

      const mergedDimensions: DimensionScore[] = problem.rubric.map((criterion) => {
        const llmScore = llmOutput.dimensionScores.find((d) => d.criterionId === criterion.id);
        return llmScore ?? base.dimensionScores.find((d) => d.criterionId === criterion.id)!;
      });
      const overallScore = Math.round(
        (mergedDimensions.reduce((sum, d, i) => sum + d.score * problem.rubric[i].weight, 0) /
          problem.rubric.reduce((s, r) => s + r.weight, 0)) *
          100
      );

      const finalResult: EvaluationResult = {
        ...base,
        status: "evaluated",
        dimensionScores: mergedDimensions,
        overallScore,
        strengths: [...new Set([...base.strengths, ...llmOutput.strengths])],
        improvements: [...new Set([...base.improvements, ...llmOutput.improvements])],
        llmError: null,
        completedAt: new Date().toISOString(),
      };
      this.evaluationRepo.upsert(finalResult);
      this.submissionRepo.updateStatus(submission.id, "evaluated");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const deterministicOnlyScore = Math.round(
        (base.dimensionScores.reduce((sum, d, i) => sum + d.score * problem.rubric[i].weight, 0) /
          Math.max(problem.rubric.reduce((s, r) => s + r.weight, 0), 1)) *
          100
      );
      const partialResult: EvaluationResult = {
        ...base,
        status: "evaluated_partial",
        overallScore: deterministicOnlyScore,
        llmError: message,
        completedAt: new Date().toISOString(),
      };
      this.evaluationRepo.upsert(partialResult);
      this.submissionRepo.updateStatus(submission.id, "evaluated_partial");
    }
  }
}
