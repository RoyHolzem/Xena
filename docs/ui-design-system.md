# Xena UI Design System

This document is the source-of-truth design contract for contributors and coding agents working on the Xena UI.

## Product story

Xena is a hybrid operations platform where human operators and AI agents work together on the company's own data, systems, and workflows.

The landing page should demonstrate that collaboration rather than describe it with generic SaaS marketing. The canonical flow is:

1. A human operator asks about an operational situation.
2. An AI agent retrieves governed company context.
3. Xena presents the relevant structured record.
4. The human directs or approves an action.
5. The agent executes against the real system and records the result.

## Do not revert the refactor

Do **not** restore:

- generic KPI dashboards with invented numbers,
- multi-section emoji feature grids,
- fake demo controls or dead marketing links,
- unverified certification or compliance claims,
- the old gradient-square text `X` logo,
- text-heavy loading screens after sign-in,
- or pre-refactor main-app panel styling.

If a requested change touches UI files, preserve the current design unless the user explicitly asks to change its direction.

## Brand system

Use these logo-derived colors as the canonical palette:

| Token | Value | Usage |
| --- | --- | --- |
| Xena red | `#e30016` | Critical accents, logo red, gradient endpoints |
| Xena blue | `#0799eb` | Primary actions, links, active UI |
| Xena ink | `#0b1d31` | Wordmark, dark surfaces, high-contrast text |

The reusable `XenaLogo` component is the source of truth for brand marks.

## Landing page contract

The landing page must remain focused, minimal, and product-led:

- Keep the overall page white, calm, and enterprise-oriented.
- Lead with human operators and AI agents working as one.
- Explain that Xena operates on the company's own data, systems, and workflows.
- Keep the dark `app.xena.lu` browser showcase as the primary visual proof.
- The showcase must include company data, an explicit human approval, agent execution, and audit context.
- Supporting content should be limited to the essential platform model and a clear path into authentication.
- Avoid invented performance metrics, generic feature-card filler, and claims that cannot be substantiated.
- Preserve responsive behavior so the showcase remains readable on phones and tablets.

## Auth and boot loading

- The unauthenticated auth-check loading state should be a circular animated loader with no text.
- The post-sign-in booting state should also be a circular animated loader with no text.
- The boot idle and error states may show controls and details so the user can start or retry the warmup sequence.

## Main app contract

The authenticated app should keep the Xena 2026 visual refresh:

- glassy rounded panels,
- subtle grid shell background,
- logo-derived red and blue accents,
- Xena logo in top navigation and assistant avatars,
- pill-shaped navigation and controls where practical,
- a clean chat center with operational side panels,
- and full-width operational modules for record management.

Refactor the legacy `features/chat/chat-shell.module.css` carefully. Component-scoped modules are the current implementation; remove obsolete duplication without deleting required loading or compatibility styles.

## Safe-edit checklist

Before committing UI changes:

1. Confirm the landing still tells the complete human → agent → company data → approval → execution story.
2. Confirm the `app.xena.lu` showcase is the primary content rather than a decorative dashboard.
3. Confirm all landing interactions perform the action their labels promise.
4. Confirm mobile navigation and the operational showcase remain usable.
5. Confirm loading and booting still use circular textless spinners.
6. Confirm the Xena red, blue, and ink palette remains intact.
7. Run lint, type checking, and a production build whenever the environment permits.
