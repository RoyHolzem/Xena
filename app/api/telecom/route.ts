import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/cognito-jwt';
import type { LabeledValue, TelecomApiResponse, TelecomRecord, TelecomView } from '@/lib/types';

const region =
  process.env.TELECOM_AWS_REGION ||
  process.env.AWS_REGION ||
  process.env.CT_AWS_REGION ||
  'eu-central-1';

const tableNames: Record<TelecomView, string> = {
  incidents: process.env.TELECOM_INCIDENTS_TABLE_NAME || 'roy-telecom-incidents-lux',
  events: process.env.TELECOM_EVENTS_TABLE_NAME || 'roy-telecom-events-lux',
  'planned-works': process.env.TELECOM_PLANNED_WORKS_TABLE_NAME || 'roy-telecom-planned-works-lux',
  orders: process.env.TELECOM_ORDERS_TABLE_NAME || 'roy-telecom-orders-lux',
};

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region }),
  { marshallOptions: { removeUndefinedValues: true } }
);

type RawItem = Record<string, any>;

const severityOrder: Record<string, number> = {
  SEV1: 0,
  SEV2: 1,
  SEV3: 2,
  SEV4: 3,
};

const incidentStatusOrder: Record<string, number> = {
  ACKNOWLEDGED: 0,
  OPEN: 1,
  IN_PROGRESS: 2,
  MONITORING: 3,
  RESOLVED: 4,
  CLOSED: 5,
};

const eventStatusOrder: Record<string, number> = {
  ACTIVE: 0,
  MONITORING: 1,
  INFO: 2,
  COMPLETED: 3,
  CLOSED: 4,
};

const workStatusOrder: Record<string, number> = {
  IN_EXECUTION: 0,
  READY: 1,
  CUSTOMER_NOTIFIED: 2,
  APPROVED: 3,
  PLANNED: 4,
  POSTPONED: 5,
};

const orderStatusOrder: Record<string, number> = {
  NEW: 0,
  ACKNOWLEDGED: 1,
  IN_PROGRESS: 2,
  PENDING_INFO: 3,
  COMPLETED: 4,
  CANCELLED: 5,
};

function parseView(value: string | null): TelecomView | null {
  if (value === 'incidents' || value === 'events' || value === 'planned-works' || value === 'orders') {
    return value;
  }
  return null;
}

function toText(value: unknown, fallback = '—') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function toIso(value: unknown) {
  if (typeof value === 'string' && value) return value;
  return new Date(0).toISOString();
}

function facts(entries: Array<[string, unknown]>): LabeledValue[] {
  return entries
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value: toText(value) }));
}

function normalizeIncident(item: RawItem): TelecomRecord {
  return {
    recordId: toText(item.recordId),
    entityType: 'incident',
    title: toText(item.title),
    summary: toText(item.summary),
    status: toText(item.status),
    severity: toText(item.severity),
    priority: toText(item.priority),
    typeCode: toText(item.incidentType),
    companyName: toText(item.companyName),
    customerName: toText(item.customerName),
    customerContactName: toText(item.customerContactName),
    customerEmail: toText(item.customerEmail),
    customerPhone: toText(item.customerPhone),
    city: toText(item.city),
    networkRegion: toText(item.networkRegion),
    networkCountry: toText(item.networkCountry),
    operatorName: toText(item.operatorName),
    serviceType: toText(item.serviceType),
    networkSegment: toText(item.networkSegment),
    fiberId: toText(item.fiberId),
    circuitId: toText(item.circuitId),
    siteCode: toText(item.siteCode),
    startTime: toIso(item.startTime),
    endTime: typeof item.endTime === 'string' ? item.endTime : undefined,
    createdAt: toIso(item.createdAt),
    updatedAt: toIso(item.updatedAt),
    customerText: toText(item.customerText),
    highlights: facts([
      ['Incident type', item.incidentType],
      ['Affected customers', item.affectedCustomers],
      ['Affected sites', item.affectedSites],
      ['Root cause', item.rootCause],
      ['ETA', item.etaText],
    ]),
    facts: facts([
      ['Operator', item.operatorName],
      ['Service', item.serviceType],
      ['Segment', item.networkSegment],
      ['Site code', item.siteCode],
      ['Fiber ID', item.fiberId],
      ['Circuit ID', item.circuitId],
      ['Vendor ref', item.vendorReference],
      ['Change ref', item.maintenanceReference],
      ['Customer contact', item.customerContactName],
      ['Customer email', item.customerEmail],
      ['Customer phone', item.customerPhone],
      ['Latest action', item.latestAction],
      ['Packet loss %', item.packetLossPct],
      ['Latency ms', item.latencyMs],
      ['Updated', item.updatedAt],
    ]),
  };
}

function normalizeEvent(item: RawItem): TelecomRecord {
  return {
    recordId: toText(item.recordId),
    entityType: 'event',
    title: toText(item.title),
    summary: toText(item.summary),
    status: toText(item.status),
    severity: toText(item.severity),
    priority: toText(item.priority),
    typeCode: toText(item.eventType),
    companyName: toText(item.companyName),
    customerName: toText(item.customerName),
    customerContactName: toText(item.customerContactName),
    customerEmail: toText(item.customerEmail),
    customerPhone: toText(item.customerPhone),
    city: toText(item.city),
    networkRegion: toText(item.networkRegion),
    networkCountry: toText(item.networkCountry),
    operatorName: toText(item.operatorName),
    serviceType: toText(item.serviceType),
    networkSegment: toText(item.networkSegment),
    fiberId: toText(item.fiberId),
    circuitId: toText(item.circuitId),
    siteCode: toText(item.siteCode),
    startTime: toIso(item.startTime),
    endTime: typeof item.endTime === 'string' ? item.endTime : undefined,
    createdAt: toIso(item.createdAt),
    updatedAt: toIso(item.updatedAt),
    customerText: toText(item.customerText),
    highlights: facts([
      ['Event type', item.eventType],
      ['Event scope', item.eventScope],
      ['Visibility', item.visibility],
      ['Notified customers', item.notifiedCustomers],
      ['Channel', item.communicationChannel],
    ]),
    facts: facts([
      ['Operator', item.operatorName],
      ['Service', item.serviceType],
      ['Segment', item.networkSegment],
      ['Site code', item.siteCode],
      ['Fiber ID', item.fiberId],
      ['Circuit ID', item.circuitId],
      ['Customer contact', item.customerContactName],
      ['Customer email', item.customerEmail],
      ['Customer phone', item.customerPhone],
      ['Next update', item.nextUpdateAt],
      ['Updated', item.updatedAt],
    ]),
  };
}

function normalizePlannedWork(item: RawItem): TelecomRecord {
  return {
    recordId: toText(item.recordId),
    entityType: 'planned-work',
    title: toText(item.title),
    summary: toText(item.summary),
    status: toText(item.status),
    severity: toText(item.severity),
    priority: toText(item.priority),
    typeCode: toText(item.plannedWorkType),
    companyName: toText(item.companyName),
    customerName: toText(item.customerName),
    customerContactName: toText(item.customerContactName),
    customerEmail: toText(item.customerEmail),
    customerPhone: toText(item.customerPhone),
    city: toText(item.city),
    networkRegion: toText(item.networkRegion),
    networkCountry: toText(item.networkCountry),
    operatorName: toText(item.operatorName),
    serviceType: toText(item.serviceType),
    networkSegment: toText(item.networkSegment),
    fiberId: toText(item.fiberId),
    circuitId: toText(item.circuitId),
    siteCode: toText(item.siteCode),
    startTime: toIso(item.maintenanceWindowStart || item.startTime),
    endTime: typeof (item.maintenanceWindowEnd || item.endTime) === 'string' ? (item.maintenanceWindowEnd || item.endTime) : undefined,
    createdAt: toIso(item.createdAt),
    updatedAt: toIso(item.updatedAt),
    customerText: toText(item.customerText),
    highlights: facts([
      ['Planned work', item.plannedWorkType],
      ['Change risk', item.changeRisk],
      ['Approval', item.approvalState],
      ['Expected impact', item.expectedImpact],
      ['Downtime minutes', item.expectedDowntimeMinutes],
    ]),
    facts: facts([
      ['Operator', item.operatorName],
      ['Service', item.serviceType],
      ['Segment', item.networkSegment],
      ['Site code', item.siteCode],
      ['Fiber ID', item.fiberId],
      ['Circuit ID', item.circuitId],
      ['Partner', item.implementationPartner],
      ['Rollback plan', item.rollbackPlan],
      ['Maintenance ref', item.maintenanceReference],
      ['Customer contact', item.customerContactName],
      ['Customer email', item.customerEmail],
      ['Customer phone', item.customerPhone],
      ['Updated', item.updatedAt],
    ]),
  };
}

function normalizeOrder(item: RawItem): TelecomRecord {
  return {
    recordId: toText(item.recordId),
    entityType: 'order',
    title: toText(item.title),
    summary: toText(item.summary),
    status: toText(item.status),
    severity: toText(item.severity),
    priority: toText(item.priority),
    typeCode: toText(item.orderType),
    companyName: toText(item.companyName),
    customerName: toText(item.customerName),
    customerContactName: toText(item.customerContactName),
    customerEmail: toText(item.customerEmail),
    customerPhone: toText(item.customerPhone),
    city: toText(item.city),
    networkRegion: toText(item.networkRegion),
    networkCountry: toText(item.networkCountry),
    operatorName: toText(item.operatorName),
    serviceType: toText(item.serviceType),
    networkSegment: toText(item.networkSegment),
    fiberId: toText(item.fiberId),
    circuitId: toText(item.circuitId),
    siteCode: toText(item.siteCode),
    startTime: toIso(item.startTime),
    endTime: typeof item.endTime === 'string' ? item.endTime : undefined,
    createdAt: toIso(item.createdAt),
    updatedAt: toIso(item.updatedAt),
    customerText: toText(item.customerText),
    highlights: facts([
      ['Order type', item.orderType],
      ['Product', item.productType],
      ['Quantity', item.quantity],
      ['Delivery date', item.requestedDeliveryDate],
      ['Source', item.orderSource],
    ]),
    facts: facts([
      ['Operator', item.operatorName],
      ['Service', item.serviceType],
      ['Segment', item.networkSegment],
      ['Site code', item.siteCode],
      ['Fiber ID', item.fiberId],
      ['Circuit ID', item.circuitId],
      ['Assigned to', item.assignedTo],
      ['Delivery address', item.deliveryAddress],
      ['Customer contact', item.customerContactName],
      ['Customer email', item.customerEmail],
      ['Customer phone', item.customerPhone],
      ['Internal notes', item.internalNotes],
      ['Updated', item.updatedAt],
    ]),
  };
}

function normalize(view: TelecomView, item: RawItem): TelecomRecord {
  if (view === 'incidents') return normalizeIncident(item);
  if (view === 'events') return normalizeEvent(item);
  if (view === 'orders') return normalizeOrder(item);
  return normalizePlannedWork(item);
}

function mergeRecord(items: TelecomRecord[], record: TelecomRecord): TelecomRecord[] {
  const idx = items.findIndex((r) => r.recordId === record.recordId);
  if (idx === -1) return [...items, record];
  const next = [...items];
  next[idx] = record;
  return next;
}

function sortRecords(view: TelecomView, items: TelecomRecord[]) {
  return [...items].sort((left, right) => {
    if (view === 'planned-works') {
      const statusDelta = (workStatusOrder[left.status] ?? 99) - (workStatusOrder[right.status] ?? 99);
      if (statusDelta !== 0) return statusDelta;
      return new Date(left.startTime).getTime() - new Date(right.startTime).getTime();
    }

    if (view === 'events') {
      const statusDelta = (eventStatusOrder[left.status] ?? 99) - (eventStatusOrder[right.status] ?? 99);
      if (statusDelta !== 0) return statusDelta;
      const severityDelta = (severityOrder[left.severity] ?? 99) - (severityOrder[right.severity] ?? 99);
      if (severityDelta !== 0) return severityDelta;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    if (view === 'orders') {
      const statusDelta = (orderStatusOrder[left.status] ?? 99) - (orderStatusOrder[right.status] ?? 99);
      if (statusDelta !== 0) return statusDelta;
      const severityDelta = (severityOrder[left.severity] ?? 99) - (severityOrder[right.severity] ?? 99);
      if (severityDelta !== 0) return severityDelta;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    const statusDelta = (incidentStatusOrder[left.status] ?? 99) - (incidentStatusOrder[right.status] ?? 99);
    if (statusDelta !== 0) return statusDelta;
    const severityDelta = (severityOrder[left.severity] ?? 99) - (severityOrder[right.severity] ?? 99);
    if (severityDelta !== 0) return severityDelta;
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const user = await verifyToken(authHeader);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const view = parseView(request.nextUrl.searchParams.get('view'));
  if (!view) {
    return NextResponse.json({ ok: false, error: 'Invalid view' }, { status: 400 });
  }

  const recordIdParam = request.nextUrl.searchParams.get('recordId')?.trim() || '';

  try {
    const response = await client.send(
      new ScanCommand({
        TableName: tableNames[view],
        Limit: 200,
      })
    );

    let items = sortRecords(view, (response.Items || []).map((item) => normalize(view, item as RawItem)));

    if (recordIdParam) {
      try {
        const got = await client.send(
          new GetCommand({
            TableName: tableNames[view],
            Key: { recordId: recordIdParam },
          })
        );
        if (got.Item) {
          const one = normalize(view, got.Item as RawItem);
          items = sortRecords(view, mergeRecord(items, one));
        }
      } catch {
        // Wrong table key or throttling — return scan-only result
      }
    }

    const payload: TelecomApiResponse = {
      ok: true,
      view,
      items,
      count: items.length,
    };
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load telecom records';
    return NextResponse.json({ ok: false, view, items: [], count: 0, error: message } satisfies TelecomApiResponse, { status: 500 });
  }
}

/* ─── Create record (POST) ─── */

const VALID_STATUSES: Record<TelecomView, string[]> = {
  incidents: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'MONITORING', 'RESOLVED', 'CLOSED'],
  events: ['ACTIVE', 'MONITORING', 'INFO', 'COMPLETED', 'CLOSED'],
  'planned-works': ['PLANNED', 'APPROVED', 'CUSTOMER_NOTIFIED', 'READY', 'IN_EXECUTION', 'COMPLETED', 'CANCELLED', 'POSTPONED'],
  orders: ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING_INFO', 'COMPLETED', 'CANCELLED'],
};

const EDITABLE_FIELDS: Record<TelecomView, string[]> = {
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

function generateRecordId(view: TelecomView): string {
  const prefix: Record<TelecomView, string> = {
    incidents: 'INCIDENT-LUX',
    events: 'EVENT-LUX',
    'planned-works': 'PW-LUX',
    orders: 'ORDER-LUX',
  };
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `${prefix[view]}-${year}-${seq}`;
}

function isConditionalCheckFailed(error: unknown): boolean {
  return error instanceof Error && error.name === 'ConditionalCheckFailedException';
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const user = await verifyToken(authHeader);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const view = parseView(request.nextUrl.searchParams.get('view'));
  if (!view) {
    return NextResponse.json({ ok: false, error: 'Invalid view' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.title || !body.status || !body.severity) {
    return NextResponse.json({ ok: false, error: 'Missing required fields: title, status, severity' }, { status: 400 });
  }

  const validStatuses = VALID_STATUSES[view];
  if (body.status && !validStatuses.includes(body.status as string)) {
    return NextResponse.json({ ok: false, error: `Invalid status '${body.status}'. Valid: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  const now = new Date().toISOString();
  const requestedRecordId = typeof body.recordId === 'string' ? body.recordId.trim() : '';

  const allowed = EDITABLE_FIELDS[view];
  const maxAttempts = requestedRecordId ? 1 : 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const recordId = requestedRecordId || generateRecordId(view);
    const item: Record<string, unknown> = { recordId, createdAt: now, updatedAt: now, startTime: now };
    for (const field of allowed) {
      if (body[field] !== undefined && body[field] !== null) {
        item[field] = body[field];
      }
    }

    try {
      await client.send(new PutCommand({
        TableName: tableNames[view],
        Item: item,
        ConditionExpression: 'attribute_not_exists(recordId)',
      }));
      return NextResponse.json({ ok: true, recordId, item: normalize(view, item as RawItem) }, { status: 201 });
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        if (requestedRecordId) {
          return NextResponse.json({ ok: false, error: `Record ${recordId} already exists` }, { status: 409 });
        }
        if (attempt < maxAttempts) continue;
        return NextResponse.json({ ok: false, error: 'Could not allocate a unique recordId' }, { status: 409 });
      }

      const message = error instanceof Error ? error.message : 'Failed to create record';
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: 'Could not allocate a unique recordId' }, { status: 409 });
}

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const user = await verifyToken(authHeader);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const view = parseView(request.nextUrl.searchParams.get('view'));
  if (!view) {
    return NextResponse.json({ ok: false, error: 'Invalid view' }, { status: 400 });
  }

  const recordId = request.nextUrl.searchParams.get('recordId')?.trim();
  if (!recordId) {
    return NextResponse.json({ ok: false, error: 'Missing recordId' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const validStatuses = VALID_STATUSES[view];
  if (body.status && !validStatuses.includes(body.status as string)) {
    return NextResponse.json({ ok: false, error: `Invalid status '${body.status}'. Valid: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  // Verify record exists
  try {
    const existing = await client.send(new GetCommand({ TableName: tableNames[view], Key: { recordId } }));
    if (!existing.Item) {
      return NextResponse.json({ ok: false, error: `Record ${recordId} not found` }, { status: 404 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check record';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const allowed = EDITABLE_FIELDS[view];
  const updates: Record<string, unknown> = {};
  for (const field of allowed) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'No valid fields to update' }, { status: 400 });
  }

  updates.updatedAt = new Date().toISOString();

  const setClauses: string[] = [];
  const attrNames: Record<string, string> = {};
  const attrValues: Record<string, unknown> = {};
  let idx = 0;
  for (const [key, value] of Object.entries(updates)) {
    idx++;
    const nameKey = `#f${idx}`;
    const valKey = `:v${idx}`;
    setClauses.push(`${nameKey} = ${valKey}`);
    attrNames[nameKey] = key;
    attrValues[valKey] = value;
  }

  try {
    await client.send(new UpdateCommand({
      TableName: tableNames[view],
      Key: { recordId },
      UpdateExpression: `SET ${setClauses.join(', ')}`,
      ExpressionAttributeNames: attrNames,
      ExpressionAttributeValues: attrValues,
    }));

    const updated = await client.send(new GetCommand({ TableName: tableNames[view], Key: { recordId } }));
    return NextResponse.json({ ok: true, recordId, item: normalize(view, updated.Item as RawItem) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update record';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
