// ksjson.mjs — THE SAME CONTENT, TWO WAYS: KonomiStandard notation and plain JSON (Kar, 2026-10-01).
// KonomiStandard is Thomas Frumkin's self-defining industrial standards compression format (teslasolar/KonomiStandard;
// its stated goal: "COMPRESSION: max info, min tokens"). Simon, relayed: "both lets do this lfg". To measure what it
// saves, the same content needs a conventional twin. This turns a layer of KonomiStandard text into minified JSON that
// carries the same atoms — every name, type, value and note — by fixed rules: blocks by their ──── headers, a schema
// line's rows zipped into keyed objects, typed objects parsed, key:value pairs kept, anything it cannot read kept
// whole as a string (which keeps the JSON SMALLER, never larger, so any doubt counts against the format's saving).
// A coverage check proves nothing was dropped. Pure and total: no I/O, never throws on garbage.

const str = (v) => (typeof v === 'string' ? v : '');

// the layers of the spec: each "## " heading and the text of the code fences under it
export function layersOf(md) {
  const out = [];
  let cur = null, inFence = false, fence = [];
  for (const line of str(md).replace(/\r\n?/g, '\n').split('\n')) {
    const h = /^## (.+)$/.exec(line);
    if (h && !inFence) { cur = { title: h[1].trim(), ks: '' }; out.push(cur); continue; }
    if (/^```/.test(line)) {
      if (inFence && cur) cur.ks += (cur.ks ? '\n' : '') + fence.join('\n');
      inFence = !inFence; fence = [];
      continue;
    }
    if (inFence) fence.push(line);
  }
  return out.filter((l) => l.ks.trim());
}

// split at top-level separators, not inside quotes, braces or brackets
export function splitTop(s, sep) {
  const out = [];
  let depth = 0, q = '', cur = '';
  for (const ch of str(s)) {
    if (q) { cur += ch; if (ch === q) q = ''; continue; }
    if (ch === '"') { q = ch; cur += ch; continue; }
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    if (ch === '}' || ch === ']' || ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

const unq = (s) => (/^".*"$/.test(s) ? s.slice(1, -1) : s);
// a scalar: numbers become numbers (shorter in JSON), quoted text loses its quotes, the rest stays text
export function scalar(s) {
  const t = str(s).trim();
  if (/^-?\d+(\.\d+)?$/.test(t) && t.length < 16 && !/^0\d/.test(t)) return Number(t);
  return unq(t);
}
// a value: {…} an object, […] an array, otherwise a scalar
export function parseValue(s) {
  const t = str(s).trim();
  if (/^\{[\s\S]*\}$/.test(t)) return parseObject(t);
  if (/^\[[\s\S]*\]$/.test(t)) return splitTop(t.slice(1, -1), ',').map((x) => parseValue(x)).filter((x) => x !== '');
  return scalar(t);
}
// {a:t,b:{…}} → { a: 't', b: {…} }; {a,b,c} → ['a','b','c']
export function parseObject(s) {
  const inner = str(s).trim().replace(/^\{|\}$/g, '');
  const parts = splitTop(inner, ',').map((p) => p.trim()).filter(Boolean);
  if (!parts.some((p) => splitTop(p, ':').length > 1)) return parts.map(scalar);
  const out = {};
  for (const p of parts) {
    const kv = splitTop(p, ':');
    const k = kv[0].trim();
    out[k] = kv.length > 1 ? parseValue(kv.slice(1).join(':')) : null;
  }
  return out;
}

// the logical lines of a block: a { that opens a multi-line object is joined until it closes
export function logicalLines(text) {
  const out = [];
  let buf = '', depth = 0;
  for (const raw of str(text).split('\n')) {
    const line = raw.trim();
    if (!line && !depth) continue;
    buf = buf ? buf + ' ' + line : line;
    for (const ch of line) { if (ch === '{') depth++; else if (ch === '}') depth--; }
    if (depth <= 0) { if (buf.trim()) out.push(buf.trim()); buf = ''; depth = 0; }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const HEADER = /^(\S+?)─{3,}\s*$/;
// a layer → its blocks: [{ name, lines }] — the lines before any header form the block named "_"
export function blocksOf(ks) {
  const out = [];
  let cur = { name: '_', lines: [] };
  for (const line of str(ks).split('\n')) {
    const h = HEADER.exec(line.trim());
    if (h) { if (cur.lines.some((l) => l.trim())) out.push(cur); cur = { name: h[1], lines: [] }; continue; }
    cur.lines.push(line);
  }
  if (cur.lines.some((l) => l.trim())) out.push(cur);
  return out.map((b) => ({ name: b.name, text: b.lines.join('\n') }));
}

// one block's text → a JSON value, by fixed rules
export function blockValue(text) {
  const items = [];
  let schema = null;
  for (const line of logicalLines(text)) {
    if (/^\{[A-Za-z0-9_, ]+\}$/.test(line) && !line.includes(':')) { schema = parseObject(line); items.push({ fields: schema }); continue; }
    if (/^\{[\s\S]*\}$/.test(line)) { items.push(parseObject(line)); continue; }
    const bars = splitTop(line, '|');
    if (bars.length > 1 && bars.every((b) => splitTop(b, ':').length > 1)) {
      const o = {}; for (const b of bars) { const kv = splitTop(b, ':'); o[kv[0].trim()] = scalar(kv.slice(1).join(':')); } items.push(o); continue;
    }
    const kv = splitTop(line, ':');
    if (kv.length === 1) { items.push(bars.length > 1 && !/\s/.test(line) ? bars.map(scalar) : scalar(line)); continue; }
    if (schema && kv.length === schema.length) {
      // a positional row under a schema line becomes a keyed object — the expansion a schema line saves
      const o = {}; schema.forEach((k, j) => { o[k] = scalar(kv[j]); }); items.push(o);
      const last = items.findIndex((x) => x && x.fields === schema);
      if (last >= 0) items.splice(last, 1);
      continue;
    }
    const key = kv[0].trim(), rest = kv.slice(1).join(':');
    const arrow = /^(\{[\s\S]*\})→(.+)$/.exec(rest.trim());
    if (arrow) { items.push({ [key]: { ...parseObject(arrow[1]), note: scalar(arrow[2]) } }); continue; }
    items.push({ [key]: parseValue(rest) });
  }
  return items;
}

// a layer of KonomiStandard text → { block name: value }, then minified
export function toJSON(ks) {
  const o = {};
  for (const b of blocksOf(ks)) o[b.name] = blockValue(b.text);
  return o;
}
export function toJSONText(ks) { return JSON.stringify(toJSON(ks)); }

// nothing dropped: every word or number in the notation is still in the JSON, as often
export function coverage(ks, json) {
  const count = (s) => { const m = new Map(); for (const a of str(s).match(/[A-Za-z0-9]+/g) || []) m.set(a, (m.get(a) || 0) + 1); return m; };
  const a = count(ks), b = count(json);
  let total = 0, kept = 0;
  for (const [k, n] of a) { total += n; kept += Math.min(n, b.get(k) || 0); }
  return total ? kept / total : 1;
}

// the shared-dictionary arm: each block as an entry the receiver may already hold, and the short address that names it
export function dictionaryOf(layerTitle, ks) {
  const id = (/(?:^|\n)ID:([^|\n]+)/.exec(str(ks)) || [])[1] || str(layerTitle).replace(/^\W+/, '').split(' ')[0];
  return blocksOf(ks).filter((b) => b.name !== '_').map((b) => ({ address: id.trim() + '/' + b.name, entry: b.name + '\n' + b.text.trim() }));
}

// the sealed rules over the held-out layers. layers: per layer { ks, json } tokens + coverage; dict: { entries, addresses }
// tokens — every held-out entry sent whole, against only the addresses that name them
export function judgeSavings({ layers, dict, coverageMin, bars } = {}) {
  const ok = Array.isArray(layers) && layers.length > 0 && layers.every((l) => l && Number.isFinite(l.ks) && Number.isFinite(l.json) && l.ks > 0 && Number.isFinite(l.coverage))
    && dict && Number.isFinite(dict.entries) && Number.isFinite(dict.addresses) && dict.addresses > 0
    && bars && Number.isFinite(bars.savesAtLeast) && Number.isFinite(bars.dictionaryAtLeast) && Number.isFinite(coverageMin);
  if (!ok) return { ok: false, why: 'per-layer token counts for both forms with coverage, the dictionary totals, and the sealed bars' };
  const sum = (k) => layers.reduce((a, x) => a + x[k], 0);
  const ratio = sum('json') / sum('ks');
  const dictRatio = dict.entries / dict.addresses;
  const losers = layers.filter((l) => l.ks >= l.json).length;
  const thin = layers.filter((l) => l.coverage < coverageMin).length;
  const r2 = (x) => Math.round(x * 100) / 100;
  const rules = [
    { id: 'lossless-twin', pass: thin === 0, value: thin === 0 ? 'the JSON twin of every held-out layer carries every word and number of the notation' : thin + ' layer(s) where the JSON twin dropped words' },
    { id: 'saves-without-dictionary', pass: ratio >= bars.savesAtLeast, value: r2(ratio) + '× — JSON ' + sum('json') + ' tokens, KonomiStandard ' + sum('ks') },
    { id: 'every-layer-saves', pass: losers === 0, value: losers === 0 ? 'every held-out layer is smaller as KonomiStandard' : losers + ' of ' + layers.length + ' layers cost as much or more as KonomiStandard' },
    { id: 'dictionary-multiplies', pass: dictRatio >= bars.dictionaryAtLeast, value: r2(dictRatio) + '× — ' + dict.entries + ' tokens of entries against ' + dict.addresses + ' tokens of addresses, when the receiver already holds them' },
  ];
  return { ok: true, rules, passed: rules.filter((r) => r.pass).length, of: rules.length, ratio: r2(ratio), dictionaryRatio: r2(dictRatio) };
}

export default { layersOf, splitTop, scalar, parseValue, parseObject, logicalLines, blocksOf, blockValue, toJSON, toJSONText, coverage, dictionaryOf, judgeSavings };
