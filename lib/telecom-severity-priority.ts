/** Canonical severity / priority enums for telecom write paths. */
export const VALID_SEVERITIES = ['SEV1', 'SEV2', 'SEV3', 'SEV4'] as const;
export const VALID_PRIORITIES = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;

/**
 * Returns an error message when the provided severity is present but invalid.
 * Omitted / null means "do not validate" (field not being set on this request).
 */
export function invalidSeverityError(severity: unknown): string | null {
  if (severity === undefined || severity === null) return null;
  if (typeof severity !== 'string' || !(VALID_SEVERITIES as readonly string[]).includes(severity)) {
    return `Invalid severity '${String(severity)}'. Valid: ${VALID_SEVERITIES.join(', ')}`;
  }
  return null;
}

/** Same gate for optional priority updates/creates. */
export function invalidPriorityError(priority: unknown): string | null {
  if (priority === undefined || priority === null) return null;
  if (typeof priority !== 'string' || !(VALID_PRIORITIES as readonly string[]).includes(priority)) {
    return `Invalid priority '${String(priority)}'. Valid: ${VALID_PRIORITIES.join(', ')}`;
  }
  return null;
}
