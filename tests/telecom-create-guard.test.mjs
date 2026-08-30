import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const CREATE_GUARD = "ConditionExpression: 'attribute_not_exists(recordId)'";
const DUPLICATE_ERROR = 'Record ${recordId} already exists';

function readSource(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function assertCreateGuard(source, label) {
  assert.match(
    source,
    /new PutCommand\(\{[\s\S]*?ConditionExpression:\s*'attribute_not_exists\(recordId\)'[\s\S]*?\}\)/,
    `${label} create path must use a conditional put so duplicate recordIds cannot overwrite existing records`,
  );
  assert.ok(source.includes('isConditionalCheckFailed'), `${label} must detect DynamoDB duplicate-key failures`);
  assert.ok(source.includes(DUPLICATE_ERROR), `${label} must return a duplicate-record error`);
  assert.match(source, /status(?:Code)?:\s*409/, `${label} duplicate creates must return HTTP 409`);
}

test('Next telecom create rejects duplicate recordIds instead of overwriting', () => {
  const source = readSource('app/api/telecom/route.ts');
  assert.ok(source.includes(CREATE_GUARD));
  assertCreateGuard(source, 'Next telecom API');
});

test('Lambda telecom create rejects duplicate recordIds instead of overwriting', () => {
  const source = readSource('infra/xena-ops-api/src/index.mjs');
  assert.ok(source.includes(CREATE_GUARD));
  assertCreateGuard(source, 'Lambda telecom API');
});
