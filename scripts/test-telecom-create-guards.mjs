import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const checks = [
  {
    path: 'app/api/telecom/route.ts',
    putPattern: /new PutCommand\(\{\s*TableName: tableNames\[view\],\s*Item: item,\s*ConditionExpression: 'attribute_not_exists\(recordId\)',\s*\}\)/s,
    conflictPattern: /status:\s*409/,
  },
  {
    path: 'infra/xena-ops-api/src/index.mjs',
    putPattern: /new PutCommand\(\{\s*TableName: TABLES\[type\],\s*Item: item,\s*ConditionExpression: 'attribute_not_exists\(recordId\)',\s*\}\)/s,
    conflictPattern: /statusCode:\s*409/,
  },
];

for (const check of checks) {
  const source = readFileSync(check.path, 'utf8');

  assert.match(
    source,
    check.putPattern,
    `${check.path} must create records with an atomic DynamoDB duplicate guard`,
  );
  assert.match(
    source,
    /ConditionalCheckFailedException/,
    `${check.path} must detect DynamoDB duplicate-key failures`,
  );
  assert.match(
    source,
    check.conflictPattern,
    `${check.path} must surface duplicate creates as HTTP 409 conflicts`,
  );
}

console.log('telecom create guards verified');
