// Unit tests for invite authorization (who may grant which events role).
// Runtime-agnostic: runs under Node's built-in runner with `node --test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { authorizeInvite, GRANTS, EVENTS_ROLES } from './invite-authz.js'

const T1 = 'tenant-1', T2 = 'tenant-2'
const caller = (over = {}) => ({ id: 'u1', role: 'admin', tenantId: T1, platformRole: null, status: 'active', ...over })

test('null caller → 401', () => {
  assert.deepEqual(authorizeInvite(null, { tenantId: T1, role: 'team' }), { ok: false, status: 401, error: 'Not authenticated' })
})

test('suspended caller → 403', () => {
  assert.equal(authorizeInvite(caller({ status: 'suspended' }), { tenantId: T1, role: 'team' }).status, 403)
})

test('invalid/non-events target role → 400 (even for super_admin)', () => {
  assert.equal(authorizeInvite(caller(), { tenantId: T1, role: 'owner' }).status, 400)
  assert.equal(authorizeInvite(caller({ platformRole: 'super_admin' }), { tenantId: T1, role: 'finance' }).status, 400)
  assert.equal(authorizeInvite(caller(), { tenantId: T1, role: 'nonsense' }).status, 400)
})

test('super_admin may grant any events role in any tenant', () => {
  for (const role of EVENTS_ROLES) {
    assert.equal(authorizeInvite(caller({ role: 'team', platformRole: 'super_admin', tenantId: T2 }), { tenantId: T1, role }).ok, true)
  }
})

test('admin may grant every events role within own tenant', () => {
  for (const role of EVENTS_ROLES) {
    assert.equal(authorizeInvite(caller({ role: 'admin' }), { tenantId: T1, role }).ok, true)
  }
})

test('manager may grant event_lead/team only', () => {
  assert.equal(authorizeInvite(caller({ role: 'manager' }), { tenantId: T1, role: 'event_lead' }).ok, true)
  assert.equal(authorizeInvite(caller({ role: 'manager' }), { tenantId: T1, role: 'team' }).ok, true)
  assert.equal(authorizeInvite(caller({ role: 'manager' }), { tenantId: T1, role: 'manager' }).status, 403)
  assert.equal(authorizeInvite(caller({ role: 'manager' }), { tenantId: T1, role: 'admin' }).status, 403)
})

test('event_lead may grant team only; team may grant nothing', () => {
  assert.equal(authorizeInvite(caller({ role: 'event_lead' }), { tenantId: T1, role: 'team' }).ok, true)
  assert.equal(authorizeInvite(caller({ role: 'event_lead' }), { tenantId: T1, role: 'event_lead' }).status, 403)
  assert.equal(authorizeInvite(caller({ role: 'team' }), { tenantId: T1, role: 'team' }).status, 403)
})

test('cross-tenant grant denied for non-super_admin', () => {
  assert.equal(authorizeInvite(caller({ role: 'admin', tenantId: T1 }), { tenantId: T2, role: 'team' }).status, 403)
})

test('GRANTS/EVENTS_ROLES shape guards', () => {
  assert.deepEqual(EVENTS_ROLES, ['admin', 'manager', 'event_lead', 'team'])
  assert.deepEqual(GRANTS.manager, ['event_lead', 'team'])
})
