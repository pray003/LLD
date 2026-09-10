# AI Usage

This prototype was built in a collaborative, agentic coding session involving
Prayanshu and Claude (Anthropic). Claude helped brainstorm ideas, draft code,
run tests, and suggest implementation patterns, while Prayanshu provided the
core product direction, evaluated trade-offs, and actively refined the design
through iteration. The final result reflects both AI-assisted acceleration and
meaningful human decision-making, rather than a one-sided AI-generated outcome.

In the spirit of the assignment's request for *meaningful* decisions rather
than a changelog, here are the design choices that shaped the project and the
ways they were refined through collaboration.

## 1. Composite evaluator (deterministic + LLM) instead of one-or-the-other

**Suggested:** Claude's first framing was closer to "run the LLM, ask it
for a score and feedback." **Refined by Prayanshu:** the system was revised
into a two-evaluator pipeline where a `DeterministicEvaluator` checks
problem-specific required elements synchronously, and an `LLMEvaluator` only
judges the genuinely ambiguous dimensions (responsibility separation,
extensibility, trade-offs).

**Why this version was accepted:** the assignment's own question — "which
parts of evaluation should be deterministic, and which benefit from an LLM" —
makes the single-evaluator version incomplete. Splitting the responsibilities
forced a real design decision about what should be objective versus
interpretive, and it improved the product: findings appear instantly instead
of waiting on an API call, and they are reproducible where reproducibility is
possible (a class name is either present or it isn't).

## 2. `SubmissionFormatHandler` as its own interface, not baked into the evaluators

**Suggested:** initially, format-specific parsing (tokenizing text vs.
regex-extracting class names from code) was going to live directly inside
`DeterministicEvaluator` as a switch statement.

**Rejected in favor of:** a separate `SubmissionFormatHandler` interface
that normalizes any format to the same shape (`tokens`, `declaredTypes`,
`renderedText`) before either evaluator sees it.

**Why:** the assignment explicitly asks how the design would accommodate
"another submission format later." A switch statement inside the evaluator
would mean touching evaluator code (and re-testing it) every time a format is
added. Separating it means a new format is a new class implementing one method,
and neither evaluator's code changes — this was worth the extra indirection for
an otherwise small prototype.

## 3. Fire-and-forget async LLM pass with a hard timeout, not a synchronous wait

**Suggested and accepted with refinement:** Claude proposed making the LLM
call awaited synchronously in the submit route at first, then immediately
pointed out the problem — a slow or hung API call would block the HTTP
response indefinitely, which conflicts with the assignment's "what should
happen if evaluation takes time or fails" question.

**Decision:** the submit route awaits only the deterministic pass, kicks off
the LLM pass in the background, and the client polls `GET /submissions/:id`.
An `AbortController` enforces a timeout on the LLM call so a hung request
can't leak forever. This was an accepted design because it kept the
implementation practical while still handling failure responsibly.

## 4. Rejected: an LLM-generated rubric per submission

**Suggested:** having the LLM decide, per submission, what dimensions matter
and how to weight them — more "adaptive" feedback.

**Rejected because:** it would make scores incomparable across attempts at the
same problem (the whole point of the History view — seeing whether attempt 2
improved on attempt 1 — breaks if the yardstick moves each time), and it would
blur the deterministic/LLM split from decision #1 by letting the LLM redefine
what's even being checked. The rubric is instead fixed per problem
(`Problem.rubric`), and only the *scores against it* are judgment calls.

## 5. SQLite with repository interfaces, not an in-memory store or a full ORM

**Suggested:** Claude raised in-memory storage as the fastest path to a
working demo, and a full ORM (Prisma) as the "more production-like"
option, and asked which trade-off to take.

**Decision:** SQLite via `better-sqlite3`, accessed only through repository
interfaces (`IProblemRepository`, etc.). In-memory would lose history on
restart, which directly undermines the "learner can see previous attempts"
requirement; a full ORM added setup and generated-code overhead disproportionate
for a small prototype. The repository interfaces were kept specifically so that
swapping to Postgres/Prisma later remains an implementation-only change rather
than a rewrite of routes or services.

Overall, the project was not built by AI alone. It was developed through an
iterative collaboration in which Claude accelerated implementation and
Prayanshu provided the critical product, design, and judgment decisions that
made the prototype coherent, usable, and authentic.
