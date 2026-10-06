import { db, configured, leadFromRow } from '../server/db.mjs';
import { send, sameOrigin, readJson, requireAdmin, method } from '../server/http.mjs';

const stages = new Set(['novo','qualificado','proposta','negociacao','ganho','perdido']);
const text = (value, max) => String(value || '').trim().slice(0, max);
const validId = (id) => /^[a-f0-9-]{36}$/i.test(id || '');

export default async function handler(req, res) {
  if (!method(req, res, ['GET','POST','PUT','DELETE'])) return;
  if (!requireAdmin(req, res)) return;
  if (!configured()) return send(res, 503, { error: 'Banco de dados não configurado.' });
  if (req.method !== 'GET' && !sameOrigin(req)) return send(res, 403, { error: 'Origem não permitida.' });
  try {
    const id = text(req.query?.id, 40);
    if (req.method === 'GET') {
      const rows = await db('linear_leads?select=*&order=updated_at.desc');
      return send(res, 200, rows.map(leadFromRow));
    }
    if (req.method === 'DELETE') {
      if (!validId(id)) return send(res, 400, { error: 'ID inválido.' });
      await db(`linear_leads?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      await db('linear_audit_log', { method: 'POST', body: JSON.stringify({ actor: 'admin', action: 'lead.delete', record_id: id }) });
      return send(res, 204);
    }
    const raw = await readJson(req);
    const stage = text(raw.stage, 30);
    const lead = {
      company: text(raw.company, 160),
      contact: text(raw.contact, 160),
      email: text(raw.email, 254),
      phone: text(raw.phone, 40),
      stage,
      value_cents: Number.isSafeInteger(raw.valueCents) && raw.valueCents >= 0 ? raw.valueCents : -1,
      source: text(raw.source, 100),
      next_action: text(raw.nextAction, 300),
      next_contact: text(raw.nextContact, 20),
      notes: text(raw.notes, 5000),
      updated_at: new Date().toISOString(),
    };
    if (!lead.company || !stages.has(stage) || lead.value_cents < 0 || (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email))) {
      return send(res, 400, { error: 'Revise os campos da oportunidade.' });
    }
    if (req.method === 'POST') {
      const rows = await db('linear_leads', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(lead),
      });
      const created = rows?.[0];
      await db('linear_audit_log', { method: 'POST', body: JSON.stringify({ actor: 'admin', action: 'lead.create', record_id: created.id }) });
      return send(res, 201, leadFromRow(created));
    }
    if (!validId(id)) return send(res, 400, { error: 'ID inválido.' });
    const rows = await db(`linear_leads?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(lead),
    });
    if (!rows?.length) return send(res, 404, { error: 'Oportunidade não encontrada.' });
    await db('linear_audit_log', { method: 'POST', body: JSON.stringify({ actor: 'admin', action: 'lead.update', record_id: id }) });
    return send(res, 200, leadFromRow(rows[0]));
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'Não foi possível concluir.' });
  }
}
