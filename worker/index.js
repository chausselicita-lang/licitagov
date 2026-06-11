/**
 * LicitaGov — Cloudflare Worker proxy para Anthropic API
 * Resolve bloqueio CORS do GitHub Pages ao chamar api.anthropic.com
 */

const ANTHROPIC_API = 'https://api.anthropic.com';

const ALLOWED_ORIGINS = [
  'https://chausselicita-lang.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-beta',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/v1/messages') {
      return new Response('Not Found', { status: 404 });
    }

    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: { message: 'x-api-key header is required' } }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
      );
    }

    const forwardHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
    };
    const beta = request.headers.get('anthropic-beta');
    if (beta) forwardHeaders['anthropic-beta'] = beta;

    let upstreamRes;
    try {
      upstreamRes = await fetch(`${ANTHROPIC_API}/v1/messages`, {
        method: 'POST',
        headers: forwardHeaders,
        body: request.body,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: { message: `Proxy error: ${err.message}` } }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
      );
    }

    const responseHeaders = new Headers(corsHeaders(origin));
    responseHeaders.set('Content-Type', upstreamRes.headers.get('Content-Type') || 'application/json');

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  },
};
