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

════════════════════════════════════
GLOBAL CSS — embed exactly in <style>
════════════════════════════════════
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
.valuation-section{margin-bottom:40px}
.valuation-section-header{background:#e8eaf0;border:1px solid #c8ccda;border-bottom:none;padding:10px 14px 8px}
.valuation-section-header h2{font-size:14px;font-weight:700;color:#1a1a2e;letter-spacing:0.01em;margin-bottom:2px}
.valuation-section-header .date-range{font-size:11px;color:#666;font-style:italic}
.val-charts-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border:1px solid #c8ccda}
.val-chart-panel{background:white;border-right:1px solid #d0d5e0;overflow:hidden}
.val-chart-panel:last-child{border-right:none}
.val-chart-panel-header{background:#f2f3f7;padding:8px 12px 6px;border-bottom:1px solid #d0d5e0}
.val-chart-panel-header h3{font-size:12px;font-weight:700;color:#1a1a2e;margin-bottom:1px}
.val-chart-panel-header .val-date{font-size:10px;color:#777;font-style:italic}
.val-chart-area{padding:8px 10px 4px;position:relative;height:240px}
.val-annotation{position:absolute;font-size:10.5px;line-height:1.45;color:#1a1a2e;pointer-events:none;background:rgba(255,255,255,0.82);padding:3px 5px}
.val-annotation .v-metric{font-weight:700}
.val-annotation .v-rel{color:#2563eb;font-weight:600}
.val-chart-legend{display:flex;gap:10px;padding:5px 10px 8px;font-size:10px;color:#444;border-top:1px solid #eee;flex-wrap:wrap}
.val-legend-item{display:flex;align-items:center;gap:4px}
.val-legend-swatch{width:18px;height:2.5px;border-radius:2px;flex-shrink:0}
.valuation-note{font-size:10.5px;color:#888;padding:7px 0 0;font-style:italic}

════════════════════════════════════
SECTION 1 — HEADER TABLE
════════════════════════════════════
One <table class="header-table"> with TWO rows:

ROW 1: <tr> of <th> cells (navy bg), then <tr> of <td> cells. Ten columns:
Company + Ticker | Recent Price | Trailing P/E | Forward P/E | Dividend Yield | Market Cap | Beta | Timeliness 1-5 | Safety 1-5 | Financial Strength letter grade

ROW 2: One <tr> with 4 <td> cells using colspan to span the full width. Each cell bg #ffffff.
Label in small plain text above, <strong>value</strong> below:
(1) EV/EBITDA (TTM)  (2) EV/EBITDA +1 Yr (E)  (3) EV/EBITDA +2 Yr (E)  (4) PEG Ratio
If PEG not meaningful show N/M. Always write EV/EBITDA in full, never abbreviate.

════════════════════════════════════
SECTION 2 — MAIN DATA BLOCK
════════════════════════════════════
<div class="data-block"> with two children:

LEFT — <div class="company-snapshot">
<h2>[Company Name] ([TICKER])</h2>
6-8 sentences: business model, primary segments, revenue/AUM scale, competitive moat, key risks, valuation vs 5yr history.
Metadata footer (font-size 13px, color #666): HQ | CEO | Ticker | website

RIGHT — flex-column div, three stacked elements, no gap between them:

1. PRICE RANGE BAR — <table class="price-range-bar">
   One row of 8 <td> cells matching the 8 fiscal year columns in the financial table.
   Each cell content: YEAR<br>H: $XX.XX<br>L: $XX.XX

2. EARNINGS CHART — <div class="chart-container"><canvas id="earningsChart"></canvas></div>
   Chart.js mixed chart initialized in the JS block:
   - Bars = EPS per share, left y-axis labeled "EPS ($)". Color #1a1a2e for historical years, #7f8fa6 for estimate years.
   - Line = Relative P/E, right y-axis labeled "Relative P/E". Color #c0392b, borderWidth 2, fill false. borderDash [5,4] for estimate years.
   - X labels = the same 8 fiscal year labels as the financial table columns.
   - Legend shown. Right axis gridlines: display false.

3. FINANCIAL TABLE — <table class="financial-table">
   8 column headers: 5 most recent historical FY, current year (E), next year (E), 3-year range e.g. '27-'29 (E).
   Header row: bg #1a1a2e, white text.

   SECTION-HEADER ROWS divide the table into groups. Each section-header row is a single <tr> containing one <td colspan="9"> with inline style:
   background:#add8e6; color:#000000; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; padding:6px 10px;
   Do NOT apply the even-row zebra stripe to section-header rows.

   Render in EXACTLY this grouped order:

   [SECTION HEADER] PER SHARE DATA
   Revenues per Share
   "Cash Flow" per Share
   Earnings per Share
   Dist. Decl'd per Share
   Cap'l Spending per Share
   Book Value per Share
   Shares/Units Outstanding (M)

   [SECTION HEADER] VALUATION
   Avg Ann'l P/E Ratio
   Relative P/E Ratio
   Avg Ann'l Dist. Yield

   [SECTION HEADER] INCOME STATEMENT ($M)
   Revenues ($mill)
   Operating Margin (%)
   Depreciation ($mill)
   Net Profit ($mill)
   Income Tax Rate (%)
   Net Profit Margin (%)

   [SECTION HEADER] BALANCE SHEET ($M)
   Working Cap'l ($mill)
   Long-Term Debt ($mill)
   Partners'/Shareholders' Capital ($mill)

   [SECTION HEADER] RETURNS & CAPITAL ALLOCATION
   Return on Total Cap'l (%)
   Return on Partners' Cap'l (%)
   Retained to Partners' Cap'l (%)
   All Dist. to Net Profit (%)

   Use — for unavailable data. (E) in column headers only.

════════════════════════════════════
SECTION 3 — HISTORICAL VALUATION CHARTS
════════════════════════════════════
Render this section directly below the data-block and above the narrative.

HTML structure:
<div class="valuation-section">
  <div class="valuation-section-header">
    <h2>Historical Absolute &amp; Relative Valuation — Forward P/E &nbsp;|&nbsp; Price / FCF &nbsp;|&nbsp; Forward EV/EBITDA &nbsp;&nbsp; vs. S&amp;P 500</h2>
    <div class="date-range">Source: FactSet, Company Filings, TFG Research &nbsp;|&nbsp; As of [Report Date]</div>
  </div>
  <div class="val-charts-grid">

    <!-- PANEL 1: Forward P/E -->
    <div class="val-chart-panel">
      <div class="val-chart-panel-header">
        <h3>Historical Forward P/E Relative to the S&amp;P 500</h3>
        <div class="val-date">[Start Year]–Present</div>
      </div>
      <div class="val-chart-area">
        <canvas id="valPEChart"></canvas>
        <div class="val-annotation" style="top:10px;right:10px;text-align:right;">
          <div class="v-metric">[TICKER] Fwd P/E: [current]x</div>
          <div style="font-size:10px;">vs. historical avg [avg]x</div>
          <div class="v-rel" style="margin-top:3px;">[XX]% of S&amp;P 500 multiple</div>
          <div class="v-rel" style="font-size:9.5px;">(historical avg: [XX]%)</div>
        </div>
      </div>
      <div class="val-chart-legend">
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#1a1a2e;height:2.5px;"></div>[TICKER] Fwd P/E (Left)</div>
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#2563eb;height:2.5px;"></div>Rel P/E vs S&amp;P (Right)</div>
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#2563eb;border-top:2px dashed #2563eb;height:0;"></div>Avg (Right)</div>
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#888;border-top:2px dashed #888;height:0;"></div>&plusmn;1&sigma; (Left)</div>
      </div>
    </div>

    <!-- PANEL 2: P/FCF -->
    <div class="val-chart-panel">
      <div class="val-chart-panel-header">
        <h3>Historical P/FCF Relative to the S&amp;P 500</h3>
        <div class="val-date">[Start Year]–Present</div>
      </div>
      <div class="val-chart-area">
        <canvas id="valFCFChart"></canvas>
        <div class="val-annotation" style="top:10px;right:10px;text-align:right;">
          <div class="v-metric">[TICKER] P/FCF: [current]x</div>
          <div style="font-size:10px;">vs. historical avg [avg]x</div>
          <div class="v-rel" style="margin-top:3px;">[XX]% of S&amp;P 500 multiple</div>
          <div class="v-rel" style="font-size:9.5px;">(historical avg: [XX]%)</div>
        </div>
      </div>
      <div class="val-chart-legend">
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#1a1a2e;height:2.5px;"></div>[TICKER] P/FCF (Left)</div>
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#2563eb;height:2.5px;"></div>Rel P/FCF vs S&amp;P (Right)</div>
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#2563eb;border-top:2px dashed #2563eb;height:0;"></div>Avg (Right)</div>
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#888;border-top:2px dashed #888;height:0;"></div>&plusmn;1&sigma; (Left)</div>
      </div>
    </div>

    <!-- PANEL 3: Forward EV/EBITDA -->
    <div class="val-chart-panel">
      <div class="val-chart-panel-header">
        <h3>Historical Forward EV/EBITDA Relative to the S&amp;P 500</h3>
        <div class="val-date">[Start Year]–Present</div>
      </div>
      <div class="val-chart-area">
        <canvas id="valEVChart"></canvas>
        <div class="val-annotation" style="top:10px;right:10px;text-align:right;">
          <div class="v-metric">[TICKER] Fwd EV/EBITDA: [current]x</div>
          <div style="font-size:10px;">vs. historical avg [avg]x</div>
          <div class="v-rel" style="margin-top:3px;">[XX]% of S&amp;P 500 multiple</div>
          <div class="v-rel" style="font-size:9.5px;">(historical avg: [XX]%)</div>
        </div>
      </div>
      <div class="val-chart-legend">
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#1a1a2e;height:2.5px;"></div>[TICKER] Fwd EV/EBITDA (Left)</div>
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#2563eb;height:2.5px;"></div>Rel EV/EBITDA vs S&amp;P (Right)</div>
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#2563eb;border-top:2px dashed #2563eb;height:0;"></div>Avg (Right)</div>
        <div class="val-legend-item"><div class="val-legend-swatch" style="background:#888;border-top:2px dashed #888;height:0;"></div>&plusmn;1&sigma; (Left)</div>
      </div>
    </div>

  </div>
  <div class="valuation-note">Historical multiples estimated from public filings and consensus data. S&amp;P 500 multiples based on index-level forward estimates. Relative series = stock multiple / S&amp;P 500 multiple x 100.</div>
</div>

CHART.JS IMPLEMENTATION FOR THE THREE VALUATION PANELS:

In the JS block before </body>, define this shared helper function and then call it once per panel.
Use monthly or bi-monthly date labels spanning the most recent 3-5 years (e.g. 'Jan-20','Mar-20',...).
Populate realistic data arrays for the stock and S&P 500 for each metric, anchored to known public data.
Compute: avgAbs = mean of stock series, stdAbs = population std dev of stock series, avgRel = mean of relative series.
Relative series = stockMetric[i] / sp500Metric[i] * 100 at each point.
Set axis min/max with ~15% headroom beyond the observed data range.

SHARED FUNCTION — embed exactly:
function buildValChart(canvasId, stockData, relData, avgAbs, stdAbs, avgRel, leftMax, leftMin, rightMax, rightMin) {
  const flat = n => stockData.map(() => n);
  new Chart(document.getElementById(canvasId), {
    data: {
      labels: valLabels,
      datasets: [
        { type:'line', label:'_hi', data:flat(+(avgAbs+stdAbs).toFixed(1)), borderWidth:0, pointRadius:0, fill:false, yAxisID:'yL' },
        { type:'line', label:'_lo', data:flat(+(avgAbs-stdAbs).toFixed(1)), borderWidth:0, pointRadius:0, fill:'-1', backgroundColor:'rgba(0,0,0,0.07)', yAxisID:'yL' },
        { type:'line', label:'Stock', data:stockData, borderColor:'#1a1a2e', borderWidth:1.8, pointRadius:0, tension:0.35, fill:false, yAxisID:'yL' },
        { type:'line', label:'Avg', data:flat(avgAbs), borderColor:'#2563eb', borderWidth:1.4, borderDash:[5,4], pointRadius:0, fill:false, yAxisID:'yL' },
        { type:'line', label:'+1sd', data:flat(+(avgAbs+stdAbs).toFixed(1)), borderColor:'#666', borderWidth:1.1, borderDash:[4,3], pointRadius:0, fill:false, yAxisID:'yL' },
        { type:'line', label:'-1sd', data:flat(+(avgAbs-stdAbs).toFixed(1)), borderColor:'#666', borderWidth:1.1, borderDash:[4,3], pointRadius:0, fill:false, yAxisID:'yL' },
        { type:'line', label:'Rel %', data:relData, borderColor:'#2563eb', borderWidth:1.8, pointRadius:0, tension:0.35, fill:false, yAxisID:'yR' },
        { type:'line', label:'Avg Rel', data:flat(avgRel), borderColor:'#2563eb', borderWidth:1.2, borderDash:[5,4], pointRadius:0, fill:false, yAxisID:'yR' }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false, animation:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ display:false },
        tooltip:{
          filter: item => !item.dataset.label.startsWith('_'),
          callbacks:{
            label: ctx => {
              const v = ctx.parsed.y;
              if(v == null) return null;
              return ctx.dataset.label + ': ' + v.toFixed(1) + (ctx.dataset.yAxisID === 'yR' ? '%' : 'x');
            }
          },
          backgroundColor:'rgba(26,26,46,0.9)', titleColor:'#fff', bodyColor:'#ccc',
          padding:7, titleFont:{size:10}, bodyFont:{size:10}
        }
      },
      scales:{
        x:{ ticks:{ font:{size:8.5}, color:'#666', maxTicksLimit:12, maxRotation:45, minRotation:30 }, grid:{ color:'#eee' } },
        yL:{ position:'left', max:leftMax, min:leftMin, ticks:{ font:{size:9}, color:'#333', callback: v => v+'x' }, grid:{ color:'#e8e8e8' } },
        yR:{ position:'right', max:rightMax, min:rightMin, ticks:{ font:{size:9}, color:'#2563eb', callback: v => v+'%' }, grid:{ drawOnChartArea:false } }
      }
    }
  });
}

Then declare valLabels array and the six data arrays, then call:
buildValChart('valPEChart',  stockFwdPE,  relPE,  avgPE,  stdPE,  avgRelPE,  peLeftMax,  peLeftMin,  peRightMax,  peRightMin);
buildValChart('valFCFChart', stockPFCF,   relFCF, avgFCF, stdFCF, avgRelFCF, fcfLeftMax, fcfLeftMin, fcfRightMax, fcfRightMin);
buildValChart('valEVChart',  stockFwdEV,  relEV,  avgEV,  stdEV,  avgRelEV,  evLeftMax,  evLeftMin,  evRightMax,  evRightMin);

════════════════════════════════════
SECTION 4 — ANALYST NARRATIVE
════════════════════════════════════
<div class="narrative"> — Three paragraphs, no headers, no bullets:

P1 Recent Results: What drove the most recent quarter or fiscal year? Assess earnings quality — distinguish recurring vs. one-time items, margin trajectory, FCF vs. reported net income, any balance sheet flags.

P2 Outlook: The 2-3 most important value drivers over the next 12-24 months. Name one specific upside catalyst and one specific downside risk to the base case.

P3 Valuation & Recommendation: State the rating (BUY/HOLD/SELL) explicitly. Give a 12-month price target and the exact multiple applied (e.g. "22x our FY26E EPS of $4.85"). Identify the single condition that would change your view — be specific, not generic.

<p class="analyst-sig">Fedeli Group Research | Report Date: [today's date] | Next Expected Earnings: [date]</p>

════════════════════════════════════
SECTION 5 — GOOD FOR WHAT?!?
════════════════════════════════════
Full-width <div> style="background:#1a1a2e;color:white;padding:24px 28px;margin-top:40px"
<h3 style="color:#AD9551;font-family:Georgia,serif;font-size:18px;font-weight:700;margin-bottom:12px">GOOD FOR WHAT?!?</h3>
3-4 opinionated plain-language sentences: who this stock IS and IS NOT right for. No hedging.

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
    max_tokens: 32000,
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
