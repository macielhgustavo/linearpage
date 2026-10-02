import { handle, type Env } from './index';

// This entry point is only referenced by the local Wrangler configuration.
export default {
  fetch(request: Request, env: Env) {
    if (!['localhost', '127.0.0.1'].includes(new URL(request.url).hostname)) return new Response('Local only', { status: 403 });
    return handle(request, env, env.ADMIN_EMAIL, true);
  },
};
