import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  'app/api/telecom/route.ts',
  'infra/xena-ops-api/src/index.mjs',
];

for (const file of files) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');

  assert.match(
    source,
    /new PutCommand\(\{[\s\S]*?ConditionExpression:\s*['"]attribute_not_exists\(recordId\)['"]/,
    `${file} must create telecom records with a conditional put`,
  );

  assert.match(
    source,
    /ConditionalCheckFailedException/,
    `${file} must handle duplicate telecom record ids`,
  );

  assert.match(
    source,
    /status:\s*409|statusCode:\s*409/,
    `${file} must return an HTTP 409 for duplicate telecom record ids`,
  );
}

console.log('telecom create guards verified');
