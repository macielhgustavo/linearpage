import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handle, type Env } from '../worker/index';

function testEnv() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_commercial.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../migrations/0002_smoke_mvp.sql', import.meta.url), 'utf8'));
  const prepare = (sql: string) => {
    let params: unknown[] = [];
    const query = {
      bind(...args: unknown[]) { params = args; return query; },
      async first() { return db.prepare(sql).get(...params as []) ?? null; },
      async all() { return { results: db.prepare(sql).all(...params as []) }; },
      async run() { return db.prepare(sql).run(...params as []); },
    };
    return query;
  };
  const env = {
    DB: {
      prepare,
      async batch(statements: { run(): Promise<unknown> }[]) {
        db.exec('BEGIN');
        try {
          const results = [];
          for (const statement of statements) results.push(await statement.run());
          db.exec('COMMIT');
          return results;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      },
    },
    ASSETS: { fetch: () => new Response('public') },
  } as unknown as Env;
  return { db, env };
}

const post = (env: Env, path: string, body: unknown, origin = 'https://linear.test') =>
  handle(new Request(`https://linear.test${path}`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), env);

test('smoke MVP accepts public analytics and turns interest into a CRM lead', async () => {
  const { db, env } = testEnv();
  try {
    const event = await post(env, '/events', {
      sessionId: 'session-12345678',
      name: 'cta_click',
      path: '/',
      source: 'direct',
      utmSource: 'email',
      utmMedium: 'outbound',
      utmCampaign: 'plastico-pr',
      metadata: { cta: 'hero' },
    });
    assert.equal(event.status, 204);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM smoke_events').get()!.n, 1);

    const interest = await post(env, '/interest', {
      company: 'Indústria Teste',
      contact: 'Gestor Teste',
      role: 'Gerente industrial',
      email: 'gestor@example.com',
      phone: '42999999999',
      energyBill: '30_100k',
      interest: 'identificar_desperdicios',
      website: '',
      source: 'direct',
      utmSource: 'email',
      utmMedium: 'outbound',
      utmCampaign: 'plastico-pr',
    });
    assert.equal(interest.status, 201);
    const lead = db.prepare('SELECT company, stage, source, notes FROM leads').get() as Record<string, string>;
    assert.equal(lead.company, 'Indústria Teste');
    assert.equal(lead.stage, 'novo');
    assert.match(lead.source, /^Landing/);
    assert.match(lead.notes, /R\$ 30–100 mil\/mês/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM audit_log').get()!.n, 1);
  } finally { db.close(); }
});

test('smoke MVP rejects cross-origin public writes and ignores honeypot submissions', async () => {
  const { db, env } = testEnv();
  try {
    assert.equal((await post(env, '/events', { sessionId: 'session-12345678', name: 'landing_view', path: '/', source: '', utmSource: '', utmMedium: '', utmCampaign: '', metadata: {} }, 'https://evil.test')).status, 403);
    const bot = await post(env, '/interest', {
      company: 'Bot',
      contact: 'Bot',
      role: '',
      email: '',
      phone: '42999999999',
      energyBill: '',
      interest: 'outro',
      website: 'spam.example',
      source: 'direct',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
    });
    assert.equal(bot.status, 201);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM leads').get()!.n, 0);
  } finally { db.close(); }
});
