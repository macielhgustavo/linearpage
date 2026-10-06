const required = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'];

export function configured() {
  return required.every((key) => process.env[key]?.trim());
}

export async function db(path, options = {}) {
  if (!configured()) throw new Error('DB_NOT_CONFIGURED');
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SUPABASE_${response.status}: ${body.slice(0, 500)}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const leadFromRow = (row) => ({
  id: row.id,
  company: row.company,
  contact: row.contact || '',
  email: row.email || '',
  phone: row.phone || '',
  stage: row.stage,
  valueCents: Number(row.value_cents || 0),
  source: row.source || '',
  nextAction: row.next_action || '',
  nextContact: row.next_contact || '',
  notes: row.notes || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const activityFromRow = (row) => ({
  id: row.id,
  leadId: row.lead_id,
  text: row.text,
  createdAt: row.created_at,
});
