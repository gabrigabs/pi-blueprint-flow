---
name: blueprint-behavior-scenarios
description: Write behavior scenarios (Given/When/Then) for a Blueprint feature
triggers:
  - behavior scenarios
  - given when then
  - bdd scenarios
  - blueprint behavior
  - acceptance scenarios
---

# Blueprint Behavior Scenarios Skill

You are writing behavior scenarios for a Blueprint feature. These scenarios serve as both documentation and a testing blueprint — they define exactly what the feature should do.

## Format

Use Gherkin-style Given/When/Then:

```gherkin
Scenario: {descriptive name}
  Given {precondition}
  And {additional precondition}
  When {action}
  Then {expected outcome}
  And {additional outcome}
```

## Process

1. Review the spec and domain model artifacts
2. Identify the key behaviors to cover:
   - Happy path (main success scenario)
   - Validation failures
   - Edge cases
   - Error handling
   - Authorization/permissions
3. Write scenarios grouped by capability
4. Ensure each scenario is independent and self-contained

## Scenario Artifact

Save as type `scenario` with filename `{feature-slug}.scenarios.md`:

```markdown
# Behavior Scenarios: {Feature Title}

## {Capability Group 1}

### Scenario: Happy path — {description}
  Given {setup}
  When {action}
  Then {result}

### Scenario: Validation — {description}
  Given {setup}
  When {invalid action}
  Then {error handling}

## {Capability Group 2}
...
```

## Guidelines

- Write 5-15 scenarios per feature (more for complex features)
- Each scenario should test ONE behavior
- Use concrete examples, not abstract descriptions
- Include both positive and negative cases
- Scenarios should be readable by non-technical stakeholders
- Don't test implementation details — test behavior

## Coverage Checklist

- [ ] Main success path
- [ ] Input validation (missing, invalid, boundary values)
- [ ] Authorization (who can/cannot do this)
- [ ] Concurrency (what if two users act simultaneously)
- [ ] Error recovery (what happens when dependencies fail)
- [ ] Edge cases from interview answers

## When Done

Save the scenarios artifact with `blueprint_save_artifact`, then call `blueprint_advance_step`.
