import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const files = [
  'app/api/telecom/route.ts',
  'infra/xena-ops-api/src/index.mjs',
];

for (const file of files) {
  const source = readFileSync(file, 'utf8');

  assert.match(
    source,
    /ConditionExpression:\s*['"]attribute_not_exists\(recordId\)['"]/,
    `${file} must protect create writes with attribute_not_exists(recordId)`,
  );
  assert.match(
    source,
    /ConditionalCheckFailedException/,
    `${file} must handle duplicate create attempts explicitly`,
  );
  assert.match(
    source,
    /MAX_CREATE_ID_ATTEMPTS/,
    `${file} must retry generated record ID collisions`,
  );
}

console.log('telecom critical regressions passed');
