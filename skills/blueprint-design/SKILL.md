---
name: blueprint-design
description: Generate UI mockups and design systems with A/B testing
triggers:
  - design the feature
  - create mockups
  - generate UI variants
  - A/B test designs
---

# Blueprint Design Skill

## Principles

- **Design System First** — Extract/generate tokens before mockups
- **A/B by Default** — Always 2+ variants (conservative + bold)
- **Accessible** — WCAG AA contrast, semantic HTML, keyboard nav
- **Responsive** — Mobile-first, breakpoints at 640/768/1024px
- **Code Quality** — Clean HTML/CSS, CSS custom properties

## Token Structure

```json
{
  "colors": { "primary": "#3b82f6", "background": "#0a0a0f", "surface": "#1a1a2e", "text": "#e5e7eb" },
  "spacing": { "sm": 8, "md": 16, "lg": 24, "xl": 32 },
  "typography": { "fontFamily": "system-ui, sans-serif", "fontSizeBase": 16, "lineHeight": 1.5 },
  "shadows": { "sm": "0 1px 2px rgba(0,0,0,0.2)", "md": "0 4px 12px rgba(0,0,0,0.3)" },
  "radii": { "sm": 4, "md": 8, "lg": 12 }
}
```

## Process

1. Read context (spec, research, interviews)
2. Extract/generate design tokens via `blueprint_design_save_tokens`
3. Generate 2-3 mockup variants via `blueprint_design_mockup`
4. Wait for user feedback (variant selection + inline comments)
5. Refine selected variant
6. Output: final HTML bundle + tokens as artifacts

## Mockup Guidelines

- **Variant A**: Conservative — standard layout, safe patterns, familiar UX
- **Variant B**: Bold — experimental layout, distinctive visual, creative approach
- **Variant C** (optional): Compromise between A and B

## HTML/CSS Requirements

- Use CSS custom properties (`var(--spacing)`, `var(--primary)`, etc.)
- Self-contained: no external dependencies
- Responsive: use relative units and media queries
- Accessible: proper contrast, focus states, semantic elements
- Dark theme by default (matches Blueprint UI)

## Tools Available

- `blueprint_design_mockup` — Save an HTML/CSS variant
- `blueprint_design_save_tokens` — Save design tokens
- `blueprint_save_artifact` — Save design summary
- `blueprint_read_artifact` — Read previous artifacts for context
- `blueprint_search_memory` — Check project conventions
