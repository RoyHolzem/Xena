'use client';

import { useState, useCallback, useEffect } from 'react';
import type { XenaUiAction } from '@/lib/xena-ui-actions';
import type { XenaActionEvent, TelecomView } from '@/lib/types';
import { cn } from './chat-utils';
import { publicConfig } from './chat-config';
import { useAuthToken } from '../auth/AuthWrapper';
import { useChat } from './hooks/useChat';
import { useVoice } from './hooks/useVoice';
import { useBootSequence } from './hooks/useBootSequence';
import { useTelecom } from './hooks/useTelecom';
import { useCockpitState } from './hooks/useCockpitState';
import { useChatContext } from './hooks/useChatContext';
import { useGitHub } from './hooks/useGitHub';
import { useModels } from './hooks/useModels';
import { useActionLog, useActionLogSync, actionEventToEntry } from './hooks/useActionLog';
import { TopNav, type AppMode } from './components/TopNav';
import { ChatCenter } from './components/ChatCenter';
import { AgentActionsPanel } from './components/AgentActionsPanel';
import { RightPanel } from './components/RightPanel';
import { ModuleDashboard } from './components/ModuleDashboard';
import { BootScreen } from './components/BootScreen';
import { AgentActivityBar } from './components/AgentActivityBar';

import styles from './styles/shell.module.css';

const DEFAULT_MODEL = 'inceptionlabs/mercury-2';

export function ChatShell() {
  const { assistantName } = publicConfig;
  const assistantInitial = assistantName.charAt(0).toUpperCase();
  const getAuthToken = useAuthToken();

  const [mode, setMode] = useState<AppMode>('xena');
  const [contextView, setContextView] = useState<TelecomView>('incidents');
  const [search] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const actionLog = useActionLog();

  const { ghStatus, ghCommit } = useGitHub();
  const { models } = useModels();

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  const telecom = useTelecom(contextView, getAuthToken, search, {
    onContextViewChange: setContextView,
    autoLoadOnMount: false,
    enablePolling: false,
  });

  const cockpit = useCockpitState(telecom, setContextView);

  const onUiActions = useCallback(
    (actions: XenaUiAction[]) => {
      void cockpit.dispatchUiActions(actions);
    },
    [cockpit],
  );

  // Log action events from the server (GET /incidents, web_fetch, etc.)
  const onXenaAction = useCallback(
    (event: XenaActionEvent) => {
      actionLog.addEntry(actionEventToEntry(event));
    },
    [actionLog],
  );

  const chat = useChat(selectedModel, {
    onXenaAction,
    onUiActions,
    onResponseDone: useCallback(() => {
      void telecom.loadTelecomView(contextView, true);
    }, [contextView, telecom]),
  });

  const voice = useVoice({
    onUserTranscript: useCallback((text: string) => {
      chat.addVoiceUserMessage(text);
    }, [chat.addVoiceUserMessage]),
    onResponseStart: useCallback(() => {
      chat.resetVoiceAssistant();
    }, [chat.resetVoiceAssistant]),
    onAssistantDelta: useCallback((delta: string) => {
      chat.appendVoiceAssistantDelta(delta);
    }, [chat.appendVoiceAssistantDelta]),
    onResponseDone: useCallback(() => {}, []),
    onError: useCallback((err: string) => {
      console.error('[voice]', err);
    }, []),
    onUiActions,
  });

  const boot = useBootSequence();

  // Sync action log with chat state
  useActionLogSync(actionLog, chat.presence, chat.messages, getAuthToken);

  useEffect(() => {
    const views: TelecomView[] = ['incidents', 'events', 'planned-works'];
    for (const view of views) {
      void telecom.loadTelecomView(view, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { matchedRecord, matchedView, pinnedCards } = useChatContext(
    chat.messages,
    telecom.recordsByView,
  );

  useEffect(() => {
    if (matchedRecord && matchedView) {
      if (matchedView !== contextView) {
        setContextView(matchedView);
      }
      telecom.selectRecord(matchedView, matchedRecord.recordId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedRecord, matchedView]);

  // Navigate to a record: switch mode & view, select the record
  const handleNavigateToRecord = useCallback((view: TelecomView, recordId: string) => {
    setMode(view as AppMode);
    setContextView(view);
    telecom.selectRecord(view, recordId);
  }, [telecom]);

  const displayRecord = matchedRecord || telecom.selectedRecord;

  const isXenaMode = mode === 'xena';
  const isReady = boot.bootState === 'ready';

  if (!isReady) {
    return (
      <div className={styles.shell}>
        <BootScreen
          bootState={boot.bootState}
          steps={boot.steps}
          progress={boot.progress}
          onStart={boot.startBoot}
          assistantName={assistantName}
          assistantInitial={assistantInitial}
        />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <TopNav
        mode={mode}
        setMode={setMode}
        ghStatus={ghStatus}
        ghCommit={ghCommit}
        models={models}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        modelFallback={chat.modelFallback}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className={cn(styles.body, !isXenaMode && styles.bodyFullWidth)}>
        {isXenaMode ? (
          <>
            <AgentActionsPanel actions={actionLog.actions} />

            <div className={styles.chatColumn}>
              <AgentActivityBar activity={cockpit.agentActivity} />
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
                matchedRecord={matchedRecord}
                matchedView={matchedView}
                pinnedCards={pinnedCards}
                onNavigateToRecord={handleNavigateToRecord}
              />
            </div>

            <RightPanel
              visible
              selectedRecord={displayRecord}
              activeView={matchedView || contextView}
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
