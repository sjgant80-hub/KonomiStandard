#!/usr/bin/env node
// kstd-measure.mjs — WHAT DOES KONOMISTANDARD SAVE, IN TOKENS? Sealed before it is measured (Kar, 2026-10-01).
// KonomiStandard is Thomas Frumkin's (teslasolar/KonomiStandard, created 2025-12-23, fork: false — the original).
// Simon, relayed: "both lets do this lfg guys epic we know its legit so its emergent hehe".
//
// Material: the format's own spec at a pinned commit of Thomas's repo (fetched, never copied into this repo). Layers 0–3
// were used to build the JSON twin (ksjson.mjs); layers 4–9 and the crosswalks are held out. Two questions, reported
// apart: with no shared dictionary, is the same content smaller as KonomiStandard than as minified JSON? And when the
// receiver already holds the entries, how much does naming an entry by its address save over sending it?
// Tokens are counted by the tokenizer that bills — Claude, through the official CLI on Simon's own login — and by a
// local one (qwen2.5:7b in Ollama); characters too.
//
//   node measure/kstd-measure.mjs --seal | --check | --run | --verify
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import K from './ksjson.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PRE = join(ROOT, 'measure', 'data', 'prereg.json'), OUT = join(ROOT, 'measure', 'data', 'run.json');
export const MATERIAL = {
  repo: 'teslasolar/KonomiStandard', commit: 'd0596a081710975c3f98780dddfb00e163078865', path: 'build-prompts/02-konomi-standard-spec.md',
  sha256: '99bc9a77d76ee213ed6de4bc2655df367ce1a61cb65c7e1d5ac1e55d6e722c83', bytes: 22785,
};
export const DEV = [0, 1, 2, 3];
export const HELD = [4, 5, 6, 7, 8, 9, 10];
const CLAUDE_MODEL = 'claude-sonnet-5-5';
const text = (f) => readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const stable = (o) => JSON.stringify(o, null, 1) + '\n';
const die = (m) => { console.error(m); process.exit(1); };
const has = (f) => process.argv.includes(f);
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' });

export async function material() {
  const url = 'https://raw.githubusercontent.com/' + MATERIAL.repo + '/' + MATERIAL.commit + '/' + MATERIAL.path;
  const md = await (await fetch(url)).text();
  if (sha(md) !== MATERIAL.sha256) throw new Error('the material is not the pinned file');
  return md;
}

// everything that does not need a tokenizer: the twins, their sizes, their coverage, the dictionary
export function shape(md) {
  const layers = K.layersOf(md);
  const held = HELD.map((k) => {
    const l = layers[k], json = K.toJSONText(l.ks);
    return { title: l.title, ks: l.ks, json, chars: { ks: l.ks.length, json: json.length }, coverage: K.coverage(l.ks, json) };
  });
  const dict = held.flatMap((h) => K.dictionaryOf(h.title, h.ks));
  return { layerTitles: layers.map((l) => l.title), held, dict, entriesText: dict.map((d) => d.entry).join('\n\n'), addressesText: dict.map((d) => d.address).join('\n') };
}

export function prereg() {
  return {
    kind: 'konomistandard-savings-prereg', v: 1, written: '2026-10-01',
    approvedBy: 'Simon, relayed verbatim: "both lets do this lfg guys epic we know its legit so its emergent hehe"',
    credit: 'KonomiStandard is Thomas Frumkin\'s: teslasolar/KonomiStandard, created 2025-12-23, fork: false, every human commit his; the earliest copy anywhere (his kp2p, MianoCube, JEDI and GaryTheGalvinator copies, the AI Craftspeople Guild page and the estate\'s copies are all later). Powered by the Konomi architecture, created by Thomas Frumkin.',
    statement: 'Sealed, committed and pushed before any held-out layer\'s tokens are counted. Run once, on this machine. Published whichever way it lands.',
    claim: 'The format\'s own goal line: "COMPRESSION: max info, min tokens".',
    question: 'Does the same content cost fewer tokens as KonomiStandard than as plain JSON — and how much does a shared dictionary add, where the receiver already holds the entries?',
    material: MATERIAL,
    method: {
      twin: 'measure/ksjson.mjs turns each layer\'s notation into minified JSON by fixed rules; anything it cannot read stays a whole string, so the JSON errs SMALL (in the format\'s disfavour, never its favour); coverage proves every word and number survives',
      dev: 'layers ' + DEV.join(', ') + ' (meta-standard, base UDTs, ISA-95, ISA-88) were used to build the twin',
      held: 'layers ' + HELD.join(', ') + ' (ISA-101, ISA-18.2, OPC-UA, MQTT/Sparkplug, Modbus, KPIs, crosswalks) are held out; the USAGE (Python) and GOAL sections are left out',
      asWritten: 'the notation is measured exactly as Thomas wrote it, its ──── header rules included',
      dictionary: 'every block of the held-out layers is an entry with an address (ID/block, e.g. "ISA-18.2/UDT:Alarm"); the arm compares all entries sent whole against only their addresses',
      tokens: {
        claude: 'the official claude CLI (' + CLAUDE_MODEL + ') on Simon\'s own login, no tools, one-word system prompt: tokens of a text = the input tokens the CLI reports for it minus those it reports for a one-character message',
        local: 'qwen2.5:7b in Ollama on this machine: the prompt tokens Ollama reports for the raw text, a one-character flush between texts so no prompt cache is shared',
        chars: 'JavaScript string length',
      },
    },
    bars: { savesAtLeast: 1.2, dictionaryAtLeast: 10, coverageMin: 0.999 },
    rules: [
      { id: 'lossless-twin', rule: 'the JSON twin of every held-out layer carries every word and number of the notation (coverage at least 0.999)' },
      { id: 'saves-without-dictionary', rule: 'with no shared dictionary, the held-out layers cost at least 1.2× more Claude tokens as JSON than as KonomiStandard' },
      { id: 'every-layer-saves', rule: 'and every held-out layer costs fewer Claude tokens as KonomiStandard' },
      { id: 'dictionary-multiplies', rule: 'with a shared dictionary, sending the addresses instead of the entries saves at least 10× in Claude tokens' },
    ],
    disclosures: [
      'Kar read the whole spec, held-out layers included, while building the twin, and saw their character counts; no tokens of a held-out layer were counted before this seal.',
      'The baseline is minified JSON, the leanest conventional form. Pretty-printed JSON or prose would make the format look better; this does not use them.',
      'There is no published ISA document to compare against — the standards are paywalled — so this measures the notation as an encoding, not as a summary of the standards.',
    ],
    predictions: {
      said: 'before any held-out layer\'s tokens were counted, by Kar',
      'lossless-twin': 'pass — the twin keeps every word on the development layers',
      'saves-without-dictionary': 'fail — the characters were within about 10% on the layers I built it on, and the ──── header rules cost tokens; I expect roughly 0.9× to 1.15×',
      'every-layer-saves': 'fail — on some layers the JSON twin is already shorter in characters',
      'dictionary-multiplies': 'pass — an address is a handful of tokens and an entry is tens to hundreds; I expect 10× to 25×',
    },
  };
}

// ── tokenizers (local glue, used by --run only) ──
async function claudeCounter() {
  const S = await import(pathToFileURL('C:/Users/sjgan/si-didy/claude-session.mjs').href);
  const KK = (await import(pathToFileURL('C:/Users/sjgan/si-didy/cockpit-kernel.mjs').href)).default;
  const cli = S.findNewestCli();
  if (!cli) throw new Error('no claude CLI');
  mkdirSync('C:\\tmp\\kar-cockpit', { recursive: true });
  const cwd = mkdtempSync('C:\\tmp\\kar-cockpit\\count-');
  const once = (message) => new Promise((done, fail) => {
    const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--model', CLAUDE_MODEL, '--system-prompt', 'Reply with the one word: ok',
      '--tools', '', '--setting-sources', 'project', '--strict-mcp-config', '--no-session-persistence', '--disable-slash-commands', '--no-chrome'];
    const child = spawn(cli.path, args, { cwd, env: KK.cleanEnv(process.env), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let buf = '', result = null, init = null;
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); try { const e = JSON.parse(l); if (e.type === 'system' && e.subtype === 'init') init = e; if (e.type === 'result') { result = e; child.stdin.end(); } } catch { /* */ } } });
    child.on('close', () => {
      if (!result || !result.usage) return fail(new Error('no usage from the CLI'));
      const u = result.usage;
      done({ total: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0), model: init && init.model, login: init ? init.apiKeySource === 'none' : null });
    });
    child.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: message }] } }) + '\n');
  });
  const base = await once('x');
  return { base, count: async (t) => (await once(t)).total - base.total };
}
async function localCount(t) {
  const call = async (prompt) => (await (await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'qwen2.5:7b', prompt, raw: true, stream: false, options: { num_predict: 1, num_ctx: 8192 } }) })).json()).prompt_eval_count || 0;
  await call('0');
  return call(t);
}

export function grade(pre, run) {
  return K.judgeSavings({ layers: run.held.map((h) => ({ ks: h.claude.ks, json: h.claude.json, coverage: h.coverage })), dict: { entries: run.dictionary.claude.entries, addresses: run.dictionary.claude.addresses },
    coverageMin: pre.bars.coverageMin, bars: pre.bars });
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  if (has('--seal')) {
    if (existsSync(PRE)) die('measure/data/prereg.json exists — it is sealed');
    mkdirSync(dirname(PRE), { recursive: true });
    writeFileSync(PRE, stable(prereg()));
    console.log('sealed measure/data/prereg.json · sha256 ' + sha(stable(prereg())));
    process.exit(0);
  }
  if (!existsSync(PRE)) die('not sealed yet');
  const sealedIn = existsSync(OUT) ? JSON.parse(text('measure/data/run.json')).sealedIn : null;
  if (has('--check')) {
    const same = text('measure/data/prereg.json') === stable(prereg()) && (!sealedIn || git('show', sealedIn + ':measure/data/prereg.json').replace(/\r\n/g, '\n') === text('measure/data/prereg.json'));
    console.log(same ? 'the pre-registration matches its sealing' : 'measure/data/prereg.json differs from what this script seals');
    process.exit(same ? 0 : 1);
  }
  const pre = JSON.parse(text('measure/data/prereg.json'));
  if (has('--verify')) {
    if (!sealedIn) die('no run to verify');
    const run = JSON.parse(text('measure/data/run.json'));
    const s = shape(await material());
    const sameShape = JSON.stringify(s.held.map((h) => ({ title: h.title, chars: h.chars, coverage: h.coverage, jsonSha: sha(h.json) }))) === JSON.stringify(run.held.map((h) => ({ title: h.title, chars: h.chars, coverage: h.coverage, jsonSha: h.jsonSha })))
      && s.dict.length === run.dictionary.entries;
    const same = sameShape && JSON.stringify(grade(pre, run)) === JSON.stringify(run.result);
    console.log(same ? 'REPRODUCED — the twins rebuild byte for byte from Thomas\'s pinned file, and the rules re-grade from the recorded counts' : 'NOT REPRODUCED');
    process.exitCode = same ? 0 : 1;   // not process.exit: on Windows it can race the fetch handle closing
  }
  else if (!has('--run')) die('usage: node measure/kstd-measure.mjs --seal | --check | --run | --verify');
  if (has('--run')) {
  if (sealedIn) die('it runs once');
  if (stable(pre) !== stable(prereg())) die('the committed pre-registration is not what this script seals');
  if (git('status', '--porcelain', 'measure').trim()) die('commit the seal and what it runs first');
  git('fetch', '-q', 'origin');
  try { git('merge-base', '--is-ancestor', 'HEAD', 'origin/main'); } catch { die('push first'); }
  const sealCommit = git('log', '-1', '--format=%H', '--', 'measure/data/prereg.json').trim();
  const s = shape(await material());
  const claude = await claudeCounter();
  const held = [];
  for (const h of s.held) {
    held.push({ title: h.title, chars: h.chars, coverage: h.coverage, jsonSha: sha(h.json),
      claude: { ks: await claude.count(h.ks), json: await claude.count(h.json) }, local: { ks: await localCount(h.ks), json: await localCount(h.json) } });
    process.stderr.write('.');
  }
  const dictionary = { entries: s.dict.length, chars: { entries: s.entriesText.length, addresses: s.addressesText.length },
    claude: { entries: await claude.count(s.entriesText), addresses: await claude.count(s.addressesText) }, local: { entries: await localCount(s.entriesText), addresses: await localCount(s.addressesText) } };
  const run = { kind: 'konomistandard-savings-run', v: 1, sealedIn: sealCommit, ranAt: new Date().toISOString(), claude: { model: claude.base.model, login: claude.base.login, baseline: claude.base.total }, held, dictionary };
  run.result = grade(pre, run);
  writeFileSync(OUT, stable(run));
  const j = run.result;
  console.log('\nmeasured · ' + j.passed + ' of ' + j.of + ' · ' + j.rules.map((r) => r.id + ' ' + (r.pass ? 'PASS' : 'FAIL') + ' (' + r.value + ')').join(' · '));
  }
}
