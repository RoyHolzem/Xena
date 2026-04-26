'use client';

import type { ChatMessage, PresenceState } from '@/lib/types';
import type { VoiceState } from '../hooks/useVoice';
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
  voiceState: VoiceState;
  voiceError: string | null;
  onToggleVoice: () => void;
  voiceActive: boolean;
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
  voiceState,
  voiceError,
  onToggleVoice,
  voiceActive,
}: ChatCenterProps) {
  // Determine voice-specific avatar state
  const effectiveAvatarState = voiceActive
    ? voiceState === 'recording'
      ? 'listening'
      : voiceState === 'transcribing'
        ? 'thinking'
        : voiceState === 'responding'
          ? 'thinking'
          : voiceState === 'playing'
            ? 'speaking'
            : voiceState === 'error'
              ? 'error'
              : avatarState
    : avatarState;

  const effectiveStatusLabel = voiceActive
    ? voiceState === 'recording'
      ? 'Recording...'
      : voiceState === 'transcribing'
        ? 'Transcribing...'
        : voiceState === 'responding'
          ? 'Thinking...'
        : voiceState === 'playing'
            ? 'Speaking...'
            : voiceState === 'error'
              ? 'Voice Error'
              : statusLabel
    : statusLabel;

  return (
    <div className={styles.chatCenter}>
      {/* Avatar header */}
      <div className={styles.chatAvatarBar}>
        <div className={styles.chatAvatarWrap}>
          <div className={cn(styles.chatAvatarCircle, styles[`avatar_${effectiveAvatarState}`])}>
            {assistantInitial}
          </div>
          <div className={cn(styles.chatAvatarRing, styles[`ring_${effectiveAvatarState}`])} />
        </div>
        <div className={styles.chatAvatarInfo}>
          <div className={styles.chatAvatarName}>{assistantName}</div>
          <div className={cn(styles.chatAvatarStatus, styles[`status_${effectiveAvatarState}`])}>
            <span className={styles.chatAvatarStatusDot} />
            {effectiveStatusLabel}
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
                {message.source === 'voice' && (
                  <span className={styles.voiceTag}>🎤</span>
                )}
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
        {(error || voiceError) && (
          <div className={styles.chatError}>{error || voiceError}</div>
        )}
        <div className={styles.chatComposerInner}>
          {/* Voice toggle button */}
          <button
            type="button"
            className={cn(
              styles.chatVoiceBtn,
              voiceActive && styles.chatVoiceBtnActive,
              voiceState === 'recording' && styles.chatVoiceBtnListening,
              voiceState === 'playing' && styles.chatVoiceBtnSpeaking,
              (voiceState === 'transcribing' || voiceState === 'responding') && styles.chatVoiceBtnConnecting,
            )}
            onClick={onToggleVoice}
            title={
              !voiceActive ? 'Start voice chat'
              : voiceState === 'recording' ? 'Stop recording'
              : 'Cancel'
            }
          >
            {!voiceActive ? (
              // Inactive: mic outline
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            ) : voiceState === 'recording' ? (
              // Recording: filled stop square
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            ) : voiceState === 'playing' ? (
              // Playing: speaker icon
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            ) : (
              // Processing: spinner
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.spin}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            )}
          </button>

          <textarea
            ref={textareaRef}
            className={styles.chatInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={voiceActive ? 'Voice mode active — speak naturally...' : `Ask ${assistantName} anything about your operations...`}
            rows={1}
            disabled={voiceActive}
          />
          <button
            className={cn(styles.chatSendBtn, draft.trim() && !voiceActive && styles.chatSendBtnActive)}
            type="submit"
            disabled={!draft.trim() || voiceActive}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div className={styles.chatComposerHint}>
          {voiceActive
            ? voiceState === 'recording' ? '🎙️ Recording — tap to stop'
              : voiceState === 'transcribing' ? '✨ Transcribing...'
              : voiceState === 'responding' ? '🧠 Thinking...'
              : voiceState === 'playing' ? '🔊 Speaking...'
              : 'Processing...'
            : 'Shift + Enter for newline'
          }
        </div>
      </form>
    </div>
  );
}
