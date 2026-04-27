import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
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

function parseView(value: string | null): TelecomView | null {
  if (value === 'incidents' || value === 'events' || value === 'planned-works') {
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

function normalize(view: TelecomView, item: RawItem): TelecomRecord {
  if (view === 'incidents') return normalizeIncident(item);
  if (view === 'events') return normalizeEvent(item);
  return normalizePlannedWork(item);
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

  try {
    const response = await client.send(
      new ScanCommand({
        TableName: tableNames[view],
        Limit: 200,
      })
    );

    const items = sortRecords(view, (response.Items || []).map((item) => normalize(view, item as RawItem)));
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
