# Appsurd SEO Build — Agent Handoff

Owner: Sardor Akhmedov (Founder & CEO) · Last updated: August 27, 2026
Repo: `sardorsplaground/appsurd` · Production: https://www.appsurd.co

---

## Paste this prompt to start

> You are continuing an in-progress SEO build on the Appsurd website. Read `APPSURD-SEO-HANDOFF.md` in full before touching anything — it contains the repo conventions, the build pipeline, the hard rules, and the task queue. Work through the task queue in order. Do not skip the verification commands at the end of each task. Do not invent business facts, client names, statistics, or competitor agencies: everything factual must be verifiable, and any statistic must carry a live source URL. Ask me before publishing anything to the live blog. Start by confirming the repo builds clean, then begin Task 1.

---

## 1. Mission

Appsurd is one of four agency brands the owner controls (Appsurd, Bolder Apps, Synergy Labs, Ever Tech Solutions). The goal is to outrank **Trango Tech** for app-development search queries, starting with Miami.

The key strategic finding: Trango Tech does not rank with listicles. They rank with a programmatic **city × service × industry** landing-page matrix. Audited from their live sitemaps:

| Property | Purpose | Pages |
|---|---|---|
| `locations.trangotech.com` | City landing pages — the ranking engine | 44 |
| `application.trangotech.com` | Service pages (20) + industry pages (21) | 41 |
| `trangotech.com` | Blog (205 posts), portfolio (28), 16 author profiles | 233 |

Their Miami page (`https://locations.trangotech.com/app-development-miami/`) is the page to beat: ~4,826 words, 1 H1 / 21 H2 / 82 H3, eighteen schema types, 275 internal links to sibling city pages, 5 FAQ blocks, and `llms.txt` on both subdomains.

**Their exploitable weaknesses:**

1. Their Miami page is **662 KB of HTML** (WordPress page builder). Appsurd is static HTML on Vercel's edge and can ship a richer page under 100 KB. Permanent structural advantage.
2. Every city page is identical copy with the city name swapped. No local case studies, no real pricing, no first-hand proof.
3. They put self-serving `AggregateRating` markup on their own pages, which Google makes ineligible for star display anyway. Do not copy this.
4. Their 205 blog posts contain no proprietary data — nothing that earns links on merit.
5. Their 44 addresses are almost certainly virtual offices. Appsurd is genuinely Miami-based.

**SERP context:** for "top app development agencies in Miami," 6 of the top 10 results are directories (Clutch, DesignRush, MobileAppDaily, Expertise, GoodFirms, Techreviewer). Agency-hosted pages do break in — Chop Dawg ranks #2 with a listicle, Trango Tech ranks with their city page. Directories still own the majority of the page, so directory placement is a parallel workstream, not a substitute for content.

---

## 2. Business facts (use verbatim, never paraphrase the NAP)

| Field | Value |
|---|---|
| Name | Appsurd |
| Address | 2125 Biscayne Blvd, Miami, FL 33137 |
| Phone | +1-645-444-1069 |
| Email | hello@appsurd.co |
| Founded | 2019 |
| Parent | Bolder Apps |
| X / Twitter | @sardorappsurd |
| Positioning | Productized AI-native development squad. One squad, one flat price, shipping every 48 hours. |

NAP (name/address/phone) consistency matters for local SEO. Use that exact formatting everywhere — site, schema, Google Business Profile, every directory listing.

**Sister brands** — when any of these appear in Appsurd content, they must carry an affiliation clause, e.g. "Bolder Apps (a sister company of Appsurd)": Bolder Apps, Synergy Labs, Ever Tech Solutions.

**Known team + bylines** (`scripts/authors.json`): Sardor Akhmedov — Founder & CEO; Andrew Abbey — Chief Marketing Officer; Sean Weldon — Tech Lead. A new author needs a line added to that file or the byline renders without a title.

**Real case studies already on site** (use these, do not invent more): American Cancer Society, Kia, Stanford University, Supreme Court of Ohio, NYPD.

---

## 3. Repo state

Static HTML site, no framework, no bundler. Node scripts run at build time on Vercel. Auto-deploys to `www.appsurd.co` on every push to `main`.

```
appsurd/
├── index.html                 # home
├── about/ careers/ compare/ offer/ security/ stack/ store/  (index.html each)
├── services/                  # index.html + 7 service pages (.html)
├── work/                      # index.html + 5 case studies + logos/
├── team/                      # index.html + 19 member pages + photos/
├── blog/
│   ├── index.html             # post list, rebuilt between GHOST:POSTS markers
│   ├── _template.html         # hand-authoring template (NOT deployed content)
│   └── *.html                 # 5 legacy posts + Ghost-generated posts
├── assets/og-default.png      # 1200x630 default social card
├── scripts/
│   ├── seo-config.json        # SINGLE SOURCE OF TRUTH for site identity
│   ├── inject-seo.js          # idempotent <head> injector for committed pages
│   ├── build-seo.js           # generates sitemap.xml / robots.txt / llms.txt
│   ├── build-blog.js          # Ghost → static blog sync
│   ├── make-post-template.js  # derives post-template.html from newest post
│   ├── post-template.html     # GENERATED — do not hand-edit
│   ├── authors.json           # author name → job title
│   └── legacy-posts.json      # pre-Ghost posts kept in the index
├── vercel.json
└── package.json
```

### Commands

```bash
npm run build     # node scripts/build-blog.js && node scripts/build-seo.js  (what Vercel runs)
npm run seo       # node scripts/inject-seo.js && node scripts/make-post-template.js
```

Run `npm run seo` after **adding any page** or **editing any page's `<title>` or meta description**, then commit the result. It is idempotent — safe to run repeatedly.

### What each script does

- **`inject-seo.js`** — walks every committed `.html` and writes a marker-delimited block (`<!-- SEO:START ... SEO:END -->`) into `<head>` containing canonical, robots, OpenGraph, Twitter card, and JSON-LD. Re-running replaces the block rather than duplicating it. Schema by page type: `Organization` + `ProfessionalService` and `WebSite` on the home page; `Service` on `services/*`; `Person` on `team/*`; `Article` on `work/*`; `BlogPosting` on legacy blog posts; plus `WebPage` + `BreadcrumbList` everywhere.
- **`build-seo.js`** — derives `sitemap.xml`, `robots.txt` and `llms.txt` from the filesystem at build time. **New pages need no manual registration**; they appear automatically. Respects `noindex` (excluded from the sitemap). `lastmod` prefers `article:modified_time`, then `article:published_time`, then `legacy-posts.json`, then file mtime. These three files are gitignored because they are generated.
- **`build-blog.js`** — pulls published posts from the Ghost Content API and renders `blog/<slug>.html` from `post-template.html`, then rebuilds the list in `blog/index.html` between the `GHOST:POSTS:START/END` markers. Fills per-post canonical, `article:published_time` / `modified_time`, feature-image OG, and `BlogPosting` + `BreadcrumbList` JSON-LD.
- **`make-post-template.js`** — regenerates `post-template.html` from `blog/who-is-leopold-aschenbrenner.html`, swapping the variable parts for `{{TOKENS}}`. **Rerun after any post-page design or nav change.**

### Design system

Dark-first with a light theme via `html[data-theme="light"]`. Tokens: `--bg #0a0a0a`, `--bg-elev #111`, `--line #262626`, `--fg #f4f4f4`, `--fg-dim #a0a0a0`, `--fg-mute #6a6a6a`, `--card #131313`. Fonts: Space Grotesk (UI), JetBrains Mono (meta rows, uppercase), Fraunces (display serif, used for italic emphasis in headlines). CSS is inline per page — there is no shared stylesheet. Copy the `<style>` block from an existing page of the same type rather than inventing new styling.

---

## 4. Gotchas that have already bitten us

1. **`vercel.json` must keep `"outputDirectory": "."`.** Specifying a `buildCommand` makes Vercel demand an explicit output directory; without it the build fails with `No Output Directory named "public" found`.
2. **URLs keep their `.html` extension.** `cleanUrls` is off. A page at `services/advisory.html` is served at `/services/advisory.html`. Directory `index.html` files serve at `/about/`. Canonicals follow this exactly — do not switch to extensionless URLs without also setting `cleanUrls` and adding redirects.
3. **`post-template.html` is generated.** Edit `blog/_template.html` or the source post, then rerun `make-post-template.js`. Direct edits get overwritten.
4. **Ghost feature images are now used** as `og:image` and schema `image`, but still are not rendered in the post body. Body images work fine (Ghost CDN).
5. **Ghost Pages are not synced** — only Posts.
6. **Post slug = filename.** A Ghost post slugged `my-post` lands at `/blog/my-post.html`.
7. **The Excerpt field in Ghost does triple duty**: bold lede, meta description, and schema description. It is not optional.
8. **JSON-LD escaping**: values inside `<script type="application/ld+json">` must be JSON-escaped, not HTML-escaped — JSON-LD parsers do not decode HTML entities. `build-blog.js` builds the whole block in JS and injects it as `{{JSONLD}}` for this reason. Do not switch to HTML-escaped tokens inside JSON-LD.
9. **The Ghost Admin API needs per-request JWT signing**, so programmatic publishing is not wired up. Publishing happens in the Ghost admin UI at https://appsurd.ghost.io/ghost/.
10. **No `AggregateRating` markup anywhere.** Google: when the reviewed entity controls the reviews about itself, those pages are ineligible for the star feature. It buys nothing and looks manipulative.

---

## 5. Hard rules — do not violate these

1. **Every named competitor agency must be verified to exist.** Search for it independently; if the only page describing it as an agency in that city is our own, it is fabricated — remove it. This has already happened once (see Task 1).
2. **Every statistic carries a live source URL** in the visible page copy.
3. **No invented client names, testimonials, awards, or press mentions.**
4. **Minimum 40% genuinely unique content** per programmatic page versus its siblings — real local case studies, real pricing, real FAQs. Google's scaled content abuse policy targets pages "generated for the primary purpose of manipulating search rankings and not helping users," regardless of whether a human or an AI wrote them. Templated pages with the city name swapped are the exact failure pattern.
5. **Sister brands always carry the affiliation clause.**
6. **Page weight under 100 KB of HTML.** This is our advantage over Trango Tech's 662 KB; do not squander it.
7. **Cadence: 2–4 new pages per month per domain.** Do not bulk-publish 40 pages in a week.
8. **Nothing publishes to the live blog without the owner's explicit approval.** Stage as a Ghost draft.

---

## 6. Content-rich page specification

Every programmatic money page (city, service, or industry) must meet this bar:

| Element | Requirement |
|---|---|
| Word count | 2,500–4,000 |
| Headings | 1 H1, 12–20 H2, 40+ H3 |
| Unique content | ≥40% not shared with sibling pages |
| Local proof | ≥2 real case studies or named local clients per Tier 1 city |
| Pricing | Real cost ranges by project type |
| Data | ≥1 statistic with a cited, linked source |
| FAQ | 8–12 questions with `FAQPage` schema, sourced from real client questions and "People Also Ask" |
| Comparison table | Us vs. typical alternatives on timeline, cost model, team structure |
| Process | Numbered, with realistic timelines |
| Tech stack | Named, with reasoning |
| Schema | `LocalBusiness`/`Service`, `FAQPage`, `BreadcrumbList`, `WebPage` — never `AggregateRating` |
| Internal links | 15–25 contextual, hub-and-spoke to sibling pages |
| Byline | Real person from `authors.json` |
| Page weight | Under 100 KB HTML |

Section order that works (adapted from Trango Tech's, which ranks): trust bar → positioning claim → services in {city} → portfolio → why clients trust us → market data → key industries → why businesses invest in {city} → tools and technologies → cost of development in {city} → how we differ → our process → testimonials → FAQ → CTA.

---

## 7. Task queue

### Task 1 — Fix the fabricated listicle on Bolder Apps (highest priority)

`https://www.bolderapps.com/blog-posts/top-10-mobile-app-development-companies-in-miami-2026-rankings-why-bolder-apps-leads-the-vibe-coding-revolution` currently ranks page one for "best mobile app development company Miami" and lists these as ranks 2–10: Wavefront Digital, Brightline Mobile, Vivid Appworks, Blue Ocean Devs, Pixel Pulse Apps, CodeCrafters Miami, NextWave Mobile, Sunshine Digital Solutions, "Miami-based Innovative App Studio."

None of them could be verified as real Miami app agencies — the only page on the internet describing them that way is that post. Rewrite it with real, verifiable competitors (Chop Dawg's page is a good reference: Koombea, Mercury Development, Foonkie Monkey, TECKpert, Big Drop, SDSOL, Cosmico Studios, Wise Code Studio are all real). Keep Bolder Apps at #1 with substantive reasoning. Replace the fake "rigorous methodology" language with verifiable criteria. Note: this site is on Webflow, not this repo.

**Done when:** every listed agency has a working link to its own live site, and the methodology section states only criteria a reader could check.

### Task 2 — Google Search Console + Bing Webmaster Tools

Verify `www.appsurd.co` in both, submit `https://www.appsurd.co/sitemap.xml`, and request indexing on the home page. Requires the owner's Google account — ask him to either do it or hand over the verification token. Repeat for the other three brand domains.

**Done when:** the sitemap shows as read with 48 discovered URLs.

### Task 3 — First 10 Miami-area city pages

Build under `/locations/` in this repo (e.g. `locations/app-development-miami.html`). Generate from a data file plus a template so the pattern scales, following the page spec in section 6.

Tier 1 order: Miami, Miami Beach, Brickell, Coral Gables, Doral, Aventura, Fort Lauderdale, Boca Raton, West Palm Beach, Hialeah.

Hyperlocal neighborhood pages (Brickell, Wynwood, Coral Gables) are the wedge — Trango Tech has exactly one Miami page and cannot compete on granularity without diluting it.

Also build `locations/index.html` as the hub, and cross-link every city page to its siblings (their 275-link mesh is doing real work).

**Done when:** each page passes the section 6 spec, `npm run seo` has been run, `sitemap.xml` contains all 11 new URLs, all JSON-LD parses, and every page is under 100 KB.

### Task 4 — Service and industry pages

12 services (iOS, Android, React Native, Flutter, cross-platform, web app, MVP, AI agents, custom software, maintenance, UI/UX, modernization) and 10 industries prioritized for real Miami demand (real estate, hospitality/restaurant, marine/yachting, healthcare, fintech/crypto, logistics/shipping, construction, fitness, events, legal).

Note that `services/` already holds Appsurd's productized offerings — these new pages are SEO landing pages for search demand, so keep them in a separate directory and make sure they do not cannibalize the existing service pages. Decide the URL pattern deliberately and document it.

### Task 5 — App development cost calculator

Interactive, client-side, better than `https://application.trangotech.com/app-development-cost-calculator/`. This is Trango Tech's only real link magnet. Make it embeddable so other sites can carry it with attribution.

### Task 6 — Proprietary data assets

The real differentiator, because no competitor has one. Annual **Miami App Development Cost Report** built from real aggregated quote data across the four brands, plus a Miami dev rate benchmark. Citable, press-worthy, impossible to copy.

### Task 7 — Directory placement

All four brands on Clutch (with verified reviews — the big one), GoodFirms, DesignRush, Expertise.com, Techreviewer, MobileAppDaily, TopDevelopers, The Manifest, G2, and Google Business Profile with the real address. Chop Dawg leans on "300+ five-star reviews across trusted directories" as trust proof and it works.

### Task 8 — Listicle layer

One listicle per brand per market, on that brand's own domain. Publisher at #1 with substantive reasoning, 9 real verified competitors each with a genuine assessment and a link, verifiable selection criteria, comparison table, 5–8 FAQs with schema, sister brands carrying the affiliation clause, 2,000–3,000 words, `Article` + `FAQPage` schema (never `Review`).

Do not put all four owned brands in the top four slots of a single page framed as an objective ranking. Per the FTC's Consumer Reviews and Testimonials Rule § 465.6, effective October 21, 2024, a business may not misrepresent that a website or entity it controls provides independent reviews or opinions about a category that includes its own services. One brand per page, in its own voice, is both safer and the version that ranks (Chop Dawg is #2 doing exactly this).

---

## 8. Verification before every commit

```bash
cd appsurd
npm run seo && npm run build          # must exit 0
grep -rn "{{" --include=*.html . | grep -v scripts/   # must be empty (no unfilled tokens)
```

Then confirm with a script that, for every `.html` outside `scripts/`:

- exactly one `<link rel="canonical">` and exactly one `<!-- SEO:START` marker
- every `<script type="application/ld+json">` block parses as JSON (unescape `<\/` to `</` first)
- no `og:` value contains `&amp;amp;` or `{{`
- the file is under 100 KB

After deploying, confirm live: `curl -sL https://www.appsurd.co/sitemap.xml | grep -c "<loc>"` matches the local page count.

---

## 9. Environment

See the accompanying `appsurd.env` — rename it to `.env` in the repo root. It is gitignored. `GHOST_API_URL` and `GHOST_CONTENT_API_KEY` are already set in the Vercel project for Production and Preview, so the deployed build works without local `.env` values; those values are only needed for local dry runs.

Local dry run without touching the network:

```bash
GHOST_MOCK=/tmp/mock.json node scripts/build-blog.js
```

`/tmp/mock.json` shape: `{"posts":[{"slug":"...","title":"...","custom_excerpt":"...","published_at":"ISO","updated_at":"ISO","reading_time":6,"feature_image":"https://...","primary_author":{"name":"Sardor Akhmedov"},"html":"<p>...</p>"}]}`

**Reset after a dry run** — it writes real files:

```bash
rm -f blog/<slug>.html && git checkout -- blog/index.html && npm run seo
```

---

## 10. Sources

- [Google Search Central — Spam policies for Google Web Search](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google Search Central — March 2024 core update and new spam policies](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)
- [Google Search Central — Review snippet structured data](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
- [FTC — Final rule banning fake reviews and testimonials](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials)
- [FTC — Consumer Reviews and Testimonials Rule: questions and answers](https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers)
- [Clutch — Top app developers in Miami](https://clutch.co/app-developers/miami)
- [Chop Dawg — Top 10 app development companies in Miami in 2026](https://www.chopdawg.com/top-10-app-development-companies-in-miami-in-2026/)
- [Trango Tech Miami location page](https://locations.trangotech.com/app-development-miami/)
- Trango Tech sitemaps: [locations](https://locations.trangotech.com/sitemap_index.xml) · [application](https://application.trangotech.com/sitemap_index.xml) · [blog](https://trangotech.com/blog/sitemap_index.xml)
