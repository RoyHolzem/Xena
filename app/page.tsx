import { ChatShell } from '@/features/chat/ChatShell';
import { AuthWrapper } from '@/features/auth/AuthWrapper';

export default function HomePage() {
  return (
    <AuthWrapper>
      <ChatShell />
    </AuthWrapper>
  );
}
