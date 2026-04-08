import { ChatShell } from '@/components/chat-shell';
import { publicConfig } from '@/lib/config';

export default function HomePage() {
  return <ChatShell appName={publicConfig.appName} assistantName={publicConfig.assistantName} />;
}
