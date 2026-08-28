#!/usr/bin/env node
/**
 * build-locations.js — generates the /locations/ landing pages.
 *
 * Each city is authored as JSON in scripts/locations/<slug>.json. Shared
 * regional facts (stats, case studies, stack, comparison) live in
 * scripts/locations/_shared.json and are merged in, so a city file only needs
 * to carry what is genuinely city-specific.
 *
 * Page chrome (fonts, base CSS, nav, footer, nav scripts) is lifted at build
 * time from services/advisory.html — the "donor". That means a nav or design
 * change to the rest of the site propagates here on the next build instead of
 * drifting into a second, stale copy.
 *
 * The <head> SEO block is NOT written here. These pages are committed, so
 * scripts/inject-seo.js owns canonical/OG/JSON-LD for them (it reads the same
 * JSON to build FAQPage and Service schema). Run `npm run seo` after this.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'locations');
const OUT_DIR = path.join(ROOT, 'locations');
const DONOR = path.join(ROOT, 'services', 'advisory.html');

const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'seo-config.json'), 'utf8'));

/* ---------------------------------------------------------------- helpers */

// Authors write entities like &amp; and &mdash; directly in the JSON copy, so we
// decode first and then escape once. Escaping without decoding turns an authored
// "&amp;" into "&amp;amp;", which renders on the page as a literal "&amp;".
const decodeEntities = (s) =>
  String(s == null ? '' : s)
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const esc = (s) =>
  decodeEntities(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Author copy may contain deliberate inline markup: <em>, <strong>, <a href>.
// Allow exactly those, escape everything else.
const ALLOWED = /^(\/?)(em|strong|b|i|br|a)(\s|\/|$)/i;
function rich(s) {
  if (s == null) return '';
  return String(s).replace(/<[^>]*>/g, (tag) => {
    const inner = tag.replace(/^<\s*/, '').replace(/\s*\/?>$/, '');
    return ALLOWED.test(inner) ? tag : esc(tag);
  });
}

const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, '');

/* ------------------------------------------------------------ chrome load */

function loadChrome() {
  const donor = fs.readFileSync(DONOR, 'utf8');

  const cut = (startNeedle, endNeedle, includeEnd = true) => {
    const a = donor.indexOf(startNeedle);
    if (a === -1) throw new Error(`donor missing: ${startNeedle}`);
    const b = donor.indexOf(endNeedle, a);
    if (b === -1) throw new Error(`donor missing: ${endNeedle}`);
    return donor.slice(a, includeEnd ? b + endNeedle.length : b);
  };

  // The donor's FAQ script assumes the button's parent is .faq. Our FAQ markup
  // wraps the button in an <h3> (so the questions are real headings for search),
  // which breaks that assumption — and leaving both handlers bound would make
  // them fight. So drop the donor's copy and ship our own below.
  const tail = donor
    .slice(donor.indexOf('</footer>') + '</footer>'.length)
    .replace(/<script>\s*document\.querySelectorAll\('\.faq button'\)[\s\S]*?<\/script>/, FAQ_SCRIPT);

  return {
    // fonts + the entire base stylesheet
    headTail: cut('<link rel="preconnect"', '</style>'),
    // the inline sprite the nav logo points at
    svgDefs: cut('<svg width="0" height="0"', '</svg>'),
    nav: cut('<!-- ===== UNIFIED NAV ===== -->', '<!-- ===== /UNIFIED NAV ===== -->'),
    // nav behaviour script, our FAQ script, and </body></html>
    tail,
  };
}

const FAQ_SCRIPT = `<script>
document.querySelectorAll('.faq button').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var item = btn.closest('.faq');
    var wasOpen = item.classList.contains('open');
    // Close every panel AND reset its button state, otherwise assistive tech is
    // told several answers are open at once while only one is visible.
    document.querySelectorAll('.faq.open').forEach(function (f) {
      f.classList.remove('open');
      var b = f.querySelector('button');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
    btn.setAttribute('aria-expanded', String(!wasOpen));
    if (!wasOpen) item.classList.add('open');
  });
});
</script>`;

/* ------------------------------------------------------------- extra CSS */

// These pages are generated, so nobody hand-reads their CSS. City copy is long
// enough that the inline stylesheet is a meaningful share of page weight, so we
// squeeze the <style> blocks (comments, redundant whitespace) on the way out.
// Only the contents of <style> tags are touched — markup is left alone.
function minifyStyles(html) {
  return String(html).replace(/<style>([\s\S]*?)<\/style>/g, (_, css) => {
    const min = css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{};,>])\s*/g, '$1')
      .replace(/;\}/g, '}')
      .replace(/:\s+/g, ':')
      .trim();
    return `<style>${min}</style>`;
  });
}

const EXTRA_CSS = `
<style>
/* ---- /locations/ page furniture ---- */
.loc-bar { border-bottom: 1px solid var(--line); background: var(--bg-elev); }
.loc-bar-inner { display: flex; flex-wrap: wrap; gap: 10px 28px; padding: 14px 0; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.11em; text-transform: uppercase; color: var(--fg-mute); }
.loc-bar-inner b { color: var(--fg-dim); font-weight: 500; }

.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin: 0 0 8px; }
.stat { background: var(--card); padding: 26px 24px 22px; }
.stat-v { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.05; }
.stat-l { margin-top: 8px; font-size: 14px; color: var(--fg-dim); line-height: 1.45; }
.stat-s { margin-top: 12px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; }
.stat-s a { color: var(--fg-mute); border-bottom: 1px solid var(--line-strong); }
.stat-s a:hover { color: var(--fg); }

.prose { max-width: 780px; }
.prose p { color: var(--fg-dim); font-size: 17.5px; line-height: 1.68; margin: 0 0 18px; }
.prose p strong { color: var(--fg); font-weight: 600; }
.prose p a { color: var(--fg); border-bottom: 1px solid var(--line-strong); }
.prose p a:hover { border-bottom-color: var(--fg); }

.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 26px 24px; }
.card h3 { margin: 0 0 10px; font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
.card p { margin: 0; color: var(--fg-dim); font-size: 15.5px; line-height: 1.6; }
.card p + p { margin-top: 12px; }
.card-idx { display: block; margin-bottom: 12px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.12em; color: var(--fg-mute); }

.tbl-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 14px; -webkit-overflow-scrolling: touch; }
/* Make the scroll area legible as a scroll area: a persistent thin track plus a
   fade on the right edge so a clipped column always looks clipped, not missing. */
.tbl-wrap { scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent; position: relative; }
.tbl-wrap::-webkit-scrollbar { height: 8px; }
.tbl-wrap::-webkit-scrollbar-track { background: var(--bg-elev); border-radius: 0 0 14px 14px; }
.tbl-wrap::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 999px; }
.tbl-scroll { position: relative; }
.tbl-hint { display: none; }
@media (max-width: 760px) {
  .tbl-scroll::after { content: ''; position: absolute; top: 26px; right: 0; bottom: 8px; width: 46px; pointer-events: none; border-radius: 0 14px 14px 0; background: linear-gradient(to right, rgba(10,10,10,0), rgba(10,10,10,0.92)); }
  .tbl-hint { display: block; margin-bottom: 8px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--fg-mute); }
}
table.tbl { width: 100%; border-collapse: collapse; font-size: 15px; min-width: 560px; }
table.tbl th, table.tbl td { text-align: left; padding: 16px 20px; border-bottom: 1px solid var(--line); vertical-align: top; }
table.tbl thead th { background: var(--bg-elev); font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.11em; text-transform: uppercase; color: var(--fg-mute); font-weight: 500; }
table.tbl tbody tr:last-child td { border-bottom: none; }
table.tbl td:first-child { color: var(--fg); font-weight: 500; }
table.tbl td { color: var(--fg-dim); line-height: 1.55; }

.steps { counter-reset: step; display: grid; gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
.step { background: var(--card); padding: 24px; display: grid; grid-template-columns: 54px 1fr; gap: 18px; }
.step-n { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; letter-spacing: 0.1em; color: var(--fg-mute); padding-top: 4px; }
.step h3 { margin: 0 0 8px; font-size: 17px; font-weight: 600; }
.step p { margin: 0; color: var(--fg-dim); font-size: 15.5px; line-height: 1.6; }
.step .when { display: inline-block; margin-top: 10px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fg-mute); border: 1px solid var(--line-strong); border-radius: 999px; padding: 4px 10px; }

.pills { display: flex; flex-wrap: wrap; gap: 10px; }
.pill { border: 1px solid var(--line-strong); border-radius: 999px; padding: 9px 16px; font-size: 14px; color: var(--fg-dim); }
.pill:hover { color: var(--fg); border-color: var(--fg-mute); }

.hood { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
.hood-i { background: var(--card); padding: 22px; }
.hood-i h3 { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
.hood-i p { margin: 0; color: var(--fg-dim); font-size: 15px; line-height: 1.58; }

.toc { border: 1px solid var(--line); border-radius: 14px; background: var(--bg-elev); padding: 22px 24px; }
.toc-h { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--fg-mute); margin-bottom: 14px; }
.toc ol { margin: 0; padding-left: 20px; columns: 2; column-gap: 32px; }
.toc li { margin: 0 0 8px; font-size: 15px; color: var(--fg-dim); break-inside: avoid; }
.toc a:hover { color: var(--fg); }
@media (max-width: 640px) { .toc ol { columns: 1; } }

.cta-box { border: 1px solid var(--line-strong); border-radius: 16px; background: var(--card); padding: 40px; text-align: center; }
.cta-box h2 { margin: 0 0 12px; font-size: clamp(26px, 4vw, 38px); letter-spacing: -0.02em; }
.cta-box p { margin: 0 auto 26px; max-width: 520px; color: var(--fg-dim); }
.cta-box .nap { margin-top: 22px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-mute); line-height: 1.9; }
.cta-box .nap a { color: var(--fg-dim); border-bottom: 1px solid var(--line-strong); }

.section h2.h2 { font-size: clamp(26px, 3.6vw, 38px); letter-spacing: -0.025em; line-height: 1.1; margin: 0 0 14px; }
.section h2.h2 em { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-weight: 400; }
.sub { color: var(--fg-dim); max-width: 720px; margin: 0 0 32px; font-size: 17px; line-height: 1.6; }
.section > .wrap > .prose + .cards, .section > .wrap > .sub + * { margin-top: 4px; }
.mt { margin-top: 32px; }

/* FAQ questions are real <h3>s wrapped around the existing button styling */
.faq .faq-h { margin: 0; font: inherit; font-weight: inherit; letter-spacing: inherit; }
</style>`;

/* --------------------------------------------------------------- renderers */

function renderStats(stats) {
  if (!stats || !stats.length) return '';
  return `<div class="stats">${stats
    .map(
      (s) => `
    <div class="stat">
      <div class="stat-v">${esc(s.value)}</div>
      <div class="stat-l">${rich(s.label)}</div>
      ${
        s.source
          ? `<div class="stat-s">Source: <a href="${esc(s.source.url)}" target="_blank" rel="noopener nofollow">${esc(
              s.source.name
            )}</a></div>`
          : ''
      }
    </div>`
    )
    .join('')}</div>`;
}

function renderSection(sec, i) {
  const id = sec.id || `s${i + 1}`;
  const parts = [];
  parts.push(`<section class="section" id="${esc(id)}">`);
  parts.push('<div class="wrap">');
  if (sec.eyebrow) parts.push(`<span class="eyebrow">${esc(sec.eyebrow)}</span>`);
  if (sec.h2) {
    const [lead, em] = Array.isArray(sec.h2) ? sec.h2 : [sec.h2, null];
    parts.push(`<h2 class="h2">${rich(lead)}${em ? ` <em>${rich(em)}</em>` : ''}</h2>`);
  }
  if (sec.sub) parts.push(`<p class="sub">${rich(sec.sub)}</p>`);
  if (sec.body && sec.body.length)
    parts.push(`<div class="prose">${sec.body.map((p) => `<p>${rich(p)}</p>`).join('')}</div>`);

  if (sec.stats) parts.push(`<div class="mt">${renderStats(sec.stats)}</div>`);

  if (sec.cards && sec.cards.length) {
    parts.push(
      `<div class="cards mt">${sec.cards
        .map(
          (c, n) => `<div class="card">${
            c.index === false ? '' : `<span class="card-idx">${String(n + 1).padStart(2, '0')}</span>`
          }<h3>${rich(c.h3)}</h3>${(Array.isArray(c.p) ? c.p : [c.p]).map((p) => `<p>${rich(p)}</p>`).join('')}</div>`
        )
        .join('')}</div>`
    );
  }

  if (sec.hoods && sec.hoods.length) {
    parts.push(
      `<div class="hood mt">${sec.hoods
        .map((h) => `<div class="hood-i"><h3>${rich(h.name)}</h3><p>${rich(h.note)}</p></div>`)
        .join('')}</div>`
    );
  }

  if (sec.table) {
    // These tables are wider than a phone. They scroll, but a silent scroll area
    // reads as a truncated table, so we ship an explicit mobile-only hint
    // alongside the CSS edge fade.
    parts.push(
      `<div class="tbl-scroll mt"><span class="tbl-hint">Swipe the table sideways to see all ${
        sec.table.head.length
      } columns →</span><div class="tbl-wrap"><table class="tbl"><thead><tr>${sec.table.head
        .map((h) => `<th>${esc(h)}</th>`)
        .join('')}</tr></thead><tbody>${sec.table.rows
        .map((r) => `<tr>${r.map((c) => `<td>${rich(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div></div>`
    );
  }

  if (sec.steps && sec.steps.length) {
    parts.push(
      `<div class="steps mt">${sec.steps
        .map(
          (s, n) =>
            `<div class="step"><div class="step-n">${String(n + 1).padStart(2, '0')}</div><div><h3>${rich(
              s.h3
            )}</h3><p>${rich(s.p)}</p>${s.when ? `<span class="when">${esc(s.when)}</span>` : ''}</div></div>`
        )
        .join('')}</div>`
    );
  }

  if (sec.pills && sec.pills.length) {
    parts.push(
      `<div class="pills mt">${sec.pills
        .map((p) =>
          p.href
            ? `<a class="pill" href="${esc(p.href)}">${rich(p.label)}</a>`
            : `<span class="pill">${rich(p.label || p)}</span>`
        )
        .join('')}</div>`
    );
  }

  if (sec.after && sec.after.length)
    parts.push(`<div class="prose mt">${sec.after.map((p) => `<p>${rich(p)}</p>`).join('')}</div>`);

  parts.push('</div></section>');
  return parts.join('\n');
}

function renderFaqs(faqs) {
  if (!faqs || !faqs.length) return '';
  return `<section class="section" id="faq">
  <div class="wrap">
    <span class="eyebrow">Questions</span>
    <h2 class="h2">The things clients<br><em>actually ask</em>.</h2>
    <div class="faqs">
${faqs
  .map(
    (f, i) => `      <div class="faq"><h3 class="faq-h"><button aria-expanded="false"><span><span class="faq-idx">Q·${String(
      i + 1
    ).padStart(2, '0')}</span>${rich(f.q)}</span><span class="faq-toggle">+</span></button></h3><div class="faq-body"><div>${(Array.isArray(
      f.a
    )
      ? f.a
      : [f.a]
    )
      .map((p) => `<p>${rich(p)}</p>`)
      .join('')}</div></div></div>`
  )
  .join('\n')}
    </div>
  </div>
</section>`;
}

function renderNearby(city, all) {
  const others = all.filter((c) => c.slug !== city.slug);
  if (!others.length) return '';
  const order = city.nearby && city.nearby.length ? city.nearby : others.map((c) => c.slug);
  const links = order
    .map((slug) => all.find((c) => c.slug === slug))
    .filter(Boolean)
    .concat(others.filter((c) => !order.includes(c.slug)))
    .filter((c, i, arr) => arr.indexOf(c) === i);
  return `<section class="section" id="nearby">
  <div class="wrap">
    <span class="eyebrow">Also serving</span>
    <h2 class="h2">Same squad, <em>next city over</em>.</h2>
    <p class="sub">We work across South Florida. Pick the market closest to you, or start at the <a href="/locations/">locations index</a>.</p>
    <div class="pills">${links
      .map((c) => `<a class="pill" href="/locations/${esc(c.slug)}.html">${esc(c.linkLabel || c.city)}</a>`)
      .join('')}</div>
  </div>
</section>`;
}

function renderToc(sections) {
  const items = sections.filter((s) => s.h2 && s.toc !== false);
  if (items.length < 4) return '';
  return `<section class="section" id="contents" style="padding-top:0;">
  <div class="wrap">
    <div class="toc">
      <div class="toc-h">On this page</div>
      <ol>${items
        .map((s, i) => {
          const [lead, em] = Array.isArray(s.h2) ? s.h2 : [s.h2, null];
          const label = stripTags(`${lead}${em ? ` ${em}` : ''}`).replace(/\s+/g, ' ').trim();
          return `<li><a href="#${esc(s.id || `s${i + 1}`)}">${esc(label)}</a></li>`;
        })
        .join('')}</ol>
    </div>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ pages */

function buildPage(city, all, chrome) {
  const [h1lead, h1em] = Array.isArray(city.h1) ? city.h1 : [city.h1, null];
  const sections = city.sections || [];

  const body = [
    `<section class="hero">
  <div class="wrap">
    <span class="eyebrow"><a href="/locations/">Locations</a> · ${esc(city.city)}, ${esc(city.region)}</span>
    <h1>${rich(h1lead)}${h1em ? `<br><em>${rich(h1em)}</em>` : ''}</h1>
    <p>${rich(city.dek)}</p>
    <div class="hero-ctas">
      <a href="https://tidycal.com/sardor/30" target="_blank" rel="noopener" class="btn btn-lg">Book a 30-min call →</a>
      <a href="#pricing" class="btn btn-lg btn-ghost">See real cost ranges</a>
    </div>
  </div>
</section>`,
    city.trustBar && city.trustBar.length
      ? `<div class="loc-bar"><div class="wrap loc-bar-inner">${city.trustBar
          .map((t) => `<span>${rich(t)}</span>`)
          .join('')}</div></div>`
      : '',
    city.stats && city.stats.length
      ? `<section class="section" style="padding-bottom:0;"><div class="wrap">${renderStats(city.stats)}</div></section>`
      : '',
    renderToc(sections),
    ...sections.map(renderSection),
    renderFaqs(city.faqs),
    renderNearby(city, all),
    `<section class="section">
  <div class="wrap">
    <div class="cta-box">
      <h2>Ready to scope your ${esc(city.city)} build?</h2>
      <p>Thirty minutes, no deck. Bring the problem; leave with a shape, a range, and a timeline you can take to your board.</p>
      <a href="https://tidycal.com/sardor/30" target="_blank" rel="noopener" class="btn btn-lg">Book a 30-min call →</a>
      <div class="nap">
        ${esc(CFG.siteName)} · ${esc(CFG.streetAddress)}, ${esc(CFG.addressLocality)}, ${esc(CFG.addressRegion)} ${esc(
      CFG.postalCode
    )}<br>
        <a href="tel:${esc(String(CFG.telephone).replace(/[^+\d]/g, ''))}">${esc(CFG.telephone)}</a> · <a href="mailto:${esc(
      CFG.email
    )}">${esc(CFG.email)}</a>
      </div>
    </div>
  </div>
</section>`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return assemble({ title: city.title, description: city.metaDescription, body, chrome, footerRight: '<a href="/locations/">← All locations</a>' });
}

function buildHub(all, chrome) {
  const byRegion = {};
  all.forEach((c) => {
    const k = c.group || 'South Florida';
    (byRegion[k] = byRegion[k] || []).push(c);
  });

  const body = `<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Locations</span>
    <h1>Where we<br><em>build</em>.</h1>
    <p>Appsurd is a Miami company — one address, one squad, no franchise network. These are the South Florida markets we work in most, with real cost ranges and local context for each.</p>
    <div class="hero-ctas">
      <a href="https://tidycal.com/sardor/30" target="_blank" rel="noopener" class="btn btn-lg">Book a 30-min call →</a>
    </div>
  </div>
</section>

<div class="loc-bar"><div class="wrap loc-bar-inner">
  <span><b>Based in</b> ${esc(CFG.streetAddress)}, ${esc(CFG.addressLocality)}</span>
  <span><b>Founded</b> ${esc(CFG.foundingDate)}</span>
  <span><b>Squad</b> One team, flat monthly price</span>
  <span><b>Cadence</b> Shipping every 48 hours</span>
</div></div>

${Object.entries(byRegion)
  .map(
    ([group, cities]) => `<section class="section">
  <div class="wrap">
    <span class="eyebrow">${esc(group)}</span>
    <h2 class="h2">${esc(cities.length)} ${cities.length === 1 ? 'market' : 'markets'} we <em>actually serve</em>.</h2>
    <div class="cards mt">${cities
      .map(
        (c) => `<div class="card"><h3><a href="/locations/${esc(c.slug)}.html">${esc(c.city)}, ${esc(
          c.region
        )}</a></h3><p>${rich(c.hubBlurb || c.metaDescription)}</p><p><a href="/locations/${esc(
          c.slug
        )}.html" style="color:var(--fg);border-bottom:1px solid var(--line-strong);">App development in ${esc(
          c.city
        )} →</a></p></div>`
      )
      .join('')}</div>
  </div>
</section>`
  )
  .join('\n\n')}

<section class="section">
  <div class="wrap">
    <div class="cta-box">
      <h2>Don't see your city?</h2>
      <p>We work remote-first across the US and take on projects well outside South Florida. The location pages exist because local context is useful — not because we bill by zip code.</p>
      <a href="https://tidycal.com/sardor/30" target="_blank" rel="noopener" class="btn btn-lg">Talk to us →</a>
      <div class="nap">
        ${esc(CFG.siteName)} · ${esc(CFG.streetAddress)}, ${esc(CFG.addressLocality)}, ${esc(CFG.addressRegion)} ${esc(
    CFG.postalCode
  )}<br>
        <a href="tel:${esc(String(CFG.telephone).replace(/[^+\d]/g, ''))}">${esc(CFG.telephone)}</a> · <a href="mailto:${esc(
    CFG.email
  )}">${esc(CFG.email)}</a>
      </div>
    </div>
  </div>
</section>`;

  return assemble({
    title: `App Development Locations — South Florida · Appsurd`,
    description: `Appsurd builds apps and AI products from ${CFG.streetAddress}, ${CFG.addressLocality}. Local cost ranges, timelines and context for every South Florida market we serve.`,
    body,
    chrome,
    footerRight: '<a href="/services/">Services →</a>',
  });
}

function assemble({ title, description, body, chrome, footerRight }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${minifyStyles(chrome.headTail)}
${minifyStyles(EXTRA_CSS)}
</head>
<body>
${chrome.svgDefs}

${chrome.nav}

<div class="grid-bg"></div>

${body}

<footer class="footer">
  <div class="wrap footer-inner">
    <span>© 2026 APPSURD · A BOLDER COMPANY · ALL RIGHTS RESERVED</span>
    <span>${footerRight}</span>
  </div>
</footer>
${chrome.tail}`;
}

/* ------------------------------------------------------------------- main */

function loadCities() {
  if (!fs.existsSync(DATA_DIR)) return [];
  const shared = fs.existsSync(path.join(DATA_DIR, '_shared.json'))
    ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, '_shared.json'), 'utf8'))
    : {};

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort();

  return files.map((f) => {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    const city = { ...raw, slug: raw.slug || f.replace(/\.json$/, '') };

    // Shared sections are referenced by key and can be overridden per city.
    city.sections = (city.sections || []).map((s) => {
      if (typeof s === 'string') {
        const tpl = (shared.sections || {})[s];
        if (!tpl) throw new Error(`${f}: unknown shared section "${s}"`);
        return interpolate(tpl, city);
      }
      if (s.use) {
        const tpl = (shared.sections || {})[s.use];
        if (!tpl) throw new Error(`${f}: unknown shared section "${s.use}"`);
        return interpolate({ ...tpl, ...s }, city);
      }
      return s;
    });

    if (city.stats === 'shared') city.stats = interpolate(shared.stats || [], city);
    if (city.faqs) city.faqs = city.faqs.map((q) => (typeof q === 'string' ? (shared.faqs || {})[q] : q)).filter(Boolean);
    return city;
  });
}

// {{CITY}} / {{COUNTY}} / {{REGION}} inside shared templates
function interpolate(node, city) {
  if (typeof node === 'string')
    return node
      .replace(/\{\{CITY\}\}/g, city.city)
      .replace(/\{\{COUNTY\}\}/g, city.county || '')
      .replace(/\{\{REGION\}\}/g, city.region || '');
  if (Array.isArray(node)) return node.map((n) => interpolate(n, city));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = interpolate(v, city);
    return out;
  }
  return node;
}

function main() {
  const cities = loadCities();
  if (!cities.length) {
    console.log('build-locations: no city data in scripts/locations/, nothing to do.');
    return;
  }
  const chrome = loadChrome();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  for (const city of cities) {
    const out = path.join(OUT_DIR, `${city.slug}.html`);
    fs.writeFileSync(out, buildPage(city, cities, chrome));
    written++;
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), buildHub(cities, chrome));

  const sizes = cities.map((c) => {
    const b = fs.statSync(path.join(OUT_DIR, `${c.slug}.html`)).size;
    return `${c.slug} ${(b / 1024).toFixed(0)}KB`;
  });
  console.log(`build-locations: ${written} city page(s) + hub written.`);
  console.log(`  ${sizes.join(' · ')}`);
}

main();
