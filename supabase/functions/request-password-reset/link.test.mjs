// Unit tests for the recovery-link builder — the exact surface that broke
// (a double-encoded `&` in the reset link). Runtime-agnostic: runs under
// Node's built-in runner with `node --test` (no deno / no repo harness).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRecoveryLink } from './link.js'

const ALLOWED = ['https://myoozz.events', 'https://demo.myoozz.events']

test('builds the app-handled link with a SINGLE literal ampersand', () => {
  const url = buildRecoveryLink('https://myoozz.events', 'abc123', ALLOWED)
  assert.equal(url, 'https://myoozz.events/login?token_hash=abc123&type=recovery')
  assert.equal(url.includes('&amp;'), false) // the exact bug guard
})

test('honors an allow-listed origin (demo) so demo can test itself', () => {
  assert.equal(
    buildRecoveryLink('https://demo.myoozz.events', 'tok', ALLOWED),
    'https://demo.myoozz.events/login?token_hash=tok&type=recovery',
  )
})

test('falls back to prod origin for a non-allow-listed origin (anti open-redirect)', () => {
  assert.equal(
    buildRecoveryLink('https://evil.example.com', 'tok', ALLOWED),
    'https://myoozz.events/login?token_hash=tok&type=recovery',
  )
})

test('falls back when origin is missing / non-string', () => {
  assert.equal(
    buildRecoveryLink(undefined, 'tok', ALLOWED),
    'https://myoozz.events/login?token_hash=tok&type=recovery',
  )
})
