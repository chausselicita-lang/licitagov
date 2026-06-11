const ANTHROPIC_API = 'https://api.anthropic.com';

const ALLOWED_ORIGINS = [
  'https://chausselicita-lang.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
];

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-beta',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin') ?? '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin) });
  }

  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: 'x-api-key header is required' } }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } },
    );
  }

  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': req.headers.get('anthropic-version') ?? '2023-06-01',
  };
  const beta = req.headers.get('anthropic-beta');
  if (beta) forwardHeaders['anthropic-beta'] = beta;

  let upstream: Response;
  try {
    upstream = await fetch(`${ANTHROPIC_API}/v1/messages`, {
      method: 'POST',
      headers: forwardHeaders,
      body: req.body,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: { message: `Proxy error: ${msg}` } }),
      { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } },
    );
  }

  const respHeaders = new Headers(corsHeaders(origin));
  respHeaders.set('Content-Type', upstream.headers.get('Content-Type') ?? 'application/json');

  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
});
