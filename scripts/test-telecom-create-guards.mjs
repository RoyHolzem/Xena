import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const guardedCreatePaths = [
  'app/api/telecom/route.ts',
  'infra/xena-ops-api/src/index.mjs',
];

for (const relativePath of guardedCreatePaths) {
  const source = readFileSync(resolve(root, relativePath), 'utf8');

  assert.match(
    source,
    /ConditionExpression:\s*['"]attribute_not_exists\(recordId\)['"]/,
    `${relativePath} must protect create writes from overwriting existing recordId rows`,
  );

  assert.match(
    source,
    /ConditionalCheckFailedException/,
    `${relativePath} must detect DynamoDB conditional create conflicts`,
  );

  assert.match(
    source,
    /status:\s*409|statusCode:\s*409/,
    `${relativePath} must return HTTP 409 for duplicate create attempts`,
  );
}

console.log('telecom create guards verified');
