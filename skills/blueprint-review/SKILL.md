---
name: blueprint-review
description: Run the review gate for a Blueprint feature before completion
triggers:
  - review the feature
  - review gate
  - blueprint review
  - quality check
---

# Blueprint Review Skill

You are running the review gate for a Blueprint feature. This is the quality checkpoint before marking the feature as complete.

## Process

1. **Run the review gate** — Use `blueprint_review_gate` to check artifact completeness
2. **Verify scenarios** — Confirm each behavior scenario is covered by tests
3. **Check conventions** — Ensure code follows project conventions from memory
4. **Identify gaps** — List anything missing or incomplete
5. **Produce review artifact** — Document the review findings

## Review Checklist

### Artifacts
- [ ] Research notes exist
- [ ] Spec is complete and matches implementation
- [ ] Domain model reflects actual code structure
- [ ] Behavior scenarios are all passing
- [ ] Implementation plan was followed

### Code Quality
- [ ] No TODO/FIXME left unaddressed
- [ ] Error handling is explicit
- [ ] Types are precise (no `any` without justification)
- [ ] Tests cover happy path and error cases
- [ ] No dead code introduced

### Integration
- [ ] Existing tests still pass
- [ ] No breaking changes to public APIs (or documented if intentional)
- [ ] Performance is acceptable
- [ ] Security considerations addressed

## Review Artifact

Save as type `review` with filename `{feature-slug}.review.md`:

```markdown
# Review: {Feature Title}

## Status: {PASS | WARN | FAIL}

## Checklist Results
- [x] Item that passed
- [ ] Item that needs attention

## Issues Found
1. {Issue description} — {severity: low/medium/high}

## Recommendations
- {Suggestion for improvement}

## Decision
{Ready to ship | Needs rework on step X}
```

## If Review Fails

- Use `blueprint_reset_step` to go back to the appropriate step
- Document why in the review artifact
- The team can then re-do that step with the new information

## When Done

If review passes: call `blueprint_advance_step` to move to memory_update.
If review fails: call `blueprint_reset_step` to the step that needs rework.
