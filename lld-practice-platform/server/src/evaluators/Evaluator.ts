import { DeterministicFinding, DimensionScore, Problem } from "../domain/types.js";
import { NormalizedSubmission } from "../formats/SubmissionFormatHandler.js";

/**
 * Two evaluators implement this interface today (deterministic + LLM), and
 * the EvaluationService composes them. A third evaluation strategy (e.g. a
 * static-analysis linter for a specific language, or a rule engine tuned
 * per-problem) just needs to implement this interface and be added to the
 * `evaluators` list the service is constructed with — no changes needed to
 * routes, storage, or the other evaluators.
 */
export interface EvaluatorOutput {
  findings: DeterministicFinding[];
  dimensionScores: DimensionScore[];
  strengths: string[];
  improvements: string[];
}

export interface Evaluator {
  name: string;
  /** Should resolve quickly and never throw for expected failure modes (timeouts, API errors) — return a rejected promise only for truly unexpected errors. */
  evaluate(problem: Problem, submission: NormalizedSubmission): Promise<EvaluatorOutput>;
}
