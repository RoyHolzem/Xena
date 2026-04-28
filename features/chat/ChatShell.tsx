'use client';

import { useState, useCallback } from 'react';
import { publicConfig } from './chat-config';
import { useAuthToken } from '../auth/AuthWrapper';
import { useChat } from './hooks/useChat';
import { useVoice } from './hooks/useVoice';
import { useBootSequence } from './hooks/useBootSequence';
import { useTelecom } from './hooks/useTelecom';
import { useGitHub } from './hooks/useGitHub';
import { useModels } from './hooks/useModels';
import { TopNav, type AppMode } from './components/TopNav';
import { ChatCenter } from './components/ChatCenter';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { ModuleDashboard } from './components/ModuleDashboard';
import { BootScreen } from './components/BootScreen';

import type { TelecomView } from '@/lib/types';
import styles from './chat-shell.module.css';

const nowIso = () => new Date().toISOString();

// Default to Mercury 2 (fast, diffusion-based). User can switch in the top nav dropdown.
const DEFAULT_MODEL_OVERRIDE = 'inceptionlabs/mercury-2';

export function ChatShell() {
  const { assistantName } = publicConfig;
  const assistantInitial = assistantName.charAt(0).toUpperCase();
  const getAuthToken = useAuthToken();

  const [mode, setMode] = useState<AppMode>('xena');
  const [activeView] = useState<TelecomView>('incidents');
  const [search] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_OVERRIDE);

  const { ghStatus, ghCommit } = useGitHub();
  const { models } = useModels();

  const chat = useChat(selectedModel);
  const boot = useBootSequence();

  // Voice hook with callbacks that inject into the chat message stream
  const voice = useVoice({
    onUserTranscript: useCallback((text: string) => {
      chat.addVoiceUserMessage(text);
    }, [chat]),

    onResponseStart: useCallback(() => {
      chat.resetVoiceAssistant();
    }, [chat]),

    onAssistantDelta: useCallback((delta: string) => {
      chat.appendVoiceAssistantDelta(delta);
    }, [chat]),

    onResponseDone: useCallback(() => {
      // no-op, response fully streamed
    }, []),

    onError: useCallback((err: string) => {
      console.error('[voice]', err);
    }, []),
  });

  // Telecom data for contextual side panels in Xena mode
  const telecom = useTelecom(activeView, getAuthToken, search);

  const isXenaMode = mode === 'xena';
  const isReady = boot.bootState === 'ready';

  return (
    <div className={styles.shell}>
      {!isReady ? (
        <BootScreen
          bootState={boot.bootState}
          steps={boot.steps}
          progress={boot.progress}
          onStart={boot.startBoot}
          assistantName={assistantName}
          assistantInitial={assistantInitial}
        />
      ) : (
        <>
      <TopNav
        mode={mode}
        setMode={setMode}
        ghStatus={ghStatus}
        ghCommit={ghCommit}
        models={models}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />

      <div className={styles.body}>
        {isXenaMode ? (
          <>
            <LeftPanel
              visible
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
              voiceActive={voice.isActive}
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
        </>
      )}
    </div>
  );
}
