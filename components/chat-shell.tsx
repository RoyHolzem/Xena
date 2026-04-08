'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
import styles from './chat-shell.module.css';
import type { ChatMessage, PresenceState } from '@/lib/types';
import { makeId } from '@/lib/utils';
import { publicConfig } from '@/lib/config';

type Props = {
  appName: string;
  assistantName: string;
};

const nowIso = () => new Date().toISOString();

export function ChatShell({ appName, assistantName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: 'assistant',
      content: `Hey — ${assistantName} here. Drop a message and I’ll answer through the OpenClaw gateway.`,
      createdAt: nowIso()
    }
  ]);
  const [draft, setDraft] = useState('');
  const [presence, setPresence] = useState<PresenceState>('idle');
  const [statusText, setStatusText] = useState(`${assistantName} is idle`);
  const [error, setError] = useState<string | null>(null);
  const assistantBufferRef = useRef('');

  const label = useMemo(() => {
    if (presence === 'processing') return `${assistantName} is processing`;
    if (presence === 'typing') return `${assistantName} is typing`;
    if (presence === 'error') return 'Connection issue';
    return `${assistantName} is idle`;
  }, [assistantName, presence]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: 'user',
      content,
      createdAt: nowIso()
    };

    const assistantMessageId = makeId();
    assistantBufferRef.current = '';
    setError(null);
    setDraft('');
    setPresence('processing');
    setStatusText(`${assistantName} is processing`);
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantMessageId, role: 'assistant', content: '', createdAt: nowIso() }
    ]);

    try {
      const response = await fetch(`${publicConfig.gatewayUrl}${publicConfig.chatPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicConfig.gatewayToken}`
        },
        body: JSON.stringify({
          model: 'openclaw',
          stream: true,
          messages: [
            ...messages
              .filter((message) => message.role === 'user' || message.role === 'assistant')
              .map((message) => ({ role: message.role, content: message.content })),
            { role: 'user', content }
          ]
        })
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || 'Failed to connect to gateway');
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
          if (!raw) continue;
          if (raw === '[DONE]') {
            setPresence('idle');
            setStatusText(`${assistantName} is idle`);
            continue;
          }

          const json = JSON.parse(raw) as {
            choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
          };

          const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content;
          if (delta) {
            setPresence('typing');
            setStatusText(`${assistantName} is typing`);
            assistantBufferRef.current += delta;
            const text = assistantBufferRef.current;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId ? { ...message, content: text } : message
              )
            );
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setPresence('error');
      setStatusText('Connection issue');
      setError(message);
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessageId
            ? { ...item, content: `Sorry — the gateway request failed.\n\n${message}` }
            : item
        )
      );
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <div className={styles.eyebrow}>OpenClaw Gateway UI</div>
            <div className={styles.title}>{appName}</div>
            <div className={styles.copy}>
              A custom standalone chat surface for Xena — not the dashboard. Dark glass, cyan glow, matrix energy.
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.statusRow}>
              <div>
                <div className={styles.eyebrow}>Presence</div>
                <div style={{ marginTop: 8, fontWeight: 600 }}>{statusText}</div>
              </div>
              <div className={styles.statusBadge}>
                <span className={`${styles.dot} ${styles[presence] || ''}`} />
                {label.replace(`${assistantName} is `, '')}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.eyebrow}>Deploy model</div>
            <div className={styles.metaList}>
              <div>• Next.js app router</div>
              <div>• Amplify Hosting</div>
              <div>• Direct browser → gateway path</div>
              <div>• Streaming responses + presence</div>
            </div>
          </div>
        </aside>

        <section className={styles.main}>
          <div className={styles.topbar}>
            <div>
              <div className={styles.topTitle}>{assistantName}</div>
              <div className={styles.topSub}>Connected through OpenClaw Gateway</div>
            </div>
            <div className={styles.statusBadge}>
              <span className={`${styles.dot} ${styles[presence] || ''}`} />
              {statusText}
            </div>
          </div>

          <div className={styles.messages}>
            {messages.map((message) => (
              <article
                key={message.id}
                className={`${styles.message} ${message.role === 'user' ? styles.user : styles.assistant}`}
              >
                <div className={styles.messageMeta}>{message.role === 'user' ? 'You' : assistantName}</div>
                {message.content || (
                  <div className={styles.typing}>
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className={styles.composer}>
            <form className={styles.form} onSubmit={onSubmit}>
              <textarea
                className={styles.input}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Message ${assistantName}...`}
              />
              <div className={styles.actions}>
                <div className={styles.helper}>{error ? `Last error: ${error}` : 'Direct gateway mode enabled.'}</div>
                <button className={styles.button} type="submit" disabled={!draft.trim() || presence === 'processing' || presence === 'typing'}>
                  Send message
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
