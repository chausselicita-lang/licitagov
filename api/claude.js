export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(400).json({
      error: { message: 'ANTHROPIC_API_KEY nao configurada nas variaveis de ambiente do Vercel.' },
    });
  }

  const forwardHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
  };
  const beta = req.headers['anthropic-beta'];
  if (beta) forwardHeaders['anthropic-beta'] = beta;

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(req.body),
    });
  } catch (err) {
    return res.status(502).json({ error: { message: `Proxy error: ${err.message}` } });
  }

  const data = await upstream.json();
  return res.status(upstream.status).json(data);
}
