'use client';

import type { AvatarState, ChatMessage, PresenceState } from '@/lib/types';
import { cn } from '../chat-utils';
import styles from '../chat-shell.module.css';

interface ChatPanelProps {
  assistantName: string;
  assistantInitial: string;
  messages: ChatMessage[];
  draft: string;
  setDraft: (draft: string) => void;
  presence: PresenceState;
  error: string | null;
  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  activeViewSingular: string;
}

export function ChatPanel({
  assistantName,
  assistantInitial,
  messages,
  draft,
  setDraft,
  error,
  messagesEndRef,
  textareaRef,
  handleSubmit,
  handleKeyDown,
  activeViewSingular,
}: ChatPanelProps) {
  return (
    <section className={styles.chatPanel}>
      <div className={styles.panelHead}>
        <div>
          <h2>Ask {assistantName}</h2>
          <p>Use chat for follow-up, triage notes, or next-step questions.</p>
        </div>
      </div>

      <div className={styles.messages} role="log" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={cn(styles.message, styles[message.role])}>
            <div className={styles.msgAvatar}>{message.role === 'user' ? 'R' : assistantInitial}</div>
            <div className={styles.msgBody}>
              <div className={styles.msgRole}>{message.role === 'user' ? 'Roy' : assistantName}</div>
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

      <form className={styles.composer} onSubmit={handleSubmit}>
        {error && <div className={styles.errorBanner}>{error}</div>}
        <textarea
          ref={textareaRef}
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask ${assistantName} about the selected ${activeViewSingular}.`}
          rows={1}
        />
        <div className={styles.composerFooter}>
          <span>Shift + Enter for newline</span>
          <button className={styles.sendButton} type="submit" disabled={!draft.trim()}>
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
