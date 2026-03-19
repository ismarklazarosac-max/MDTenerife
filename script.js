/* ═══════════════════════════════════════════════════
   Marketing Digital Tenerife — Main Script v2
═══════════════════════════════════════════════════ */

/* ── NAVBAR SCROLL ─────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ── HAMBURGER MENU ────────────────────────────── */
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
const navInner  = document.querySelector('.nav-inner');

/*  FIX: On mobile, move #navLinks to <body> so position:fixed is
    relative to the viewport — not to .nav-header which can create
    a containing block via backdrop-filter / transforms.
    On close, move it back into the header for desktop layout. */

function isMobile() { return window.innerWidth <= 640; }

function closeNav() {
  navLinks.classList.remove('open');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('nav-open');
  // Move nav back into header for desktop flex layout
  if (navLinks.parentNode === document.body) {
    navInner.insertBefore(navLinks, hamburger);
  }
}

function openNav() {
  // Move nav to <body> so fixed positioning works from viewport
  if (isMobile() && navLinks.parentNode !== document.body) {
    document.body.appendChild(navLinks);
  }
  navLinks.classList.add('open');
  hamburger.classList.add('open');
  hamburger.setAttribute('aria-expanded', 'true');
  document.documentElement.classList.add('nav-open');
}

hamburger.addEventListener('click', (e) => {
  e.stopPropagation();
  navLinks.classList.contains('open') ? closeNav() : openNav();
});

// Close when clicking a direct nav link (not a dropdown trigger)
navLinks.querySelectorAll('a.nav-link, a.nav-drop-item, a.nav-cta').forEach(link => {
  link.addEventListener('click', closeNav);
});

// Close when clicking outside
document.addEventListener('click', (e) => {
  if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && e.target !== hamburger) {
    closeNav();
  }
});

// If window resizes to desktop while menu is open, close it and restore nav
window.addEventListener('resize', () => {
  if (window.innerWidth > 640 && navLinks.classList.contains('open')) {
    closeNav();
  }
});

/* ── DROPDOWN ACCORDION (mobile) ───────────────── */
document.querySelectorAll('.nav-drop-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (window.innerWidth > 640) return; // desktop uses CSS :hover
    e.stopPropagation();
    const wrap = btn.closest('.nav-drop-wrap');
    const isOpen = wrap.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
    // close siblings
    document.querySelectorAll('.nav-drop-wrap').forEach(w => {
      if (w !== wrap) { w.classList.remove('open'); w.querySelector('.nav-drop-btn').setAttribute('aria-expanded', 'false'); }
    });
  });
});

// Close dropdowns when resizing to desktop
window.addEventListener('resize', () => {
  if (window.innerWidth > 900) {
    document.querySelectorAll('.nav-drop-wrap').forEach(w => w.classList.remove('open'));
  }
});

/* ── ACTIVE NAV ON SCROLL ──────────────────────── */
const sections   = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navAnchors.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

sections.forEach(s => sectionObserver.observe(s));

/* ── SCROLL REVEAL ─────────────────────────────── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 6) * 80}ms`;
  revealObserver.observe(el);
});

/* ── PARALLAX ORBS ─────────────────────────────── */
let ticking = false;
window.addEventListener('mousemove', (e) => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const mx = (e.clientX / window.innerWidth  - 0.5) * 20;
    const my = (e.clientY / window.innerHeight - 0.5) * 20;
    const o1 = document.querySelector('.orb-1');
    const o2 = document.querySelector('.orb-2');
    const o3 = document.querySelector('.orb-3');
    if (o1) o1.style.transform = `translate(${mx * 0.5}px, ${my * 0.5}px)`;
    if (o2) o2.style.transform = `translate(${-mx * 0.3}px, ${-my * 0.3}px)`;
    if (o3) o3.style.transform = `translate(${mx * 0.4}px, ${my * 0.4}px)`;
    ticking = false;
  });
});

/* ── COUNTER ANIMATION ─────────────────────────── */
function animateCounter(el, target, duration = 2000) {
  const isDecimal = String(target).includes('.');
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const start  = performance.now();

  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const v = target * (1 - Math.pow(1 - p, 3));
    el.textContent = prefix + (isDecimal ? v.toFixed(1) : Math.floor(v)) + suffix;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = prefix + (isDecimal ? target.toFixed(1) : target) + suffix;
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el   = entry.target;
    const text = el.textContent.trim();
    const m    = text.match(/^([^\d]*)(\d+\.?\d*)([^\d]*)$/);
    if (!m) return;
    el.dataset.prefix = m[1];
    el.dataset.suffix = m[3];
    animateCounter(el, parseFloat(m[2]));
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num, .tn-num').forEach(el => counterObserver.observe(el));

/* ── GSAP HERO PREMIUM ANIMATION ───────────────────
   Requires GSAP 3 (loaded after this file in the HTML).
   DOMContentLoaded fires after all blocking scripts run,
   so gsap is guaranteed to be defined by then.
─────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined') return;

  // ── 1. SET INITIAL HIDDEN STATES ──────────────────
  gsap.set('.hero-badge',       { opacity: 0, y: -14 });
  gsap.set('.hero-title-inner', { yPercent: 110, opacity: 0 });
  gsap.set('.hero-desc',        { opacity: 0, y: 24 });
  gsap.set('.hero-actions',     { opacity: 0, y: 18 });
  gsap.set('.hero-proof',       { opacity: 0, y: 14 });
  gsap.set('.hero-visual',      { opacity: 0, x: 36 });

  // ── 2. ENTRY TIMELINE ─────────────────────────────
  const heroTl = gsap.timeline({ delay: 0.08 });

  heroTl.to('.hero-badge', {
    opacity: 1, y: 0,
    duration: 0.55,
    ease: 'power2.out'
  });

  heroTl.to('.hero-title-inner', {
    yPercent: 0, opacity: 1,
    duration: 0.82,
    stagger: 0.13,
    ease: 'power4.out'
  }, '-=0.22');

  heroTl.to('.hero-desc', {
    opacity: 1, y: 0,
    duration: 0.65,
    ease: 'power2.out'
  }, '-=0.40');

  heroTl.to('.hero-actions', {
    opacity: 1, y: 0,
    duration: 0.60,
    ease: 'power2.out'
  }, '-=0.42');

  heroTl.to('.hero-proof', {
    opacity: 1, y: 0,
    duration: 0.55,
    ease: 'power2.out'
  }, '-=0.36');

  heroTl.to('.hero-visual', {
    opacity: 1, x: 0,
    duration: 0.90,
    ease: 'power3.out'
  }, '<-0.60');

  // ── 3. BACKGROUND — GSAP-DRIVEN GLOW BREATHING ────
  // Layer subtle scale+opacity pulses on the existing
  // CSS-animated orbs to add a living, breathing quality.

  gsap.to('.hero-spotlight', {
    scale: 1.20, opacity: 0.80,
    duration: 4.5,
    yoyo: true, repeat: -1,
    ease: 'sine.inOut'
  });

  gsap.to('.glow-orb-a', {
    scale: 1.14,
    duration: 6.0,
    yoyo: true, repeat: -1,
    ease: 'sine.inOut'
  });

  gsap.to('.glow-orb-b', {
    scale: 1.10, opacity: 0.85,
    duration: 7.5,
    yoyo: true, repeat: -1,
    ease: 'sine.inOut',
    delay: 1.8
  });

  gsap.to('.glow-orb-c', {
    scale: 1.25, opacity: 0.55,
    duration: 5.5,
    yoyo: true, repeat: -1,
    ease: 'sine.inOut',
    delay: 1.1
  });

  // ── 4. CTA BUTTON HOVER MICROANIMATION ────────────
  // Scale spring on enter/leave + active press feedback.
  // Layered on top of the existing CSS shimmer sweep.
  const ctaBtn = document.querySelector('.hero-actions .btn-primary');
  if (ctaBtn) {
    ctaBtn.addEventListener('mouseenter', () => {
      gsap.to(ctaBtn, { scale: 1.046, duration: 0.28, ease: 'power2.out' });
    });
    ctaBtn.addEventListener('mouseleave', () => {
      gsap.to(ctaBtn, { scale: 1, duration: 0.34, ease: 'power3.out' });
    });
    ctaBtn.addEventListener('mousedown', () => {
      gsap.to(ctaBtn, { scale: 0.968, duration: 0.10, ease: 'power2.in' });
    });
    ctaBtn.addEventListener('mouseup', () => {
      gsap.to(ctaBtn, { scale: 1.03, duration: 0.22, ease: 'back.out(2.5)' });
    });
  }
});

/* ── PORTFOLIO FILTER ──────────────────────────── */
const filterBtns = document.querySelectorAll('.filter-btn');
const portCards  = document.querySelectorAll('.port-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('filter-btn--active'));
    btn.classList.add('filter-btn--active');
    const f = btn.dataset.filter;
    portCards.forEach(card => {
      const match = f === 'all' || card.dataset.cat === f;
      card.style.opacity   = match ? '1' : '0.25';
      card.style.transform = match ? '' : 'scale(0.97)';
      card.style.pointerEvents = match ? '' : 'none';
    });
  });
});

/* ── CONTACT FORM ──────────────────────────────── */
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><path d="M21 12a9 9 0 11-4.2-7.6"/></svg> Sending...`;

    if (!document.getElementById('_spinStyle')) {
      const s = document.createElement('style');
      s.id = '_spinStyle';
      s.textContent = '@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }

    setTimeout(() => {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ¡Mensaje enviado! Te respondemos en 24h`;
      btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.background = '';
        btn.disabled = false;
        contactForm.reset();
      }, 4000);
    }, 1600);
  });
}
