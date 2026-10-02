import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface AuthEnv { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string; ADMIN_EMAIL: string }
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function authorize(request: Request, env: AuthEnv): Promise<string | null> {
  const team = env.ACCESS_TEAM_DOMAIN;
  if (!team || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) || !env.ACCESS_AUD || !env.ADMIN_EMAIL) return null;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  const issuer = `https://${team}`;
  let keys = keySets.get(issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    keySets.set(issuer, keys);
  }
  return verifyIdentity(token, keys, issuer, env.ACCESS_AUD, env.ADMIN_EMAIL);
}

export async function verifyIdentity(token: string, keys: JWTVerifyGetKey, issuer: string, audience: string, email: string) {
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer, audience, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'email'],
    });
    return typeof payload.email === 'string' && payload.email.toLowerCase() === email.toLowerCase() ? payload.email : null;
  } catch { return null; }
}
