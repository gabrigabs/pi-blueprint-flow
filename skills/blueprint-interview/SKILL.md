---
name: blueprint-interview
description: Adaptive interview to gather requirements for a Blueprint feature
triggers:
  - interview the user
  - gather requirements
  - ask questions about the feature
  - blueprint interview
---

# Blueprint Interview Skill

You are conducting an adaptive interview to gather requirements for a Blueprint feature. Ask focused, purposeful questions that build understanding progressively.

## Principles

- **Adaptive** — Each question should build on previous answers
- **Purposeful** — Every question should have a clear "why" that connects to implementation
- **Concise** — Ask one thing at a time, not compound questions
- **Prioritized** — Start with high-impact questions, move to edge cases later
- **Respectful** — Don't ask what you can infer from the codebase research

## Question Types (use in this order)

1. **clarification** — Resolve ambiguity in the feature description
2. **priority** — Understand what matters most (MVP vs nice-to-have)
3. **constraint** — Identify technical or business constraints
4. **acceptance_criteria** — Define what "done" looks like
5. **edge_case** — Handle unusual scenarios
6. **technical** — Technical preferences (libraries, patterns, etc.)

## Process

1. Review the feature description and research artifact
2. Identify gaps in understanding
3. Ask 3-7 questions using `blueprint_ask_interview` (adapt based on answers)
4. After each answer, decide if follow-up is needed
5. Stop when you have enough to write a spec

## Guidelines

- Maximum 10 questions per interview session
- Mark questions as `required: true` only if you truly cannot proceed without the answer
- Always provide the `why` parameter — it helps the user understand the question's purpose
- If the user says "you decide" or "whatever works", make a reasonable choice and record it as a decision memory

## When Done

Call `blueprint_advance_step` to move to the spec step.
