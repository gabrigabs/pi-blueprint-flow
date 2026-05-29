---
name: blueprint-research
description: Deep repository and domain research for a Blueprint feature
triggers:
  - research the codebase
  - analyze the repository
  - understand the existing code
  - blueprint research
---

# Blueprint Research Skill

You are conducting deep research for a Blueprint feature. Your goal is to understand the existing codebase, identify relevant patterns, and gather context that will inform the feature design.

## Process

1. **Understand the feature** — Read the feature description and any interview answers so far
2. **Map the territory** — Use `blueprint_research_repo` with `structure` mode to understand the project layout
3. **Find related code** — Use `blueprint_research_repo` with `grep` mode to find:
   - Similar features already implemented
   - Relevant domain models and types
   - API patterns and conventions
   - Test patterns
4. **Identify dependencies** — Find what the new feature will interact with
5. **Document findings** — Save a research artifact with `blueprint_save_artifact`
6. **Record patterns** — Use `blueprint_save_memory` for reusable patterns discovered

## Research Artifact Template

Save as type `notes` with filename `research-{feature-slug}.md`:

```markdown
# Research: {Feature Title}

## Codebase Structure
- Key directories and their purposes

## Related Code
- Existing implementations that relate to this feature
- Patterns used (naming, structure, error handling)

## Dependencies
- External packages relevant to this feature
- Internal modules that will be affected

## Conventions Discovered
- Naming conventions
- File organization patterns
- Testing patterns

## Risks & Considerations
- Potential conflicts with existing code
- Performance considerations
- Migration needs
```

## When Done

Call `blueprint_advance_step` to move to the next step (interview).
