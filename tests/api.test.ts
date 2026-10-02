import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handle, type Env } from '../worker/index';

test('API persists leads and activities, validates input, audits writes and cascades deletion', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_commercial.sql', import.meta.url), 'utf8'));
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
  const env = { DB: { prepare, async batch(statements: { run(): Promise<unknown> }[]) {
    db.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } } } as unknown as Env;
  const call = (path: string, method = 'GET', body?: unknown) => handle(new Request(`https://linear.test${path}`, { method, headers: { Origin: 'https://linear.test', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }), env, 'owner@example.com');
  try {
    assert.deepEqual(await (await call('/api/leads')).json(), []);
    const input = { company: "Teste ' <script>alert(1)</script>", stage: 'novo', valueCents: 12345 };
    assert.equal((await call('/api/leads', 'POST', { ...input, valueCents: -1 })).status, 400);
    const created = await call('/api/leads', 'POST', input);
    assert.equal(created.status, 201);
    const lead = await created.json() as { id: string };
    const path = `/api/leads/${lead.id}`;
    assert.equal((await call(path, 'PUT', { ...input, stage: 'proposta' })).status, 200);
    assert.equal((await call(`${path}/activities`, 'POST', { text: 'Contato registrado.' })).status, 201);
    assert.equal((await (await call(`${path}/activities`)).json() as unknown[]).length, 1);
    const list = await (await call('/api/leads')).json() as { company: string; stage: string }[];
    assert.equal(list[0].company, input.company);
    assert.equal(list[0].stage, 'proposta');
    assert.equal((await call('/api/leads', 'POST', { ...input, notes: 'x'.repeat(25000) })).status, 400);
    assert.equal((await call(path, 'DELETE')).status, 204);
    assert.deepEqual(await (await call('/api/leads')).json(), []);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM activities').get()!.n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM audit_log').get()!.n, 4);
    assert.equal((await call(path, 'PUT', input)).status, 404);
  } finally { db.close(); }
});
