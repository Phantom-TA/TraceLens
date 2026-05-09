/**
 * @file templates/styles.ts
 * @description Inlined CSS design system for TraceLens HTML reports.
 * Self-contained, offline-first, dark/light mode, print-ready.
 */

export function getStyles(): string {
  return `
<style>
/* ── Google Fonts ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Design Tokens ── */
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  --color-bg:        #0f1117;
  --color-bg-card:   #1a1d2e;
  --color-bg-hover:  #20243a;
  --color-border:    #2a2d45;
  --color-border-light: #353860;

  --color-text:      #e2e8f0;
  --color-text-muted:#8892aa;
  --color-text-dim:  #4a5270;

  --color-accent:    #6366f1;
  --color-accent-glow: rgba(99,102,241,0.15);
  --color-accent-2:  #8b5cf6;

  --color-good:      #10b981;
  --color-warning:   #f59e0b;
  --color-poor:      #ef4444;
  --color-critical:  #dc2626;
  --color-muted:     #64748b;
  --color-info:      #3b82f6;

  --color-good-bg:      rgba(16,185,129,0.1);
  --color-warning-bg:   rgba(245,158,11,0.1);
  --color-poor-bg:      rgba(239,68,68,0.1);
  --color-critical-bg:  rgba(220,38,38,0.12);
  --color-info-bg:      rgba(59,130,246,0.1);

  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.5);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.6);

  --sidebar-w: 240px;
  --header-h:  56px;
}

/* ── Light Mode ── */
@media (prefers-color-scheme: light) {
  :root:not(.theme-dark) {
    --color-bg:        #f8fafc;
    --color-bg-card:   #ffffff;
    --color-bg-hover:  #f1f5f9;
    --color-border:    #e2e8f0;
    --color-border-light: #cbd5e1;
    --color-text:      #0f172a;
    --color-text-muted:#475569;
    --color-text-dim:  #94a3b8;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.1);
    --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
    --color-bg-card:   #ffffff;
    --color-accent-glow: rgba(99,102,241,0.08);
  }
}

.theme-light {
  --color-bg:        #f8fafc;
  --color-bg-card:   #ffffff;
  --color-bg-hover:  #f1f5f9;
  --color-border:    #e2e8f0;
  --color-border-light: #cbd5e1;
  --color-text:      #0f172a;
  --color-text-muted:#475569;
  --color-text-dim:  #94a3b8;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
  --color-accent-glow: rgba(99,102,241,0.08);
}

/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 15px; scroll-behavior: smooth; }
body {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  min-height: 100vh;
  transition: background 0.2s, color 0.2s;
}
a { color: var(--color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }
code, pre { font-family: var(--font-mono); font-size: 0.85em; }

/* ── Layout ── */
.layout { display: flex; min-height: 100vh; padding-top: var(--header-h); }

.header {
  position: fixed; top: 0; left: 0; right: 0; height: var(--header-h);
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  display: flex; align-items: center; gap: 16px;
  padding: 0 24px; z-index: 100;
  box-shadow: var(--shadow-sm);
}
.header-logo {
  font-weight: 700; font-size: 1rem;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-2));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}
.header-url {
  font-size: 0.8rem; color: var(--color-text-muted);
  font-family: var(--font-mono); overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; max-width: 400px;
}
.header-spacer { flex: 1; }
.theme-toggle {
  background: var(--color-bg-hover); border: 1px solid var(--color-border);
  color: var(--color-text-muted); border-radius: var(--radius-sm);
  padding: 6px 12px; cursor: pointer; font-size: 0.8rem;
  transition: all 0.15s;
}
.theme-toggle:hover { color: var(--color-text); border-color: var(--color-accent); }

.sidebar {
  width: var(--sidebar-w); flex-shrink: 0;
  position: sticky; top: var(--header-h); height: calc(100vh - var(--header-h));
  overflow-y: auto; padding: 20px 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-card);
}
.sidebar-nav { list-style: none; }
.sidebar-item a {
  display: block; padding: 7px 20px;
  color: var(--color-text-muted); font-size: 0.82rem;
  border-left: 2px solid transparent; transition: all 0.15s;
}
.sidebar-item a:hover, .sidebar-item a.active {
  color: var(--color-text); border-left-color: var(--color-accent);
  background: var(--color-accent-glow); text-decoration: none;
}
.sidebar-heading {
  font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--color-text-dim);
  padding: 16px 20px 6px;
}

.main { flex: 1; min-width: 0; padding: 32px 40px; max-width: 1100px; }

/* ── Section ── */
.section {
  margin-bottom: 40px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.section-header {
  padding: 18px 24px; display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-hover);
  cursor: pointer; user-select: none;
}
.section-header h2 {
  font-size: 0.95rem; font-weight: 600; letter-spacing: -0.01em;
}
.section-icon { font-size: 1.1rem; }
.section-badge { margin-left: auto; }
.section-body { padding: 24px; }
details > summary { list-style: none; }
details > summary::-webkit-details-marker { display: none; }
details > summary { cursor: pointer; }
details[open] .chevron { transform: rotate(90deg); }
.chevron { transition: transform 0.2s; display: inline-block; color: var(--color-text-dim); }

/* ── Cards ── */
.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  box-shadow: var(--shadow-sm);
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}
.metric-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px 18px;
  position: relative; overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
}
.metric-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
.metric-card-label {
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--color-text-muted);
  margin-bottom: 6px;
}
.metric-card-value {
  font-size: 1.6rem; font-weight: 700; font-family: var(--font-mono);
  line-height: 1; letter-spacing: -0.03em;
}
.metric-card-unit { font-size: 0.75rem; color: var(--color-text-muted); margin-left: 2px; }
.metric-card-rating { margin-top: 8px; }

/* ── Badges ── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 999px;
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.02em;
}
.rating-good    { color: var(--color-good);    background: var(--color-good-bg); }
.rating-needs-improvement { color: var(--color-warning); background: var(--color-warning-bg); }
.rating-poor    { color: var(--color-poor);    background: var(--color-poor-bg); }
.rating-unknown { color: var(--color-muted);   background: rgba(100,116,139,0.1); }

.severity-critical { color: var(--color-critical); background: var(--color-critical-bg); }
.severity-high     { color: var(--color-poor);     background: var(--color-poor-bg); }
.severity-medium   { color: var(--color-warning);  background: var(--color-warning-bg); }
.severity-low      { color: var(--color-good);     background: var(--color-good-bg); }

.confidence-high   { color: var(--color-good);    background: var(--color-good-bg); }
.confidence-medium { color: var(--color-warning);  background: var(--color-warning-bg); }
.confidence-low    { color: var(--color-muted);    background: rgba(100,116,139,0.1); }

.cat-bundle     { color: #a78bfa; background: rgba(167,139,250,0.1); }
.cat-javascript { color: #fbbf24; background: rgba(251,191,36,0.1); }
.cat-network    { color: #38bdf8; background: rgba(56,189,248,0.1); }
.cat-server     { color: #34d399; background: rgba(52,211,153,0.1); }
.cat-images     { color: #fb923c; background: rgba(251,146,60,0.1); }
.cat-rendering  { color: #f472b6; background: rgba(244,114,182,0.1); }
.cat-other      { color: var(--color-muted); background: rgba(100,116,139,0.1); }

.trend-improved  { color: var(--color-good); }
.trend-regressed { color: var(--color-poor); }
.trend-unchanged { color: var(--color-text-muted); }

/* ── Tables ── */
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th {
  text-align: left; padding: 10px 14px;
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-hover);
}
.data-table td {
  padding: 10px 14px; border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--color-bg-hover); }
.mono { font-family: var(--font-mono); font-size: 0.82em; }

/* ── Risk Cards ── */
.risk-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px 18px; margin-bottom: 12px;
  position: relative; overflow: hidden;
  transition: box-shadow 0.15s;
}
.risk-card:hover { box-shadow: var(--shadow-md); }
.risk-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 3px;
}
.risk-card.severity-critical::before { background: var(--color-critical); }
.risk-card.severity-high::before     { background: var(--color-poor); }
.risk-card.severity-medium::before   { background: var(--color-warning); }
.risk-card.severity-low::before      { background: var(--color-good); }
.risk-card-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.risk-card-title { font-weight: 600; font-size: 0.9rem; }
.risk-card-meta  { font-size: 0.82rem; color: var(--color-text-muted); margin-bottom: 8px; }
.risk-card-rec   {
  font-size: 0.82rem; color: var(--color-text-muted);
  padding: 8px 12px; background: var(--color-bg-hover);
  border-radius: var(--radius-sm); border-left: 2px solid var(--color-accent);
}
.chips { display: flex; gap: 6px; flex-wrap: wrap; }

/* ── Progress Bars ── */
.progress-bar-track {
  height: 6px; background: var(--color-border);
  border-radius: 3px; overflow: hidden; flex: 1;
}
.progress-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }

/* ── AI Section ── */
.ai-summary-block {
  background: linear-gradient(135deg, var(--color-accent-glow), rgba(139,92,246,0.08));
  border: 1px solid rgba(99,102,241,0.3);
  border-radius: var(--radius-md); padding: 18px 20px;
  font-size: 0.92rem; line-height: 1.7; margin-bottom: 20px;
}
.ai-cause-card {
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  padding: 16px 18px; margin-bottom: 12px;
}
.ai-cause-rank {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--color-accent); color: #fff;
  font-size: 0.72rem; font-weight: 700; flex-shrink: 0;
}
.ai-cause-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.ai-cause-title  { font-weight: 600; font-size: 0.9rem; }
.ai-cause-body   { font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.6; }
.ai-cause-impact { font-size: 0.82rem; color: var(--color-warning); margin-top: 6px; }
.ai-metrics { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
.ai-metric-pill {
  font-family: var(--font-mono); font-size: 0.75rem;
  padding: 2px 8px; background: var(--color-bg-hover);
  border: 1px solid var(--color-border); border-radius: 4px;
}

/* ── Rec Cards ── */
.rec-card {
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  padding: 16px 18px; margin-bottom: 12px;
  transition: box-shadow 0.15s;
}
.rec-card:hover { box-shadow: var(--shadow-md); }
.rec-card-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.rec-rank {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  background: var(--color-bg-hover); border: 1px solid var(--color-border);
  font-size: 0.72rem; font-weight: 700; color: var(--color-text-muted); margin-top: 1px;
}
.rec-action { font-weight: 600; font-size: 0.9rem; flex: 1; }
.rec-body { font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.6; margin-bottom: 10px; }
.rec-impact {
  font-size: 0.82rem; font-weight: 500;
  color: var(--color-good); padding: 6px 10px;
  background: var(--color-good-bg); border-radius: var(--radius-sm);
  display: inline-block;
}
.rec-footer { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }

/* ── Timeline SVG ── */
.timeline-wrap { overflow-x: auto; border-radius: var(--radius-md); }
.timeline-svg  { display: block; min-width: 100%; }

/* ── Score Gauges ── */
.score-gauges { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
.gauge-wrap { text-align: center; }
.gauge-label { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 6px; font-weight: 500; }

/* ── Artifact Links ── */
.artifact-list { display: flex; flex-direction: column; gap: 8px; }
.artifact-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: var(--color-bg-hover); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); font-size: 0.85rem;
  transition: border-color 0.15s;
}
.artifact-item:hover { border-color: var(--color-accent); }
.artifact-icon { font-size: 1.1rem; }
.artifact-path { font-family: var(--font-mono); color: var(--color-text-muted); font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; }
.artifact-open { margin-left: auto; font-size: 0.78rem; color: var(--color-accent); white-space: nowrap; }

/* ── Session Meta ── */
.meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
.meta-item { }
.meta-key { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-dim); margin-bottom: 3px; }
.meta-val { font-size: 0.88rem; font-family: var(--font-mono); color: var(--color-text); }

/* ── Comparison ── */
.comparison-header { display: flex; gap: 0; margin-bottom: 24px; }
.comparison-col { flex: 1; padding: 16px 20px; }
.comparison-col.before { background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2); border-radius: var(--radius-md) 0 0 var(--radius-md); }
.comparison-col.after  { background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2); border-radius: 0 var(--radius-md) var(--radius-md) 0; border-left: none; }
.comparison-col-label  { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 4px; }
.comparison-col-url    { font-family: var(--font-mono); font-size: 0.82rem; }

.delta-positive { color: var(--color-good); }
.delta-negative { color: var(--color-poor); }

/* ── Hydration Bar ── */
.hydration-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.hydration-bar-label { font-size: 0.8rem; color: var(--color-text-muted); min-width: 120px; }

/* ── Empty State ── */
.empty-state {
  text-align: center; padding: 32px 24px;
  color: var(--color-text-muted); font-size: 0.88rem;
}
.empty-state-icon { font-size: 2rem; margin-bottom: 8px; }

/* ── Footer ── */
.report-footer {
  margin-top: 48px; padding: 20px 40px;
  border-top: 1px solid var(--color-border);
  font-size: 0.78rem; color: var(--color-text-dim);
  display: flex; align-items: center; gap: 16px;
}
.footer-logo {
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-2));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

/* ── Print ── */
@media print {
  .sidebar, .header, .theme-toggle { display: none !important; }
  .main { padding: 0; max-width: none; }
  .layout { display: block; }
  details { display: block; }
  details > summary { display: none; }
  .section { break-inside: avoid; box-shadow: none; border: 1px solid #ccc; }
  body { background: white; color: black; }
  a { color: #4338ca; }
  .metric-card { background: #f8fafc; }
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--color-border-light); }

/* ── Animations ── */
@keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
.section { animation: fadeIn 0.25s ease both; }

/* ── Responsive ── */
@media (max-width: 768px) {
  :root { --sidebar-w: 0px; }
  .sidebar { display: none; }
  .main { padding: 20px 16px; }
  .card-grid { grid-template-columns: 1fr 1fr; }
  .header-url { display: none; }
}
</style>`;
}
