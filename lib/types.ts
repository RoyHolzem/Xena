/* ─── Core chat types ─── */

export type Role = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
};

export type PresenceState = 'idle' | 'processing' | 'typing' | 'error';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

/* ─── Telecom types ─── */

export type TelecomView = 'incidents' | 'events' | 'planned-works';

export type LabeledValue = {
  label: string;
  value: string;
};

export type TelecomRecord = {
  recordId: string;
  entityType: string;
  title: string;
  summary: string;
  status: string;
  severity: string;
  priority: string;
  typeCode: string;
  companyName: string;
  customerName: string;
  customerContactName: string;
  customerEmail: string;
  customerPhone: string;
  city: string;
  networkRegion: string;
  networkCountry: string;
  operatorName: string;
  serviceType: string;
  networkSegment: string;
  fiberId: string;
  circuitId: string;
  siteCode: string;
  startTime: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
  customerText: string;
  highlights: LabeledValue[];
  facts: LabeledValue[];
};

export type TelecomApiResponse = {
  ok: boolean;
  view: TelecomView;
  items: TelecomRecord[];
  count: number;
  error?: string;
};

/* ─── Xena SSE Action Events ─── */

export type XenaActionCategory =
  | 'lambda' | 'cloudformation' | 'amplify' | 's3' | 'iam'
  | 'apigateway' | 'dynamodb' | 'ec2' | 'ecs' | 'sns' | 'sqs'
  | 'cdk' | 'lightsail' | 'cloudfront' | 'route53' | 'cloudwatch'
  | 'logs' | 'ssm' | 'secretsmanager' | 'kms' | 'cognito'
  | 'bedrock' | 'sagemaker' | 'general';

export type XenaActionVerb =
  | 'created' | 'updated' | 'deleted' | 'deployed' | 'invoked'
  | 'listed' | 'described' | 'configured' | 'scaled' | 'checked'
  | 'started' | 'stopped' | 'modified' | 'published';

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

/* ─── Activity Log ─── */

export type ActionSource = 'xena' | 'cloudtrail';

export type ActionLogEntry = {
  id: string;
  timestamp: string;
  verb: string;
  category: string;
  label: string;
  resource?: string;
  region?: string;
  detail?: string;
  source: ActionSource;
};
