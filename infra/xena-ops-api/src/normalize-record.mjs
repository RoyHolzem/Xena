/**
 * Shape DynamoDB telecom items for Operations API responses.
 *
 * Planned works store the real schedule in maintenanceWindowStart/End while
 * create always stamps startTime=now. Prefer the window fields so agents do
 * not treat create-time as the maintenance window (matches Next.js normalizer).
 */
export function normalizeRecord(item = {}) {
  const startRaw = item.maintenanceWindowStart || item.startTime;
  const endRaw = item.maintenanceWindowEnd || item.endTime;

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
    startTime: toIso(startRaw),
    endTime: typeof endRaw === 'string' && endRaw ? endRaw : undefined,
    // Keep canonical window fields so agents can read the schedule explicitly.
    maintenanceWindowStart:
      typeof item.maintenanceWindowStart === 'string' && item.maintenanceWindowStart
        ? item.maintenanceWindowStart
        : undefined,
    maintenanceWindowEnd:
      typeof item.maintenanceWindowEnd === 'string' && item.maintenanceWindowEnd
        ? item.maintenanceWindowEnd
        : undefined,
    createdAt: toIso(item.createdAt),
    updatedAt: toIso(item.updatedAt),
  };
}

function toIso(v) {
  return typeof v === 'string' && v ? v : new Date(0).toISOString();
}
