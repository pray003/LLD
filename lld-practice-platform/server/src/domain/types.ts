/**
 * Core domain model for the LLD Practice Platform.
 *
 * These types are the "nouns" a learner and the platform reason about.
 * Keeping them as plain data + separate behaviour (evaluators, format
 * handlers, repositories) means we can swap *how* something is stored or
 * evaluated without touching *what* it means to be a Problem or a Submission.
 */

export type SubmissionFormat = "text" | "code" | "diagram";

export type SubmissionStatus =
  | "submitted"       // received, not yet evaluated
  | "evaluating"      // evaluation in progress
  | "evaluated"       // full evaluation (deterministic + AI) completed
  | "evaluated_partial" // deterministic completed, AI evaluation failed/timed out
  | "evaluation_failed"; // both evaluators failed

export type AttemptStatus = "in_progress" | "submitted" | "reviewed";

export interface RubricCriterion {
  id: string;
  label: string;
  description: string;
  /** Weight 0-1, all criteria for a problem should sum to ~1 */
  weight: number;
}

/**
 * A "requiredElement" is something a good solution to this specific problem
 * is expected to reason about (a class, a relationship, a rule). The
 * DeterministicEvaluator checks for these mechanically; the LLMEvaluator
 * uses them as grounding context so its feedback stays anchored to the
 * problem instead of generic OOP platitudes.
 */
export interface RequiredElement {
  id: string;
  kind: "class" | "interface" | "relationship" | "rule";
  name: string;
  hint: string;
  /** keywords used by the deterministic checker to detect this element in free text/code */
  keywords: string[];
}

export interface Problem {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  statement: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  requiredElements: RequiredElement[];
  rubric: RubricCriterion[];
  createdAt: string;
}

export interface Attempt {
  id: string;
  problemId: string;
  learnerId: string;
  status: AttemptStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  attemptId: string;
  format: SubmissionFormat;
  /** Raw content: freeform text/pseudocode, code, or a serialized diagram (list of classes+edges) */
  content: string;
  status: SubmissionStatus;
  createdAt: string;
}

export interface DeterministicFinding {
  criterionId: string; // RequiredElement.id or "structure"
  passed: boolean;
  message: string;
}

export interface DimensionScore {
  criterionId: string; // RubricCriterion.id
  score: number; // 0-1
  comment: string;
}

export interface EvaluationResult {
  id: string;
  submissionId: string;
  status: SubmissionStatus;
  deterministicFindings: DeterministicFinding[];
  dimensionScores: DimensionScore[];
  overallScore: number | null; // 0-100, null while pending
  strengths: string[];
  improvements: string[];
  llmError: string | null;
  createdAt: string;
  completedAt: string | null;
}
