import { database, collections, configured } from '../server/db.mjs';
import { send, sameOrigin, readJson, method } from '../server/http.mjs';

const allowed = new Set(['landing_view','scroll_50','demo_view','how_it_works_view','cta_click','form_start','form_submit','form_error']);
const text = (value, max) => String(value || '').trim().slice(0, max);

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  if (!sameOrigin(req)) return send(res, 403, { error: 'Origem não permitida.' });
  if (!configured()) return send(res, 204);

  try {
    const raw = await readJson(req);
    const name = text(raw.name, 50);
    const sessionId = text(raw.sessionId, 80);
    if (!allowed.has(name) || sessionId.length < 8) return send(res, 400, { error: 'Evento inválido.' });

    const db = await database();
    await db.collection(collections.events).insertOne({
      sessionId,
      name,
      path: text(raw.path || '/', 300),
      source: text(raw.source, 100),
      utmSource: text(raw.utmSource, 120),
      utmMedium: text(raw.utmMedium, 120),
      utmCampaign: text(raw.utmCampaign, 160),
      metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
      createdAt: new Date(),
    });

    return send(res, 204);
  } catch (error) {
    console.error(error);
    return send(res, 204);
  }
}
