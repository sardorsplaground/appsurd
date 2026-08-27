#!/usr/bin/env node
// Ghost → static blog sync. Runs as the Vercel build step.
//
// Pulls published posts from the Ghost Content API, renders each one into
// blog/<slug>.html using scripts/post-template.html, and rebuilds the post
// list in blog/index.html between the GHOST:POSTS:START/END markers.
//
// Pre-Ghost posts live in scripts/legacy-posts.json and keep their committed
// HTML files; a Ghost post with the same slug takes over that entry.
//
// Requires: GHOST_API_URL (e.g. https://appsurd.ghost.io) and
// GHOST_CONTENT_API_KEY. With neither set, exits 0 without touching files so
// deploys keep working before Ghost is configured.
// Local testing: GHOST_MOCK=path/to/posts.json bypasses the network.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');
const START = '<!-- GHOST:POSTS:START -->';
const END = '<!-- GHOST:POSTS:END -->';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function authorLine(post, titles) {
  const name = post.primary_author?.name || 'Appsurd Team';
  return titles[name] ? `${name}, ${titles[name]}` : name;
}

async function fetchPosts(apiUrl, key) {
  const url = `${apiUrl.replace(/\/$/, '')}/ghost/api/content/posts/`
    + `?key=${key}&limit=all&include=authors&formats=html`
    + `&order=${encodeURIComponent('published_at desc')}`;
  const res = await fetch(url, { headers: { 'Accept-Version': 'v5.0' } });
  if (!res.ok) throw new Error(`Ghost API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).posts || [];
}

function renderPost(template, post, titles) {
  const lede = post.custom_excerpt || post.excerpt || '';
  return template
    .replaceAll('{{TITLE}}', esc(post.title))
    .replaceAll('{{TITLE_HTML}}', esc(post.title))
    .replaceAll('{{DESCRIPTION}}', esc(lede.replace(/\s+/g, ' ').trim()))
    .replaceAll('{{DATE}}', fmtDate(post.published_at))
    .replaceAll('{{AUTHOR}}', esc(authorLine(post, titles)))
    .replaceAll('{{READ_TIME}}', `${post.reading_time || 1} min read`)
    .replaceAll('{{LEDE}}', esc(lede))
    .replaceAll('{{BODY}}', post.html || '');
}

function renderEntry(e) {
  return `    <a href="${e.href}" class="post-link">
      <div class="post-meta">
        <span class="date">${e.dateText}</span>
        <span>${e.authorHtml}</span>
      </div>
      <div>
        <h2 class="post-title">${e.titleHtml}</h2>
        <p class="post-excerpt">${e.excerptHtml}</p>
        <span class="post-cta">Read post <span class="arrow">→</span></span>
      </div>
    </a>`;
}

async function main() {
  const apiUrl = process.env.GHOST_API_URL;
  const key = process.env.GHOST_CONTENT_API_KEY;
  const mock = process.env.GHOST_MOCK;

  if (!mock && (!apiUrl || !key)) {
    console.log('build-blog: GHOST_API_URL / GHOST_CONTENT_API_KEY not set — skipping Ghost sync.');
    return;
  }

  const template = fs.readFileSync(path.join(__dirname, 'post-template.html'), 'utf8');
  const titles = JSON.parse(fs.readFileSync(path.join(__dirname, 'authors.json'), 'utf8'));
  const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, 'legacy-posts.json'), 'utf8'));

  const posts = mock
    ? JSON.parse(fs.readFileSync(mock, 'utf8')).posts
    : await fetchPosts(apiUrl, key);

  const ghostSlugs = new Set();
  const entries = [];

  for (const post of posts) {
    const slug = post.slug;
    if (!/^[a-z0-9-]+$/.test(slug) || slug === 'index') {
      console.warn(`build-blog: skipping unsafe slug "${slug}"`);
      continue;
    }
    fs.writeFileSync(path.join(BLOG, `${slug}.html`), renderPost(template, post, titles));
    ghostSlugs.add(slug);
    const excerpt = (post.custom_excerpt || post.excerpt || '').replace(/\s+/g, ' ').trim();
    entries.push({
      href: `/blog/${slug}.html`,
      dateISO: post.published_at,
      dateText: fmtDate(post.published_at),
      authorHtml: esc(authorLine(post, titles)),
      titleHtml: esc(post.title),
      excerptHtml: esc(excerpt),
    });
  }

  for (const e of legacy) {
    if (!ghostSlugs.has(e.slug)) entries.push(e);
  }
  entries.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));

  const indexPath = path.join(BLOG, 'index.html');
  const index = fs.readFileSync(indexPath, 'utf8');
  const a = index.indexOf(START);
  const b = index.indexOf(END);
  if (a === -1 || b === -1 || b < a) throw new Error('GHOST:POSTS markers missing from blog/index.html');
  fs.writeFileSync(indexPath,
    index.slice(0, a + START.length)
    + '\n\n' + entries.map(renderEntry).join('\n\n') + '\n\n    '
    + index.slice(b));

  console.log(`build-blog: ${ghostSlugs.size} Ghost post(s) rendered, `
    + `${entries.length - ghostSlugs.size} legacy post(s) kept, index rebuilt.`);
}

main().catch((err) => {
  console.error('build-blog failed:', err.message);
  process.exit(1);
});
