# AI Usage

This entire prototype was built in collaboration with Claude (Anthropic)
in an agentic coding session — Claude proposed the domain design, wrote the
code, ran the tests, and iterated based on results. In the spirit of the
assignment's request for *meaningful* decisions rather than a changelog,
here are the ones that actually shaped the design, including where a
first AI suggestion was rejected or revised.

## 1. Composite evaluator (deterministic + LLM) instead of one-or-the-other

**Suggested:** Claude's first framing was closer to "run the LLM, ask it
for a score and feedback." **Revised to:** a two-evaluator pipeline where a
`DeterministicEvaluator` checks problem-specific required elements
synchronously, and an `LLMEvaluator` only judges the genuinely ambiguous
dimensions (responsibility separation, extensibility, trade-offs).

**Why accepted in this revised form:** the assignment's own question —
"which parts of evaluation should be deterministic, and which benefit from
an LLM" — makes the single-evaluator version an obviously incomplete
answer. Splitting it forced a real design decision (what exactly goes in
each bucket) rather than a hand-wave, and it directly improves the
product: findings appear instantly instead of waiting on an API call, and
they're reproducible where reproducibility is possible (a class name is
either present or it isn't).

## 2. `SubmissionFormatHandler` as its own interface, not baked into the evaluators

**Suggested:** initially, format-specific parsing (tokenizing text vs.
regex-extracting class names from code) was going to live directly inside
`DeterministicEvaluator` as a switch statement.

**Rejected in favor of:** a separate `SubmissionFormatHandler` interface
that normalizes any format to the same shape (`tokens`, `declaredTypes`,
`renderedText`) before either evaluator sees it.

**Why:** the assignment explicitly asks how the design would accommodate
"another submission format later." A switch statement inside the
evaluator would mean touching evaluator code (and re-testing it) every
time a format is added. Separating it means a new format is a new class
implementing one method, and neither evaluator's code changes — this was
worth the extra indirection for a one-file, low-complexity addition.

## 3. Fire-and-forget async LLM pass with a hard timeout, not a synchronous wait

**Suggested and accepted as-is:** Claude proposed making the LLM call
awaited synchronously in the submit route at first, then immediately
flagged the problem itself — a slow or hung API call would block the HTTP
response indefinitely, which conflicts with the assignment's "what should
happen if evaluation takes time or fails" question.

**Decision:** the submit route awaits only the deterministic pass, kicks
off the LLM pass in the background, and the client polls
`GET /submissions/:id`. An `AbortController` enforces a timeout on the
LLM call so a hung request can't leak forever. This was accepted directly
because it's the standard shape for this problem and the assignment
explicitly says to keep the failure-handling practical rather than
building real distributed infrastructure — a background async call with a
timeout is proportionate; a message queue would not have been.

## 4. Rejected: an LLM-generated rubric per submission

**Suggested:** having the LLM decide, per submission, what dimensions
matter and how to weight them — more "adaptive" feedback.

**Rejected because:** it would make scores incomparable across attempts at
the same problem (the whole point of the History view — seeing whether
attempt 2 improved on attempt 1 — breaks if the yardstick moves each
time), and it would blur the deterministic/LLM split from decision #1 by
letting the LLM redefine what's even being checked. The rubric is instead
fixed per problem (`Problem.rubric`), and only the *scores against it* are
judgment calls.

## 5. SQLite with repository interfaces, not an in-memory store or a full ORM

**Suggested:** Claude raised in-memory storage as the fastest path to a
working demo, and a full ORM (Prisma) as the "more production-like"
option, and asked which trade-off to take.

**Decision:** SQLite via `better-sqlite3`, accessed only through
repository interfaces (`IProblemRepository`, etc.). In-memory would lose
history on restart, which directly undermines the "learner can see
previous attempts" requirement; a full ORM added setup and generated-code
overhead disproportionate to four small tables in a 2-day prototype. The
repository interfaces were kept regardless of this choice specifically so
swapping to Postgres/Prisma later is a implementation-only change, not a
rewrite of routes or services.
