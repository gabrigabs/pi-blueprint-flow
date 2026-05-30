---
name: blueprint-coding-discipline
description: Enforces disciplined coding practices — think before coding, simplicity first, surgical changes, goal-driven execution, and verification discipline
triggers:
  - coding discipline
  - think before coding
  - surgical changes
  - simplicity first
  - verification discipline
  - blueprint discipline
---

# Blueprint Coding Discipline Skill

You are operating under strict coding discipline. Every change must be intentional, minimal, and verified. This skill enforces five core principles that prevent overengineering, scope creep, and unverified changes.

## Principle 1: Think Before Coding

Before altering any code:

- Declare your assumptions explicitly
- Identify ambiguities in the requirements
- Ask when there is uncertain business logic — do not guess
- State a short plan (3-5 bullet points) before implementing
- If the task is unclear, clarify before writing a single line

### Checklist

- [ ] Assumptions declared
- [ ] Ambiguities identified and resolved
- [ ] Plan stated before implementation

## Principle 2: Simplicity First

Avoid:

- Overengineering for hypothetical future requirements
- Premature abstractions (no interface/base class until the second use case)
- Speculative generalization (YAGNI)
- Large changes when a small one suffices
- Adding configuration for things that have one value

Prefer:

- Inline code over indirection until repetition proves the need
- Concrete implementations over abstract frameworks
- Fewer files over many small ones when cohesion is high
- Direct solutions over clever ones

### Checklist

- [ ] Solution is the simplest that satisfies requirements
- [ ] No premature abstractions introduced
- [ ] No speculative generalization

## Principle 3: Surgical Changes

Rules:

- Alter only files directly required by the task
- Do not refactor adjacent code without explicit request
- Every file touched must have a stated reason
- Do not change behavior unrelated to the task
- If a refactor is needed to proceed, state it and get approval first

### Checklist

- [ ] Only necessary files modified
- [ ] No drive-by refactoring
- [ ] Each change has a stated reason

## Principle 4: Goal-Driven Execution

Every task must have:

- A clear objective (what does "done" look like?)
- Acceptance criteria (how do we verify success?)
- Scope boundaries (what is explicitly out of scope?)
- Expected output (what artifacts or changes result?)

If any of these are missing, ask before proceeding.

### Checklist

- [ ] Objective is clear
- [ ] Acceptance criteria defined
- [ ] Scope boundaries stated
- [ ] Expected output identified

## Principle 5: Verification Discipline

Before declaring a task complete:

- State how you validated the change (build, test, lint, manual check)
- If you ran tests, report the result
- If you could not run validation, explain why
- List any remaining risks or known limitations
- Never claim "done" without verification or explicit justification

### Checklist

- [ ] Validation method stated
- [ ] Tests run or reason given for skipping
- [ ] Remaining risks listed
- [ ] No silent assumptions about correctness

## When to Apply

This skill applies to ALL implementation work within Blueprint Flow. It is automatically evaluated during the review gate step.

The review gate will score each principle (0.0 to 1.0) and flag violations. Low scores trigger recommendations for rework.

## Integration with Review Gate

The review gate includes a "Coding Discipline Gate" section that evaluates:

```
assumptionsScore    — Were assumptions declared?
simplicityScore     — Is the solution appropriately simple?
surgicalChangeScore — Were changes minimal and targeted?
verificationScore   — Was the work verified?
overallDisciplineScore — Weighted average
```

A score below 0.6 on any dimension triggers a warning. Below 0.4 triggers a recommendation to reset to the relevant step.
