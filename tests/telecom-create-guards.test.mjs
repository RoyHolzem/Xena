import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const guardedCreatePaths = [
  {
    label: 'Next.js telecom API',
    path: new URL('../app/api/telecom/route.ts', import.meta.url),
  },
  {
    label: 'Lambda telecom API mirror',
    path: new URL('../infra/xena-ops-api/src/index.mjs', import.meta.url),
  },
];

for (const { label, path } of guardedCreatePaths) {
  test(`${label} rejects duplicate record creates`, async () => {
    const source = await readFile(path, 'utf8');

    assert.match(
      source,
      /ConditionExpression:\s*['"]attribute_not_exists\(recordId\)['"]/,
      'create writes must not replace an existing DynamoDB item',
    );
    assert.match(
      source,
      /ConditionalCheckFailedException/,
      'duplicate create conflicts should be handled explicitly',
    );
    assert.match(
      source,
      /status(?:Code)?:\s*409/,
      'duplicate creates should return HTTP 409',
    );
  });
}
