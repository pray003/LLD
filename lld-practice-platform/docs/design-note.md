# Design Note

## 1. MVP scope

The practice loop this prototype implements:

```
Choose a problem → Design a solution (text / code / diagram)
→ Submit → Automatic + AI feedback → Review → Try again
```

Explicitly out of scope: accounts/auth, an LMS or curriculum, a real UML
drawing surface, and any distributed job infrastructure. A learner id is a
free-text field persisted in the browser; a "diagram" is a small JSON graph
of classes and edges rather than a canvas.

## 2. User flow

1. **Problem list** — a small set of seeded problems (Parking Lot, Elevator
   System, Vending Machine), each with functional/non-functional
   requirements.
2. **Start an attempt** — creates an `Attempt` tying a learner to a problem.
   An attempt can hold multiple submissions (retries).
3. **Design + submit** — the learner picks a format (text, code, or
   diagram-as-JSON) and submits. The response comes back immediately with
   deterministic findings; a status pill shows `evaluating` while the AI
   pass runs in the background, and the UI polls until it resolves.
4. **Feedback** — a checklist of required elements the deterministic
   evaluator found or didn't, rubric-dimension scores (blended
   deterministic + AI), an overall score, and free-text strengths /
   improvements from the AI pass. If the AI pass failed, the learner sees
   exactly that and can retry it.
5. **History** — every attempt across problems, with its submission count
   and latest score, so a learner can see whether attempt 2 improved on
   attempt 1.

## 3. Domain model and key classes

```
Problem            — statement, functional/non-functional requirements,
                      RequiredElement[] (what a strong solution addresses),
                      RubricCriterion[] (what gets scored, and how much
                      each dimension is worth)

Attempt             — a learner's ongoing/finished attempt at one Problem;
                      holds a status and owns 1..N Submissions

Submission           — one snapshot of a learner's solution: a format
                      (text|code|diagram) and raw content

EvaluationResult     — the output of evaluating one Submission: pass/fail
                      findings against RequiredElements, a score per
                      RubricCriterion, an overall score, and free-text
                      strengths/improvements

SubmissionFormatHandler (interface)
  ├─ TextFormatHandler     — tokenizes free text for keyword matching
  ├─ CodeFormatHandler     — regex-extracts declared class/interface names
  └─ DiagramFormatHandler  — parses a {classes, edges} JSON graph

Evaluator (interface)
  ├─ DeterministicEvaluator — checks RequiredElements against the
  │                            normalized submission; fast, synchronous,
  │                            free, no ambiguity in its own logic
  └─ LLMEvaluator            — calls the Anthropic API with the problem,
                                rubric, and submission; judges dimensions
                                that have more than one valid answer

EvaluationService     — orchestrates the two evaluators: runs the
                        deterministic pass synchronously and persists an
                        immediate result, then runs the LLM pass
                        asynchronously and merges/upgrades the result when
                        it resolves (or falls back cleanly if it fails)

Repositories (IProblemRepository, IAttemptRepository, ISubmissionRepository,
IEvaluationRepository) — thin interfaces over SQLite; routes and services
depend on these interfaces, not on SQLite directly.
```

The two interfaces that matter most for the assignment's design questions
are `SubmissionFormatHandler` and `Evaluator` — see §5 and §6.

## 4. What a learner needs to provide for an attempt to be meaningful

Three things, regardless of format:

- **Enough surface area to judge responsibility separation** — a single
  sentence ("I'd use OOP") can't be evaluated, which is why the
  deterministic evaluator includes a structural "is this substantial
  enough" check independent of any specific required element.
- **Traceable connection to the problem's actual requirements** — feedback
  on a generic "good OOP practices" essay isn't useful; it has to be
  anchored to *this* problem's stated functional/non-functional
  requirements, which is why `RequiredElement`s and the rubric are defined
  per-problem rather than globally.
- **A format that can express structure** — text and code can both express
  classes/relationships if the learner chooses to write them out; a
  one-line diagram JSON with no edges can't. The format itself doesn't
  gate what's "meaningful" — what the learner actually puts into it does.

## 5. Evaluation approach: what's deterministic vs. what needs an LLM

This is the central design question, so the split is deliberate:

**Deterministic (`DeterministicEvaluator`):**
- Did the submission mention/declare each problem-specific required
  class, interface, relationship, or rule?
- Is there enough substance to evaluate at all?

These checks have one right answer — either a `PricingStrategy` interface
is present in some form, or it isn't — so encoding them as rules is more
reliable, faster, and cheaper than asking a model to check for them. They
also run *synchronously*, so a learner never stares at a blank spinner: the
findings checklist appears instantly.

**LLM-based (`LLMEvaluator`):**
- Whether responsibilities are actually *well* separated, not just present.
- Whether the chosen abstractions would bend or break under the stated
  non-functional requirements.
- Whether trade-offs are reasonable given the constraints — the exact
  place where two different, valid designs can both be "good," which a
  fixed rule set cannot judge without effectively hard-coding one
  reference solution.

The LLM is prompted with the problem, its rubric, its required elements
(as grounding context, explicitly framed as "not the only valid design"),
and the learner's submission, and asked to return structured JSON scores +
free-text strengths/improvements — not a redesign or a rewritten solution,
which would defeat the point of practice.

**Why not the reverse (LLM does everything, or rules do everything)?**
An LLM-only approach would be slower and non-reproducible even for checks
that have one right answer, and would risk inconsistent scoring for the
same objective fact across two submissions. A rules-only approach cannot
judge design quality at all — it can confirm a `PricingStrategy` interface
exists, not whether it's a sensible abstraction. Composing both gives fast,
consistent, free feedback on the checkable part immediately, and reserves
the model call for the part that actually needs reasoning.

## 6. Extensibility: new evaluators and new formats

Both axes are behind interfaces so the pipeline doesn't need to change
shape as new approaches are added:

- **New evaluation approach** — implement `Evaluator` (name +
  `evaluate(problem, normalizedSubmission)`), then add it to the list
  `EvaluationService` is constructed with (currently `[deterministic,
  llm]`). A per-language static-analysis linter, or a second LLM pass tuned
  to a specific rubric dimension, both fit this shape without touching
  routes, storage, or the other evaluator.
- **New submission format** — implement `SubmissionFormatHandler`
  (`normalize(content) → { tokens, declaredTypes, renderedText }`) and
  register it in `formatHandlers`. Both evaluators only ever see the
  normalized shape, so neither needs to know a new format was added. A
  future "upload a real UML image" format would slot in here (with
  `normalize` doing OCR/vision extraction instead of JSON parsing);
  nothing else changes.

## 7. What happens if evaluation is slow or fails

`Submission.status` moves through `submitted → evaluating → evaluated |
evaluated_partial`. The deterministic pass is synchronous and always
completes, so a submission is never left with *zero* feedback. The LLM
pass runs in the background with a hard timeout (`AbortController`,
default 20s); if it times out, throws (missing/invalid API key, malformed
response), or the API errors, `EvaluationService` catches it and marks the
result `evaluated_partial` with a plain-language `llmError` and the
deterministic findings intact — never an indefinite spinner or a bare
500. The learner can hit "Retry AI feedback" to re-run just the LLM pass
without resubmitting.

This intentionally stays a single in-process async call rather than a real
job queue, per the assignment's scope boundary. If load or latency grew
enough to matter, the natural next step is moving the LLM call behind a
queue (e.g. BullMQ/Redis) with a worker pool — `EvaluationService`'s
public methods (`startEvaluation`, `retryLlm`) wouldn't need to change
shape, since the HTTP layer already treats the LLM pass as fire-and-forget
and polls for the result.

## 8. Key trade-offs

- **SQLite + repository interfaces, not an ORM.** Enough persistence to
  support real attempt history across restarts, without the setup cost of
  a full ORM for four small tables. The repository interfaces mean this
  can be swapped for Postgres later by writing new implementations, not by
  changing any route or service code.
- **Diagram format is a JSON graph, not a canvas.** A real drawing surface
  is a multi-day project on its own and orthogonal to the LLD evaluation
  problem this assignment is about; a structured JSON shape gets the same
  "explicit classes and relationships" signal for the evaluator with a
  fraction of the effort.
- **Deterministic checks are keyword/declaration-based, not a real parser.**
  This is intentionally shallow — a regex for `class X`/`interface X` in
  code, and keyword matching in free text. It will have false negatives
  (a learner who names a class differently than expected) and rare false
  positives. This is acceptable because the deterministic layer is a
  coverage hint, not the sole source of truth — the LLM pass sees the raw
  submission directly and isn't limited by the same heuristics.
- **No auth.** A learner id is a plain string the browser remembers. This
  keeps the MVP focused on the practice loop rather than building account
  infrastructure the assignment doesn't ask for, at the cost of no real
  identity guarantees — acceptable for a prototype, not for production.
