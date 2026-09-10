export type SubmissionFormat = "text" | "code" | "diagram";
export type SubmissionStatus = "submitted" | "evaluating" | "evaluated" | "evaluated_partial" | "evaluation_failed";
export type AttemptStatus = "in_progress" | "submitted" | "reviewed";

export interface RubricCriterion {
  id: string;
  label: string;
  description: string;
  weight: number;
}

export interface RequiredElement {
  id: string;
  kind: "class" | "interface" | "relationship" | "rule";
  name: string;
  hint: string;
  keywords: string[];
}

export interface ProblemSummary {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  statement: string;
}

export interface Problem extends ProblemSummary {
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
  content: string;
  status: SubmissionStatus;
  createdAt: string;
}

export interface DeterministicFinding {
  criterionId: string;
  passed: boolean;
  message: string;
}

export interface DimensionScore {
  criterionId: string;
  score: number;
  comment: string;
}

export interface EvaluationResult {
  id: string;
  submissionId: string;
  status: SubmissionStatus;
  deterministicFindings: DeterministicFinding[];
  dimensionScores: DimensionScore[];
  overallScore: number | null;
  strengths: string[];
  improvements: string[];
  llmError: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface SubmissionWithEvaluation extends Submission {
  evaluation: EvaluationResult | null;
}

export interface AttemptWithSubmissions extends Attempt {
  problemTitle?: string;
  submissions: SubmissionWithEvaluation[];
}
