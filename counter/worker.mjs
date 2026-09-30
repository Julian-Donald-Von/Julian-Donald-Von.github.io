const ORIGIN = 'https://julian-donald-von.github.io';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const headers = {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store', 'Vary': 'Origin'
    };
    const json = (body, status = 200) => Response.json(body, {status, headers});
    if (origin && origin !== ORIGIN) return json({error: 'Forbidden origin'}, 403);
    if (!['/count', '/stfu'].includes(url.pathname)) return json({error: 'Not found'}, 404);
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    const method = url.pathname === '/stfu' ? 'POST' : 'GET';
    if (request.method !== method) return json({error: 'Method not allowed'}, 405);
    if (!env.DB || typeof env.IP_SALT !== 'string' || env.IP_SALT.length < 32) {
      return json({error: 'Counter not configured'}, 503);
    }
    try {
      let count;
      if (method === 'POST') {
        if (origin !== ORIGIN) return json({error: 'Origin required'}, 403);
        // Cloudflare supplies this header on the deployed edge. No third-party IP lookup.
        const ip = request.headers.get('CF-Connecting-IP');
        if (!ip || ip === 'unknown' || !/^[0-9a-fA-F:.]+$/.test(ip)) return json({error: 'Client IP unavailable'}, 400);
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.IP_SALT),
          {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
        const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
        const hash = Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('');
        const results = await env.DB.batch([
          env.DB.prepare('INSERT OR IGNORE INTO stfu_clicks (ip_hash) VALUES (?)').bind(hash),
          env.DB.prepare('SELECT COUNT(*) AS count FROM stfu_clicks')
        ]);
        count = results[1].results[0].count;
      } else {
        count = (await env.DB.prepare('SELECT COUNT(*) AS count FROM stfu_clicks').first()).count;
      }
      if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid count');
      return json({count});
    } catch (_) {
      // Do not return database details, IPs, or secret material to clients.
      return json({error: 'Counter unavailable'}, 503);
    }
  }
};
