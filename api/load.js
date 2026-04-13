/* ── api/load.js ─────────────────────────────────────────────────────────────
   Retrieves a previously generated report from Vercel KV by its share ID.
   Called by the frontend when a user opens a shared URL: /?id=abc123
   GET /api/load?id=abc123
────────────────────────────────────────────────────────────────────────────── */

module.exports = async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const id = (req.query && req.query.id) ? req.query.id.trim() : '';
  if (!id) return res.status(400).json({ error: 'Missing id parameter.' });

  // Sanitise — only allow base64url characters
  if (!/^[A-Za-z0-9_-]{6,16}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid report ID.' });
  }

  const kvUrl   = process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!kvUrl || !kvToken) {
    return res.status(500).json({ error: 'KV store not configured on this server.' });
  }

  try {
    const kvRes = await fetch(kvUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + kvToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['GET', 'report:' + id])
    });

    if (!kvRes.ok) {
      return res.status(502).json({ error: 'KV lookup failed (HTTP ' + kvRes.status + ').' });
    }

    const kvData = await kvRes.json();
    const raw    = kvData.result;

    if (!raw) {
      return res.status(404).json({ error: 'Report not found. It may have expired (reports are kept for 90 days).' });
    }

    let record;
    try {
      record = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({ error: 'Could not parse stored report.' });
    }

    // Cache shared reports aggressively — content never changes for a given ID
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    return res.status(200).json({
      html:      record.html,
      ticker:    record.ticker    || '',
      createdAt: record.createdAt || ''
    });

  } catch (err) {
    console.error('Load error:', err.message);
    return res.status(500).json({ error: 'Load error: ' + err.message });
  }
};
