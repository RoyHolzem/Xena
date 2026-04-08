export type Role = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
};

export type PresenceState = 'idle' | 'processing' | 'typing' | 'error';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
