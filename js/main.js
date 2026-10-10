/* ===========================
   Shared state（hero-gl.js と共有）
   =========================== */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer   = window.matchMedia('(hover: hover) and (pointer: fine)');

// 各セクションで背景の「実験体」がとる姿勢
// x, y: 画面内の位置（-1〜1） / s: 大きさ / h: 色相（0=ライム寄り, 1=バイオレット寄り）
// c: 収束度 / o: 背景の不透明度
const SCENES = {
  hero:        { x:  0.42, y:  0.16, s: 1.00, h: 0.25, c: 0, o: 1    },
  intro:       { x: -0.05, y:  0.00, s: 1.45, h: 0.85, c: 0, o: 0.6  },
  about:       { x:  0.62, y: -0.20, s: 0.70, h: 0.60, c: 0, o: 0.45 },
  projects:    { x:  0.62, y: -0.20, s: 0.70, h: 0.60, c: 0, o: 0    },
  experiments: { x: -0.55, y:  0.30, s: 0.60, h: 1.00, c: 0, o: 0.35 },
  contact:     { x:  0.00, y:  0.10, s: 0.62, h: 0.35, c: 1, o: 0.9  },
};
window.LIFEBIT = { scene: { ...SCENES.hero }, reducedMotion: reducedMotion.matches };

/* ===========================
   Navigation: Hamburger Toggle
   =========================== */
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

function setMenu(open) {
  navLinks.classList.toggle('is-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
}

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('is-open')));
  navLinks.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => setMenu(false));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('is-open')) {
      setMenu(false);
      navToggle.focus();
    }
  });
}

/* ===========================
   Scroll: header / progress（rAFで1回にまとめる）
   =========================== */
const header = document.querySelector('.site-header');
const root   = document.documentElement;
let ticking  = false;

function onScrollFrame() {
  ticking = false;
  const max = root.scrollHeight - window.innerHeight;
  root.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
  header.classList.toggle('is-scrolled', window.scrollY > 40);
}
window.addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); }
}, { passive: true });
onScrollFrame();

/* ===========================
   Active Section / Scene（IntersectionObserver）
   =========================== */
const scenes    = document.querySelectorAll('[data-scene]');
const navItems  = document.querySelectorAll('.nav__link, .rail__link');

function setScene(name) {
  const target = SCENES[name] || SCENES.hero;
  Object.assign(window.LIFEBIT.scene, target);
  root.style.setProperty('--stage-o', target.o);
  navItems.forEach(link => {
    const id = link.dataset.for || link.getAttribute('href').slice(1);
    // Projects のナビは Experiments 中も点灯させない（セクション単位で判定）
    link.classList.toggle('is-active', id === name);
  });
}

if ('IntersectionObserver' in window) {
  // 画面中央の帯に入ったセクションをアクティブにする
  const sceneIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setScene(entry.target.dataset.scene);
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  scenes.forEach(sec => sceneIO.observe(sec));
}

/* ===========================
   Reveal Animation
   =========================== */
const reveals = document.querySelectorAll('.reveal, .intro .line');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -12% 0px' });
  reveals.forEach(el => io.observe(el));
} else {
  reveals.forEach(el => el.classList.add('is-in'));
}

/* ===========================
   Per-work Giscus (lazy load)
   =========================== */
document.querySelectorAll('.comments__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const body   = btn.closest('.comments').querySelector('.comments__body');
    const isOpen = body.hidden;

    body.hidden = !isOpen;
    btn.setAttribute('aria-expanded', String(isOpen));
    btn.textContent = isOpen ? 'コメントを閉じる' : 'コメントを表示';

    if (isOpen && !body.querySelector('.giscus')) {
      const script = document.createElement('script');
      script.src = 'https://giscus.app/client.js';
      script.setAttribute('data-repo',            'lifebit-lab/portfolio');
      script.setAttribute('data-repo-id',         'R_kgDOSs-aIw');
      script.setAttribute('data-category',        'General');
      script.setAttribute('data-category-id',     'DIC_kwDOSs-aI84C-Ng0');
      script.setAttribute('data-mapping',         'specific');
      script.setAttribute('data-term',            btn.dataset.term);
      script.setAttribute('data-strict',          '0');
      script.setAttribute('data-reactions-enabled', '1');
      script.setAttribute('data-emit-metadata',   '0');
      script.setAttribute('data-input-position',  'bottom');
      script.setAttribute('data-theme',           'dark');
      script.setAttribute('data-lang',            'ja');
      script.setAttribute('crossorigin',          'anonymous');
      script.async = true;
      body.appendChild(script);
    }
  });
});

/* ===========================
   Projects: Jump Nav (auto-generated)
   =========================== */
const jumpNav = document.getElementById('projects-jump');
if (jumpNav) {
  document.querySelectorAll('#projects .work').forEach(work => {
    const num   = work.querySelector('.work__num')?.textContent.trim();
    const title = work.querySelector('.work__title')?.textContent.trim();
    if (!num || !title) return;

    const id = `project-${num}`;
    if (!work.id) work.id = id;

    const link = document.createElement('a');
    link.className = 'projects__jump-link';
    link.href      = `#${id}`;
    const b = document.createElement('b');
    b.textContent = num;
    link.append(b, title);
    jumpNav.appendChild(link);
  });
}

/* ===========================
   Custom Cursor（デスクトップのみ・ネイティブカーソルは残す）
   =========================== */
const cursor = document.querySelector('.cursor');
if (cursor && finePointer.matches && !reducedMotion.matches) {
  const label = cursor.querySelector('.cursor__label');
  let tx = -100, ty = -100, cx = -100, cy = -100, running = false;

  const loop = () => {
    cx += (tx - cx) * 0.2;
    cy += (ty - cy) * 0.2;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3) requestAnimationFrame(loop);
    else running = false;
  };

  window.addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    cursor.classList.add('is-on');
    if (!running) { running = true; requestAnimationFrame(loop); }
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));

  document.addEventListener('pointerover', (e) => {
    const hit = e.target.closest('[data-cursor]');
    cursor.classList.toggle('is-hover', !!hit);
    if (hit) label.textContent = hit.dataset.cursor;
  });
}

/* ===========================
   Aurora Memoria: 動くプレビュー（表示中のみ描画）
   =========================== */
const auroraCanvas = document.querySelector('.aurora__canvas');
if (auroraCanvas && auroraCanvas.getContext) {
  const ctx = auroraCanvas.getContext('2d');
  const bands = [
    { hue: [125, 255, 210], amp: 0.10, freq: 1.6, speed: 0.22, y: 0.40 },
    { hue: [146, 116, 255], amp: 0.13, freq: 1.1, speed: 0.16, y: 0.50 },
    { hue: [255, 150, 210], amp: 0.08, freq: 2.2, speed: 0.30, y: 0.60 },
  ];
  let visible = false, raf = 0, w = 0, h = 0;

  const resize = () => {
    const r = auroraCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = auroraCanvas.width  = Math.round(r.width  * dpr * 0.6);
    h = auroraCanvas.height = Math.round(r.height * dpr * 0.6);
  };

  const draw = (t) => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    bands.forEach((b, i) => {
      const [r, g, bl] = b.hue;
      for (let k = 0; k < 14; k++) {
        const off = k / 14;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 12) {
          const u = x / w;
          const y = h * (b.y
            + Math.sin(u * Math.PI * b.freq + t * b.speed + i) * b.amp
            + Math.sin(u * 7.0 - t * b.speed * 1.7 + k * 0.3) * 0.015)
            - off * h * 0.22;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${r},${g},${bl},${0.085 * (1 - off)})`;
        ctx.lineWidth = Math.max(2, h * 0.016);
        ctx.stroke();
      }
    });
  };

  const tick = (now) => {
    draw(now / 1000);
    if (visible) raf = requestAnimationFrame(tick);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    draw(12);
  } else {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(tick);
    }).observe(auroraCanvas);
  }
}

/* Contact は Google Forms リンクのため JS 不要 */
