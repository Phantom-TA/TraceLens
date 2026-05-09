/**
 * @file templates/comparison-shell.ts
 * @description HTML document envelope for before/after comparison reports.
 */

import { getStyles } from "./styles.js";
import { escHtml } from "../utils/format.js";

export interface ComparisonShellOptions {
  title: string;
  beforeUrl: string;
  afterUrl: string;
  beforeLabel: string;
  afterLabel: string;
  generatedAt: string;
  bodyContent: string;
}

export function renderComparisonShell(opts: ComparisonShellOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="description" content="TraceLens comparison report: ${escHtml(opts.beforeLabel)} vs ${escHtml(opts.afterLabel)}"/>
  <title>${escHtml(opts.title)}</title>
  ${getStyles()}
  <style>
    .comp-banner {
      display: grid; grid-template-columns: 1fr auto 1fr;
      gap: 0; border-radius: var(--radius-lg); overflow: hidden;
      margin-bottom: 32px; border: 1px solid var(--color-border);
    }
    .comp-side {
      padding: 20px 24px;
    }
    .comp-side.baseline {
      background: rgba(239,68,68,0.06); border-right: 1px solid var(--color-border);
    }
    .comp-side.current {
      background: rgba(16,185,129,0.06);
    }
    .comp-vs {
      display: flex; align-items: center; justify-content: center;
      padding: 0 16px; font-weight: 700; color: var(--color-text-dim);
      font-size: 0.85rem;
    }
    .comp-role { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-dim); margin-bottom: 4px; }
    .comp-label { font-weight: 600; font-size: 1rem; margin-bottom: 4px; }
    .comp-url { font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-text-muted); }
  </style>
</head>
<body>
  <header class="header" role="banner">
    <span class="header-logo">⚡ TraceLens</span>
    <span style="font-size:0.82rem;color:var(--color-text-muted);margin-left:8px;">Comparison Report</span>
    <span class="header-spacer"></span>
    <button class="theme-toggle" id="theme-toggle" onclick="toggleTheme()" aria-label="Toggle color theme">☀️ Light</button>
  </header>

  <div class="layout" style="--sidebar-w:0px;">
    <main class="main" id="main-content" style="max-width:1200px;margin:0 auto;">
      ${opts.bodyContent}
      <footer class="report-footer" role="contentinfo">
        <span class="footer-logo">TraceLens</span>
        <span>Comparison generated ${escHtml(opts.generatedAt)}</span>
      </footer>
    </main>
  </div>

  <script>
    function toggleTheme() {
      const html = document.documentElement;
      const btn = document.getElementById('theme-toggle');
      if (html.classList.contains('theme-dark')) {
        html.classList.remove('theme-dark'); html.classList.add('theme-light');
        btn.textContent = '🌙 Dark'; localStorage.setItem('tl-theme', 'light');
      } else {
        html.classList.remove('theme-light'); html.classList.add('theme-dark');
        btn.textContent = '☀️ Light'; localStorage.setItem('tl-theme', 'dark');
      }
    }
    (function() {
      const saved = localStorage.getItem('tl-theme');
      const btn = document.getElementById('theme-toggle');
      if (saved === 'light') { document.documentElement.classList.add('theme-light'); if (btn) btn.textContent = '🌙 Dark'; }
      else { document.documentElement.classList.add('theme-dark'); }
    })();
  </script>
</body>
</html>`;
}
