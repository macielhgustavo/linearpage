import { database, collections, configured } from '../server/db.mjs';
import { send, requireAdmin, method } from '../server/http.mjs';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  if (!requireAdmin(req, res)) return;
  if (!configured()) return send(res, 503, { error: 'Banco de dados não configurado.' });

  try {
    const db = await database();
    const eventCounts = await db.collection(collections.events).aggregate([
      { $group: { _id: '$name', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    const leads = await db.collection(collections.leads).countDocuments({ source: /^Landing · / });

    return send(res, 200, {
      events: eventCounts.map(item => ({ name: item._id, count: item.count })),
      leads,
    });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'Não foi possível carregar métricas.' });
  }
}
