import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';
import { NextResponse } from 'next/server';

const region = process.env.AWS_REGION || 'eu-central-1';
const client = new CloudTrailClient({ region });

// ─── Service → category map ───
const SERVICE_MAP: Record<string, string> = {
  'lambda.amazonaws.com': 'lambda',
  'cloudformation.amazonaws.com': 'cloudformation',
  'amplify.amazonaws.com': 'amplify',
  's3.amazonaws.com': 's3',
  'iam.amazonaws.com': 'iam',
  'apigateway.amazonaws.com': 'apigateway',
  'dynamodb.amazonaws.com': 'dynamodb',
  'ec2.amazonaws.com': 'ec2',
  'ecs.amazonaws.com': 'ecs',
  'sns.amazonaws.com': 'sns',
  'sqs.amazonaws.com': 'sqs',
  'lightsail.amazonaws.com': 'lightsail',
  'cloudfront.amazonaws.com': 'cloudfront',
  'route53.amazonaws.com': 'route53',
  'acm.amazonaws.com': 'acm',
  'cloudtrail.amazonaws.com': 'cloudtrail',
  'cloudwatch.amazonaws.com': 'cloudwatch',
  'logs.amazonaws.com': 'logs',
  'ssm.amazonaws.com': 'ssm',
  'secretsmanager.amazonaws.com': 'secretsmanager',
  'kms.amazonaws.com': 'kms',
  'elasticloadbalancing.amazonaws.com': 'elb',
  'autoscaling.amazonaws.com': 'autoscaling',
  'cognito-idp.amazonaws.com': 'cognito',
  'appsync.amazonaws.com': 'appsync',
  'bedrock.amazonaws.com': 'bedrock',
  'sagemaker.amazonaws.com': 'sagemaker',
  'memorydb.amazonaws.com': 'memorydb',
  'sts.amazonaws.com': 'sts',
};

function categorize(source: string): string {
  return SERVICE_MAP[source] || source.replace('.amazonaws.com', '');
}

function extractVerb(eventName: string): string {
  const lower = eventName.toLowerCase();
  const verbs: [string, string][] = [
    ['create', 'created'],
    ['update', 'updated'],
    ['delete', 'deleted'],
    ['deploy', 'deployed'],
    ['invoke', 'invoked'],
    ['start', 'started'],
    ['stop', 'stopped'],
    ['modify', 'modified'],
    ['configur', 'configured'],
    ['scale', 'scaled'],
    ['attach', 'attached'],
    ['detach', 'detached'],
    ['enable', 'enabled'],
    ['disable', 'disabled'],
    ['publish', 'published'],
    ['subscribe', 'subscribed'],
    ['send', 'sent'],
    ['put', 'put'],
    ['assume', 'assumed'],
  ];
  for (const [prefix, past] of verbs) {
    if (lower.startsWith(prefix)) return past;
  }
  return lower;
}

// ─── Filter out noisy read-only events ───
const NOISY_PATTERNS = [
  'lookup', 'getlogin', 'getuser', 'getrole', 'getpolicy', 'getinstance',
  'getoperation', 'getbucket', 'getfunction', 'getstage', 'getapi',
  'getcaller', 'getstatic', 'getdisk', 'getdistribution', 'getcontainer',
  'getrelational', 'getport', 'getmetric', 'getaccess', 'getinstance',
  'headbucket', 'listattached', 'listrole', 'listuser', 'listbucket',
  'listfunction', 'listapps', 'listjobs', 'describ', 'assumerole',
  'getstage', 'getstages', 'getapis', 'getsnapshot',
  'createservicelinkedrole', 'describesnapshot',
];

function isNoisy(eventName: string): boolean {
  const lower = eventName.toLowerCase();
  return NOISY_PATTERNS.some((p) => lower.includes(p));
}

function extractResource(event: any): string {
  if (event.ResourceName) return event.ResourceName;
  try {
    const resources = JSON.parse(event.Resources || '[]');
    if (resources.length > 0) return resources[0].resourceName || resources[0].ARN || '—';
  } catch {}
  return '—';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minutes = parseInt(searchParams.get('minutes') || '30', 10);
  const startTime = new Date(Date.now() - minutes * 60 * 1000);

  try {
    const command = new LookupEventsCommand({
      StartTime: startTime,
      MaxResults: 50,
    });

    const response = await client.send(command);

    const actions = (response.Events || [])
      .filter((e) => !isNoisy(e.EventName || ''))
      .map((event, i) => ({
        id: `ct-${Date.now()}-${i}`,
        timestamp: formatTime(event.EventTime?.toISOString() || new Date().toISOString()),
        verb: extractVerb(event.EventName || ''),
        category: categorize(event.EventSource || ''),
        label: event.EventName || 'Unknown',
        resource: extractResource(event),
        region: event.EventSource?.includes('lightsail') ? 'lightsail' : region,
        user: event.Username || '—',
        source: 'cloudtrail' as const,
      }));

    return NextResponse.json({ actions, count: actions.length, since: startTime.toISOString() });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'CloudTrail lookup failed', actions: [] },
      { status: 500 }
    );
  }
}
