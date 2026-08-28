#!/usr/bin/env node
// Adds a "Locations" entry to the Company dropdown in the unified nav on every
// committed page, so the /locations/ hub and its city pages are reachable from
// anywhere on the site instead of only from the sitemap.
//
// Idempotent: the inserted markup carries a marker comment and is skipped if
// already present. Safe to re-run after nav edits.
//
//   node scripts/add-locations-nav.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MARKER = '<!-- nav:locations -->';
const SKIP_DIRS = new Set(['node_modules', '.git', 'scripts', '.vercel']);

// Anchor: the About link inside the Company dropdown. We insert immediately
// after the Team link so Locations sits with the other "about us" entries.
const ANCHOR = /(<a class="unav-dd-link" href="\/team\/" role="menuitem">[\s\S]*?<\/a>)/;

const ENTRY = `$1
          ${MARKER}
          <a class="unav-dd-link" href="/locations/" role="menuitem">
            <span class="unav-dd-icon" style="display:grid;place-items:center;"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 14s5-4.35 5-8A5 5 0 0 0 3 6c0 3.65 5 8 5 8Z" stroke="#f4f4f4" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="6" r="1.8" stroke="#f4f4f4" stroke-width="1.4"/></svg></span>
            <div class="unav-dd-body">
              <span class="unav-dd-title">Locations</span>
              <span class="unav-dd-desc">Where we work across South Florida</span>
            </div>
          </a>`;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(full, out);
    } else if (e.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

let added = 0; let already = 0; let noNav = 0;

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  if (rel === 'blog/_template.html') continue;
  const html = fs.readFileSync(file, 'utf8');

  if (html.includes(MARKER)) { already++; continue; }
  if (!ANCHOR.test(html)) { noNav++; continue; }

  fs.writeFileSync(file, html.replace(ANCHOR, ENTRY));
  added++;
}

console.log(`add-locations-nav: ${added} page(s) updated, ${already} already had it, ${noNav} without a Company dropdown.`);
