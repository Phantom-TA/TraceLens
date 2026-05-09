/**
 * @file templates/html-shell.ts
 * @description Full HTML document envelope for TraceLens reports.
 * Sticky sidebar, dark/light mode toggle, semantic structure, print-ready.
 */

import { getStyles } from "./styles.js";
import { escHtml } from "../utils/format.js";

export interface ShellOptions {
  title: string;
  url: string;
  sessionId: string;
  generatedAt: string;
  sections: Array<{ id: string; label: string; icon: string }>;
  bodyContent: string;
}

export function renderHtmlShell(opts: ShellOptions): string {
  const navItems = opts.sections
    .map(
      (s) =>
        `<li class="sidebar-item"><a href="#${escHtml(s.id)}" id="nav-${escHtml(s.id)}">${s.icon} ${escHtml(s.label)}</a></li>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="description" content="TraceLens performance intelligence report for ${escHtml(opts.url)}"/>
  <meta name="generator" content="TraceLens Report Engine v1.0.0"/>
  <title>${escHtml(opts.title)}</title>
  ${getStyles()}
</head>
<body>
  <!-- Header -->
  <header class="header" role="banner">
    <span class="header-logo">⚡ TraceLens</span>
    <span class="header-url" title="${escHtml(opts.url)}">${escHtml(opts.url)}</span>
    <span class="header-spacer"></span>
    <span style="font-size:0.78rem;color:var(--color-text-muted);margin-right:8px;">${escHtml(opts.sessionId)}</span>
    <button class="theme-toggle" id="theme-toggle" onclick="toggleTheme()" aria-label="Toggle color theme">☀️ Light</button>
  </header>

  <div class="layout">
    <!-- Sidebar Navigation -->
    <nav class="sidebar" aria-label="Report sections">
      <p class="sidebar-heading">Navigation</p>
      <ul class="sidebar-nav">
        ${navItems}
      </ul>
    </nav>

    <!-- Main Content -->
    <main class="main" id="main-content">
      ${opts.bodyContent}

      <footer class="report-footer" role="contentinfo">
        <span class="footer-logo">TraceLens</span>
        <span>Report generated ${escHtml(opts.generatedAt)}</span>
        <span style="margin-left:auto;">Session: <code>${escHtml(opts.sessionId)}</code></span>
      </footer>
    </main>
  </div>

  <script>
    // Theme toggle — minimal inline JS, no dependencies
    function toggleTheme() {
      const html = document.documentElement;
      const btn = document.getElementById('theme-toggle');
      if (html.classList.contains('theme-dark')) {
        html.classList.remove('theme-dark');
        html.classList.add('theme-light');
        btn.textContent = '🌙 Dark';
        localStorage.setItem('tl-theme', 'light');
      } else {
        html.classList.remove('theme-light');
        html.classList.add('theme-dark');
        btn.textContent = '☀️ Light';
        localStorage.setItem('tl-theme', 'dark');
      }
    }
    // Restore saved theme
    (function() {
      const saved = localStorage.getItem('tl-theme');
      const btn = document.getElementById('theme-toggle');
      if (saved === 'light') {
        document.documentElement.classList.add('theme-light');
        if (btn) btn.textContent = '🌙 Dark';
      } else {
        document.documentElement.classList.add('theme-dark');
        if (btn) btn.textContent = '☀️ Light';
      }
    })();
    // Active nav highlight on scroll
    (function() {
      const sections = document.querySelectorAll('[data-section]');
      const navLinks = document.querySelectorAll('.sidebar-item a');
      if (!sections.length) return;
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            navLinks.forEach(l => l.classList.remove('active'));
            const lnk = document.getElementById('nav-' + e.target.id);
            if (lnk) lnk.classList.add('active');
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      sections.forEach(s => obs.observe(s));
    })();
  </script>
</body>
</html>`;
}
