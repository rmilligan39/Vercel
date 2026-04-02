const https = require('https');

/* ── Prompt builder ─────────────────────────────────────────────────────── */
function buildPrompt(query) {
  return `You are a senior equity analyst at Fedeli Group. Produce a complete, self-contained HTML equity research report for the company: "${query}".

CRITICAL OUTPUT RULE: Return ONLY valid HTML. Your entire response must begin with <!DOCTYPE html> and end with </html>. Do not output markdown code fences, backticks, or any text outside the HTML document.

The HTML document must contain:
- All CSS in an embedded <style> block
- Chart.js loaded from https://cdn.jsdelivr.net/npm/chart.js (script tag in <head>)
- All JavaScript in a <script> block just before </body>
- No other external dependencies

Flag all forward estimates with (E) in column headers only, not in individual cells.

GLOBAL CSS — embed exactly:
body{font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#111;max-width:1200px;margin:40px auto;padding:0 24px}
.header-table{width:100%;font-size:15px;border-collapse:collapse;margin-bottom:32px}
.header-table th{background-color:#1a1a2e;color:white;padding:10px 12px;text-align:left}
.header-table td{padding:10px 12px;border:1px solid #ccc}
.data-block{display:flex;gap:32px;margin-bottom:40px}
.company-snapshot{flex:0 0 280px;font-size:16px;line-height:1.7}
.company-snapshot h2{font-size:18px;margin-bottom:10px}
.financial-table{flex:1;width:100%;border-collapse:collapse;font-size:15px}
.financial-table th{background-color:#1a1a2e;color:white;padding:8px 10px;text-align:right;white-space:nowrap}
.financial-table th:first-child{text-align:left}
.financial-table td{padding:7px 10px;border-bottom:1px solid #e0e0e0;text-align:right;white-space:nowrap}
.financial-table td:first-child{text-align:left;font-weight:500}
.financial-table tr:nth-child(even){background-color:#f7f7f7}
.narrative{font-size:17px;line-height:1.85;max-width:960px;border-top:2px solid #1a1a2e;padding-top:24px}
.narrative p{margin-bottom:20px}
.analyst-sig{font-size:15px;color:#555;margin-top:24px;font-style:italic}
.price-range-bar{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:0}
.price-range-bar td{padding:6px 8px;text-align:center;border:1px solid #444;line-height:1.4;white-space:nowrap;background-color:#1a1a2e;color:white}
.chart-container{width:100%;height:220px;margin-bottom:0}

=== SECTION 1 — HEADER TABLE ===
One <table class="header-table"> with TWO rows:
ROW 1: <th> header row (navy bg), then <tr> data row. Ten columns: Company + Ticker | Recent Price | Trailing P/E | Forward P/E | Dividend Yield | Market Cap | Beta | Timeliness 1-5 | Safety 1-5 | Financial Strength letter grade.
ROW 2: One <tr> with 4 <td> cells using colspan to fill the full width. Each cell bg #ffffff. Label in small plain text above, <strong>value</strong> below:
  (1) EV/EBITDA (TTM)  (2) EV/EBITDA +1 Yr (E)  (3) EV/EBITDA +2 Yr (E)  (4) PEG Ratio
If PEG not meaningful show N/M. Always write EV/EBITDA in full, never abbreviate.

=== SECTION 2 — DATA BLOCK ===
<div class="data-block"> with two children:

LEFT <div class="company-snapshot">:
<h2>[Company Name] ([TICKER])</h2>
6-8 sentences: business model, segments, revenue/AUM scale, competitive moat, key risks, valuation vs 5yr history.
Metadata footer 13px #666: HQ | CEO | Ticker | website

RIGHT — flex-column div, three stacked elements, no gap:

1. <table class="price-range-bar"> one row 8 <td> cells matching fin table years.
   Each cell: YEAR<br>H: $XX.XX<br>L: $XX.XX

2. <div class="chart-container"><canvas id="earningsChart"></canvas></div>
   Chart.js mixed chart in JS block:
   Bars = EPS per share, left y-axis "EPS ($)", color #1a1a2e historical / #7f8fa6 estimate years.
   Line = Relative P/E, right y-axis "Relative P/E", color #c0392b, borderWidth 2, fill false.
   borderDash [5,4] for estimate years. Legend shown. Right axis gridlines off.
   X labels = same 8 fiscal year labels as financial table.

3. <table class="financial-table">
   8 column headers: 5 historical FY, current (E), next (E), 3yr range e.g. '27-'29 (E).
   Header row bg #1a1a2e white text.

   SECTION-HEADER ROWS: <td colspan="9"> styled inline:
   background:#add8e6;color:#000;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:6px 10px
   Do NOT apply even-row zebra stripe to section-header rows.

   Groups in EXACT order:
   [PER SHARE DATA]
   Revenues per Share | "Cash Flow" per Share | Earnings per Share | Dist. Decl'd per Share | Cap'l Spending per Share | Book Value per Share | Shares/Units Outstanding (M)

   [VALUATION]
   Avg Ann'l P/E Ratio | Relative P/E Ratio | Avg Ann'l Dist. Yield

   [INCOME STATEMENT ($M)]
   Revenues ($mill) | Operating Margin (%) | Depreciation ($mill) | Net Profit ($mill) | Income Tax Rate (%) | Net Profit Margin (%)

   [BALANCE SHEET ($M)]
   Working Cap'l ($mill) | Long-Term Debt ($mill) | Partners'/Shareholders' Capital ($mill)

   [RETURNS & CAPITAL ALLOCATION]
   Return on Total Cap'l (%) | Return on Partners' Cap'l (%) | Retained to Partners' Cap'l (%) | All Dist. to Net Profit (%)

   Use — for unavailable data. (E) in column headers only.

=== SECTION 3 — ANALYST NARRATIVE ===
<div class="narrative"> Three paragraphs, no headers, no bullets:
P1 Recent Results: recurring vs one-time, margins, FCF quality, balance sheet flags.
P2 Outlook: 2-3 value drivers next 12-24 months, one specific upside catalyst, one specific downside risk.
P3 Rating (BUY/HOLD/SELL), 12-month price target, exact multiple e.g. "22x FY26E EPS of $4.85", single condition that changes the rating.
<p class="analyst-sig">Fedeli Group Research | Report Date: [today's date] | Next Expected Earnings: [date]</p>

=== SECTION 4 — GOOD FOR WHAT?!? ===
Full-width <div> style="background:#1a1a2e;color:white;padding:24px 28px;margin-top:40px"
<h3 style="color:#AD9551;font-family:Georgia,serif;font-size:18px;font-weight:700;margin-bottom:12px">GOOD FOR WHAT?!?</h3>
3-4 opinionated plain-language sentences: who this IS and IS NOT right for. No hedging.

Use real financial data from training knowledge. Anchor all estimates to public information.`;
}

/* ── HTTPS wrapper ──────────────────────────────────────────────────────── */
function httpsPost(options, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    });
    req.on('error', reject);
    req.setTimeout(240000, () => {
      req.destroy(new Error('Anthropic request timed out after 240s'));
    });
    req.write(payload);
    req.end();
  });
}

/* ── Main Vercel handler ─────────────────────────────────────────────────
   Vercel passes a Node.js IncomingMessage (req) and ServerResponse (res).
   No configuration files needed — Vercel auto-detects this as a function.
─────────────────────────────────────────────────────────────────────────── */
module.exports = async function handler(req, res) {

  // CORS — allow the frontend to call this function
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // Read API key from Vercel environment variable
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set in Vercel environment variables.');
    return res.status(500).json({ error: 'Server configuration error: API key not set.' });
  }

  // Parse body — Vercel auto-parses JSON bodies when Content-Type is application/json
  const body = req.body || {};
  const query = (typeof body === 'string' ? JSON.parse(body) : body).query || '';

  if (!query.trim()) {
    return res.status(400).json({ error: 'Missing "query" in request body.' });
  }

  console.log(`Generating report for: ${query}`);

  const prompt = buildPrompt(query.trim());
  const payload = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }]
  });

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  try {
    const anthropicRes = await httpsPost(options, payload);
    console.log(`Anthropic status: ${anthropicRes.status}`);

    let parsed;
    try {
      parsed = JSON.parse(anthropicRes.body);
    } catch (e) {
      return res.status(500).json({ error: 'Could not parse Anthropic response.' });
    }

    if (anthropicRes.status !== 200) {
      const msg = parsed?.error?.message || `Anthropic returned HTTP ${anthropicRes.status}`;
      return res.status(anthropicRes.status).json({ error: msg });
    }

    let html = (parsed.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    if (!html) {
      return res.status(500).json({ error: 'Anthropic returned an empty response.' });
    }

    return res.status(200).json({ html });

  } catch (err) {
    console.error('Function error:', err.message);
    return res.status(500).json({ error: 'Function error: ' + err.message });
  }
};
