'use client';

import type { ChatMessage, PresenceState } from '@/lib/types';
import { cn } from '../chat-utils';
import styles from '../chat-shell.module.css';

interface ChatCenterProps {
  assistantName: string;
  assistantInitial: string;
  avatarState: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
  statusLabel: string;
  messages: ChatMessage[];
  draft: string;
  setDraft: (d: string) => void;
  presence: PresenceState;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatCenter({
  assistantName,
  assistantInitial,
  avatarState,
  statusLabel,
  messages,
  draft,
  setDraft,
  error,
  messagesEndRef,
  textareaRef,
  handleSubmit,
  handleKeyDown,
}: ChatCenterProps) {
  return (
    <div className={styles.chatCenter}>
      {/* Avatar header */}
      <div className={styles.chatAvatarBar}>
        <div className={styles.chatAvatarWrap}>
          <div className={cn(styles.chatAvatarCircle, styles[`avatar_${avatarState}`])}>
            {assistantInitial}
          </div>
          <div className={cn(styles.chatAvatarRing, styles[`ring_${avatarState}`])} />
        </div>
        <div className={styles.chatAvatarInfo}>
          <div className={styles.chatAvatarName}>{assistantName}</div>
          <div className={cn(styles.chatAvatarStatus, styles[`status_${avatarState}`])}>
            <span className={styles.chatAvatarStatusDot} />
            {statusLabel}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.chatMessages}>
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(styles.chatMessage, styles[`msg_${message.role}`], styles.msgEnter)}
            style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
          >
            <div className={styles.chatMsgAvatar}>
              {message.role === 'user' ? 'R' : assistantInitial}
            </div>
            <div className={styles.chatMsgContent}>
              <div className={styles.chatMsgRole}>
                {message.role === 'user' ? 'Roy' : assistantName}
              </div>
              <div className={styles.chatMsgBubble}>
                {message.content || (
                  <div className={styles.typingIndicator}>
                    <span /><span /><span />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <form className={styles.chatComposer} onSubmit={handleSubmit}>
        {error && (
          <div className={styles.chatError}>{error}</div>
        )}
        <div className={styles.chatComposerInner}>
          <textarea
            ref={textareaRef}
            className={styles.chatInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${assistantName} anything about your operations...`}
            rows={1}
          />
          <button
            className={cn(styles.chatSendBtn, draft.trim() && styles.chatSendBtnActive)}
            type="submit"
            disabled={!draft.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div className={styles.chatComposerHint}>Shift + Enter for newline</div>
      </form>
    </div>
  );
}
