import { ObjectId } from 'mongodb';
import { database, collections, configured, activityFromDoc } from '../server/db.mjs';
import { send, sameOrigin, readJson, requireAdmin, method } from '../server/http.mjs';

export default async function handler(req, res) {
  if (!method(req, res, ['GET','POST'])) return;
  if (!requireAdmin(req, res)) return;
  if (!configured()) return send(res, 503, { error: 'Banco de dados não configurado.' });
  if (req.method === 'POST' && !sameOrigin(req)) return send(res, 403, { error: 'Origem não permitida.' });

  const leadIdText = String(req.query?.leadId || '');
  if (!ObjectId.isValid(leadIdText)) return send(res, 400, { error: 'Lead inválido.' });
  const leadId = new ObjectId(leadIdText);

  try {
    const db = await database();
    const leadExists = await db.collection(collections.leads).findOne({ _id: leadId }, { projection: { _id: 1 } });
    if (!leadExists) return send(res, 404, { error: 'Oportunidade não encontrada.' });

    if (req.method === 'GET') {
      const docs = await db.collection(collections.activities).find({ leadId }).sort({ createdAt: -1 }).toArray();
      return send(res, 200, docs.map(activityFromDoc));
    }

    const raw = await readJson(req);
    const value = String(raw.text || '').trim().slice(0, 2000);
    if (!value) return send(res, 400, { error: 'Informe um contato válido.' });

    const doc = { leadId, text: value, createdAt: new Date() };
    const result = await db.collection(collections.activities).insertOne(doc);
    await db.collection(collections.audit).insertOne({
      actor: 'admin', action: 'contact.create', recordId: leadId, createdAt: new Date(),
    });
    return send(res, 201, activityFromDoc({ ...doc, _id: result.insertedId }));
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'Não foi possível concluir.' });
  }
}
