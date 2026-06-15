import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const checks = [
  {
    label: 'Next.js telecom route',
    path: new URL('../app/api/telecom/route.ts', import.meta.url),
  },
  {
    label: 'ops API Lambda route',
    path: new URL('../infra/xena-ops-api/src/index.mjs', import.meta.url),
  },
];

for (const check of checks) {
  const source = await readFile(check.path, 'utf8');
  assert.match(
    source,
    /ConditionExpression:\s*['"]attribute_not_exists\(recordId\)['"]/,
    `${check.label} must protect creates from overwriting existing recordId values`,
  );
  assert.match(
    source,
    /ConditionalCheckFailedException/,
    `${check.label} must handle duplicate recordId writes explicitly`,
  );
  assert.match(
    source,
    /status: 409|statusCode: 409/,
    `${check.label} must return 409 for duplicate recordId writes`,
  );
}

console.log('telecom create guards verified');
