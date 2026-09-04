import test from 'node:test';
import assert from 'node:assert/strict';
import { validateClientRequest } from '../lib/client-request.ts';

const form = { systemId: 'FV-0001', requestType: 'maintenance', name: ' Cliente prueba ', phone: '9991234567', message: 'Solicito mantenimiento', email: '', preferredDate: '' };

test('maps form fields to exact RPC parameters and normalizes optional values', () => {
  assert.deepEqual(validateClientRequest(form), { payload: {
    p_system_code: 'FV-0001', p_request_type: 'maintenance', p_customer_name: 'Cliente prueba',
    p_phone: '9991234567', p_email: null, p_message: 'Solicito mantenimiento', p_preferred_date: null,
  } });
});
test('maps failure without creating a completed maintenance', () => {
  assert.equal(validateClientRequest({ ...form, requestType: 'failure' }).payload.p_request_type, 'failure');
});
for (const [label, input] of [
  ['null', null], ['array', []], ['wrong field type', { ...form, name: {} }],
  ['invalid system', { ...form, systemId: 'other' }],
  ['invalid request type', { ...form, requestType: 'completed' }],
  ['invalid email', { ...form, email: 'not-an-email' }],
  ['too long message', { ...form, message: 'x'.repeat(1501) }],
  ['invalid calendar day', { ...form, preferredDate: '2027-02-30' }],
  ['date on failure', { ...form, requestType: 'failure', preferredDate: '2027-08-01' }],
  ['honeypot', { ...form, website: 'spam' }],
]) test(`rejects ${label}`, () => assert.ok('error' in validateClientRequest(input)));
test('accepts a valid preferred date', () => {
  assert.equal(validateClientRequest({ ...form, preferredDate: '2027-08-01' }).payload.p_preferred_date, '2027-08-01');
});
