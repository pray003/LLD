import { describe, expect, it, vi } from "vitest";
import { EvaluationService } from "../src/services/EvaluationService.js";
import { DeterministicEvaluator } from "../src/evaluators/DeterministicEvaluator.js";
import { Evaluator } from "../src/evaluators/Evaluator.js";
import { IEvaluationRepository } from "../src/repositories/EvaluationRepository.js";
import { ISubmissionRepository } from "../src/repositories/SubmissionRepository.js";
import { EvaluationResult, Submission } from "../src/domain/types.js";
import { seedProblems } from "../src/seedData.js";

const problem = seedProblems.find((p) => p.id === "vending-machine")!;

// In-memory fakes so these tests don't touch SQLite at all — pure domain-level testing.
class FakeEvaluationRepo implements IEvaluationRepository {
  store = new Map<string, EvaluationResult>();
  upsert(result: EvaluationResult): void {
    this.store.set(result.submissionId, result);
  }
  getBySubmission(submissionId: string): EvaluationResult | null {
    return this.store.get(submissionId) ?? null;
  }
}

class FakeSubmissionRepo implements ISubmissionRepository {
  statuses = new Map<string, string>();
  create(): void {}
  getById(): Submission | null {
    return null;
  }
  getByAttempt(): Submission[] {
    return [];
  }
  updateStatus(id: string, status: string): void {
    this.statuses.set(id, status);
  }
}

function makeSubmission(content: string): Submission {
  return {
    id: "sub-1",
    attemptId: "attempt-1",
    format: "text",
    content,
    status: "submitted",
    createdAt: new Date().toISOString(),
  };
}

describe("EvaluationService", () => {
  it("falls back to deterministic-only ('evaluated_partial') when the LLM evaluator throws", async () => {
    const evalRepo = new FakeEvaluationRepo();
    const subRepo = new FakeSubmissionRepo();
    const failingLlm: Evaluator = {
      name: "llm",
      evaluate: vi.fn().mockRejectedValue(new Error("ANTHROPIC_API_KEY not configured")),
    };

    const service = new EvaluationService(new DeterministicEvaluator(), failingLlm, evalRepo, subRepo);
    const submission = makeSubmission("A vending machine with an Inventory class and VendingMachineState.");

    await service.startEvaluation(problem, submission);
    // give the fire-and-forget LLM pass a tick to run and fail
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = evalRepo.getBySubmission(submission.id);
    expect(result?.status).toBe("evaluated_partial");
    expect(result?.llmError).toContain("ANTHROPIC_API_KEY");
    expect(result?.overallScore).not.toBeNull();
    expect(subRepo.statuses.get(submission.id)).toBe("evaluated_partial");
  });

  it("merges LLM dimension scores and marks status 'evaluated' when the LLM evaluator succeeds", async () => {
    const evalRepo = new FakeEvaluationRepo();
    const subRepo = new FakeSubmissionRepo();
    const succeedingLlm: Evaluator = {
      name: "llm",
      evaluate: vi.fn().mockResolvedValue({
        findings: [],
        dimensionScores: problem.rubric.map((r) => ({ criterionId: r.id, score: 0.8, comment: "Solid design." })),
        strengths: ["Clear state separation."],
        improvements: ["Consider a refund edge case."],
      }),
    };

    const service = new EvaluationService(new DeterministicEvaluator(), succeedingLlm, evalRepo, subRepo);
    const submission = makeSubmission("A vending machine with Inventory, VendingMachineState, and PaymentStrategy.");

    await service.startEvaluation(problem, submission);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = evalRepo.getBySubmission(submission.id);
    expect(result?.status).toBe("evaluated");
    expect(result?.llmError).toBeNull();
    expect(result?.dimensionScores.every((d) => d.score === 0.8)).toBe(true);
    expect(result?.overallScore).toBe(80);
    expect(subRepo.statuses.get(submission.id)).toBe("evaluated");
  });

  it("persists an immediate 'evaluating' result from startEvaluation before the LLM pass resolves", async () => {
    const evalRepo = new FakeEvaluationRepo();
    const subRepo = new FakeSubmissionRepo();
    let resolveLlm: (() => void) | undefined;
    const slowLlm: Evaluator = {
      name: "llm",
      evaluate: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLlm = () =>
              resolve({ findings: [], dimensionScores: [], strengths: [], improvements: [] });
          })
      ),
    };

    const service = new EvaluationService(new DeterministicEvaluator(), slowLlm, evalRepo, subRepo);
    const submission = makeSubmission("A basic vending machine.");

    const initial = await service.startEvaluation(problem, submission);
    expect(initial.status).toBe("evaluating");
    expect(subRepo.statuses.get(submission.id)).toBe("evaluating");

    resolveLlm?.();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(evalRepo.getBySubmission(submission.id)?.status).toBe("evaluated");
  });
});
