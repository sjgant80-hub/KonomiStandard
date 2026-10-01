#!/usr/bin/env node
// scripts/check-links.mjs <dist> <base> — every local href and src in every built page must resolve to a file in the
// artifact, the way GitHub Pages serves it under <base> (a directory serves its index.html). Exit 1, naming each one,
// if any does not. External links, anchors, data: and javascript: are not checked.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';

const [dist, base] = process.argv.slice(2);
const pages = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) pages.push(p); } };
walk(dist);

const served = (rel) => {
  const p = join(dist, rel);
  if (existsSync(p) && statSync(p).isFile()) return true;
  return existsSync(join(p, 'index.html')) || existsSync(p + '.html');
};
const bad = [];
for (const page of pages) {
  const html = readFileSync(page, 'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (s) => s.slice(0, s.indexOf('>') + 1));
  const here = '/' + posix.relative(dist.replace(/\\/g, '/'), dirname(page).replace(/\\/g, '/'));
  for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const url = m[1].split('#')[0].split('?')[0];
    if (!url || /^(https?:|mailto:|data:|javascript:|\/\/)/.test(url) || url.includes('{{')) continue;
    let site;
    if (url.startsWith('/')) {
      if (!url.startsWith(base)) { bad.push(page + ' → ' + m[1] + ' (outside ' + base + ')'); continue; }
      site = url.slice(base.length);
    } else site = posix.normalize(posix.join(here, url)).replace(/^\//, '');
    if (!served(site)) bad.push(page + ' → ' + m[1]);
  }
}
console.log(pages.length + ' pages checked · ' + (bad.length ? bad.length + ' broken' : 'every local link resolves'));
for (const b of bad) console.log('  ✗ ' + b);
process.exitCode = bad.length ? 1 : 0;
