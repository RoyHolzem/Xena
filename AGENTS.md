# Xena Repository Instructions

## Canonical UI design contract

Before changing UI code, read `docs/ui-design-system.md`.

The current Xena UI is the approved Human + AI operations design. Do **not** restore a generic SaaS landing page, invented KPI dashboard, emoji feature grid, or unverified compliance claims unless the user explicitly asks for them.

When editing UI files:
- Preserve the focused white landing page and its dark `app.xena.lu` operational showcase.
- Keep the core story explicit: human operator request → agent reads company data → human approval → governed action → audit trail.
- Position Xena as a hybrid operations platform where human operators and AI agents work together on the company's own data, systems, and workflows.
- Keep supporting marketing content minimal; the product interaction is the primary proof.
- Preserve the reusable `XenaLogo` component as the source of truth for brand marks.
- Preserve the Xena palette: red `#e30016`, blue `#0799eb`, and ink `#0b1d31`.
- Preserve responsive layouts for the showcase, operational context rail, navigation, and calls to action.
- Preserve the authenticated main-app glass panels and circular textless loading/boot spinners.
- If you touch `features/chat/chat-shell.module.css`, keep the Xena 2026 visual refresh behavior intact while removing duplication carefully.
