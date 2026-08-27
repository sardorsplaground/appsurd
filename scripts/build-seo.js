#!/usr/bin/env node
// Generates sitemap.xml, robots.txt and llms.txt at build time.
//
// Runs AFTER build-blog.js so Ghost-generated post files are already on disk
// and get picked up automatically. Everything it writes is derived from the
// filesystem, so new pages need no manual registration.
//
//   node scripts/build-seo.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'seo-config.json'), 'utf8'));
const LEGACY = JSON.parse(fs.readFileSync(path.join(__dirname, 'legacy-posts.json'), 'utf8'));

const SKIP_DIRS = new Set(['node_modules', '.git', 'scripts', '.vercel']);
const SKIP_FILES = new Set(['blog/_template.html']);

function xesc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function decode(s) {
  return String(s ?? '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

function urlPathFor(rel) {
  const parts = rel.split(path.sep);
  const file = parts.pop();
  if (file === 'index.html') return parts.length ? `/${parts.join('/')}/` : '/';
  return `/${[...parts, file].join('/')}`;
}

function priorityFor(urlPath) {
  if (urlPath === '/') return '1.0';
  if (urlPath === '/offer/') return '0.9';
  if (/^\/[a-z-]+\/$/.test(urlPath)) return '0.9';
  if (urlPath.startsWith('/services/')) return '0.8';
  if (urlPath.startsWith('/work/')) return '0.7';
  if (urlPath.startsWith('/blog/')) return '0.7';
  if (urlPath.startsWith('/team/')) return '0.5';
  return '0.6';
}

function changefreqFor(urlPath) {
  if (urlPath === '/' || urlPath === '/blog/') return 'weekly';
  if (urlPath.startsWith('/blog/')) return 'yearly';
  return 'monthly';
}

function main() {
  const files = walk(ROOT)
    .filter((f) => !SKIP_FILES.has(path.relative(ROOT, f).split(path.sep).join('/')));

  const pages = files.map((file) => {
    const rel = path.relative(ROOT, file);
    const html = fs.readFileSync(file, 'utf8');
    const urlPath = urlPathFor(rel);

    const noindex = /<meta\s+name="robots"[^>]*noindex/i.test(html);
    const titleM = html.match(/<title>([\s\S]*?)<\/title>/i);
    const descM = html.match(/<meta\s+name="description"\s+content="([\s\S]*?)"\s*\/?>/i);
    const pubM = html.match(/<meta\s+property="article:published_time"\s+content="([^"]+)"/i);
    const modM = html.match(/<meta\s+property="article:modified_time"\s+content="([^"]+)"/i);

    // Prefer the last-modified date; fall back to published, then legacy, then mtime.
    let lastmod = (modM && modM[1]) || (pubM && pubM[1]) || null;
    const legacy = LEGACY.find((p) => p.href === urlPath);
    if (!lastmod && legacy) lastmod = legacy.dateISO;
    if (!lastmod) lastmod = fs.statSync(file).mtime.toISOString();

    return {
      rel,
      urlPath,
      url: CFG.origin + urlPath,
      title: decode(titleM ? titleM[1].trim() : CFG.siteName),
      description: decode(descM ? descM[1].trim() : ''),
      lastmod: new Date(lastmod).toISOString().slice(0, 10),
      noindex,
    };
  }).filter((p) => !p.noindex);

  pages.sort((a, b) => a.urlPath.localeCompare(b.urlPath));

  // ---------------------------------------------------------- sitemap.xml
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map((p) => [
      '  <url>',
      `    <loc>${xesc(p.url)}</loc>`,
      `    <lastmod>${p.lastmod}</lastmod>`,
      `    <changefreq>${changefreqFor(p.urlPath)}</changefreq>`,
      `    <priority>${priorityFor(p.urlPath)}</priority>`,
      '  </url>',
    ].join('\n')),
    '</urlset>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

  // ---------------------------------------------------------- robots.txt
  const robots = `# ${CFG.siteName} — ${CFG.origin}
User-agent: *
Allow: /

# AI crawlers are welcome; see /llms.txt
Allow: /llms.txt

Sitemap: ${CFG.origin}/sitemap.xml
`;
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots);

  // ---------------------------------------------------------- llms.txt
  const group = (prefix) => pages.filter((p) => p.urlPath.startsWith(prefix)
    && p.urlPath !== prefix);
  const bullet = (p) => {
    const name = p.title.replace(/\s+[—–-]\s+Appsurd.*$/, '').trim() || p.title;
    return `- [${name}](${p.url})${p.description ? `: ${p.description}` : ''}`;
  };
  const single = (u) => pages.find((p) => p.urlPath === u);

  const sections = [];
  sections.push(`# ${CFG.siteName}\n`);
  sections.push(`> ${CFG.description}\n`);
  sections.push([
    `- Website: ${CFG.origin}/`,
    `- Contact: ${CFG.email}`,
    CFG.telephone ? `- Phone: ${CFG.telephone}` : null,
    `- Based in: ${[CFG.addressLocality, CFG.addressRegion].filter(Boolean).join(', ')}`,
    `- Founded: ${CFG.foundingDate}`,
    CFG.parentOrganization ? `- Part of: ${CFG.parentOrganization}` : null,
    `- Sitemap: ${CFG.origin}/sitemap.xml`,
  ].filter(Boolean).join('\n') + '\n');

  const addSection = (heading, items) => {
    if (!items.length) return;
    sections.push(`## ${heading}\n`);
    sections.push(items.map(bullet).join('\n') + '\n');
  };

  const core = ['/about/', '/offer/', '/compare/', '/stack/', '/security/', '/store/', '/careers/']
    .map(single).filter(Boolean);
  addSection('Key pages', core);
  addSection('Services', [single('/services/'), ...group('/services/')].filter(Boolean));
  addSection('Case studies', [single('/work/'), ...group('/work/')].filter(Boolean));
  addSection('Writing', [single('/blog/'), ...group('/blog/')].filter(Boolean));
  addSection('Team', [single('/team/'), ...group('/team/')].filter(Boolean));

  sections.push('## Expertise\n');
  sections.push(CFG.knowsAbout.map((k) => `- ${k}`).join('\n') + '\n');
  sections.push('## Areas served\n');
  sections.push(CFG.areaServed.map((k) => `- ${k}`).join('\n') + '\n');

  fs.writeFileSync(path.join(ROOT, 'llms.txt'), sections.join('\n'));

  console.log(`build-seo: sitemap.xml (${pages.length} URLs), robots.txt, llms.txt written.`);
}

main();
