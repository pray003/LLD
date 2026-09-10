import type {
  Attempt,
  AttemptWithSubmissions,
  EvaluationResult,
  Problem,
  ProblemSummary,
  Submission,
  SubmissionFormat,
} from "../types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listProblems: () => request<ProblemSummary[]>("/problems"),
  getProblem: (id: string) => request<Problem>(`/problems/${id}`),

  createAttempt: (problemId: string, learnerId: string) =>
    request<Attempt>("/attempts", {
      method: "POST",
      body: JSON.stringify({ problemId, learnerId }),
    }),
  getAttempt: (id: string) => request<AttemptWithSubmissions>(`/attempts/${id}`),
  listAttempts: (learnerId: string) =>
    request<AttemptWithSubmissions[]>(`/attempts?learnerId=${encodeURIComponent(learnerId)}`),

  submit: (attemptId: string, format: SubmissionFormat, content: string) =>
    request<{ submission: Submission; evaluation: EvaluationResult }>("/submissions", {
      method: "POST",
      body: JSON.stringify({ attemptId, format, content }),
    }),
  getSubmission: (id: string) =>
    request<{ submission: Submission; evaluation: EvaluationResult | null }>(`/submissions/${id}`),
  retryEvaluation: (id: string) =>
    request<{ submission: Submission; evaluation: EvaluationResult }>(`/submissions/${id}/retry-evaluation`, {
      method: "POST",
    }),
};
