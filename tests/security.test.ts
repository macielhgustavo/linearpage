import test from 'node:test';
import assert from 'node:assert/strict';
import { handle, api, secure, type Env } from '../worker/index';
import { authorize, verifyIdentity } from '../worker/auth';
import { generateKeyPair, SignJWT } from 'jose';
import { leadSchema, summarize, type Lead } from '../src/lib/commercial';

test('production denies private HTML and API without Access, including spoofed identity headers', async () => {
  const env = { ADMIN_EMAIL: 'owner@example.com', ASSETS: { fetch: () => new Response('public') } } as unknown as Env;
  for (const path of ['/admin', '/admin/', '/admin/index.html', '/api/leads', '/api/session']) {
    const response = await handle(new Request(`https://example.com${path}`, { headers: { 'Cf-Access-Authenticated-User-Email': 'owner@example.com' } }), env);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  assert.equal((await handle(new Request('https://example.com/'), env)).status, 200);
});

test('missing, invalid and tampered Access assertions are rejected', async () => {
  const env = { ADMIN_EMAIL: 'owner@example.com', ACCESS_TEAM_DOMAIN: 'linear.cloudflareaccess.com', ACCESS_AUD: 'test-audience' };
  assert.equal(await authorize(new Request('https://example.com/admin'), env), null);
  assert.equal(await authorize(new Request('https://example.com/admin', { headers: { 'Cf-Access-Jwt-Assertion': 'not-a-jwt' } }), env), null);
  assert.equal(await authorize(new Request('https://example.com/admin'), { ...env, ACCESS_TEAM_DOMAIN: 'evil.example.com' }), null);
});

test('cross-site writes are denied before any database access', async () => {
  const request = new Request('https://example.com/api/leads', { method: 'POST', headers: { Origin: 'https://evil.example.com' }, body: '{}' });
  const response = await api(request, {} as Env, 'owner@example.com');
  assert.equal(response.status, 403);
});

test('headers prohibit inline scripts and caching on private endpoints', () => {
  const result = secure(new Response('ok'), new Request('https://example.com/api/leads'));
  assert.equal(result.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.match(result.headers.get('Content-Security-Policy')!, /script-src 'self';/);
  assert.equal(result.headers.get('Strict-Transport-Security'), 'max-age=31536000');
});

const valid = { company: 'Empresa', stage: 'novo', valueCents: 12500 };
test('only valid signed Access tokens for the configured owner, issuer and audience pass', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const issuer = 'https://linear.cloudflareaccess.com';
  const sign = (email = 'owner@example.com', aud = 'admin-app', iss = issuer, expiry = '1h') => new SignJWT({ email }).setProtectedHeader({ alg: 'RS256' }).setIssuedAt().setIssuer(iss).setAudience(aud).setExpirationTime(expiry).sign(privateKey);
  const verify = (token: string) => verifyIdentity(token, async () => publicKey, issuer, 'admin-app', 'owner@example.com');
  assert.equal(await verify(await sign()), 'owner@example.com');
  assert.equal(await verify(await sign('other@example.com')), null);
  assert.equal(await verify(await sign('owner@example.com', 'other-app')), null);
  assert.equal(await verify(await sign('owner@example.com', 'admin-app', 'https://wrong.cloudflareaccess.com')), null);
  assert.equal(await verify(await sign('owner@example.com', 'admin-app', issuer, '-1h')), null);
  const parts = (await sign()).split('.');
  parts[1] = Buffer.from(JSON.stringify({ email: 'owner@example.com' })).toString('base64url');
  assert.equal(await verify(parts.join('.')), null);
});
test('input rejects unexpected fields, invalid dates and negative or fractional money', () => {
  assert.equal(leadSchema.safeParse(valid).success, true);
  for (const invalid of [{ company: '  ' }, { email: 'invalid' }, { stage: 'admin' }, { valueCents: -1 }, { valueCents: 1.5 }, { nextContact: '2026-02-30' }, { role: 'admin' }]) {
    assert.equal(leadSchema.safeParse({ ...valid, ...invalid }).success, false);
  }
});

test('commercial totals exclude lost/won from pipeline and closed deals from agenda', () => {
  const lead = (stage: string, nextContact: string) => ({ ...valid, id: stage, stage, nextContact }) as Lead;
  const summary = summarize([lead('novo', '2026-09-28'), lead('proposta', '2026-09-29'), lead('ganho', '2026-09-20'), lead('perdido', '2026-09-20')], '2026-09-29');
  assert.deepEqual(summary, { open: 2, pipeline: 25000, overdue: 1, dueToday: 1, won: 12500 });
});
