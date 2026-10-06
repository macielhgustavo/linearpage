import test from 'node:test';
import assert from 'node:assert/strict';
import { leadSchema, smokeInterestSchema, smokeEventSchema, summarize, type Lead } from '../src/lib/commercial';

test('commercial schemas still validate the smoke MVP and CRM data', () => {
  assert.equal(leadSchema.safeParse({ company: 'Indústria', stage: 'novo', valueCents: 0 }).success, true);
  assert.equal(smokeInterestSchema.safeParse({
    company: 'Indústria',
    contact: 'Gestor',
    phone: '42999999999',
    interest: 'identificar_desperdicios'
  }).success, true);
  assert.equal(smokeEventSchema.safeParse({
    sessionId: 'session-12345678',
    name: 'cta_click',
    path: '/',
    metadata: { cta: 'hero' }
  }).success, true);
});

test('commercial totals keep closed deals out of the active pipeline', () => {
  const base = { company: 'Empresa', contact: '', email: '', phone: '', valueCents: 12500, source: '', nextAction: '', notes: '', createdAt: '', updatedAt: '' };
  const lead = (stage: string, nextContact: string) => ({ ...base, id: stage, stage, nextContact }) as Lead;
  const result = summarize([
    lead('novo', '2026-10-01'),
    lead('proposta', '2026-10-06'),
    lead('ganho', '2026-10-01'),
    lead('perdido', '2026-10-01')
  ], '2026-10-06');
  assert.deepEqual(result, { open: 2, pipeline: 25000, overdue: 1, dueToday: 1, won: 12500 });
});

test('Vercel function modules can be loaded without Cloudflare bindings', async () => {
  for (const path of [
    '../api/interest.mjs',
    '../api/events.mjs',
    '../api/leads.mjs',
    '../api/activities.mjs',
    '../api/session.mjs',
    '../api/smoke-metrics.mjs'
  ]) {
    const module = await import(path);
    assert.equal(typeof module.default, 'function');
  }
});
