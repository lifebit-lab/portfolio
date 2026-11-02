#!/usr/bin/env node
/**
 * レイアウトの自動点検
 *
 * 作品を追加・並べ替えしたあとに走らせる。目で見ても分からない崩れを機械的に拾う。
 *   - 「仕組み」の図：箱の見出しが枠からはみ出していないか
 *   - 「仕組み」の図：矢印のラベルが箱に重なっていないか
 *   - 右端の目次が、本文の操作要素（アコーディオンの「＋」）のクリックを奪っていないか
 *   - 横方向のはみ出し、id の重複、画像の読み込み失敗、Consoleエラー
 *
 * 使い方:
 *   node .claude/scripts/layout-check.mjs [URL]
 *   （既定は http://localhost:8000/ ）
 */

import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:8000/';
const WIDTHS = [[1440, 900], [1024, 768], [390, 844], [320, 640]];

let failed = 0;
const ng = (msg) => { failed++; console.log(`  NG  ${msg}`); };
const ok = (msg) => console.log(`  ok  ${msg}`);

const browser = await chromium.launch({ channel: 'chrome' });

/* ---------- 1. 図の崩れ（1440pxで見る） ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in'));
    document.querySelectorAll('.work__flow').forEach(d => { d.open = true; });
  });
  await page.waitForTimeout(800);

  const boxes = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.flow').forEach((f, i) => {
      f.querySelectorAll('.flow__box').forEach(bx => {
        const b = bx.querySelector('b'), cs = getComputedStyle(bx);
        const avail = bx.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        if (b.scrollWidth > avail + 1) out.push(`図${i + 1}「${b.textContent}」${b.scrollWidth}px > 枠${Math.round(avail)}px`);
      });
    });
    return out;
  });
  boxes.length ? boxes.forEach(ng) : ok('図の箱：見出しのはみ出しなし');

  const overlaps = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.flow').forEach((f, i) => {
      const labels = [...f.querySelectorAll('.flow__arrow i')];
      const boxes = [...f.querySelectorAll('.flow__box')];
      labels.forEach(l => {
        const a = l.getBoundingClientRect();
        boxes.forEach(bx => {
          const r = bx.getBoundingClientRect();
          if (Math.min(a.right, r.right) - Math.max(a.left, r.left) > 1 &&
              Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top) > 1)
            out.push(`図${i + 1}「${l.textContent}」が箱に重なる`);
        });
      });
    });
    return out;
  });
  overlaps.length ? overlaps.forEach(ng) : ok('図の矢印：箱との重なりなし');
  await page.close();
}

/* ---------- 2. 目次がクリックを奪っていないか ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in'));
  });
  await page.waitForTimeout(300);

  const stolen = await page.evaluate(async () => {
    const out = [];
    for (const s of document.querySelectorAll('.work__more summary')) {
      const abs = s.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: abs - 450, behavior: 'instant' });
      await new Promise(r => setTimeout(r, 70));
      const q = s.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.round(q.right - 6), Math.round(q.top + q.height / 2));
      const a = hit ? hit.closest('a,summary,button') : null;
      if (a && a.tagName === 'A') out.push(`「${s.textContent.trim()}」の＋が ${a.getAttribute('href')} に奪われる`);
    }
    return out;
  });
  stolen.length ? stolen.forEach(ng) : ok('アコーディオンの「＋」：目次に奪われない');
  await page.close();
}

/* ---------- 3. 各画面幅の基本点検 ---------- */
for (const [w, h] of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const errs = [], bad = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().split('/').pop()}`); });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in'));
    document.querySelectorAll('details').forEach(d => { d.open = true; });
    document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; });
  });
  await page.waitForTimeout(3000);

  const r = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    return {
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dup: [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))],
      imgNG: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).length,
      works: document.querySelectorAll('.works > .work').length,
      flows: document.querySelectorAll('.work__flow').length,
    };
  });

  const issues = [];
  if (r.over > 0) issues.push(`横に${r.over}pxはみ出す`);
  if (r.dup.length) issues.push(`idが重複: ${r.dup.join(', ')}`);
  if (r.imgNG) issues.push(`画像${r.imgNG}件が読み込めない`);
  if (errs.length) issues.push(`Consoleエラー${errs.length}件: ${errs[0]?.slice(0, 60)}`);
  if (bad.length) issues.push(`404等${bad.length}件: ${bad[0]}`);

  if (issues.length) issues.forEach(i => ng(`${w}px — ${i}`));
  else ok(`${w}px — 作品${r.works}件 / 図${r.flows}件、はみ出し・id重複・画像・エラーなし`);
  await page.close();
}

await browser.close();
console.log(failed ? `\n${failed}件の問題が見つかりました。` : '\nすべて問題なし。');
process.exit(failed ? 1 : 0);
