import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { verifyToken } from '@/lib/cognito-jwt';

const cwLogs = new CloudWatchLogsClient({ region: 'eu-central-1' });

export async function POST(request: Request) {
  // Verify auth
  const authHeader = request.headers.get('Authorization');
  const user = await verifyToken(authHeader);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { afterTimestamp }: { afterTimestamp?: number } = await request.json();

  // Query CloudWatch for API Gateway access logs since the given timestamp
  const startTime = afterTimestamp || Date.now() - 60_000;

  try {
    const result = await cwLogs.send(
      new FilterLogEventsCommand({
        logGroupName: '/aws/apigateway/xena-ops-api',
        startTime,
        limit: 50,
      }),
    );

    const events = (result.events || [])
      .map((e) => {
        try {
          return JSON.parse(e.message || '{}');
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return Response.json({ events });
  } catch (err) {
    console.error('[api-logs] CloudWatch query failed:', err);
    return Response.json({ events: [], error: String(err) }, { status: 500 });
  }
}
