/* ===========================
   Navigation: Hamburger Toggle
   =========================== */
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
  });

  navLinks.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'メニューを開く');
    });
  });

  document.addEventListener('click', (e) => {
    if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ===========================
   Navigation: Active Section
   =========================== */
const sections = document.querySelectorAll('section[id]');
const navItems  = document.querySelectorAll('.nav__link');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (sec.getBoundingClientRect().top <= 80) current = sec.id;
  });
  navItems.forEach(link => {
    link.classList.toggle('is-active', link.getAttribute('href') === `#${current}`);
  });
}, { passive: true });

/* ===========================
   Reveal Animation
   =========================== */
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  reveals.forEach(el => io.observe(el));
} else {
  reveals.forEach(el => el.classList.add('is-visible'));
}

/* ===========================
   Per-card Giscus (lazy load)
   =========================== */
document.querySelectorAll('.card__comments-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const wrapper = btn.closest('.card__comments');
    const body    = wrapper.querySelector('.card__comments-body');
    const isOpen  = body.hidden;

    body.hidden = !isOpen;
    btn.setAttribute('aria-expanded', String(isOpen));

    if (isOpen && !body.querySelector('.giscus')) {
      const term   = btn.dataset.term;
      const script = document.createElement('script');
      script.src = 'https://giscus.app/client.js';
      script.setAttribute('data-repo',            'lifebit-lab/portfolio');
      script.setAttribute('data-repo-id',         'R_kgDOSs-aIw');
      script.setAttribute('data-category',        'General');
      script.setAttribute('data-category-id',     'DIC_kwDOSs-aI84C-Ng0');
      script.setAttribute('data-mapping',         'specific');
      script.setAttribute('data-term',            term);
      script.setAttribute('data-strict',          '0');
      script.setAttribute('data-reactions-enabled', '1');
      script.setAttribute('data-emit-metadata',   '0');
      script.setAttribute('data-input-position',  'bottom');
      script.setAttribute('data-theme',           'light');
      script.setAttribute('data-lang',            'ja');
      script.setAttribute('crossorigin',          'anonymous');
      script.async = true;
      body.appendChild(script);
    }
  });
});

/* Contact は Google Forms リンクのため JS 不要 */
