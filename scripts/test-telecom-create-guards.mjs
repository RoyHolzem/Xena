import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const checks = [
  {
    name: 'Next telecom API',
    file: 'app/api/telecom/route.ts',
    conflictStatus: 'status: 409',
  },
  {
    name: 'Lambda ops API',
    file: 'infra/xena-ops-api/src/index.mjs',
    conflictStatus: 'statusCode: 409',
  },
];

for (const check of checks) {
  const source = readFileSync(resolve(root, check.file), 'utf8');
  const hasConditionalPut =
    /new PutCommand\(\{[\s\S]*?ConditionExpression:\s*['"]attribute_not_exists\(recordId\)['"][\s\S]*?\}\)/.test(source);

  if (!hasConditionalPut) {
    throw new Error(`${check.name} create path must use an insert-only DynamoDB PutCommand`);
  }

  if (!source.includes('ConditionalCheckFailedException')) {
    throw new Error(`${check.name} must detect DynamoDB duplicate-record failures`);
  }

  if (!source.includes(check.conflictStatus)) {
    throw new Error(`${check.name} must return 409 when create collides with an existing recordId`);
  }
}

console.log('telecom create guards ok');
