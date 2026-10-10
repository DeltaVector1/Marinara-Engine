---
name: "Marinara Engine"
description: "A focused personal chat and roleplay workspace."
colors:
  background: "var(--background)"
  surface: "var(--card)"
  text: "var(--foreground)"
  muted: "var(--muted-foreground)"
  accent: "var(--primary)"
  accent-foreground: "var(--primary-foreground)"
  border: "var(--border)"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  control: "6px"
  panel: "8px"
spacing:
  compact: "8px"
  standard: "16px"
---

# Design System: Marinara Engine

## Direction

Build a compact, reading-first workspace for personal Conversation and Roleplay chats. Keep the transcript and composer visually dominant. Use the existing theme tokens and one restrained accent at a time. Keep surfaces opaque or near-opaque so text remains clear.

Avoid marketing layouts, glowing panels, decorative gradients, and grids of nested cards. Use color to show focus, selection, and action. Keep character art inside the chat or library where it supports the task.

## Implementation plan

- [x] Prune retired features while preserving saved data and stable Conversation and Roleplay flows.
- [x] Keep the transcript central with opaque surfaces, one restrained accent, and labeled actions.
- [x] Check phone-width layout and keyboard access in the UI smoke suite.

## Layout and controls

- Keep frequent chat actions close to the transcript and composer.
- Group related tools in clearly labelled panels. Do not make essential actions depend on hover.
- Show advanced options in focused sections that users can open when needed.
- Use consistent spacing and compact controls without clipping labels or touch targets.

## Reading and accessibility

- Give long messages a stable, high-contrast surface. Avoid blur behind text.
- Keep line lengths comfortable and preserve visible message hierarchy.
- Label icon-only controls for assistive technology. Preserve keyboard focus and operation.
- At narrow widths, keep the transcript readable and keep the composer and key actions within reach.
- Do not use color alone to communicate status, warnings, selection, or errors.
