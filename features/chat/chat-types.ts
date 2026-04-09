export type Role = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
};

export type PresenceState = 'idle' | 'processing' | 'typing' | 'error';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export type ConsoleEntry = {
  id: string;
  timestamp: string;
  type: 'info' | 'action' | 'stream' | 'done' | 'error';
  message: string;
};

/* ─── Xena Action Events ─── */

export type XenaActionCategory =
  | 'lambda'
  | 'cloudformation'
  | 'amplify'
  | 's3'
  | 'iam'
  | 'apigateway'
  | 'dynamodb'
  | 'ec2'
  | 'ecs'
  | 'sns'
  | 'sqs'
  | 'cdk'
  | 'general';

export type XenaActionVerb =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'deployed'
  | 'invoked'
  | 'listed'
  | 'described'
  | 'configured'
  | 'scaled'
  | 'checked';

export type XenaActionEvent = {
  type: 'action';
  id?: string;
  verb: XenaActionVerb;
  category: XenaActionCategory;
  label: string;
  resource?: string;
  region?: string;
  detail?: string;
  timestamp?: string;
};

export type XenaContentEvent = {
  type: 'content';
  delta?: string;
  content?: string;
};

export type XenaDoneEvent = {
  type: 'done';
};

export type XenaSSEEvent = XenaActionEvent | XenaContentEvent | XenaDoneEvent;

export type ActionLogEntry = {
  id: string;
  timestamp: string;
  verb: XenaActionVerb;
  category: XenaActionCategory;
  label: string;
  resource?: string;
  region?: string;
  detail?: string;
};
