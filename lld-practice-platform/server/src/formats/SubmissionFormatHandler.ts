import { Submission } from "../domain/types.js";

/**
 * A submission can arrive as free text, pseudo/real code, or a diagram
 * (we model a diagram as a small JSON graph of classes + relationships,
 * since a full drawing tool is out of scope for this MVP).
 *
 * Each format needs to be reduced to the same shape before the
 * DeterministicEvaluator can check for required elements: a flat list of
 * "tokens" (words/identifiers) plus a structured list of declared classes
 * and relationships, if the format can express them.
 *
 * Adding a new submission format later (e.g. an uploaded UML image, or a
 * live code-execution sandbox) means implementing this one interface and
 * registering it in `formatHandlers` below — nothing else in the
 * evaluation pipeline changes.
 */
export interface NormalizedSubmission {
  /** lowercased words/identifiers extracted from the submission, for keyword matching */
  tokens: string[];
  /** class/interface names the learner explicitly declared, if the format supports it */
  declaredTypes: string[];
  /** human-readable text for the LLM prompt (may be the raw content, or a rendered version of it) */
  renderedText: string;
}

export interface SubmissionFormatHandler {
  format: Submission["format"];
  normalize(content: string): NormalizedSubmission;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/i)
    .filter(Boolean);
}

export class TextFormatHandler implements SubmissionFormatHandler {
  format = "text" as const;
  normalize(content: string): NormalizedSubmission {
    return {
      tokens: tokenize(content),
      declaredTypes: [], // free text doesn't reliably declare types; deterministic check falls back to keyword search
      renderedText: content,
    };
  }
}

export class CodeFormatHandler implements SubmissionFormatHandler {
  format = "code" as const;
  normalize(content: string): NormalizedSubmission {
    // Cheap heuristic parse: look for class/interface declarations across common languages.
    const declared: string[] = [];
    const classRegex = /\b(class|interface)\s+([A-Za-z_][A-Za-z0-9_]*)/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      declared.push(match[2]);
    }
    return {
      tokens: tokenize(content),
      declaredTypes: declared,
      renderedText: content,
    };
  }
}

/** Diagram submissions are stored as JSON: { classes: [{name, methods:[]}], edges: [{from,to,type}] } */
export class DiagramFormatHandler implements SubmissionFormatHandler {
  format = "diagram" as const;
  normalize(content: string): NormalizedSubmission {
    let declared: string[] = [];
    let renderedText = content;
    try {
      const parsed = JSON.parse(content) as {
        classes?: { name: string; methods?: string[] }[];
        edges?: { from: string; to: string; type: string }[];
      };
      declared = (parsed.classes ?? []).map((c) => c.name);
      const edgeLines = (parsed.edges ?? []).map((e) => `${e.from} --${e.type}--> ${e.to}`);
      const classLines = (parsed.classes ?? []).map((c) => `${c.name}(${(c.methods ?? []).join(", ")})`);
      renderedText = [...classLines, ...edgeLines].join("\n");
    } catch {
      // Malformed diagram JSON — treat as opaque text, deterministic checks will mostly fail,
      // which is the correct signal (the learner submitted something we can't parse as a diagram).
    }
    return {
      tokens: tokenize(renderedText),
      declaredTypes: declared,
      renderedText,
    };
  }
}

export const formatHandlers: Record<Submission["format"], SubmissionFormatHandler> = {
  text: new TextFormatHandler(),
  code: new CodeFormatHandler(),
  diagram: new DiagramFormatHandler(),
};
