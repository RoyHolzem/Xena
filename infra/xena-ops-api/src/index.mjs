import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' }));

const TABLES = {
  incidents: process.env.INCIDENTS_TABLE || 'roy-telecom-incidents-lux',
  events: process.env.EVENTS_TABLE || 'roy-telecom-events-lux',
  'planned-works': process.env.PLANNED_WORKS_TABLE || 'roy-telecom-planned-works-lux',
};

const SEVERITY = { SEV1: 0, SEV2: 1, SEV3: 2, SEV4: 3 };

const STATUS_ORDER = {
  incidents: { ACKNOWLEDGED: 0, OPEN: 1, IN_PROGRESS: 2, MONITORING: 3, RESOLVED: 4, CLOSED: 5 },
  events: { ACTIVE: 0, MONITORING: 1, INFO: 2, COMPLETED: 3, CLOSED: 4 },
  'planned-works': { IN_EXECUTION: 0, READY: 1, CUSTOMER_NOTIFIED: 2, APPROVED: 3, PLANNED: 4, POSTPONED: 5 },
};

const OPEN_STATUSES = {
  incidents: s => !['RESOLVED', 'CLOSED'].includes(s),
  events: s => !['COMPLETED', 'CLOSED'].includes(s),
  'planned-works': s => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(s),
};

function toIso(v) { return (typeof v === 'string' && v) ? v : new Date(0).toISOString(); }

function normalize(item) {
  return {
    recordId: item.recordId ?? '',
    title: item.title ?? '',
    summary: item.summary ?? '',
    status: item.status ?? '',
    severity: item.severity ?? '',
    priority: item.priority ?? '',
    operatorName: item.operatorName ?? '',
    serviceType: item.serviceType ?? '',
    networkSegment: item.networkSegment ?? '',
    city: item.city ?? '',
    startTime: toIso(item.startTime),
    endTime: item.endTime || undefined,
    createdAt: toIso(item.createdAt),
    updatedAt: toIso(item.updatedAt),
  };
}

function sorter(type) {
  return (a, b) => {
    const so = STATUS_ORDER[type] || {};
    const sd = (so[a.status] ?? 99) - (so[b.status] ?? 99);
    if (sd !== 0) return sd;
    const svd = (SEVERITY[a.severity] ?? 99) - (SEVERITY[b.severity] ?? 99);
    if (svd !== 0) return svd;
    return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
  };
}

async function scanAll(table) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await ddb.send(new ScanCommand({ TableName: table, ExclusiveStartKey }));
    items.push(...(res.Items || []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function getLatest(table) {
  const items = await scanAll(table);
  return items
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 20)
    .map(normalize);
}

async function getOpen(table, type) {
  const items = await scanAll(table);
  const isOpen = OPEN_STATUSES[type] || (() => true);
  return items.filter(i => isOpen(i.status)).sort(sorter(type)).map(normalize);
}

async function getPlannedWorksToday(table) {
  const items = await scanAll(table);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  return items.filter(item => {
    const start = item.startTime ? new Date(item.startTime) : null;
    const end = (item.endTime || item.maintenanceWindowEnd) ? new Date(item.endTime || item.maintenanceWindowEnd) : null;
    if (!start) return false;
    const startDate = start.toISOString().slice(0, 10);
    if (startDate === today) return true;
    if (end) return today >= startDate && today <= end.toISOString().slice(0, 10);
    return false;
  }).sort(sorter('planned-works')).map(normalize);
}

const ROUTES = {
  'GET /incidents/latest': () => getLatest(TABLES.incidents),
  'GET /incidents/open': () => getOpen(TABLES.incidents, 'incidents'),
  'GET /events/latest': () => getLatest(TABLES.events),
  'GET /events/open': () => getOpen(TABLES.events, 'events'),
  'GET /planned-works/today': () => getPlannedWorksToday(TABLES['planned-works']),
  'GET /planned-works/open': () => getOpen(TABLES['planned-works'], 'planned-works'),
};

export const handler = async (event) => {
  const route = `${event.requestContext?.http?.method || 'GET'} ${event.rawPath || event.path || '/'}`;

  const handle = ROUTES[route];
  if (!handle) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found', available: Object.keys(ROUTES) }),
    };
  }

  try {
    const items = await handle();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, count: items.length, items }),
    };
  } catch (err) {
    console.error('xena-ops-api error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
