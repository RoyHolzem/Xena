'use client';

import type { ChatMessage, PresenceState, TelecomRecord, TelecomView } from '@/lib/types';
import type { VoiceState } from '../hooks/useVoice';
import type { PinnedCard } from './ContextCard';
import { cn } from '../chat-utils';
import { ContextCard } from './ContextCard';
import styles from '../styles/chat-center.module.css';

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
  messagesScrollRef: React.RefObject<HTMLDivElement>;
  onMessagesScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  voiceState: VoiceState;
  voiceError: string | null;
  onToggleVoice: () => void;
  voiceActive: boolean;
  matchedRecord: TelecomRecord | null;
  matchedView: TelecomView | null;
  pinnedCards: PinnedCard[];
  onNavigateToRecord: (view: TelecomView, recordId: string) => void;
}

const STARTERS = [
  'Show me the highest-impact open incidents',
  'What changed in operations today?',
  'Prepare the next maintenance handover',
];

function channelState(
  avatarState: ChatCenterProps['avatarState'],
  voiceActive: boolean,
  voiceState: VoiceState,
) {
  if (!voiceActive) {
    if (avatarState === 'thinking') return { label: 'Planning', tone: 'working' };
    if (avatarState === 'speaking') return { label: 'Responding', tone: 'working' };
    if (avatarState === 'error') return { label: 'Attention', tone: 'error' };
    return { label: 'Online', tone: 'ready' };
  }
  if (voiceState === 'recording') return { label: 'Listening', tone: 'recording' };
  if (voiceState === 'transcribing') return { label: 'Transcribing', tone: 'working' };
  if (voiceState === 'responding') return { label: 'Planning', tone: 'working' };
  if (voiceState === 'playing') return { label: 'Speaking', tone: 'ready' };
  if (voiceState === 'error') return { label: 'Voice error', tone: 'error' };
  return { label: 'Voice ready', tone: 'ready' };
}

function VoiceIcon({ state, active }: { state: VoiceState; active: boolean }) {
  if (active && state === 'recording') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>;
  }
  if (active && state === 'playing') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 6 7 10H4v4h3l4 4V6Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></svg>;
}

export function ChatCenter({
  assistantName,
  avatarState,
  messages,
  draft,
  setDraft,
  presence,
  error,
  messagesEndRef,
  messagesScrollRef,
  onMessagesScroll,
  textareaRef,
  handleSubmit,
  handleKeyDown,
  voiceState,
  voiceError,
  onToggleVoice,
  voiceActive,
  matchedRecord,
  pinnedCards,
  onNavigateToRecord,
}: ChatCenterProps) {
  const state = channelState(avatarState, voiceActive, voiceState);
  const cardByMessage = new Map<string, PinnedCard>();
  for (const card of pinnedCards) cardByMessage.set(card.messageId, card);

  return (
    <section className={styles.chatCenter} aria-label="Xena agent channel">
      <header className={styles.channelHeader}>
        <div className={styles.channelIdentity}>
          <div className={styles.channelMark}>
            <img src="/favicon.png" alt="" width={27} height={27} />
          </div>
          <div>
            <span className={styles.channelEyebrow}>AI operations assistant</span>
            <strong className={styles.channelTitle}>{assistantName}</strong>
          </div>
        </div>
        <div className={cn(styles.channelStatus, styles[`channelStatus_${state.tone}`])}>
          <span aria-hidden="true" />
          {state.label}
        </div>
      </header>

      <div className={styles.chatMessages} ref={messagesScrollRef} onScroll={onMessagesScroll}>
        {messages.length === 0 && (
          <div className={styles.chatEmptyState}>
            <div className={styles.emptySignal} aria-hidden="true">
              <span /><span /><span />
            </div>
            <span className={styles.emptyEyebrow}>Get started</span>
            <h2>What needs attention?</h2>
            <p>
              Ask naturally and Xena will use approved skills and company data to help with operations.
            </p>
            <div className={styles.starterGrid}>
              {STARTERS.map((starter) => (
                <button key={starter} type="button" onClick={() => setDraft(starter)}>
                  <span>{starter}</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const pinnedCard = cardByMessage.get(message.id);
          const isAssistant = message.role === 'assistant';
          return (
            <article
              key={message.id}
              className={cn(styles.messageTurn, isAssistant ? styles.turnAssistant : styles.turnUser)}
            >
              <div className={styles.turnIdentity}>
                <span className={styles.turnAvatar}>
                  {isAssistant ? <img src="/favicon.png" alt="" width={18} height={18} /> : 'RH'}
                </span>
                <span className={styles.turnRole}>{isAssistant ? assistantName : 'You'}</span>
                {message.source === 'voice' && (
                  <span className={styles.turnSource}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="4" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3" /></svg>
                    Voice
                  </span>
                )}
              </div>
              <div className={styles.turnBody}>
                {message.content ? (
                  <div className={styles.messageText}>{message.content}</div>
                ) : (
                  <div className={styles.responseSkeleton} aria-label="Xena is working">
                    <span /><span /><span />
                  </div>
                )}
                {pinnedCard && (
                  <div className={styles.chatContextCardWrap}>
                    <ContextCard
                      record={pinnedCard.record}
                      view={pinnedCard.view}
                      compact
                      onNavigate={() => onNavigateToRecord(pinnedCard.view, pinnedCard.record.recordId)}
                    />
                  </div>
                )}
              </div>
            </article>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.chatComposer} onSubmit={handleSubmit}>
        {(error || voiceError) && (
          <div className={styles.chatError} role="alert">{error || voiceError}</div>
        )}
        {matchedRecord && (
          <div className={styles.contextRibbon}>
            <span className={styles.contextRibbonDot} />
            Working context
            <strong>{matchedRecord.recordId}</strong>
          </div>
        )}
        <div className={cn(styles.composerSurface, voiceActive && styles.composerSurfaceVoice)}>
          <textarea
            ref={textareaRef}
            className={styles.chatInput}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              matchedRecord
                ? `Continue with ${matchedRecord.recordId}…`
                : voiceActive
                  ? 'Voice channel active…'
                  : 'Give Xena an operational intent…'
            }
            rows={1}
            disabled={voiceActive}
            aria-label="Message Xena"
          />
          <div className={styles.composerActions}>
            <button
              type="button"
              className={cn(styles.iconButton, voiceActive && styles.iconButtonActive, voiceState === 'recording' && styles.iconButtonRecording)}
              onClick={onToggleVoice}
              aria-label={!voiceActive ? 'Start voice channel' : voiceState === 'recording' ? 'Stop recording' : 'Cancel voice channel'}
              title={!voiceActive ? 'Start voice channel' : 'Stop voice channel'}
            >
              <VoiceIcon state={voiceState} active={voiceActive} />
            </button>
            <button
              className={cn(styles.sendButton, draft.trim() && !voiceActive && styles.sendButtonReady)}
              type="submit"
              disabled={!draft.trim() || voiceActive || presence === 'processing' || presence === 'typing'}
              aria-label="Send intent"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 14-7-4 14-3-6-7-1Z"/><path d="m12 13 7-8" /></svg>
            </button>
          </div>
        </div>
        <div className={styles.composerMeta}>
          <span>{voiceActive ? state.label : 'Enter to send · Shift+Enter for new line'}</span>
          <span className={styles.composerTrust}>Human-controlled</span>
        </div>
      </form>
    </section>
  );
}
