import { db, configured } from './_lib/db.mjs';
import { send, requireAdmin, method } from './_lib/http.mjs';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  if (!requireAdmin(req, res)) return;
  if (!configured()) return send(res, 503, { error: 'Banco de dados não configurado.' });
  try {
    const rows = await db('linear_smoke_events?select=name');
    const events = Object.entries(rows.reduce((acc, row) => {
      acc[row.name] = (acc[row.name] || 0) + 1;
      return acc;
    }, {})).map(([name, count]) => ({ name, count }));
    const leads = await db('linear_leads?source=like.Landing%20%C2%B7%20*&select=id');
    return send(res, 200, { events, leads: leads.length });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'Não foi possível carregar métricas.' });
  }
}
