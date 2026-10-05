import { authorize, type AuthEnv } from './auth';
import { leadSchema, activitySchema, smokeInterestSchema, smokeEventSchema } from '../src/lib/commercial';

export interface Env extends AuthEnv { ASSETS: Fetcher; DB: D1Database }
export const privatePath = (path: string) => path === '/admin' || path.startsWith('/admin/') || path === '/api' || path.startsWith('/api/');
const json = (body: unknown, status = 200) => Response.json(body, { status });
const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
export function secure(response: Response, request: Request) {
  const output = new Response(response.body, response);
  for (const [key, value] of Object.entries(securityHeaders)) output.headers.set(key, value);
  if (new URL(request.url).protocol === 'https:') output.headers.set('Strict-Transport-Security', 'max-age=31536000');
  if (privatePath(new URL(request.url).pathname)) {
    output.headers.set('Cache-Control', 'no-store');
    output.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return output;
}
async function readBody(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('CONTENT_TYPE');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('BODY');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 24000) { await reader.cancel(); throw new Error('SIZE'); }
    chunks.push(value);
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(data));
}
const sameOrigin = (request: Request) => request.headers.get('Origin') === new URL(request.url).origin;
const energyLabels: Record<string, string> = {
  '': 'não informado', ate_10k: 'até R$ 10 mil/mês', '10_30k': 'R$ 10–30 mil/mês',
  '30_100k': 'R$ 30–100 mil/mês', '100k_plus': 'acima de R$ 100 mil/mês',
};
const interestLabels: Record<string, string> = {
  reduzir_custos: 'reduzir custos de energia', identificar_desperdicios: 'identificar desperdícios',
  monitorar_maquinas: 'monitorar máquinas', entender_consumo: 'entender melhor o consumo', outro: 'outro',
};
async function publicApi(request: Request, env: Env): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (pathname !== '/interest' && pathname !== '/events') return null;
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  if (!sameOrigin(request)) return json({ error: 'Origem não permitida.' }, 403);
  if (!env.DB) return json({ error: 'Serviço temporariamente indisponível.' }, 503);
  if (pathname === '/events') {
    const parsed = smokeEventSchema.safeParse(await readBody(request));
    if (!parsed.success) return json({ error: 'Evento inválido.' }, 400);
    const event = parsed.data;
    await env.DB.prepare(
      'INSERT INTO smoke_events (id,sessionId,name,path,source,utmSource,utmMedium,utmCampaign,metadata,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).bind(
      crypto.randomUUID(), event.sessionId, event.name, event.path, event.source,
      event.utmSource, event.utmMedium, event.utmCampaign, JSON.stringify(event.metadata), new Date().toISOString()
    ).run();
    return new Response(null, { status: 204 });
  }
  const parsed = smokeInterestSchema.safeParse(await readBody(request));
  if (!parsed.success) return json({ error: 'Revise nome, empresa, telefone e e-mail.' }, 400);
  const interest = parsed.data;
  if (interest.website) return json({ ok: true }, 201);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const sourceDetail = (interest.utmSource || interest.source || 'site').slice(0, 70);
  const source = `Landing · ${sourceDetail}`;
  const notes = [
    `Cargo: ${interest.role || 'não informado'}`,
    `Conta de energia: ${energyLabels[interest.energyBill]}`,
    `Interesse principal: ${interestLabels[interest.interest]}`,
    interest.utmMedium ? `UTM medium: ${interest.utmMedium}` : '',
    interest.utmCampaign ? `UTM campaign: ${interest.utmCampaign}` : '',
  ].filter(Boolean).join('\n');
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO leads (company,contact,email,phone,stage,valueCents,source,nextAction,nextContact,notes,updatedAt,createdAt,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(
      interest.company, interest.contact, interest.email, interest.phone, 'novo', 0, source,
      'Entrar em contato para avaliar aderência ao piloto da Linear.', '', notes, now, now, id
    ),
    env.DB.prepare('INSERT INTO audit_log (id, actor, action, recordId, createdAt) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), 'landing', 'lead.create', id, now),
  ]);
  return json({ ok: true }, 201);
}
export async function api(request: Request, env: Env, actor: string, local = false): Promise<Response> {
  const { pathname, origin } = new URL(request.url);
  if (request.method !== 'GET' && request.headers.get('Origin') !== origin) return json({ error: 'Origem não permitida.' }, 403);
  if (pathname === '/api/session' && request.method === 'GET') return json({ email: actor, local });
  if (!env.DB) return json({ error: 'Banco de dados não configurado.' }, 503);
  const audit = (action: string, recordId: string) => env.DB.prepare('INSERT INTO audit_log (id, actor, action, recordId, createdAt) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), actor, action, recordId, new Date().toISOString());
  if (pathname === '/api/smoke-metrics' && request.method === 'GET') {
    const events = await env.DB.prepare('SELECT name, COUNT(*) AS count FROM smoke_events GROUP BY name').all();
    const leads = await env.DB.prepare("SELECT COUNT(*) AS count FROM leads WHERE source LIKE 'Landing · %'").first<{ count: number }>();
    return json({ events: events.results, leads: leads?.count ?? 0 });
  }
  if (pathname === '/api/leads' && request.method === 'GET') {
    const result = await env.DB.prepare('SELECT * FROM leads ORDER BY updatedAt DESC').all();
    return json(result.results);
  }
  const match = pathname.match(/^\/api\/leads\/([a-f0-9-]{36})(\/activities)?$/);
  if (match?.[2]) {
    const id = match[1];
    if (!await env.DB.prepare('SELECT id FROM leads WHERE id = ?').bind(id).first()) return json({ error: 'Oportunidade não encontrada.' }, 404);
    if (request.method === 'GET') return json((await env.DB.prepare('SELECT * FROM activities WHERE leadId = ? ORDER BY createdAt DESC').bind(id).all()).results);
    if (request.method === 'POST') {
      const parsed = activitySchema.safeParse(await readBody(request));
      if (!parsed.success) return json({ error: 'Informe um contato válido (até 2000 caracteres).' }, 400);
      const entry = { id: crypto.randomUUID(), leadId: id, text: parsed.data.text, createdAt: new Date().toISOString() };
      await env.DB.batch([
        env.DB.prepare('INSERT INTO activities (id, leadId, text, createdAt) VALUES (?, ?, ?, ?)').bind(entry.id, id, entry.text, entry.createdAt),
        audit('contact.create', id),
      ]);
      return json(entry, 201);
    }
  }
  if ((pathname === '/api/leads' && request.method === 'POST') || (match && !match[2] && request.method === 'PUT')) {
    const parsed = leadSchema.safeParse(await readBody(request));
    if (!parsed.success) return json({ error: 'Revise os campos: empresa, e-mail, valor e data devem ser válidos.' }, 400);
    const id = match?.[1] ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const lead = parsed.data;
    const values = [lead.company, lead.contact, lead.email, lead.phone, lead.stage, lead.valueCents, lead.source, lead.nextAction, lead.nextContact, lead.notes];
    if (match && !await env.DB.prepare('SELECT id FROM leads WHERE id = ?').bind(id).first()) return json({ error: 'Oportunidade não encontrada.' }, 404);
    const statement = match
      ? env.DB.prepare('UPDATE leads SET company=?, contact=?, email=?, phone=?, stage=?, valueCents=?, source=?, nextAction=?, nextContact=?, notes=?, updatedAt=? WHERE id=?').bind(...values, now, id)
      : env.DB.prepare('INSERT INTO leads (company,contact,email,phone,stage,valueCents,source,nextAction,nextContact,notes,updatedAt,createdAt,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...values, now, now, id);
    await env.DB.batch([statement, audit(match ? 'lead.update' : 'lead.create', id)]);
    return json(await env.DB.prepare('SELECT * FROM leads WHERE id=?').bind(id).first(), match ? 200 : 201);
  }
  if (match && !match[2] && request.method === 'DELETE') {
    if (!await env.DB.prepare('SELECT id FROM leads WHERE id=?').bind(match[1]).first()) return json({ error: 'Oportunidade não encontrada.' }, 404);
    await env.DB.batch([env.DB.prepare('DELETE FROM leads WHERE id=?').bind(match[1]), audit('lead.delete', match[1])]);
    return new Response(null, { status: 204 });
  }
  return json({ error: 'Rota não encontrada.' }, 404);
}
export async function handle(request: Request, env: Env, identity: string | null = null, local = false) {
  const path = new URL(request.url).pathname;
  try {
    const publicResponse = await publicApi(request, env);
    if (publicResponse) return secure(publicResponse, request);
    if (privatePath(path)) {
      const actor = identity ?? await authorize(request, env);
      if (!actor) return secure(json({ error: 'Acesso restrito. Entre com sua conta autorizada pelo Cloudflare Access.' }, 401), request);
      if (path.startsWith('/api/')) return secure(await api(request, env, actor, local), request);
    }
    return secure(await env.ASSETS.fetch(request), request);
  } catch (error) {
    const badRequest = error instanceof Error && ['CONTENT_TYPE', 'BODY', 'SIZE'].includes(error.message) || error instanceof SyntaxError;
    return secure(json({ error: badRequest ? 'Requisição inválida.' : 'Não foi possível concluir. Tente novamente.' }, badRequest ? 400 : 500), request);
  }
}
export default { fetch: (request: Request, env: Env) => handle(request, env) };
