'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { publicConfig } from './chat-config';
import { useAuthToken, useCurrentUser, useSignOut } from '../auth/AuthWrapper';
import styles from './chat-shell.module.css';
import type {
  ActionLogEntry,
  ActionSource,
  AvatarState,
  ChatMessage,
  ConsoleEntry,
  PresenceState,
  XenaActionEvent
} from './chat-types';
import { cn, makeId } from './chat-utils';

const nowIso = () => new Date().toISOString();
const ts = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const GH_REPO = 'RoyHolzem/Xena';
const GH_BRANCH = 'experimental';
const CT_POLL_INTERVAL = 15000;

export function ChatShell() {
  const { appName, assistantName } = publicConfig;
  const assistantInitial = assistantName.charAt(0).toUpperCase();
  const getAuthToken = useAuthToken();
  const signOut = useSignOut();
  const currentUser = useCurrentUser();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: 'assistant',
      content: `Hello. I'm ${assistantName}, your AI assistant. How can I help you today?`,
      createdAt: nowIso()
    }
  ]);
  const [draft, setDraft] = useState('');
  const [presence, setPresence] = useState<PresenceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [consoleLog, setConsoleLog] = useState<ConsoleEntry[]>([
    { id: makeId(), timestamp: ts(), type: 'info', message: `${assistantName} initialized — gateway link established` }
  ]);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [ghStatus, setGhStatus] = useState<'connected' | 'checking' | 'error'>('checking');
  const [ghCommit, setGhCommit] = useState<string>('-');
  const [awsStatus, setAwsStatus] = useState<'connected' | 'checking' | 'error'>('checking');
  const seenActionIds = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const actionEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const assistantBufferRef = useRef('');

  const addLog = useCallback((type: ConsoleEntry['type'], message: string) => {
    setConsoleLog((prev) => [...prev, { id: makeId(), timestamp: ts(), type, message }]);
  }, []);

  const addAction = useCallback((entry: { id?: string; timestamp: string; verb: string; category: string; label: string; resource?: string; region?: string; detail?: string }, source: ActionSource) => {
    const id = entry.id || makeId();
    if (seenActionIds.current.has(id)) return;
    seenActionIds.current.add(id);
    const full: ActionLogEntry = { ...entry, id, source };
    setActionLog((prev) => [...prev, full]);
  }, []);

  const addXenaAction = useCallback((event: XenaActionEvent) => {
    addAction({
      timestamp: event.timestamp || ts(),
      verb: event.verb,
      category: event.category,
      label: event.label,
      resource: event.resource,
      region: event.region,
      detail: event.detail,
    }, 'xena');
    addLog('action', `[Xena] ${event.verb} ${event.category}: ${event.label}${event.region ? ` (${event.region})` : ''}`);
  }, [addAction, addLog]);

  // ── CloudTrail Polling ──
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch('/api/aws-activity?minutes=30', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (cancelled) return;
        setAwsStatus('connected');
        if (data.actions) {
          for (const a of data.actions) {
            addAction({
              timestamp: new Date(a.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              verb: a.verb,
              category: a.category,
              label: a.label,
              resource: a.resource,
              region: a.region,
              detail: a.detail,
            }, 'cloudtrail');
          }
        }
      } catch {
        if (!cancelled) setAwsStatus('error');
      }
    };
    poll();
    const interval = setInterval(poll, CT_POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, [addAction, getAuthToken]);

  // ── GitHub Status ──
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${GH_REPO}/branches/${GH_BRANCH}`, {
          headers: { Accept: 'application/vnd.github.v3+json' }
        });
        if (!res.ok) throw new Error('GitHub API error');
        const data = await res.json();
        if (!cancelled) {
          setGhStatus('connected');
          setGhCommit(data.commit?.sha?.slice(0, 7) || '-');
        }
      } catch {
        if (!cancelled) setGhStatus('error');
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [consoleLog]);
  useEffect(() => { actionEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [actionLog]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 180)}px`; }
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

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || presence === 'processing' || presence === 'typing') return;

    addLog('action', `User sent message (${content.length} chars)`);
    addLog('action', `Preparing request payload — ${messages.length} context messages`);

    const userMessage: ChatMessage = { id: makeId(), role: 'user', content, createdAt: nowIso() };
    const assistantMessageId = makeId();
    assistantBufferRef.current = '';
    setError(null);
    setDraft('');
    setPresence('processing');
    addLog('action', `Sending via server proxy → gateway`);

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantMessageId, role: 'assistant', content: '', createdAt: nowIso() }
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
          model: 'openclaw',
          stream: true,
          messages: [
            ...messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content }
          ]
        })
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || `Server error ${response.status}`);
      }

      addLog('info', `Gateway responded ${response.status} — stream open`);
      addLog('action', `Reading SSE stream...`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) { addLog('info', `Stream ended — ${chunkCount} chunks received`); break; }
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
          const line = chunk.split('\n').find((entry) => entry.startsWith('data:'));
          if (!line) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === '[DONE]') {
            addLog('done', `Stream complete — ${assistantBufferRef.current.length} chars generated`);
            setPresence('idle');
            continue;
          }

          try {
            const parsed = JSON.parse(raw);
            if (parsed.type === 'action') { addXenaAction(parsed as XenaActionEvent); continue; }
            const delta = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content;
            if (delta) {
              chunkCount++;
              if (chunkCount === 1) addLog('stream', `First token received — generating response`);
              setPresence('typing');
              assistantBufferRef.current += delta;
              const text = assistantBufferRef.current;
              setMessages((current) =>
                current.map((m) => m.id === assistantMessageId ? { ...m, content: text } : m)
              );
            }
          } catch { /* Non-JSON SSE */ }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPresence('error');
      setError(message);
      addLog('error', `Error: ${message}`);
      setMessages((current) =>
        current.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: `I encountered an error. Please try again.\n\n${message}` }
            : m
        )
      );
    }
  }, [draft, messages, presence, addLog, addXenaAction, getAuthToken]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) form.requestSubmit();
    }
  }, []);

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}>
          <div className={styles.sidebarTitle}>{appName}</div>
          <div className={styles.sidebarSub}>AI Assistant Interface</div>
        </div>

        <div className={styles.avatarSection}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatarCircle}>{assistantInitial}</div>
            <div className={cn(styles.statusRing, styles[avatarState])} />
            <div className={cn(styles.statusIndicator, styles[avatarState])} />
          </div>
          <div className={styles.avatarName}>{assistantName}</div>
          <div className={cn(styles.statusBadge, styles[avatarState])}>
            <span className={styles.badgeDot} />
            {statusLabel}
          </div>
        </div>

        <div className={styles.sessionInfo}>
          <div className={styles.sessionLabel}>Session</div>
          <div className={styles.sessionMeta}>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>User</span>
              <span className={styles.metaVal}>{currentUser?.email || '—'}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>Messages</span>
              <span className={styles.metaVal}>{messages.length}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>Status</span>
              <span className={styles.metaVal}>{statusLabel}</span>
            </div>
          </div>
        </div>

        <div className={styles.sessionInfo}>
          <div className={styles.sessionLabel}>Connections</div>
          <div className={styles.sessionMeta}>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>GitHub</span>
              <span className={cn(styles.metaVal, styles.ghStatus, styles[`gh_${ghStatus}`])}>
                <span className={styles.ghDot} />
                {ghStatus === 'connected' ? 'Connected' : ghStatus === 'checking' ? 'Checking...' : 'Error'}
              </span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>Branch</span>
              <span className={styles.metaVal}>{GH_BRANCH}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>Version</span>
              <span className={styles.metaValMono}>{ghCommit}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>AWS CloudTrail</span>
              <span className={cn(styles.metaVal, styles.ghStatus, styles[`gh_${awsStatus}`])}>
                <span className={styles.ghDot} />
                {awsStatus === 'connected' ? 'Live' : awsStatus === 'checking' ? 'Connecting...' : 'Error'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Activity Log ── */}
        <div className={styles.actionSection}>
          <div className={styles.sessionLabel}>
            Activity
            {actionLog.length > 0 && <span className={styles.actionCount}>{actionLog.length}</span>}
          </div>
          <div className={styles.actionList}>
            {actionLog.length === 0 ? (
              <div className={styles.actionEmpty}>No actions yet</div>
            ) : (
              actionLog.map((entry) => (
                <div key={entry.id} className={styles.actionEntry}>
                  <div className={styles.actionHead}>
                    <span className={cn(styles.actionVerb, styles[`verb_${entry.verb}`])}>{entry.verb}</span>
                    <span className={cn(styles.actionCat, styles[`cat_${entry.category}`])}>{entry.category}</span>
                    <span className={styles.actionTime}>{entry.timestamp}</span>
                  </div>
                  <div className={styles.actionLabel}>{entry.label}</div>
                  {entry.resource && entry.resource !== '-' && (
                    <div className={styles.actionResource}>{entry.resource}</div>
                  )}
                </div>
              ))
            )}
            <div ref={actionEndRef} />
          </div>
        </div>

        <div className={styles.sidebarFooter}>
          <button onClick={signOut} className={styles.signOutBtn}>Sign out</button>
        </div>
      </aside>

      {/* ── Main Chat ── */}
      <main className={styles.main}>
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderLeft}>
            <div className={styles.chatHeaderAvatar}>{assistantInitial}</div>
            <div className={styles.chatHeaderInfo}>
              <h2>{assistantName}</h2>
              <p>AI Assistant</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.consoleToggle} onClick={() => setConsoleOpen((v) => !v)} title={consoleOpen ? 'Hide console' : 'Show console'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              Console
              <span className={cn(styles.consoleCount, consoleLog.length > 0 && styles.active)}>{consoleLog.length}</span>
            </button>
            <div className={styles.headerStatus}>
              <span className={cn(styles.headerStatusDot, styles[avatarState])} />
              {statusLabel}
            </div>
          </div>
        </div>

        <div className={styles.mainContent}>
          <div className={cn(styles.chatArea, consoleOpen && styles.withConsole)}>
            <div className={styles.messages} role="log" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={cn(styles.message, styles[message.role])}>
                  <div className={styles.msgAvatar}>{message.role === 'user' ? 'U' : assistantInitial}</div>
                  <div className={styles.msgContent}>
                    <div className={styles.msgRole}>{message.role === 'user' ? 'You' : assistantName}</div>
                    <div className={styles.msgBubble}>
                      {message.content || (
                        <div className={styles.typing}><span /><span /><span /></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.composer}>
              <div className={styles.composerInner}>
                {error && <div className={cn(styles.errorBanner, styles.visible)}>{error}</div>}
                <form className={styles.form} onSubmit={handleSubmit}>
                  <div className={styles.inputWrap}>
                    <textarea
                      ref={textareaRef}
                      className={styles.input}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${assistantName}...`}
                      rows={1}
                    />
                    <div className={styles.inputActions}>
                      <span className={styles.inputHint}>Shift+Enter for new line</span>
                      <button className={styles.button} type="submit" disabled={!draft.trim() || presence === 'processing' || presence === 'typing'}>
                        Send
                        <span className={styles.buttonIcon}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* ── Console Panel ── */}
          {consoleOpen && (
            <div className={styles.consolePanel}>
              <div className={styles.consoleHead}>
                <div className={styles.consoleHeadLeft}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                  Console
                </div>
                <button className={styles.consoleClear} onClick={() => setConsoleLog([])}>Clear</button>
              </div>
              <div className={styles.consoleBody}>
                {consoleLog.map((entry) => (
                  <div key={entry.id} className={cn(styles.consoleRow, styles[`log_${entry.type}`])}>
                    <span className={styles.consoleTs}>{entry.timestamp}</span>
                    <span className={cn(styles.consoleIcon, styles[`icon_${entry.type}`])}>
                      {entry.type === 'info' && 'ℹ'}
                      {entry.type === 'action' && '⚙'}
                      {entry.type === 'stream' && '↗'}
                      {entry.type === 'done' && '✓'}
                      {entry.type === 'error' && '✗'}
                    </span>
                    <span className={styles.consoleMsg}>{entry.message}</span>
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
