'use client';

import { useState } from 'react';
import { publicConfig } from './chat-config';
import { useAuthToken, useSignOut } from '../auth/AuthWrapper';
import { useChat } from './hooks/useChat';
import { useTelecom } from './hooks/useTelecom';
import { useGitHub } from './hooks/useGitHub';
import { useCloudTrail } from './hooks/useCloudTrail';
import { Sidebar } from './components/Sidebar';
import { OperationsPanel } from './components/OperationsPanel';
import { ChatPanel } from './components/ChatPanel';
import { VIEW_META } from '@/features/operations/view-meta';
import styles from './chat-shell.module.css';

import type { TelecomView } from '@/lib/types';

export function ChatShell() {
  const { appName, assistantName } = publicConfig;
  const assistantInitial = assistantName.charAt(0).toUpperCase();
  const getAuthToken = useAuthToken();
  const signOut = useSignOut();

  const [activeView, setActiveView] = useState<TelecomView>('incidents');
  const [search, setSearch] = useState('');

  const { awsStatus, actionLog, addXenaAction } = useCloudTrail(getAuthToken);
  const { ghStatus, ghCommit, ghBranch } = useGitHub();

  const chat = useChat(addXenaAction);

  const telecom = useTelecom(activeView, getAuthToken, search);

  return (
    <div className={styles.shell}>
      <Sidebar
        appName={appName}
        assistantName={assistantName}
        avatarState={chat.avatarState}
        statusLabel={chat.statusLabel}
        activeViewLabel={VIEW_META.find((v) => v.key === activeView)?.label || activeView}
        messageCount={chat.messages.length}
        ghStatus={ghStatus}
        ghCommit={ghCommit}
        ghBranch={ghBranch}
        awsStatus={awsStatus}
        actionLog={actionLog}
        onSignOut={signOut}
      />

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1>Luxembourg telecom operations</h1>
            <p>Switch between incidents, events and planned works, all backed by the DynamoDB staging tables you asked me to seed.</p>
          </div>
          <div className={styles.topbarMeta}>
            <div className={styles.topbarTag}>Staging</div>
            <div className={styles.topbarTag}>Dynamo-backed</div>
            <div className={styles.topbarTag}>Live auth</div>
          </div>
        </header>

        <div className={styles.workspace}>
          <OperationsPanel
            activeView={activeView}
            setActiveView={setActiveView}
            search={search}
            setSearch={setSearch}
            records={telecom.records}
            filteredRecords={telecom.filteredRecords}
            selectedRecord={telecom.selectedRecord}
            setSelectedRecordId={(id) => telecom.setSelectedRecordIds((prev) => ({ ...prev, [activeView]: id }))}
            telecomLoading={telecom.telecomLoading}
            telecomError={telecom.telecomError}
            telecomLoadedAt={telecom.telecomLoadedAt}
            loadTelecomView={telecom.loadTelecomView}
          />

          <ChatPanel
            assistantName={assistantName}
            assistantInitial={assistantInitial}
            messages={chat.messages}
            draft={chat.draft}
            setDraft={chat.setDraft}
            presence={chat.presence}
            error={chat.error}
            isFocused={chat.isFocused}
            setIsFocused={chat.setIsFocused}
            messagesEndRef={chat.messagesEndRef}
            textareaRef={chat.textareaRef}
            handleSubmit={(e) => chat.handleSubmit(e, getAuthToken)}
            handleKeyDown={chat.handleKeyDown}
            activeViewSingular={activeView.slice(0, -1)}
          />
        </div>
      </main>
    </div>
  );
}
