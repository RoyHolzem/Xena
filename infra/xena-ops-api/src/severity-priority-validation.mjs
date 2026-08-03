/** Canonical severity / priority enums for telecom write paths. */
export const VALID_SEVERITIES = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];
export const VALID_PRIORITIES = ['P1', 'P2', 'P3', 'P4', 'P5'];

/**
 * Returns an error message when the provided severity is present but invalid.
 * Omitted / null means "do not validate" (field not being set on this request).
 * Empty string and non-canonical values are rejected so SEV1 incidents cannot
 * be silently declassified.
 */
export function invalidSeverityError(severity) {
  if (severity === undefined || severity === null) return null;
  if (typeof severity !== 'string' || !VALID_SEVERITIES.includes(severity)) {
    return `Invalid severity '${severity}'. Valid: ${VALID_SEVERITIES.join(', ')}`;
  }
  return null;
}

/**
 * Same gate for optional priority updates/creates.
 */
export function invalidPriorityError(priority) {
  if (priority === undefined || priority === null) return null;
  if (typeof priority !== 'string' || !VALID_PRIORITIES.includes(priority)) {
    return `Invalid priority '${priority}'. Valid: ${VALID_PRIORITIES.join(', ')}`;
  }
  return null;
}
