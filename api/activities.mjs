import { db, configured, activityFromRow } from '../server/db.mjs';
import { send, sameOrigin, readJson, requireAdmin, method } from '../server/http.mjs';

const validId = (id) => /^[a-f0-9-]{36}$/i.test(id || '');

export default async function handler(req, res) {
  if (!method(req, res, ['GET','POST'])) return;
  if (!requireAdmin(req, res)) return;
  if (!configured()) return send(res, 503, { error: 'Banco de dados não configurado.' });
  if (req.method === 'POST' && !sameOrigin(req)) return send(res, 403, { error: 'Origem não permitida.' });
  const leadId = String(req.query?.leadId || '');
  if (!validId(leadId)) return send(res, 400, { error: 'Lead inválido.' });
  try {
    if (req.method === 'GET') {
      const rows = await db(`linear_activities?lead_id=eq.${encodeURIComponent(leadId)}&select=*&order=created_at.desc`);
      return send(res, 200, rows.map(activityFromRow));
    }
    const raw = await readJson(req);
    const value = String(raw.text || '').trim().slice(0, 2000);
    if (!value) return send(res, 400, { error: 'Informe um contato válido.' });
    const rows = await db('linear_activities', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ lead_id: leadId, text: value }),
    });
    await db('linear_audit_log', { method: 'POST', body: JSON.stringify({ actor: 'admin', action: 'contact.create', record_id: leadId }) });
    return send(res, 201, activityFromRow(rows[0]));
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'Não foi possível concluir.' });
  }
}
