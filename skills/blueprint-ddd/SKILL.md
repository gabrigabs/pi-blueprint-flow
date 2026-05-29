---
name: blueprint-ddd
description: Domain-Driven Design modeling for a Blueprint feature
triggers:
  - domain modeling
  - ddd
  - model the domain
  - blueprint ddd
  - aggregates and entities
---

# Blueprint DDD Skill

You are performing selective Domain-Driven Design modeling for a Blueprint feature. Focus on the parts of DDD that add value — don't force every concept if it doesn't fit.

## When to Apply DDD Deeply

- Complex business logic with many rules
- Multiple actors interacting with shared state
- Event-driven workflows
- Features that will grow over time

## When to Keep It Light

- Simple CRUD operations
- UI-only changes
- Infrastructure/tooling features
- One-off scripts or migrations

## Process

1. Review the spec artifact
2. Identify the bounded context this feature lives in
3. Model the core concepts:
   - **Entities** — Objects with identity and lifecycle
   - **Value Objects** — Immutable, identity-less concepts
   - **Aggregates** — Consistency boundaries
   - **Domain Events** — Things that happen that others care about
   - **Commands** — Intentions to change state
4. Define aggregate boundaries and invariants
5. Save the domain model artifact

## Domain Model Artifact

Save as type `domain_model` with filename `{feature-slug}.domain.md`:

```markdown
# Domain Model: {Feature Title}

## Bounded Context
{Name} — {one-line description}

## Entities
### {EntityName}
- Identity: {how identified}
- State: {key fields}
- Invariants: {rules that must always hold}
- Lifecycle: {created → ... → archived}

## Value Objects
### {ValueObjectName}
- Fields: {immutable fields}
- Validation: {construction rules}

## Aggregates
### {AggregateName}
- Root: {entity}
- Contains: {entities, value objects}
- Invariants: {consistency rules}
- Commands: {what can be done}

## Domain Events
- {EventName} — emitted when {condition}

## Context Map
- Upstream: {contexts this depends on}
- Downstream: {contexts that depend on this}
```

## Guidelines

- Only model what the feature actually needs
- Prefer fewer, well-defined aggregates over many small ones
- Events should represent business facts, not technical operations
- If the feature is simple, a brief model with just entities and their relationships is fine

## When Done

Save the domain model artifact with `blueprint_save_artifact`, then call `blueprint_advance_step`.
