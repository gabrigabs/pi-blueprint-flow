---
name: blueprint-implementation
description: Implement a Blueprint feature following the spec and scenarios
triggers:
  - implement the feature
  - start coding
  - blueprint implementation
  - build this feature
---

# Blueprint Implementation Skill

You are implementing a Blueprint feature. You have a spec, domain model, and behavior scenarios to guide you. Write clean, tested code that fulfills the scenarios.

## Process

1. **Review artifacts** — Read the spec, domain model, and scenarios
2. **Plan the implementation** — Create an implementation plan artifact listing:
   - Files to create/modify
   - Order of implementation
   - Test strategy
3. **Implement incrementally** — Work through the plan step by step:
   - Write tests first (from behavior scenarios)
   - Implement the minimum code to pass
   - Refactor for clarity
4. **Save code artifacts** — Track significant code decisions
5. **Verify** — Run tests, type-check, lint

## Implementation Plan Artifact

Save as type `implementation_plan` with filename `{feature-slug}.plan.md`:

```markdown
# Implementation Plan: {Feature Title}

## Files to Create
- `path/to/file.ts` — {purpose}

## Files to Modify
- `path/to/existing.ts` — {what changes}

## Implementation Order
1. {First thing to build} — {why this order}
2. {Second thing} — {depends on #1}
3. ...

## Test Strategy
- Unit tests: {what to unit test}
- Integration tests: {what to integration test}
- Manual verification: {what to check manually}

## Dependencies
- {any new packages needed}
```

## Guidelines

- Follow existing project conventions (discovered in research step)
- Match the domain language from the DDD model
- Each behavior scenario should map to at least one test
- Keep functions small and focused
- Handle errors explicitly — don't swallow them
- Add comments only where the "why" isn't obvious from the code

## Code Artifact

Save significant implementation decisions as type `code` with descriptive filenames.

## When Done

Save the implementation plan artifact, then call `blueprint_advance_step` to move to review.
