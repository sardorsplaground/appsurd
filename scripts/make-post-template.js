#!/usr/bin/env node
// Derives scripts/post-template.html from the newest committed post,
// replacing the variable parts with {{TOKENS}} used by build-blog.js.
// Rerun after any post-page design/nav change: node scripts/make-post-template.js
const fs = require('fs');
const path = require('path');

const repo = path.join(__dirname, '..');
const SOURCE = 'blog/who-is-leopold-aschenbrenner.html'; // newest hand-written post
const src = fs.readFileSync(path.join(repo, SOURCE), 'utf8');

let out = src;

out = out.replace(/<title>[\s\S]*?<\/title>/, '<title>{{TITLE}} — Appsurd</title>');
out = out.replace(/<meta name="description" content="[\s\S]*?">/, '<meta name="description" content="{{DESCRIPTION}}">');

out = out.replace(
  /<div class="post-meta">[\s\S]*?<\/div>/,
  `<div class="post-meta">
      <span>{{DATE}}</span>
      <span class="sep">/</span>
      <span>{{AUTHOR}}</span>
      <span class="sep">/</span>
      <span>{{READ_TIME}}</span>
    </div>`
);

out = out.replace(/<h1>[\s\S]*?<\/h1>/, '<h1>{{TITLE_HTML}}</h1>');
out = out.replace(/<p class="lede">[\s\S]*?<\/p>/, '<p class="lede">{{LEDE}}</p>');

const proseStart = out.indexOf('<div class="prose">');
const endcapStart = out.indexOf('<div class="endcap">');
if (proseStart === -1 || endcapStart === -1 || endcapStart < proseStart) {
  throw new Error('Could not locate prose/endcap boundaries');
}
const proseEndTag = out.lastIndexOf('</div>', endcapStart);
out =
  out.slice(0, proseStart) +
  '<div class="prose">\n      {{BODY}}\n    </div>' +
  out.slice(proseEndTag + '</div>'.length);

fs.writeFileSync(path.join(repo, 'scripts/post-template.html'), out);

for (const t of ['{{TITLE}}', '{{DESCRIPTION}}', '{{DATE}}', '{{AUTHOR}}', '{{READ_TIME}}', '{{TITLE_HTML}}', '{{LEDE}}', '{{BODY}}']) {
  const n = out.split(t).length - 1;
  if (n !== 1) throw new Error(`token ${t} appears ${n} times`);
}
if (/Aschenbrenner/.test(out)) throw new Error('leftover post content in template');
console.log('scripts/post-template.html written,', out.split('\n').length, 'lines');
