# Research Note

## The learner problem

Low-Level Design (LLD) is taught mostly through exposure, not practice with
feedback. A learner reads or watches a walkthrough of "Design a Parking Lot,"
recognizes the shape of a good answer when they see it, and assumes they
could reproduce it — until an interviewer asks them to defend a design
decision live, and it turns out recognition isn't the same skill as
production.

The core difficulty is that LLD, unlike a LeetCode-style algorithm problem,
rarely has one correct answer to check against. Two solutions can both be
"correct" while differing in how responsibilities are split, which
relationships are modeled explicitly vs. implied, and which extensibility
points are anticipated. That ambiguity is exactly what makes LLD hard to
self-assess: a learner can produce *a* design and have no reliable way to
tell whether it's a *good* one, short of getting a human reviewer.

## Existing approaches

A short survey of what's already out there:

- **Curated problem/solution repositories** (e.g. the widely-used
  `awesome-low-level-design` GitHub repo) give learners a large bank of
  problems with reference solutions and notes on diagrams and design
  patterns, covering OOP fundamentals, design patterns, UML, and concurrency
  — but the learner reads a reference solution rather than getting feedback
  on their own.
- **Structured courses/question banks** (e.g. AlgoMaster's LLD resource)
  organize problems by language and topic and add progress tracking, but
  progress tracking here means "did you view this problem," not "is your
  solution good" — filtering and language-based views are navigational,
  not evaluative.
- **Diagramming-first tools** (e.g. LLDCanvas) focus on giving learners a
  proper UML editor plus a library of design patterns and timed practice
  mode, which addresses the *tooling* gap (learners often don't have a good
  way to draw a class diagram) but still doesn't tell them if the diagram
  they drew reflects sound design.
- **Machine-coding practice sites** (e.g. CodeZym) frame LLD as writing
  runnable code against a spec, sometimes across a multi-day roadmap
  covering common patterns like Strategy, Observer, Factory, and Singleton.
  These get closer to "practice with a real artifact" but the evaluation
  end is typically either absent or limited to whether the code compiles
  and passes a few example calls — not whether the *design* is good.
- **Community/blog write-ups** repeatedly converge on the same advice:
  practice a small set of canonical problems (Parking Lot, Elevator,
  Vending Machine, TicTacToe, Splitwise), produce class diagrams, and
  defend design decisions out loud. The advice is consistent; the tooling
  to practice that specific loop with feedback is not.

## Key gaps

1. **No feedback loop.** Every resource above is either a content library
   (read this) or an editor (draw/write this). None of them close the loop
   back to the learner with an assessment of *their* specific submission.
2. **No handling of design ambiguity.** Anything that does check a
   submission tends to check for a specific reference implementation, which
   breaks down the moment a learner takes a legitimately different but
   valid approach (e.g. Strategy vs. a simpler polymorphic hierarchy for
   pricing).
3. **No sense of progress over multiple attempts.** Practice implies
   repetition — attempting a problem, getting feedback, and trying again
   with that feedback in mind. Content libraries have no concept of "your
   second attempt at Parking Lot" as distinct from your first.
4. **Format lock-in.** Some tools assume the learner will produce a
   diagram; others assume code. Real interview practice happens in mixed
   forms (talk through it, sketch it, sometimes write skeleton code), and a
   tool that only accepts one format doesn't match how LLD is actually
   practiced or assessed in an interview.

## Product direction

Build a small, focused practice loop rather than a content library or a
diagramming tool: **choose a problem → design a solution in whatever form
fits → submit it → get feedback that separates "did you cover the known
requirements" from "is your design actually good" → see how this attempt
compares to your last one.**

Two design decisions follow directly from the gaps above:

- **Feedback has to combine deterministic checks with judgment-based
  review**, because some things about an LLD solution are checkable
  mechanically (did you define a pricing abstraction at all?) while others
  need reasoning about trade-offs (is this abstraction actually well
  justified for the stated requirements?). Evaluation approach and
  reasoning are detailed in the Design Note.
- **The submission format should be a pluggable detail, not a foundational
  assumption**, so the same evaluation pipeline can accept text, code, or a
  diagram without three separate products.
