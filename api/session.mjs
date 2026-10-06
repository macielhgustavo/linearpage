import { send, requireAdmin, method } from './_lib/http.mjs';
export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  if (!requireAdmin(req, res)) return;
  return send(res, 200, { email: process.env.ADMIN_EMAIL || 'admin', local: false });
}
