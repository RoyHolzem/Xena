import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' }));

const TABLES = {
  incidents: process.env.INCIDENTS_TABLE || 'roy-telecom-incidents-lux',
  events: process.env.EVENTS_TABLE || 'roy-telecom-events-lux',
  'planned-works': process.env.PLANNED_WORKS_TABLE || 'roy-telecom-planned-works-lux',
  orders: process.env.ORDERS_TABLE || 'roy-telecom-orders-lux',
};

const SEVERITY = { SEV1: 0, SEV2: 1, SEV3: 2, SEV4: 3 };

const STATUS_ORDER = {
  incidents: { ACKNOWLEDGED: 0, OPEN: 1, IN_PROGRESS: 2, MONITORING: 3, RESOLVED: 4, CLOSED: 5 },
  events: { ACTIVE: 0, MONITORING: 1, INFO: 2, COMPLETED: 3, CLOSED: 4 },
  'planned-works': { IN_EXECUTION: 0, READY: 1, CUSTOMER_NOTIFIED: 2, APPROVED: 3, PLANNED: 4, POSTPONED: 5 },
  orders: { NEW: 0, ACKNOWLEDGED: 1, IN_PROGRESS: 2, PENDING_INFO: 3, COMPLETED: 4, CANCELLED: 5 },
};

const OPEN_STATUSES = {
  incidents: s => !['RESOLVED', 'CLOSED'].includes(s),
  events: s => !['COMPLETED', 'CLOSED'].includes(s),
  'planned-works': s => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(s),
  orders: s => !['COMPLETED', 'CANCELLED'].includes(s),
};

// Valid statuses per entity type
const VALID_STATUSES = {
  incidents: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'MONITORING', 'RESOLVED', 'CLOSED'],
  events: ['ACTIVE', 'MONITORING', 'INFO', 'COMPLETED', 'CLOSED'],
  'planned-works': ['PLANNED', 'APPROVED', 'CUSTOMER_NOTIFIED', 'READY', 'IN_EXECUTION', 'COMPLETED', 'CANCELLED', 'POSTPONED'],
  orders: ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING_INFO', 'COMPLETED', 'CANCELLED'],
};

// All editable fields per entity type
const EDITABLE_FIELDS = {
  incidents: [
    'title', 'summary', 'status', 'severity', 'priority',
    'operatorName', 'serviceType', 'networkSegment', 'city',
    'networkRegion', 'networkCountry', 'companyName', 'customerName',
    'customerContactName', 'customerEmail', 'customerPhone',
    'fiberId', 'circuitId', 'siteCode', 'endTime',
    'incidentType', 'affectedCustomers', 'affectedSites',
    'rootCause', 'etaText', 'vendorReference', 'maintenanceReference',
    'latestAction', 'packetLossPct', 'latencyMs', 'customerText',
  ],
  events: [
    'title', 'summary', 'status', 'severity', 'priority',
    'operatorName', 'serviceType', 'networkSegment', 'city',
    'networkRegion', 'networkCountry', 'companyName', 'customerName',
    'customerContactName', 'customerEmail', 'customerPhone',
    'fiberId', 'circuitId', 'siteCode', 'endTime',
    'eventType', 'eventScope', 'visibility', 'notifiedCustomers',
    'communicationChannel', 'nextUpdateAt', 'customerText',
  ],
  'planned-works': [
    'title', 'summary', 'status', 'severity', 'priority',
    'operatorName', 'serviceType', 'networkSegment', 'city',
    'networkRegion', 'networkCountry', 'companyName', 'customerName',
    'customerContactName', 'customerEmail', 'customerPhone',
    'fiberId', 'circuitId', 'siteCode', 'endTime',
    'plannedWorkType', 'changeRisk', 'approvalState',
    'expectedImpact', 'expectedDowntimeMinutes', 'maintenanceWindowStart',
    'maintenanceWindowEnd', 'implementationPartner', 'rollbackPlan',
    'maintenanceReference', 'customerText',
  ],
  orders: [
    'title', 'summary', 'status', 'severity', 'priority',
    'operatorName', 'serviceType', 'networkSegment', 'city',
    'networkRegion', 'networkCountry', 'companyName', 'customerName',
    'customerContactName', 'customerEmail', 'customerPhone',
    'fiberId', 'circuitId', 'siteCode', 'endTime',
    'orderType', 'productType', 'quantity', 'deliveryAddress',
    'requestedDeliveryDate', 'orderSource', 'assignedTo',
    'internalNotes', 'customerText',
  ],
};

// Fields required for creation
const REQUIRED_CREATE_FIELDS = ['title', 'status', 'severity'];

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

// ─── Write handlers ───

function generateRecordId(type) {
  const prefix = {
    incidents: 'INCIDENT-LUX',
    events: 'EVENT-LUX',
    'planned-works': 'PW-LUX',
    orders: 'ORDER-LUX',
  }[type] || 'REC-LUX';
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}

function isConditionalCheckFailed(error) {
  return error?.name === 'ConditionalCheckFailedException';
}

function parseBody(event) {
  try {
    let body = event.body;
    if (!body) return {};
    if (event.isBase64Encoded) {
      body = Buffer.from(body, 'base64').toString('utf-8');
    }
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function createRecord(type, body) {
  if (!body) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON body' }) };

  const missing = REQUIRED_CREATE_FIELDS.filter(f => !body[f]);
  if (missing.length > 0) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: `Missing required fields: ${missing.join(', ')}` }) };
  }

  if (body.status && VALID_STATUSES[type] && !VALID_STATUSES[type].includes(body.status)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: `Invalid status '${body.status}'. Valid: ${VALID_STATUSES[type].join(', ')}` }) };
  }

  const now = new Date().toISOString();
  const requestedRecordId = typeof body.recordId === 'string' && body.recordId.trim()
    ? body.recordId.trim()
    : null;
  const maxAttempts = requestedRecordId ? 1 : 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const recordId = requestedRecordId || generateRecordId(type);
    const allowed = EDITABLE_FIELDS[type] || [];
    const item = { recordId, createdAt: now, updatedAt: now, startTime: now };
    for (const field of allowed) {
      if (body[field] !== undefined && body[field] !== null) {
        item[field] = body[field];
      }
    }
    // Ensure startTime is set
    if (!item.startTime) item.startTime = now;

    try {
      await ddb.send(new PutCommand({
        TableName: TABLES[type],
        Item: item,
        ConditionExpression: 'attribute_not_exists(recordId)',
      }));

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, recordId, item: normalize(item) }),
      };
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        if (requestedRecordId || attempt === maxAttempts - 1) {
          return {
            statusCode: 409,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: `Record ${recordId} already exists` }),
          };
        }
        continue;
      }
      throw error;
    }
  }

  return {
    statusCode: 409,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: false, error: 'Failed to create unique record ID' }),
  };
}

async function updateRecord(type, recordId, body) {
  if (!body) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON body' }) };
  if (!recordId) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing recordId' }) };

  // Verify record exists
  const existing = await ddb.send(new GetCommand({ TableName: TABLES[type], Key: { recordId } }));
  if (!existing.Item) {
    return { statusCode: 404, body: JSON.stringify({ ok: false, error: `Record ${recordId} not found` }) };
  }

  if (body.status && VALID_STATUSES[type] && !VALID_STATUSES[type].includes(body.status)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: `Invalid status '${body.status}'. Valid: ${VALID_STATUSES[type].join(', ')}` }) };
  }

  const allowed = EDITABLE_FIELDS[type] || [];
  const updates = {};
  for (const field of allowed) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'No valid fields to update' }) };
  }

  updates.updatedAt = new Date().toISOString();

  const setClauses = [];
  const attrNames = {};
  const attrValues = {};
  let idx = 0;
  for (const [key, value] of Object.entries(updates)) {
    idx++;
    const nameKey = `#f${idx}`;
    const valKey = `:v${idx}`;
    setClauses.push(`${nameKey} = ${valKey}`);
    attrNames[nameKey] = key;
    attrValues[valKey] = value;
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLES[type],
    Key: { recordId },
    UpdateExpression: `SET ${setClauses.join(', ')}`,
    ExpressionAttributeNames: attrNames,
    ExpressionAttributeValues: attrValues,
    ReturnValues: 'ALL_NEW',
  }));

  // Fetch the updated record to return
  const updated = await ddb.send(new GetCommand({ TableName: TABLES[type], Key: { recordId } }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, recordId, item: normalize(updated.Item) }),
  };
}

// ─── Routing ───

const GET_ROUTES = {
  'GET /incidents/latest': () => getLatest(TABLES.incidents),
  'GET /incidents/open': () => getOpen(TABLES.incidents, 'incidents'),
  'GET /events/latest': () => getLatest(TABLES.events),
  'GET /events/open': () => getOpen(TABLES.events, 'events'),
  'GET /planned-works/today': () => getPlannedWorksToday(TABLES['planned-works']),
  'GET /planned-works/open': () => getOpen(TABLES['planned-works'], 'planned-works'),
  'GET /orders/latest': () => getLatest(TABLES.orders),
  'GET /orders/open': () => getOpen(TABLES.orders, 'orders'),
};

function matchPutRoute(route) {
  // PUT /incidents/{recordId}, PUT /events/{recordId}, etc.
  const match = route.match(/^PUT \/((incidents|events|planned-works|orders)\/(.+))$/);
  if (match) return { type: match[2], recordId: decodeURIComponent(match[3]) };
  return null;
}

function matchPostRoute(route) {
  const match = route.match(/^POST \/(incidents|events|planned-works|orders)$/);
  if (match) return match[1];
  return null;
}

export const handler = async (event) => {
  const route = `${event.requestContext?.http?.method || 'GET'} ${event.rawPath || event.path || '/'}`;

  // GET routes
  const getHandle = GET_ROUTES[route];
  if (getHandle) {
    try {
      const items = await getHandle();
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
  }

  // POST routes (create)
  const postType = matchPostRoute(route);
  if (postType) {
    const body = parseBody(event);
    const result = await createRecord(postType, body);
    return { ...result, headers: { 'Content-Type': 'application/json' } };
  }

  // PUT routes (update)
  const putMatch = matchPutRoute(route);
  if (putMatch) {
    const body = parseBody(event);
    const result = await updateRecord(putMatch.type, putMatch.recordId, body);
    return { ...result, headers: { 'Content-Type': 'application/json' } };
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not found', available: [...Object.keys(GET_ROUTES), 'POST /{entity}', 'PUT /{entity}/{recordId}'] }),
  };
};
