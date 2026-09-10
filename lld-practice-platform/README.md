# LLD Practice Platform

A small end-to-end prototype for practicing Low-Level Design: choose a
problem, design a solution (text, code, or a diagram), submit it, and get
feedback that combines fast deterministic checks with AI-based judgment on
design quality. Full submission history is kept per attempt.

See `docs/research-note.md` and `docs/design-note.md` for the problem
research and the design rationale (evaluation approach, extensibility
points, trade-offs). See `AI_USAGE.md` for how AI tools were used while
building this.

## Project structure

```
server/   Express + TypeScript API, SQLite persistence, evaluators
client/   React + TypeScript + Vite frontend
docs/     Research note and design note
```

## Prerequisites

- Node.js 20+
- (Optional) an `ANTHROPIC_API_KEY` to enable AI-based feedback. Without
  one, the platform still works end-to-end — submissions get deterministic
  feedback only, with a clear "AI feedback unavailable" status and a retry
  button, rather than failing.

## Running it

**1. Install dependencies**

```bash
cd server && npm install
cd ../client && npm install
```

**2. (Optional) enable AI feedback**

```bash
cd server
export ANTHROPIC_API_KEY=sk-ant-...     # optional
```

**3. Seed the database** (also happens automatically on server start, but
can be run standalone)

```bash
cd server
npm run seed
```

**4. Run the API**

```bash
cd server
npm run dev
# Listening on http://localhost:4000
```

**5. Run the frontend** (in a second terminal)

```bash
cd client
npm run dev
# Open http://localhost:5173 — the Vite dev server proxies /api to :4000
```

## Running tests

```bash
cd server
npm test
```

Covers: deterministic-evaluator element detection across all three
submission formats, and the evaluation service's async merge/fallback
behavior (including the "LLM evaluator fails or times out" path).

## Key design decisions (short version)

- **Two evaluators, one pipeline.** A `DeterministicEvaluator` checks for
  problem-specific required classes/interfaces/rules — fast, free,
  synchronous. An `LLMEvaluator` calls the Anthropic API to judge
  responsibility separation, extensibility, and trade-offs — the parts of
  LLD that genuinely have more than one right answer. Full reasoning in
  `docs/design-note.md` §5.
- **Format and evaluator are both pluggable interfaces.** Adding a new
  submission format (e.g. an uploaded UML image) or a new evaluation
  strategy (e.g. a language-specific linter) means implementing one
  interface each, without touching routes or the other evaluator. See
  `docs/design-note.md` §6.
- **Evaluation never hangs or hard-fails.** The deterministic pass always
  completes synchronously; the AI pass has a timeout and falls back to a
  clearly-labeled partial result (with a retry button) instead of an
  indefinite spinner. See `docs/design-note.md` §7.

## Known limitations

- Deterministic element detection is keyword/declaration-based, not a real
  parser — it can miss a required element the learner named differently
  than expected. It's a coverage hint feeding into the rubric, not the
  sole judge of correctness; the LLM sees the raw submission unfiltered.
- "Diagram" submissions are a small JSON graph of classes/edges, not a
  drawn canvas.
- No authentication — a learner id is a plain string persisted in the
  browser (`localStorage`), sufficient to keep attempt history separate
  per learner but not a real identity system.
- The LLM evaluation pass is a single in-process async call with a
  timeout, not a durable job queue — acceptable at this scale per the
  assignment's scope boundary; `docs/design-note.md` §7 covers how it
  would evolve under load.
