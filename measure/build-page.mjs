#!/usr/bin/env node
// build-page.mjs — savings.html, generated from the sealed pre-registration and the committed run by the gated rules.
// Never typed; CI rebuilds it and fails if the committed page differs.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { grade } from './kstd-measure.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const json = (f) => (existsSync(join(ROOT, f)) ? JSON.parse(read(f)) : null);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pre = json('measure/data/prereg.json'), run = json('measure/data/run.json');
const r2 = (x) => (Math.round(x * 100) / 100).toFixed(2);

let body = '';
if (!pre) body = '<p class="muted">Not sealed yet.</p>';
else if (!run) body = '<p class="muted">Sealed before any held-out layer\'s tokens were counted (<code>measure/data/prereg.json</code>). Being measured; the result lands here whichever way it goes.</p>';
else {
  const j = grade(pre, run);
  const tot = (k, a) => run.held.reduce((s, h) => s + h[k][a], 0);
  body = '<p class="lead"><b>' + j.passed + ' of ' + j.of + ' sealed rules held.</b> With no shared dictionary, the held-out layers cost <b>' + tot('claude', 'ks') + '</b> Claude tokens as KonomiStandard and <b>'
    + tot('claude', 'json') + '</b> as minified JSON — <b>' + r2(j.ratio) + '×</b>. With a shared dictionary, naming the ' + run.dictionary.entries + ' held-out entries by address instead of sending them costs <b>'
    + run.dictionary.claude.addresses + '</b> tokens instead of <b>' + run.dictionary.claude.entries + '</b> — <b>' + r2(j.dictionaryRatio) + '×</b>, but only where the receiver already holds them.</p>'
    + '<div class="scroll"><table><thead><tr><th>held-out layer</th><th>Claude tokens<br>KonomiStandard</th><th>Claude tokens<br>JSON</th><th>JSON ÷ KS</th><th>local qwen2.5<br>KS · JSON</th><th>characters<br>KS · JSON</th></tr></thead><tbody>'
    + run.held.map((h) => '<tr><td>' + esc(h.title) + '</td><td>' + h.claude.ks + '</td><td>' + h.claude.json + '</td><td>' + r2(h.claude.json / h.claude.ks) + '×</td><td>' + h.local.ks + ' · ' + h.local.json + '</td><td>' + h.chars.ks + ' · ' + h.chars.json + '</td></tr>').join('')
    + '<tr class="tot"><td>all held-out layers</td><td>' + tot('claude', 'ks') + '</td><td>' + tot('claude', 'json') + '</td><td>' + r2(j.ratio) + '×</td><td>' + tot('local', 'ks') + ' · ' + tot('local', 'json') + '</td><td>' + tot('chars', 'ks') + ' · ' + tot('chars', 'json') + '</td></tr>'
    + '</tbody></table></div>'
    + '<h2>The sealed rules</h2><div class="scroll"><table><thead><tr><th>rule</th><th>result</th><th></th><th>predicted</th></tr></thead><tbody>'
    + j.rules.map((r) => '<tr><td>' + esc(pre.rules.find((x) => x.id === r.id).rule) + '</td><td>' + esc(r.value) + '</td><td class="' + (r.pass ? 'pass' : 'fail') + '">' + (r.pass ? 'PASS' : 'FAIL') + '</td><td>' + esc(pre.predictions[r.id]) + '</td></tr>').join('')
    + '</tbody></table></div>'
    + '<p class="muted">Claude tokens by the official CLI (' + esc(run.claude.model) + ') on the estate\'s own login, each text measured against a one-character baseline; local tokens by qwen2.5:7b in Ollama. Sealed in <code>'
    + esc(run.sealedIn.slice(0, 7)) + '</code>; every count is in <code>measure/data/run.json</code>; CI rebuilds every JSON twin from Thomas\'s pinned file and re-grades the rules on every push.</p>';
}

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KonomiStandard · token savings, measured</title>
<meta name="description" content="What Thomas Frumkin's KonomiStandard notation saves in tokens, measured against plain JSON and with a shared dictionary — sealed before it was measured.">
<style>
:root{--bg:#1a1a2e;--panel:#16213e;--line:#0f3460;--ink:#eaeaea;--dim:#8892b0;--accent:#e94560;--ok:#4ade80;--bad:#f87171}
@media (prefers-color-scheme: light){:root{--bg:#f7f7fb;--panel:#ffffff;--line:#d6dbe8;--ink:#1a1a2e;--dim:#4b5563;--accent:#c42a47;--ok:#15803d;--bad:#b91c1c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 ui-monospace,Menlo,Consolas,monospace;padding:24px 16px}
main{max-width:980px;margin:0 auto}h1{color:var(--accent);font-size:clamp(1.6rem,4vw,2.4rem);margin:0 0 .4rem}h2{color:var(--accent);font-size:1.15rem;margin:2rem 0 .6rem}
.lead{font-size:1.02rem}.muted{color:var(--dim);font-size:.9rem}a{color:var(--accent)}code{background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:0 .3em}
.scroll{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:var(--panel)}table{border-collapse:collapse;width:100%;font-size:.86rem}
th,td{padding:.5rem .65rem;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--dim);font-weight:600}tr:last-child td{border-bottom:0}
.tot td{font-weight:700}.pass{color:var(--ok);font-weight:700}.fail{color:var(--bad);font-weight:700}footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--dim);font-size:.85rem}
</style></head><body><main>
<p class="muted"><a href="./">← Konomi Standard</a></p>
<h1>What KonomiStandard saves, in tokens</h1>
<p>KonomiStandard is Thomas Frumkin's self-defining industrial standards compression format — its own goal line reads <i>"COMPRESSION: max info, min tokens"</i>. This measures that on the format's own spec: the held-out layers (ISA-101, ISA-18.2, OPC-UA, MQTT/Sparkplug, Modbus, KPIs, crosswalks) as Thomas wrote them, against the same content as minified JSON — and, separately, what a shared dictionary adds when the receiver already holds the entries. Sealed before it was measured; reported whichever way it landed.</p>
<!-- ⟦SAVINGS-BEGIN⟧ generated by measure/build-page.mjs -->
${body}
<!-- ⟦SAVINGS-END⟧ -->
<footer>KonomiStandard is Thomas Frumkin's — <a href="https://github.com/teslasolar/KonomiStandard">teslasolar/KonomiStandard</a>, the original (created 2025-12-23). Powered by the Konomi architecture, created by Thomas Frumkin. Measurement by Kar, in the AI-Native Solutions estate.</footer>
</main></body></html>
`;
writeFileSync(join(ROOT, 'savings.html'), page);
console.log('savings.html built · ' + (run ? 'measured' : pre ? 'sealed' : 'unsealed'));
