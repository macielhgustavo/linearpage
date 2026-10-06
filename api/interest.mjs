import { db, configured } from '../server/db.mjs';
import { send, sameOrigin, readJson, method } from '../server/http.mjs';

const energyLabels = {
  '': 'não informado', ate_10k: 'até R$ 10 mil/mês', '10_30k': 'R$ 10–30 mil/mês',
  '30_100k': 'R$ 30–100 mil/mês', '100k_plus': 'acima de R$ 100 mil/mês',
};
const interestLabels = {
  reduzir_custos: 'reduzir custos de energia',
  identificar_desperdicios: 'identificar desperdícios',
  monitorar_maquinas: 'monitorar máquinas',
  entender_consumo: 'entender melhor o consumo',
  outro: 'outro',
};
const text = (value, max) => String(value || '').trim().slice(0, max);

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  if (!sameOrigin(req)) return send(res, 403, { error: 'Origem não permitida.' });
  if (!configured()) return send(res, 503, { error: 'Banco de dados ainda não configurado.' });
  try {
    const raw = await readJson(req);
    const payload = {
      company: text(raw.company, 160),
      contact: text(raw.contact, 160),
      role: text(raw.role, 120),
      email: text(raw.email, 254),
      phone: text(raw.phone, 40),
      energyBill: text(raw.energyBill, 30),
      interest: text(raw.interest, 60),
      website: text(raw.website, 120),
      source: text(raw.source, 100),
      utmSource: text(raw.utmSource, 120),
      utmMedium: text(raw.utmMedium, 120),
      utmCampaign: text(raw.utmCampaign, 160),
    };
    if (!payload.company || !payload.contact || payload.phone.length < 6) {
      return send(res, 400, { error: 'Revise nome, empresa e telefone.' });
    }
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return send(res, 400, { error: 'Revise o e-mail informado.' });
    }
    if (payload.website) return send(res, 201, { ok: true });

    const sourceDetail = (payload.utmSource || payload.source || 'site').slice(0, 70);
    const notes = [
      `Cargo: ${payload.role || 'não informado'}`,
      `Conta de energia: ${energyLabels[payload.energyBill] || 'não informado'}`,
      `Interesse principal: ${interestLabels[payload.interest] || 'outro'}`,
      payload.utmMedium ? `UTM medium: ${payload.utmMedium}` : '',
      payload.utmCampaign ? `UTM campaign: ${payload.utmCampaign}` : '',
    ].filter(Boolean).join('\n');

    const created = await db('linear_leads', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        company: payload.company,
        contact: payload.contact,
        email: payload.email,
        phone: payload.phone,
        stage: 'novo',
        value_cents: 0,
        source: `Landing · ${sourceDetail}`,
        next_action: 'Entrar em contato para avaliar aderência ao piloto da Linear.',
        next_contact: '',
        notes,
      }),
    });
    const leadId = created?.[0]?.id;
    if (leadId) {
      await db('linear_audit_log', {
        method: 'POST',
        body: JSON.stringify({ actor: 'landing', action: 'lead.create', record_id: leadId }),
      });
    }
    return send(res, 201, { ok: true });
  } catch (error) {
    console.error(error);
    const bad = error instanceof SyntaxError || ['CONTENT_TYPE', 'SIZE'].includes(error?.message);
    return send(res, bad ? 400 : 500, { error: bad ? 'Requisição inválida.' : 'Não foi possível concluir. Tente novamente.' });
  }
}
