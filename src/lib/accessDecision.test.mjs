import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateAccess } from './accessDecision.js'

test('super_admin is allowed even with no app_roles', () => {
  assert.deepEqual(evaluateAccess({ platform_role: 'super_admin' }), { allowed: true, suspended: false, reason: 'ok' })
})
test('app_roles.events grants access', () => {
  assert.equal(evaluateAccess({ app_roles: { events: 'manager' } }).allowed, true)
})
test('no events grant and not super_admin → denied (no-grant)', () => {
  assert.deepEqual(evaluateAccess({ app_roles: { books: 'owner' } }), { allowed: false, suspended: false, reason: 'no-grant' })
})
test('suspended is denied regardless of role/grant', () => {
  assert.deepEqual(
    evaluateAccess({ status: 'suspended', platform_role: 'super_admin', app_roles: { events: 'admin' } }),
    { allowed: false, suspended: true, reason: 'suspended' },
  )
})
test('falsy events role → denied (pins the truthiness contract)', () => {
  assert.deepEqual(evaluateAccess({ app_roles: { events: false } }), { allowed: false, suspended: false, reason: 'no-grant' })
})
test('empty / missing claims → denied, not a crash', () => {
  assert.deepEqual(evaluateAccess(null), { allowed: false, suspended: false, reason: 'no-grant' })
  assert.equal(evaluateAccess(undefined).allowed, false)
  assert.equal(evaluateAccess({}).allowed, false)
})
