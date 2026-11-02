#!/usr/bin/env node
/**
 * ポートフォリオの週次点検
 *
 * 3つを調べてレポートにする。実際の追加・修正はしない（報告まで）。
 *   1. 未掲載のプロジェクト（~/projects/ にあってポートフォリオに載っていないもの）
 *   2. 掲載済みで更新があったもの（前回の点検以降にコミットが進んだもの）
 *   3. 掲載中の公開URLの死活（200を返さなくなったもの）
 *
 * 状態は .claude/portfolio-watch.json に持つ。初回は現状を記録するだけで差分は出ない。
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECTS = join(homedir(), 'projects');
const STATE = join(ROOT, '.claude', 'portfolio-watch.json');
const REPORT = join(ROOT, '.claude', 'notes', 'weekly-check.md');

const TIMEOUT_MS = 20000;

/* ---------- 状態 ---------- */

const defaults = {
  // 掲載済み（ディレクトリ名 → カードでの扱い）。載せたら手で足す
  listed: {},
  // 対象外（ポートフォリオに載せるつもりがないもの）
  ignore: ['portfolio'],
  // 前回点検時の最終コミット日時
  lastCommit: {},
  lastRun: null,
};

function loadState() {
  if (!existsSync(STATE)) return { ...defaults, firstRun: true };
  try {
    return { ...defaults, ...JSON.parse(readFileSync(STATE, 'utf-8')) };
  } catch {
    return { ...defaults, firstRun: true };
  }
}

/* ---------- プロジェクトを調べる ---------- */

function git(dir, args) {
  try {
    return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/** デプロイ設定の痕跡から、公開先の候補を挙げる */
function deployHints(dir, name) {
  const hints = [];

  const vercel = join(dir, '.vercel', 'project.json');
  if (existsSync(vercel)) {
    try {
      const pn = JSON.parse(readFileSync(vercel, 'utf-8')).projectName;
      if (pn) hints.push({ kind: 'Vercel', url: `https://${pn}.vercel.app/` });
    } catch { /* 壊れていれば無視 */ }
  }

  // Cloudflare Pages は wrangler.toml を持たないことがある（.wrangler だけ残る）
  const cf = ['wrangler.toml', 'wrangler.jsonc', 'wrangler.json', '.wrangler']
    .some(f => existsSync(join(dir, f)));
  if (cf) hints.push({ kind: 'Cloudflare', url: `https://${name}.pages.dev/` });

  if (existsSync(join(dir, 'firebase.json'))) hints.push({ kind: 'Firebase', url: `https://${name}.web.app/` });

  // 設定ファイルが無くても、スクリプトに書いてあれば拾う
  if (!hints.length) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const j = JSON.parse(readFileSync(pkg, 'utf-8'));
        const text = JSON.stringify({ s: j.scripts, d: j.devDependencies });
        if (/wrangler/.test(text)) hints.push({ kind: 'Cloudflare', url: `https://${name}.pages.dev/` });
        else if (/vercel/.test(text)) hints.push({ kind: 'Vercel', url: `https://${name}.vercel.app/` });
        else if (/firebase/.test(text)) hints.push({ kind: 'Firebase', url: `https://${name}.web.app/` });
      } catch { /* 壊れていれば無視 */ }
    }
  }
  return hints;
}

function scanProjects(state) {
  const out = [];
  for (const name of readdirSync(PROJECTS, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)) {
    if (name.startsWith('.') || state.ignore.includes(name)) continue;
    const dir = join(PROJECTS, name);
    out.push({
      name,
      dir,
      listed: Object.prototype.hasOwnProperty.call(state.listed, name),
      note: state.listed[name] ?? null,
      lastCommit: git(dir, ['log', '-1', '--format=%cI']) || null,
      lastSubject: git(dir, ['log', '-1', '--format=%s']) || null,
      hints: deployHints(dir, name),
    });
  }
  return out.sort((a, b) => (b.lastCommit ?? '').localeCompare(a.lastCommit ?? ''));
}

/* ---------- 公開URLの死活 ---------- */

function listedUrls() {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf-8');
  const skip = /schema\.org|lifebit-lab\.github\.io|fonts\.(googleapis|gstatic)/;
  const urls = new Set();
  for (const m of html.matchAll(/href="(https:\/\/[^"]+)"/g)) {
    if (!skip.test(m[1])) urls.add(m[1]);
  }
  return [...urls].sort();
}

async function head(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ac.signal });
    return { url, status: r.status, ok: r.ok };
  } catch (e) {
    return { url, status: 0, ok: false, error: e.name === 'AbortError' ? 'タイムアウト' : e.message };
  } finally {
    clearTimeout(t);
  }
}

/* ---------- レポート ---------- */

function buildReport({ projects, checks, state, now }) {
  const unlisted = projects.filter(p => !p.listed);
  const updated = projects.filter(p => {
    if (!p.listed || !p.lastCommit) return false;
    const prev = state.lastCommit[p.name];
    return prev && p.lastCommit > prev;
  });
  const down = checks.filter(c => !c.ok);

  const L = [];
  L.push(`# ポートフォリオ週次点検`, '', `点検日時: ${now.toLocaleString('ja-JP')}`, '');
  if (state.firstRun) L.push('> 初回のため、今回は現状を記録しただけです。差分は次回から出ます。', '');

  L.push('## まとめ', '');
  const liveUnlisted = unlisted.filter(p => p.hints.some(h => h.live));
  L.push(`- 未掲載のプロジェクト: ${unlisted.length}件${liveUnlisted.length ? `（うち**公開中が${liveUnlisted.length}件**）` : ''}`);
  L.push(`- 掲載済みで更新あり: ${updated.length}件`);
  L.push(`- 公開URLの異常: ${down.length}件 / ${checks.length}件中`);
  L.push('');

  L.push('## 1. 未掲載のプロジェクト', '');
  if (!unlisted.length) L.push('なし。');
  else {
    L.push('| プロジェクト | 最終コミット | 内容 | デプロイ設定 |', '|---|---|---|---|');
    for (const p of unlisted) {
      const hint = p.hints.length
        ? p.hints.map(h => h.url ? `${h.kind} ${h.live ? `**公開中** ${h.url}` : `（${h.url} は応答なし）`}` : h.kind).join(' / ')
        : '—';
      L.push(`| ${p.name} | ${p.lastCommit ? p.lastCommit.slice(0, 10) : 'git管理なし'} | ${p.lastSubject ?? '—'} | ${hint} |`);
    }
    L.push('', '掲載する場合は、Claude Code に「◯◯をポートフォリオに追加して」と伝えてください。');
    L.push('載せないものは `.claude/portfolio-watch.json` の `ignore` に足すと、次回から出なくなります。');
  }
  L.push('');

  L.push('## 2. 掲載済みで更新があったもの', '');
  if (!updated.length) L.push('なし。');
  else {
    L.push('| プロジェクト | 前回の点検時 | 今回 | 最新のコミット |', '|---|---|---|---|');
    for (const p of updated) {
      L.push(`| ${p.name} | ${state.lastCommit[p.name].slice(0, 10)} | ${p.lastCommit.slice(0, 10)} | ${p.lastSubject} |`);
    }
    L.push('', 'スクリーンショットや説明文が実態とずれていないか、確認する価値があります。');
  }
  L.push('');

  L.push('## 3. 公開URLの死活', '');
  if (!down.length) L.push(`${checks.length}件すべて正常（200）。`);
  else {
    L.push('**異常あり。ポートフォリオから、動かないものへリンクしている可能性があります。**', '');
    L.push('| URL | 結果 |', '|---|---|');
    for (const c of down) L.push(`| ${c.url} | ${c.status || c.error} |`);
  }
  L.push('');

  L.push('---', '', '<details><summary>掲載済みプロジェクトの状況</summary>', '');
  L.push('| プロジェクト | 最終コミット | 扱い |', '|---|---|---|');
  for (const p of projects.filter(x => x.listed)) {
    L.push(`| ${p.name} | ${p.lastCommit ? p.lastCommit.slice(0, 10) : '—'} | ${p.note ?? ''} |`);
  }
  L.push('', '</details>', '');
  return { text: L.join('\n'), counts: {
    unlisted: unlisted.length, updated: updated.length, down: down.length,
    live: unlisted.filter(p => p.hints.some(h => h.live)).length } };
}

function notify(counts) {
  const parts = [];
  if (counts.live) parts.push(`公開中の未掲載${counts.live}件`);
  else if (counts.unlisted) parts.push(`未掲載${counts.unlisted}件`);
  if (counts.updated) parts.push(`更新${counts.updated}件`);
  if (counts.down) parts.push(`URL異常${counts.down}件`);
  const body = parts.length ? parts.join(' / ') : '変化なし';
  try {
    execFileSync('osascript', ['-e',
      `display notification ${JSON.stringify(body)} with title "ポートフォリオ週次点検" subtitle ${JSON.stringify(REPORT)}`],
      { stdio: 'ignore' });
  } catch { /* 通知が出せなくても点検は成立する */ }
}

/* ---------- 実行 ---------- */

const state = loadState();
const projects = scanProjects(state);
const checks = await Promise.all(listedUrls().map(head));

// 未掲載プロジェクトの推測URLが本当に公開されているか確かめる
for (const p of projects.filter(x => !x.listed)) {
  for (const h of p.hints) {
    if (!h.url) continue;
    const r = await head(h.url);
    h.live = r.ok;
  }
}
const now = new Date();
const { text, counts } = buildReport({ projects, checks, state, now });

mkdirSync(dirname(REPORT), { recursive: true });
writeFileSync(REPORT, text, 'utf-8');

const nextState = {
  listed: state.listed,
  ignore: state.ignore,
  lastCommit: Object.fromEntries(projects.filter(p => p.lastCommit).map(p => [p.name, p.lastCommit])),
  lastRun: now.toISOString(),
};
writeFileSync(STATE, JSON.stringify(nextState, null, 2) + '\n', 'utf-8');

notify(counts);
console.log(text);
console.log(`\nレポート: ${REPORT}`);
