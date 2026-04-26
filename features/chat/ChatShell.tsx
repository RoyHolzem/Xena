'use client';

import { useState, useCallback } from 'react';
import { publicConfig } from './chat-config';
import { useAuthToken } from '../auth/AuthWrapper';
import { useChat } from './hooks/useChat';
import { useVoice } from './hooks/useVoice';
import { useTelecom } from './hooks/useTelecom';
import { useGitHub } from './hooks/useGitHub';
import { useCloudTrail } from './hooks/useCloudTrail';
import { TopNav, type AppMode } from './components/TopNav';
import { ChatCenter } from './components/ChatCenter';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { ModuleDashboard } from './components/ModuleDashboard';

import type { TelecomView } from '@/lib/types';
import styles from './chat-shell.module.css';

const nowIso = () => new Date().toISOString();

export function ChatShell() {
  const { assistantName } = publicConfig;
  const assistantInitial = assistantName.charAt(0).toUpperCase();
  const getAuthToken = useAuthToken();

  const [mode, setMode] = useState<AppMode>('xena');
  const [activeView] = useState<TelecomView>('incidents');
  const [search] = useState('');

  const { awsStatus, actionLog, addXenaAction } = useCloudTrail(getAuthToken);
  const { ghStatus, ghCommit } = useGitHub();

  const chat = useChat(addXenaAction);

  // Voice hook with callbacks that inject into the chat message stream
  const voice = useVoice({
    onTranscript: useCallback((text: string) => {
      chat.addVoiceUserMessage(text);
    }, [chat]),

    onAssistantText: useCallback((delta: string) => {
      chat.appendVoiceAssistantDelta(delta);
    }, [chat]),

    onError: useCallback((err: string) => {
      console.error('[voice]', err);
    }, []),
  });

  // Telecom data for contextual side panels in Xena mode
  const telecom = useTelecom(activeView, getAuthToken, search);

  const isXenaMode = mode === 'xena';

  return (
    <div className={styles.shell}>
      <TopNav
        mode={mode}
        setMode={setMode}
        ghStatus={ghStatus}
        ghCommit={ghCommit}
        awsStatus={awsStatus}
      />

      <div className={styles.body}>
        {isXenaMode ? (
          <>
            <LeftPanel
              visible
              actionLog={actionLog}
              selectedContext={telecom.selectedRecord?.recordId ?? null}
            />

            <ChatCenter
              assistantName={assistantName}
              assistantInitial={assistantInitial}
              avatarState={chat.avatarState}
              statusLabel={chat.statusLabel}
              messages={chat.messages}
              draft={chat.draft}
              setDraft={chat.setDraft}
              presence={chat.presence}
              error={chat.error}
              messagesEndRef={chat.messagesEndRef}
              textareaRef={chat.textareaRef}
              handleSubmit={(e) => chat.handleSubmit(e, getAuthToken)}
              handleKeyDown={chat.handleKeyDown}
              voiceState={voice.state}
              voiceError={voice.error}
              onToggleVoice={voice.toggle}
              voiceActive={voice.isConnected}
            />

            <RightPanel
              visible={!!telecom.selectedRecord}
              selectedRecord={telecom.selectedRecord}
              activeView={activeView}
            />
          </>
        ) : (
          <ModuleDashboard
            view={mode as TelecomView}
            onBackToXena={() => setMode('xena')}
          />
        )}
      </div>
    </div>
  );
}
