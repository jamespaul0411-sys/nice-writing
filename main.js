/* ─────────────────────────────────────────────
   NICE WRITING — PUBLIC SITE
───────────────────────────────────────────── */

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let workOrder = null;

// Fallback content shown if Supabase is empty
const DEFAULTS = {
  hero: {
    eyebrow: 'Writing & Editing',
    headline: 'Words that move the<br><em>world</em> forward.',
    sub: 'Freelance writer and editor for nonprofits, NGOs, and philanthropic foundations.',
    cta: 'View Work'
  },
  about: {
    heading: 'Writing that serves\npurpose.',
    body: [
      'I\'m a writer and editor with experience helping mission-driven organizations communicate with clarity and impact.',
      'My work spans annual reports, grant narratives, impact stories, newsletters, and op-eds — always shaped around the people and causes at the center of the work.'
    ],
    tags: ['Annual Reports','Grant Narratives','Impact Stories','Newsletters','Op-Eds','Editing']
  },
  contact: {
    heading: 'Let\'s work\ntogether.',
    sub: 'Available for freelance writing and editing projects with nonprofits, foundations, and mission-driven organizations globally.',
    links: [
      { label: 'Email',    value: 'hello@nicewriting.co', href: 'mailto:hello@nicewriting.co' },
      { label: 'Location', value: 'New York, NY',         href: null }
    ]
  }
};

// ── NAV ──────────────────────────────────────

const nav       = document.getElementById('nav');
const navLinks  = document.querySelectorAll('.nav-links a');
const navToggle = document.getElementById('nav-toggle');
const navLinksEl = document.getElementById('nav-links');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 30);
  let cur = '';
  document.querySelectorAll('section[id]').forEach(s => {
    if (window.scrollY >= s.offsetTop - 120) cur = s.id;
  });
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${cur}`));
}, { passive: true });

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinksEl.classList.toggle('open');
  document.body.style.overflow = navLinksEl.classList.contains('open') ? 'hidden' : '';
});

navLinksEl.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navToggle.classList.remove('open');
  navLinksEl.classList.remove('open');
  document.body.style.overflow = '';
}));

// ── RENDER HELPERS ───────────────────────────

function renderHero(d) {
  document.getElementById('hero-eyebrow').textContent  = d.eyebrow;
  document.getElementById('hero-headline').innerHTML   = d.headline;
  document.getElementById('hero-sub').textContent      = d.sub;
  document.getElementById('hero-cta-text').textContent = d.cta;
}

function renderAbout(d) {
  document.getElementById('about-heading').innerHTML =
    d.heading.replace(/\n/g, '<br>');
  const body = document.getElementById('about-body');
  body.innerHTML = '';
  (d.body || []).forEach(t => {
    const p = document.createElement('p');
    p.textContent = t;
    body.appendChild(p);
  });
  const tags = document.getElementById('about-tags');
  tags.innerHTML = '';
  (d.tags || []).forEach(t => {
    const el = document.createElement('span');
    el.className = 'tag';
    el.textContent = t;
    tags.appendChild(el);
  });
}

function renderWork(items) {
  const list = document.getElementById('work-list');
  const filtersEl = document.getElementById('work-filters');
  list.innerHTML = '';
  filtersEl.innerHTML = '';

  if (!items.length) {
    list.innerHTML = '<div class="loading-row">No work added yet.</div>';
    return;
  }

  const cats = ['All', ...new Set(items.map(w => w.category).filter(Boolean))];
  cats.forEach((cat, i) => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (i === 0 ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.work-item').forEach(el =>
        el.classList.toggle('hidden', cat !== 'All' && el.dataset.cat !== cat)
      );
    });
    filtersEl.appendChild(btn);
  });

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'work-item reveal';
    el.dataset.cat = item.category || '';

    let linkHtml = '';
    if (item.file_url) {
      linkHtml = `<a href="${item.file_url}" target="_blank" rel="noreferrer" class="work-link" onclick="event.stopPropagation()">Download →</a>`;
    } else if (item.link) {
      linkHtml = `<a href="${item.link}" target="_blank" rel="noreferrer" class="work-link" onclick="event.stopPropagation()">Read →</a>`;
    }

    el.innerHTML = `
      <div class="work-item-top">
        <span class="work-title">${item.title}</span>
        <span class="work-year">${item.year || ''}</span>
      </div>
      <div class="work-meta">
        ${item.client ? `<span class="work-client">${item.client}</span>` : ''}
        ${item.client && item.category ? '<span class="work-dot">·</span>' : ''}
        ${item.category ? `<span class="work-cat">${item.category}</span>` : ''}
      </div>
      <div class="work-desc">
        ${item.description ? `<p>${item.description}</p>` : ''}
        ${linkHtml}
      </div>`;

    el.addEventListener('click', () => el.classList.toggle('open'));
    list.appendChild(el);
  });

  // Re-observe new reveal elements
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
}

function renderContact(d) {
  document.getElementById('contact-heading').innerHTML =
    d.heading.replace(/\n/g, '<br>');
  document.getElementById('contact-sub').textContent = d.sub;
  const linksEl = document.getElementById('contact-links');
  linksEl.innerHTML = '';
  (d.links || []).forEach(item => {
    const div = document.createElement('div');
    div.className = 'contact-item reveal';
    div.innerHTML = `
      <span class="contact-label">${item.label}</span>
      ${item.href
        ? `<a href="${item.href}" class="contact-value">${item.value}</a>`
        : `<span class="contact-value">${item.value}</span>`}`;
    linksEl.appendChild(div);
  });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
}

// ── SCROLL REVEAL ─────────────────────────────

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -48px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── LOAD FROM SUPABASE ────────────────────────

async function loadSiteContent() {
  try {
    const { data } = await sb.from('site_content').select('key, value');
    const map = Object.fromEntries((data || []).map(r => [r.key, r.value]));
    const wo = map.work_order && map.work_order.order;
    workOrder = Array.isArray(wo) ? wo : null;
    renderHero(map.hero || DEFAULTS.hero);
    renderAbout(map.about || DEFAULTS.about);
    renderContact(map.contact || DEFAULTS.contact);
  } catch (_) {
    renderHero(DEFAULTS.hero);
    renderAbout(DEFAULTS.about);
    renderContact(DEFAULTS.contact);
  }
}

async function loadWork() {
  try {
    const { data } = await sb.from('work_items').select('*').order('created_at', { ascending: false });
    let items = data || [];
    if (Array.isArray(workOrder) && workOrder.length && items.length) {
      const byId = new Map(items.map(w => [w.id, w]));
      const orderIds = workOrder.filter(id => byId.has(id));
      const seen = new Set(orderIds);
      const remaining = items.filter(w => !seen.has(w.id));
      const ordered = [...orderIds.map(id => byId.get(id)), ...remaining];
      items = ordered;
    }
    renderWork(items);
  } catch (_) {
    document.getElementById('work-list').innerHTML = '<div class="loading-row">Could not load work.</div>';
  }
}

document.getElementById('footer-text').innerHTML =
  `&copy; ${new Date().getFullYear()} Nice Writing. All rights reserved.`;

(async () => {
  await loadSiteContent();
  await loadWork();
})();