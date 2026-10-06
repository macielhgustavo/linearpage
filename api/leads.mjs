import { ObjectId } from 'mongodb';
import { database, collections, configured, leadFromDoc } from '../server/db.mjs';
import { send, sameOrigin, readJson, requireAdmin, method } from '../server/http.mjs';

const stages = new Set(['novo','qualificado','proposta','negociacao','ganho','perdido']);
const text = (value, max) => String(value || '').trim().slice(0, max);
const objectId = (id) => ObjectId.isValid(id || '') ? new ObjectId(id) : null;

export default async function handler(req, res) {
  if (!method(req, res, ['GET','POST','PUT','DELETE'])) return;
  if (!requireAdmin(req, res)) return;
  if (!configured()) return send(res, 503, { error: 'Banco de dados não configurado.' });
  if (req.method !== 'GET' && !sameOrigin(req)) return send(res, 403, { error: 'Origem não permitida.' });

  try {
    const db = await database();
    const id = text(req.query?.id, 40);

    if (req.method === 'GET') {
      const docs = await db.collection(collections.leads).find({}).sort({ updatedAt: -1 }).toArray();
      return send(res, 200, docs.map(leadFromDoc));
    }

    if (req.method === 'DELETE') {
      const _id = objectId(id);
      if (!_id) return send(res, 400, { error: 'ID inválido.' });
      const result = await db.collection(collections.leads).deleteOne({ _id });
      if (!result.deletedCount) return send(res, 404, { error: 'Oportunidade não encontrada.' });
      await Promise.all([
        db.collection(collections.activities).deleteMany({ leadId: _id }),
        db.collection(collections.audit).insertOne({ actor: 'admin', action: 'lead.delete', recordId: _id, createdAt: new Date() }),
      ]);
      return send(res, 204);
    }

    const raw = await readJson(req);
    const stage = text(raw.stage, 30);
    const valueCents = Number.isSafeInteger(raw.valueCents) && raw.valueCents >= 0 ? raw.valueCents : -1;
    const lead = {
      company: text(raw.company, 160),
      contact: text(raw.contact, 160),
      email: text(raw.email, 254),
      phone: text(raw.phone, 40),
      stage,
      valueCents,
      source: text(raw.source, 100),
      nextAction: text(raw.nextAction, 300),
      nextContact: text(raw.nextContact, 20),
      notes: text(raw.notes, 5000),
      updatedAt: new Date(),
    };

    if (!lead.company || !stages.has(stage) || valueCents < 0 ||
      (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email))) {
      return send(res, 400, { error: 'Revise os campos da oportunidade.' });
    }

    if (req.method === 'POST') {
      const doc = { ...lead, createdAt: lead.updatedAt };
      const result = await db.collection(collections.leads).insertOne(doc);
      const created = { ...doc, _id: result.insertedId };
      await db.collection(collections.audit).insertOne({
        actor: 'admin', action: 'lead.create', recordId: result.insertedId, createdAt: new Date(),
      });
      return send(res, 201, leadFromDoc(created));
    }

    const _id = objectId(id);
    if (!_id) return send(res, 400, { error: 'ID inválido.' });
    const existing = await db.collection(collections.leads).findOneAndUpdate(
      { _id },
      { $set: lead },
      { returnDocument: 'after' }
    );
    if (!existing) return send(res, 404, { error: 'Oportunidade não encontrada.' });
    await db.collection(collections.audit).insertOne({
      actor: 'admin', action: 'lead.update', recordId: _id, createdAt: new Date(),
    });
    return send(res, 200, leadFromDoc(existing));
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'Não foi possível concluir.' });
  }
}
