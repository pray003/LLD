import { Problem } from "../domain/types.js";
import { NormalizedSubmission } from "../formats/SubmissionFormatHandler.js";
import { Evaluator, EvaluatorOutput } from "./Evaluator.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 20_000);

/**
 * Judges the things that genuinely have more than one right answer:
 * whether responsibilities are well separated, whether the abstractions
 * chosen will bend or break under the stated non-functional requirements,
 * whether trade-offs are reasonable given the constraints. This is the
 * part of evaluation that benefits from reasoning rather than
 * pattern-matching, which is exactly why it's the part we hand to an LLM
 * instead of trying to encode as rules.
 *
 * Contract with the rest of the system: this evaluator either returns a
 * well-formed EvaluatorOutput, or throws. It never hangs — an
 * AbortController enforces TIMEOUT_MS so a slow/unavailable API can't
 * block a submission forever. The caller (EvaluationService) decides what
 * "throws" means for the learner (falls back to deterministic-only
 * feedback with a clear "AI evaluation unavailable" note).
 */
export class LLMEvaluator implements Evaluator {
  name = "llm";

  async evaluate(problem: Problem, submission: NormalizedSubmission): Promise<EvaluatorOutput> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const prompt = this.buildPrompt(problem, submission);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1200,
          system:
            "You are an LLD (Low-Level Design) interview coach. Respond with ONLY a single JSON object, " +
            "no prose before or after, no markdown fences. If you are unsure, still return your best-effort JSON.",
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${body.slice(0, 300)}`);
      }

      const data = (await response.json()) as { content: { type: string; text?: string }[] };
      const text = data.content
        .filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join("\n")
        .trim();

      return this.parseModelJson(text, problem);
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildPrompt(problem: Problem, submission: NormalizedSubmission): string {
    const rubricLines = problem.rubric.map((r) => `- ${r.id}: ${r.label} — ${r.description}`).join("\n");
    const elementLines = problem.requiredElements
      .map((e) => `- (${e.kind}) ${e.name}: ${e.hint}`)
      .join("\n");

    return [
      `Problem: ${problem.title}`,
      `Statement: ${problem.statement}`,
      `Functional requirements:\n${problem.functionalRequirements.map((r) => `- ${r}`).join("\n")}`,
      `Non-functional requirements:\n${problem.nonFunctionalRequirements.map((r) => `- ${r}`).join("\n")}`,
      `Elements a strong solution typically addresses (not the only valid design — use as grounding, not a checklist):\n${elementLines}`,
      `Rubric dimensions to score (0.0-1.0 each):\n${rubricLines}`,
      `Learner's submission:\n"""\n${submission.renderedText}\n"""`,
      `Task: Evaluate this LLD submission. There may be more than one valid design — judge whether THIS design's` +
        ` responsibilities, abstractions, and relationships are coherent and justified for the stated requirements,` +
        ` not whether it matches one reference solution.`,
      `Return JSON exactly in this shape:`,
      `{"dimensionScores":[{"criterionId":"<rubric id>","score":0.0,"comment":"..."}],` +
        `"strengths":["..."],"improvements":["..."]}`,
    ].join("\n\n");
  }

  private parseModelJson(text: string, problem: Problem): EvaluatorOutput {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    }
    const parsed = JSON.parse(cleaned) as {
      dimensionScores: { criterionId: string; score: number; comment: string }[];
      strengths: string[];
      improvements: string[];
    };

    // Defensive: ensure every rubric criterion got a score, even if the model omitted one.
    const byId = new Map(parsed.dimensionScores.map((d) => [d.criterionId, d]));
    const dimensionScores = problem.rubric.map((criterion) => {
      const found = byId.get(criterion.id);
      return found ?? { criterionId: criterion.id, score: 0.5, comment: "Model did not score this dimension; default applied." };
    });

    return {
      findings: [], // the LLM doesn't produce pass/fail findings; that's the deterministic evaluator's job
      dimensionScores,
      strengths: parsed.strengths ?? [],
      improvements: parsed.improvements ?? [],
    };
  }
}
