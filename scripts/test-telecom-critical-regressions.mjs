import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const appRoute = read('app/api/telecom/route.ts');
const lambdaRoute = read('infra/xena-ops-api/src/index.mjs');
const dashboard = read('features/chat/components/ModuleDashboard.tsx');
const shell = read('features/chat/ChatShell.tsx');

for (const [name, source] of [
  ['Next.js telecom API', appRoute],
  ['Lambda telecom API', lambdaRoute],
]) {
  assert.match(
    source,
    /ConditionExpression:\s*['"]attribute_not_exists\(recordId\)['"]/,
    `${name} must reject duplicate creates instead of overwriting existing records`,
  );
  assert.match(
    source,
    /ConditionalCheckFailedException/,
    `${name} must convert duplicate create failures into a client-visible conflict`,
  );
  assert.match(
    source,
    /status(?:Code)?:\s*409/,
    `${name} must return HTTP 409 for duplicate create attempts`,
  );
}

assert.match(
  dashboard,
  /initialRecordId/,
  'ModuleDashboard must accept an initial record id for context-card navigation',
);
assert.match(
  shell,
  /initialRecordId=\{moduleFocus\?\.view === mode \? moduleFocus\.recordId : null\}/,
  'ChatShell must pass context-card focus into ModuleDashboard',
);
assert.match(
  dashboard,
  /loadTelecomView\(view,\s*true,\s*initialRecordId\)/,
  'ModuleDashboard must load the initially focused record via recordId merge',
);
assert.match(
  dashboard,
  /loadTelecomView\(view,\s*true,\s*result\.recordId \?\? recordId\)/,
  'ModuleDashboard updates must refresh with the updated record id',
);
assert.match(
  dashboard,
  /loadTelecomView\(view,\s*true,\s*result\.recordId \?\? result\.item\?\.recordId\)/,
  'ModuleDashboard creates must refresh with the created record id',
);

console.log('telecom critical regression checks passed');
