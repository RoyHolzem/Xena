'use client';

/**
 * OpenClaw / gateway may inject SSE `data:` JSON lines alongside token deltas:
 * - UI bundle: `{ "type": "xena_ui", "uiActions": [ ... ] }` (see @/lib/xena-ui-actions and docs/xena-agentic-ui.md)
 * - Legacy focus: `{ "type": "telecom_focus", "view", "recordId" }` (mapped to OPEN_* actions)
 * - Ops-style: `{ "type": "action", ... }` (XenaActionEvent)
 */

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarState, ChatMessage, PresenceState, XenaActionEvent } from '@/lib/types';
import type { XenaUiAction } from '@/lib/xena-ui-actions';
import { makeId } from '../chat-utils';
import { parseSseDataObject, type ToolCallInfo } from '../sse-parse';
import {
  appendAssistantStream,
  createAssistantStreamBuffers,
  resetAssistantStream,
} from './assistant-stream-buffers';

const nowIso = () => new Date().toISOString();

export type ToolCallEvent = {
  id: string;
  name: string;
  arguments: string;
};

export type UseChatOptions = {
  onXenaAction?: (event: XenaActionEvent) => void;
  onUiActions?: (actions: XenaUiAction[]) => void;
  onToolCall?: (call: ToolCallEvent) => void;
  onToolResult?: (result: { id: string; name: string; content: string }) => void;
  onResponseDone?: () => void;
};

export function useChat(selectedModel: string = 'inceptionlabs/mercury-2', options?: UseChatOptions) {
  const onXenaAction = options?.onXenaAction;
  const onUiActions = options?.onUiActions;
  const onToolCall = options?.onToolCall;
  const onToolResult = options?.onToolResult;
  const onResponseDone = options?.onResponseDone;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [presence, setPresence] = useState<PresenceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Model fallback tracking
  const [modelFallback, setModelFallback] = useState<{
    requested: string;
    actual?: string;
    fellBack: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Text and voice must not share a buffer — overlapping streams previously
  // mixed deltas into one string and rewrote both assistant messages.
  const assistantBuffersRef = useRef(createAssistantStreamBuffers());
  const voiceAssistantMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  }, [draft]);

  const avatarState: AvatarState = useMemo(() => {
    if (presence === 'typing') return 'speaking';
    if (presence === 'processing') return 'thinking';
    if (presence === 'error') return 'error';
    if (isFocused || Boolean(draft.trim())) return 'listening';
    return 'idle';
  }, [draft, isFocused, presence]);

  const statusLabel = useMemo(() => {
    switch (avatarState) {
      case 'speaking': return 'Responding';
      case 'thinking': return 'Thinking';
      case 'listening': return 'Listening';
      case 'error': return 'Error';
      default: return 'Online';
    }
  }, [avatarState]);

  // ─── Voice message helpers ───

  const addVoiceUserMessage = useCallback((transcript: string) => {
    const msg: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: transcript,
      createdAt: nowIso(),
      source: 'voice',
    };
    setMessages((current) => [...current, msg]);
  }, []);

  const ensureVoiceAssistantMessage = useCallback(() => {
    if (voiceAssistantMsgIdRef.current) return;
    const id = makeId();
    voiceAssistantMsgIdRef.current = id;
    resetAssistantStream(assistantBuffersRef.current, 'voice');
    setMessages((current) => [
      ...current,
      { id, role: 'assistant', content: '', createdAt: nowIso(), source: 'voice' },
    ]);
  }, []);

  const appendVoiceAssistantDelta = useCallback((delta: string) => {
    ensureVoiceAssistantMessage();
    const text = appendAssistantStream(assistantBuffersRef.current, 'voice', delta);
    const msgId = voiceAssistantMsgIdRef.current;
    if (!msgId) return;
    setMessages((current) =>
      current.map((m) => (m.id === msgId ? { ...m, content: text } : m))
    );
  }, [ensureVoiceAssistantMessage]);

  const resetVoiceAssistant = useCallback(() => {
    voiceAssistantMsgIdRef.current = null;
    resetAssistantStream(assistantBuffersRef.current, 'voice');
  }, []);

  // ─── Text chat submit ───

  const handleSubmit = useCallback(async (
    event: FormEvent<HTMLFormElement>,
    getAuthToken: () => Promise<string | null>,
  ) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || presence === 'processing' || presence === 'typing') return;

    const userMessage: ChatMessage = { id: makeId(), role: 'user', content, createdAt: nowIso() };
    const assistantMessageId = makeId();
    resetAssistantStream(assistantBuffersRef.current, 'text');
    setError(null);
    setModelFallback(null); // Reset fallback state for new message
    setDraft('');
    setPresence('processing');

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantMessageId, role: 'assistant', content: '', createdAt: nowIso() },
    ]);

    try {
      const token = await getAuthToken();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: 'openclaw/operator',
          model_override: selectedModel,
          stream: true,
          messages: [
            ...messages
              .filter((message) => message.role === 'user' || message.role === 'assistant')
              .map((message) => ({ role: message.role, content: message.content })),
            { role: 'user', content },
          ],
        }),
      });

      // Check for model fallback from response headers
      const requestedModel = response.headers.get('x-requested-model') || selectedModel;
      const actualModel = response.headers.get('x-actual-model') || '';
      if (actualModel && actualModel !== requestedModel) {
        setModelFallback({ requested: requestedModel, actual: actualModel, fellBack: true });
        console.warn(`[chat] Model fallback: requested=${requestedModel}, actual=${actualModel}`);
      }

      if (!response.ok || !response.body) {
        const text = await response.text();
        // Try to parse error body for model info
        let errorData: any = {};
        try { errorData = JSON.parse(text); } catch { /* not JSON */ }

        // If the error includes requested_model, surface it
        const errMsg = errorData.error || text || `Server error ${response.status}`;
        const modelCtx = errorData.requested_model
          ? ` (model: ${errorData.requested_model})`
          : '';
        throw new Error(errMsg + modelCtx);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
          const line = chunk.split('\n').find((entry) => entry.startsWith('data:'));
          if (!line) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === '[DONE]') {
            console.log('[chat] SSE stream done');
            setPresence('idle');
            onResponseDone?.();
            continue;
          }

          try {
            const parsed = JSON.parse(raw);
            // Debug: log every SSE event
            const pType = (parsed as any).type;
            const delta = (parsed as any).choices?.[0]?.delta;
            const hasToolCalls = delta?.tool_calls;
            if (pType || hasToolCalls || !delta?.content) {
              console.log('[chat] SSE:', pType ? `type=${pType}` : 'no-type', hasToolCalls ? `TOOL_CALLS=${JSON.stringify(hasToolCalls)}` : '', !delta?.content ? `keys=[${Object.keys(parsed).join(',')}]` : '');
            }

            const sseLine = parseSseDataObject(parsed);
            if (sseLine.kind === 'xena_ui') {
              onUiActions?.(sseLine.actions);
              continue;
            }
            if (sseLine.kind === 'action') {
              onXenaAction?.(sseLine.event);
              continue;
            }
            if (sseLine.kind === 'tool_call') {
              for (const tc of sseLine.calls) {
                onToolCall?.({ id: tc.id || `tc-${Date.now()}`, name: tc.name, arguments: tc.arguments || '' });
              }
              continue;
            }
            if (sseLine.kind === 'tool_result') {
              onToolResult?.({ id: sseLine.id, name: sseLine.name, content: sseLine.content });
              continue;
            }
            if (sseLine.kind === 'delta') {
              setPresence('typing');
              const text = appendAssistantStream(
                assistantBuffersRef.current,
                'text',
                sseLine.text,
              );
              setMessages((current) => current.map((message) => (
                message.id === assistantMessageId ? { ...message, content: text } : message
              )));
            }
          } catch {
            // ignore non-json chunks
          }
        }
      }

      setPresence('idle');
      onResponseDone?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPresence('error');
      setError(message);
      setMessages((current) =>
        current.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: `I hit an error while contacting the gateway.\n\n${message}` }
            : msg
        )
      );
    }
  }, [draft, messages, presence, selectedModel, onXenaAction, onUiActions, onToolCall, onToolResult, onResponseDone]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.closest('form')?.requestSubmit();
    }
  }, []);

  return {
    messages,
    draft,
    setDraft,
    presence,
    error,
    isFocused,
    setIsFocused,
    avatarState,
    statusLabel,
    messagesEndRef,
    textareaRef,
    handleSubmit,
    handleKeyDown,
    addVoiceUserMessage,
    appendVoiceAssistantDelta,
    resetVoiceAssistant,
    modelFallback,
  };
}
