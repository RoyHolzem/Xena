import type { TelecomView, XenaActionEvent, XenaTelecomFocusEvent } from '@/lib/types';
import type { XenaUiAction } from '@/lib/xena-ui-actions';
import { normalizeUiActions } from './ui-action-dispatcher';

export type ToolCallInfo = {
  index: number;
  id?: string;
  name: string;
  arguments?: string;
};

export type ParsedSseLine =
  | { kind: 'xena_ui'; actions: XenaUiAction[] }
  | { kind: 'action'; event: XenaActionEvent }
  | { kind: 'delta'; text: string }
  | { kind: 'tool_call'; calls: ToolCallInfo[] }
  | { kind: 'tool_result'; id: string; name: string; content: string }
  | { kind: 'skip' };

function isTelecomView(value: unknown): value is TelecomView {
  return value === 'incidents' || value === 'events' || value === 'planned-works' || value === 'orders';
}

function telecomFocusToOpenAction(view: TelecomView, recordId: string): XenaUiAction {
  if (view === 'incidents') return { type: 'OPEN_INCIDENT', recordId };
  if (view === 'events') return { type: 'OPEN_EVENT', recordId };
  if (view === 'orders') return { type: 'OPEN_ORDER', recordId };
  return { type: 'OPEN_PLANNED_WORK', recordId };
}

/** Parse one gateway SSE JSON object (after `data: `). */
export function parseSseDataObject(parsed: unknown): ParsedSseLine {
  if (!parsed || typeof parsed !== 'object') return { kind: 'skip' };
  const o = parsed as Record<string, unknown>;

  // Structured Xena UI action bundle
  if (o.type === 'xena_ui' && Array.isArray(o.uiActions)) {
    const actions = normalizeUiActions(o.uiActions);
    if (actions.length === 0) return { kind: 'skip' };
    return { kind: 'xena_ui', actions };
  }

  // Legacy telecom focus
  if (o.type === 'telecom_focus' && typeof o.recordId === 'string' && o.recordId.trim() && isTelecomView(o.view)) {
    const actions: XenaUiAction[] = [telecomFocusToOpenAction(o.view, o.recordId.trim())];
    return { kind: 'xena_ui', actions };
  }

  // Structured action event from gateway
  if (o.type === 'action' && typeof o.verb === 'string' && typeof o.category === 'string' && typeof o.label === 'string') {
    return { kind: 'action', event: parsed as XenaActionEvent };
  }

  // Tool result event (gateway sends when a tool completes)
  if (o.type === 'tool_result' && typeof o.name === 'string' && typeof o.content === 'string') {
    return { kind: 'tool_result', id: String(o.id || ''), name: o.name, content: o.content };
  }

  // OpenAI-format streaming — check for tool_calls first
  const choice = (parsed as { choices?: Array<{ delta?: { content?: string; tool_calls?: unknown[]; role?: string }; message?: { content?: string } }> }).choices?.[0];
  if (choice) {
    // Tool call deltas
    const toolCalls = choice.delta?.tool_calls;
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      console.log('[sse] tool_calls:', JSON.stringify(toolCalls));
      const calls: ToolCallInfo[] = toolCalls.map((tc: any) => ({
        index: tc.index ?? 0,
        id: tc.id,
        name: tc.function?.name || '',
        arguments: tc.function?.arguments || '',
      }));
      return { kind: 'tool_call', calls };
    }

    // Text content delta
    const content = choice.delta?.content ?? choice.message?.content;
    if (typeof content === 'string' && content.length > 0) {
      return { kind: 'delta', text: content };
    }
  }

  // Log any unrecognized types that might be tool-related
  if (typeof o.type === 'string' && o.type !== 'xena_ui' && o.type !== 'telecom_focus') {
    console.log('[sse] unknown type:', o.type, '| keys:', Object.keys(o).join(','));
  }

  return { kind: 'skip' };
}
