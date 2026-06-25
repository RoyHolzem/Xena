# Xena agentic UI architecture

## 1. Purpose

Xena's **Xena mode** (three-column cockpit) is an **agentic operations interface**: the human drives intent through chat (and voice); the **Xena Operator** (behind OpenClaw) decides when to call tools and APIs; the **browser** updates navigation, search results, and the detail panel only from **structured `uiActions`**, never from parsing assistant prose.

## 2. Previous behavior

- A hardcoded assistant welcome message appeared on every load.
- Telecom data for the active view was fetched on mount and the **first row** was auto-selected, so the right panel always showed a record before the user asked.
- Optional `telecom_focus` SSE lines could move selection, but there was no first-class action catalog or search-results surface.

## 3. New behavior

- **Empty chat** until the user sends a message (no seed assistant bubble).
- **Telecom preload**: all three views (incidents, events, planned-works) are eagerly loaded on shell mount so the chat context matcher has data to work with.
- **Chat-driven context matching** (`useChatContext`): the UI watches both user and assistant messages and matches them against loaded telecom records. Matching uses a 3-tier strategy:
  1. **Exact recordId** — any message containing a record ID like `INCIDENT-LUX-2026-0053`
  2. **Circuit / fiber / site codes** — messages referencing specific circuit IDs, fiber IDs, or site codes
  3. **Fuzzy scoring** — weighted token overlap on title, company, city, operator, summary, and other fields. Best match above threshold wins.
- When a record is matched:
  - **Right panel** auto-populates with the matching record's full details
  - **Active view** switches to the matching record's tab (incidents / events / planned-works)
  - **Inline ContextCard** renders below the latest assistant message (severity badge, status, timeline, key facts)
  - **Chat input placeholder** adapts to show the matched record title
- **Agentic UI actions** (`xena_ui` SSE lines) still work as the primary driver when the operator has tools — they flow through `useCockpitState` → `applyUiActions` → `telecom.focusRecord`. Chat context matching acts as a **fallback** that provides dynamic UI even without operator tool access.
- **Agent activity** bar appears when the operator emits `SET_AGENT_ACTIVITY` and clears on `CLEAR_AGENT_ACTIVITY` or `CLEAR_CONTEXT`.
- **Module dashboard** (top nav Incidents / Events / Maintenance) keeps **auto load + polling** for traditional browsing.

## 4. Agent response contract (logical vs transport)

**Logical turn result** (what the operator "returns" conceptually):

```json
{
  "answer": "Opened INCIDENT-LUX-2026-0053.",
  "uiActions": [
    { "type": "OPEN_INCIDENT", "recordId": "INCIDENT-LUX-2026-0053" }
  ]
}
```

**Transport (recommended):** keep `answer` as normal **streamed** chat tokens (OpenAI-style `choices[].delta.content` in SSE). Emit **`uiActions` only** on separate SSE `data:` lines so the UI never depends on parsing natural language:

```json
{ "type": "xena_ui", "uiActions": [ { "type": "OPEN_INCIDENT", "recordId": "INCIDENT-LUX-2026-0053" } ] }
```

If the gateway batches a single JSON object with both `answer` and `uiActions`, it may still send `answer` as streamed text and attach the same `uiActions` array in a final `xena_ui` line-the frontend does not require a duplicate `answer` field once text has streamed.

## 5. Supported `uiActions`

| Type | Fields | Effect (frontend) |
|------|--------|-------------------|
| `OPEN_INCIDENT` | `recordId` | Set view to incidents, fetch `/api/telecom?view=incidents&recordId=…`, select record |
| `OPEN_EVENT` | `recordId` | Same for events |
| `OPEN_PLANNED_WORK` | `recordId` | Same for planned works |
| `SHOW_INCIDENT` | `recordId` | MVP: same as `OPEN_*` (detail on right) |
| `SHOW_EVENT` | `recordId` | MVP: same |
| `SHOW_PLANNED_WORK` | `recordId` | MVP: same |
| `SHOW_SEARCH_RESULTS` | `entity`: `incident` \| `event` \| `planned-work`, `results[]` | Left list; each row has `recordId`, `title`, `status`, `severity`. If **exactly one** result, auto-open and clear list |
| `CLEAR_CONTEXT` | - | Clear telecom in-memory data, selection, search results, activity |
| `SET_AGENT_ACTIVITY` | `phase`, `message` (or message derived from `phase` if only one is set) | Activity bar text |
| `CLEAR_AGENT_ACTIVITY` | - | Hide activity bar |

**Legacy:** `{ "type": "telecom_focus", "view": "incidents"|"events"|"planned-works", "recordId": "…" }` is still accepted and mapped to the corresponding `OPEN_*` action.

Types live in [`lib/xena-ui-actions.ts`](../lib/xena-ui-actions.ts). Normalization and application: [`features/chat/ui-action-dispatcher.ts`](../features/chat/ui-action-dispatcher.ts).

## 6. Frontend dispatcher behavior

1. **`parseSseDataObject`** ([`features/chat/sse-parse.ts`](../features/chat/sse-parse.ts)) classifies each SSE JSON line: `xena_ui`, legacy `telecom_focus`, `action`, or token `delta`.
2. **`useChat` / `useVoice`** call `onUiActions(actions)` when a `xena_ui` bundle is received (same path for text and voice chat streams).
3. **`useCockpitState`** ([`features/chat/hooks/useCockpitState.ts`](../features/chat/hooks/useCockpitState.ts)) runs **`applyUiActions`**, which updates:
   - `telecom` via `focusRecord` / `clearOperationalContext`
   - left-panel `searchResults`
   - `agentActivity`
   - `setContextView` when needed

Invalid or unknown action objects are dropped by **`normalizeUiActions`**.

## 6.5 Chat-driven context matching

When the operator **cannot** emit structured `xena_ui` actions (e.g. no tools configured), the UI still provides a dynamic experience through **client-side context matching**.

**Hook:** [`features/chat/hooks/useChatContext.ts`](../features/chat/hooks/useChatContext.ts)
**Component:** [`features/chat/components/ContextCard.tsx`](../features/chat/components/ContextCard.tsx)

### How it works

1. All three telecom views are **preloaded** on shell mount (incidents, events, planned-works).
2. `useChatContext` watches the `messages` array (both user and assistant messages) and the `recordsByView` data.
3. On every message change, it runs a 3-tier matching algorithm:
   - **Tier 1 — Exact recordId**: message contains a known record ID → instant match
   - **Tier 2 — Circuit/fiber/site codes**: message contains a known code → instant match
   - **Tier 3 — Fuzzy scoring**: weighted token overlap across title (×10), summary (×5), company (×6), city (×4), operator (×4), and other fields. Best score above threshold (6) wins.
4. When matched, the `ChatShell`:
   - Switches the active view tab to the matching record's category
   - Calls `telecom.selectRecord()` to update the right panel
   - Passes the match to `ChatCenter`, which renders an inline `ContextCard` below the latest assistant message
   - Updates the chat input placeholder to reference the matched record

### ContextCard (inline)

The `ContextCard` renders as a glass-morphism card inside the chat message stream:

```
┌─────────────────────────────────────┐
│ Fiber Outage          SEV2  OPEN    │
│ Fiber cut affecting Luxembourg City │
│ Start    07 May 2026, 14:30         │
│ Customer POST Luxembourg            │
│ Location Luxembourg                  │
│─────────────────────────────────────│
│ Root cause    Cable damage           │
│ ETA           08 May, 08:00          │
│ Affected      12 customers          │
└─────────────────────────────────────┘
```

### Relationship to agentic UI actions

| Scenario | Driver | Mechanism |
|----------|--------|-----------|
| Operator has tools + emits `xena_ui` | Agentic actions | `useCockpitState` → `applyUiActions` → `focusRecord` |
| Operator has no tools (text-only) | Chat context matching | `useChatContext` → fuzzy match → `selectRecord` |
| Both fire (operator emits action AND chat matches) | Agentic actions take priority | `displayRecord = matchedRecord \|\| telecom.selectedRecord` |

The chat context matcher is a **progressive enhancement** — it works immediately with any operator, and gracefully defers to structured actions when available.

## 7. Operations API / tool mapping

| Intent | Browser (Next) | Operator / tools (typical) |
|--------|----------------|----------------------------|
| List / latest / by id (incidents, events, planned works) | `GET /api/telecom?view=…&recordId=` optional | Same data via server tools, or [Xena Operations API](../README.md#xena-operations-api) (`GET /incidents/latest`, etc.) |
| Customer / company / site / service search | **Not implemented** in Next routes yet | Phase 2: extend `/api/telecom` or add proxy routes; **do not** fabricate rows in the client |

The LLM should use tools to compute facts; the UI only reflects **`uiActions`** returned alongside (or after) those tool results.

## 8. Example user flows

### Agentic flows (operator with tools)

1. **"Open latest incident"** - Operator calls ops API or internal tool → streams short answer → emits `xena_ui` with `OPEN_INCIDENT` and the resolved `recordId` → right panel shows detail, left shows selected id card.
2. **"Open incident INCIDENT-LUX-2026-0053"** - Same with explicit id.
3. **"Status of company XYZ"** - Operator searches → emits `SHOW_SEARCH_RESULTS` with multiple rows → user clicks a row → client calls `focusRecord` for that id. If the operator returns a single row, the dispatcher auto-opens and clears the list.

### Chat context flows (operator without tools)

4. **"What's happening with POST Technologies?"** - User sends message → `useChatContext` scores POST Technologies against all records → matches incident/company → right panel auto-populates, inline ContextCard appears under the operator's text response.
5. **"Tell me about INCIDENT-LUX-2026-0053"** - Exact recordId match → right panel shows full detail, active view switches to incidents.
6. **"Status of fiber LUX-FB-0042"** - Circuit/fiber code match → right panel surfaces the matching record.
7. **"Any issues in Luxembourg City?"** - Fuzzy match on city field → best-scoring record appears in right panel.

## 9. OpenClaw integration notes

- Inject **one SSE `data:` line** per control payload (or batch multiple actions in one `uiActions` array).
- Use **stable Dynamo `recordId`** strings so `GET /api/telecom?...&recordId=` succeeds.
- Prefer **`xena_ui`** for all new integrations; keep `telecom_focus` only for backward compatibility.
- Drive **activity** UX with `SET_AGENT_ACTIVITY` while tools run (e.g. `{ "type": "SET_AGENT_ACTIVITY", "phase": "search", "message": "Xena is searching incidents…" }`), then `CLEAR_AGENT_ACTIVITY` or `CLEAR_CONTEXT` when done.

## 10. Server-side xena_ui injection (chat route)

The Next.js chat API route (`app/api/chat/route.ts`) automatically injects `xena_ui` SSE actions when the **operator's streamed text** contains recognized record IDs. This means:

- The **operator does not need to emit `xena_ui` JSON itself** — it just mentions the record ID in its natural language response.
- The server-side `createXenaUiInjector()` TransformStream scans each `data:` SSE line for `choices[0].delta.content` matching record ID patterns.
- When a match is found, it injects an additional `data:` line: `{ "type": "xena_ui", "uiActions": [{ "type": "OPEN_INCIDENT", "recordId": "..." }] }`.
- Each record ID is emitted at most once per request (deduped via `Set`).
- Recognized patterns: `INCIDENT-LUX-YYYY-XXXX`, `EVENT-LUX-YYYY-XXXX`, `PW-LUX-YYYY-XXXX`, `ORDER-LUX-YYYY-XXXX`.

**Example SSE stream (what the browser receives):**

```
data: {"choices":[{"delta":{"content":"The latest incident is INCIDENT-LUX-2026-0090"}}]}

data: {"type":"xena_ui","uiActions":[{"type":"OPEN_INCIDENT","recordId":"INCIDENT-LUX-2026-0090"}]}

data: {"choices":[{"delta":{"content":", a SIP call setup failure in Dudelange."}}]}

data: [DONE]
```

The frontend's `parseSseDataObject` already handles both operator-emitted and server-injected `xena_ui` lines identically.
