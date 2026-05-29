---
name: blueprint-spec
description: Write a technical specification for a Blueprint feature
triggers:
  - write a spec
  - create specification
  - blueprint spec
  - technical specification
---

# Blueprint Spec Skill

You are writing a technical specification for a Blueprint feature. The spec should be precise enough to implement from, but not so detailed that it constrains good engineering decisions.

## Inputs

Before writing, review:
- Feature description
- Research artifact (from research step)
- Interview answers (from interview step)
- Project memories (relevant decisions, constraints, conventions)

## Spec Structure

Save as type `spec` with filename `{feature-slug}.spec.md`:

```markdown
# Spec: {Feature Title}

## Summary
One paragraph describing what this feature does and why.

## User Stories
- As a {role}, I want {action} so that {benefit}

## Requirements

### Functional
- [ ] Requirement 1
- [ ] Requirement 2

### Non-Functional
- Performance: ...
- Security: ...
- Accessibility: ...

## API Design
Endpoints, tool interfaces, or function signatures.

## Data Model
New or modified entities, their fields, and relationships.

## Behavior Rules
Key business rules and validation logic.

## Out of Scope
What this feature explicitly does NOT include.

## Open Questions
Anything still unresolved (should be minimal after interview).
```

## Guidelines

- Be specific about behavior, vague about implementation details
- Include acceptance criteria that can be tested
- Reference existing patterns from the research step
- Keep it under 500 lines — if longer, the feature should be split

## When Done

Save the spec artifact with `blueprint_save_artifact`, then call `blueprint_advance_step`.
