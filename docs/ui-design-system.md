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
- opaque or decorative-only loading screens after sign-in,
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
- Keep the landing experience inside the viewport with persistent, visible navigation. Its four menu-switched views are Overview, Live workflow, Architecture, and Trust model; do not replace them with a long stack of scrolling sections.
- Lead with human operators and AI agents working as one.
- Explain that Xena operates on the company's own data, systems, and workflows.
- Keep the dark `app.xena.lu` browser showcase as the primary visual proof.
- The showcase must include company data, an explicit human approval, agent execution, and audit context.
- Supporting content should be limited to the essential platform model and a clear path into authentication.
- Avoid invented performance metrics, generic feature-card filler, and claims that cannot be substantiated.
- Preserve responsive behavior so the showcase remains readable on phones and tablets.
- Use Instrument Sans for expressive product typography and JetBrains Mono for technical labels and live-system metadata.

## Architecture presentation

- Present the Xena application and data plane accurately as managed and serverless; describe OpenClaw as a separate, replaceable gateway island rather than pretending the Lightsail component is serverless.
- Explain that agent context is transient while operational records remain in managed, access-controlled stores. Do not claim that all data at rest is absent.
- Describe AWS Secrets Manager as encrypted secret storage, not hashing. Hashes cannot supply recoverable runtime credentials.
- Preserve the selectable Delivery, Live runtime, Agent island, and Voice loop layers, animated packet flow, component detail panel, and dedicated compact mobile representation.
- Never claim certifications or compliance outcomes that are not substantiated. Explain the architectural controls and reduced finding surface instead.

## Auth and boot loading

- The unauthenticated auth-check may remain a minimal loader because it is normally brief.
- `Start Agent` is a deliberate ignition step that warms the serverless runtime, secured gateway, agent, and operational data connection.
- During boot, show the real startup stages from `useBootSequence`, elapsed time, completed-stage timings, and the currently active handshake.
- Do not fabricate determinate progress or hide a long cold start behind a decorative spinner.
- Use restrained motion only on the active startup stage. Stop motion on completion or failure.
- Preserve a visible retry path and the completed/failed stage details when startup fails.

## Main app contract

The authenticated app is a fixed-viewport **Agent Workbench**:

- Keep the written XENA brand and persistent header navigation visible across Operate, Incidents, Events, Maintenance, and Orders.
- Use a restrained dark control-plane shell, subtle static grid, flat technical surfaces, Xena blue for active state, and Xena red only for critical state.
- Keep conversation and operational artifacts in the same workspace; focusing an inline artifact must not eject the operator from chat.
- Present current structured tool/action state in the compact run strip. Do not mix delayed CloudWatch telemetry or prose-inferred records into the verified live trace.
- Render records, search results, approvals, and receipts as typed artifacts with stable dimensions and clear provenance.
- Hydrate artifacts in place and animate only state or spatial continuity. Avoid idle pulsing, perpetual scanning, bouncing decoration, and large motion.
- Operational modules remain available through the header and use the same density, typography, card geometry, and motion tokens.
- Put model, GitHub, runtime, and theme details in the System panel rather than competing with primary navigation.

Refactor the legacy `features/chat/chat-shell.module.css` carefully. Component-scoped modules are the current implementation; remove obsolete duplication without deleting required loading or compatibility styles.

## Safe-edit checklist

Before committing UI changes:

1. Confirm the landing still tells the complete human → agent → company data → approval → execution story.
2. Confirm the `app.xena.lu` showcase is the primary content rather than a decorative dashboard.
3. Confirm all landing interactions perform the action their labels promise.
4. Confirm mobile navigation and the operational showcase remain usable.
5. Confirm the Start Agent ignition reports truthful cold-start stages, timings, and failures.
6. Confirm the Xena red, blue, and ink palette remains intact.
7. Confirm keyboard focus and reduced-motion behavior across navigation, composer, artifacts, and expandable sections.
8. Run lint, type checking, and a production build whenever the environment permits.
