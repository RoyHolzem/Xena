/**
 * True when a planned work's maintenance window overlaps `today` (UTC YYYY-MM-DD).
 * Prefer maintenance window fields: create always stamps startTime=now, so using
 * startTime alone false-positives create-day works and false-negatives when
 * endTime shadows a later maintenanceWindowEnd.
 */
export function isPlannedWorkToday(item, today) {
  const startRaw = item.maintenanceWindowStart || item.startTime;
  const endRaw = item.maintenanceWindowEnd || item.endTime;
  const start = startRaw ? new Date(startRaw) : null;
  const end = endRaw ? new Date(endRaw) : null;
  if (!start || Number.isNaN(start.getTime())) return false;
  const startDate = start.toISOString().slice(0, 10);
  if (startDate === today) return true;
  if (end && !Number.isNaN(end.getTime())) {
    return today >= startDate && today <= end.toISOString().slice(0, 10);
  }
  return false;
}
