import assert from 'node:assert/strict';
import test from 'node:test';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { createRecord } from '../infra/xena-ops-api/src/index.mjs';

const validIncident = {
  recordId: 'INCIDENT-LUX-2026-0001',
  title: 'Core link down',
  status: 'OPEN',
  severity: 'SEV1',
};

test('createRecord protects existing telecom records with a conditional put', async () => {
  let sentCommand;
  const ddb = {
    async send(command) {
      sentCommand = command;
      return {};
    },
  };

  const result = await createRecord('incidents', validIncident, ddb);

  assert.equal(result.statusCode, 201);
  assert.ok(sentCommand instanceof PutCommand);
  assert.equal(sentCommand.input.ConditionExpression, 'attribute_not_exists(recordId)');
  assert.equal(sentCommand.input.Item.recordId, validIncident.recordId);
});

test('createRecord returns conflict instead of overwriting a duplicate recordId', async () => {
  const duplicateError = new Error('The conditional request failed');
  duplicateError.name = 'ConditionalCheckFailedException';

  const ddb = {
    async send() {
      throw duplicateError;
    },
  };

  const result = await createRecord('incidents', validIncident, ddb);
  const body = JSON.parse(result.body);

  assert.equal(result.statusCode, 409);
  assert.equal(body.ok, false);
  assert.match(body.error, /INCIDENT-LUX-2026-0001 already exists/);
});
