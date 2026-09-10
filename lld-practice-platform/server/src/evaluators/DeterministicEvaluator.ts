import { Problem } from "../domain/types.js";
import { NormalizedSubmission } from "../formats/SubmissionFormatHandler.js";
import { Evaluator, EvaluatorOutput } from "./Evaluator.js";

/**
 * Checks things that have one right answer and don't need judgement:
 * did the learner mention/declare each required class, interface,
 * relationship, or rule for this specific problem? This is fast, free,
 * deterministic, and runs synchronously before the submission is even
 * marked "evaluating" — the learner gets partial signal instantly even if
 * the LLM call later fails or is slow.
 *
 * It deliberately does NOT try to judge design quality, naming taste, or
 * trade-offs — those are exactly the parts where more than one valid
 * design exists, which is what the LLMEvaluator is for.
 */
export class DeterministicEvaluator implements Evaluator {
  name = "deterministic";

  async evaluate(problem: Problem, submission: NormalizedSubmission): Promise<EvaluatorOutput> {
    const findings: EvaluatorOutput["findings"] = [];
    const strengths: string[] = [];
    const improvements: string[] = [];

    const haystack = new Set(submission.tokens);
    const declaredLower = submission.declaredTypes.map((t) => t.toLowerCase());

    for (const element of problem.requiredElements) {
      const foundByDeclaration = declaredLower.some((d) => d === element.name.toLowerCase());
      const foundByKeyword = element.keywords.some(
        (kw) => haystack.has(kw.toLowerCase()) || submission.renderedText.toLowerCase().includes(kw.toLowerCase())
      );
      const passed = foundByDeclaration || foundByKeyword;

      findings.push({
        criterionId: element.id,
        passed,
        message: passed
          ? `Found ${element.kind} "${element.name}" (${element.hint}).`
          : `Missing ${element.kind} "${element.name}" — ${element.hint}`,
      });

      if (passed) strengths.push(`Addressed ${element.kind} "${element.name}".`);
      else improvements.push(`Consider adding/discussing ${element.kind} "${element.name}": ${element.hint}`);
    }

    // A structural sanity check independent of any specific element: is there enough substance to evaluate?
    const substantial = submission.tokens.length >= 20;
    findings.push({
      criterionId: "structure",
      passed: substantial,
      message: substantial
        ? "Submission has enough substance to evaluate."
        : "Submission looks too short to meaningfully cover the problem — add more detail.",
    });
    if (!substantial) improvements.push("Expand the submission — it currently looks too brief to judge design quality.");

    // Deterministic-only coarse score per rubric criterion, based on the fraction of required
    // elements found. This gets overwritten/refined by the LLM's dimension scores when available.
    const passRate = findings.filter((f) => f.passed).length / Math.max(findings.length, 1);
    const dimensionScores = problem.rubric.map((criterion) => ({
      criterionId: criterion.id,
      score: passRate,
      comment: "Coarse score based on required-element coverage (deterministic pass, not yet judged by AI).",
    }));

    return { findings, dimensionScores, strengths, improvements };
  }
}
