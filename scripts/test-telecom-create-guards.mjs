import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);

const targets = [
  {
    label: 'Next telecom API',
    path: 'app/api/telecom/route.ts',
  },
  {
    label: 'xena-ops Lambda',
    path: 'infra/xena-ops-api/src/index.mjs',
  },
];

for (const target of targets) {
  const source = readFileSync(resolve(root, target.path), 'utf8');

  assert.match(
    source,
    /ConditionExpression:\s*['"]attribute_not_exists\(recordId\)['"]/,
    `${target.label} create path must reject duplicate recordId writes`,
  );
  assert.match(
    source,
    /ConditionalCheckFailedException/,
    `${target.label} must detect DynamoDB conditional write conflicts`,
  );
  assert.match(
    source,
    /status(?:Code)?:\s*409/,
    `${target.label} must return HTTP 409 for duplicate creates`,
  );
}

console.log('telecom create guards verified');
