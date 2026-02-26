/* ─────────────────────────────────────────────
   NICE WRITING — ADMIN PANEL
───────────────────────────────────────────── */

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let workItems   = [];
let workOrder   = [];
let editingId   = null;
let pendingFile = null;

// ── AUTH ──────────────────────────────────────

// ── AUTH ─────────────────────────────────────

function init() {
  if (sessionStorage.getItem('nw-authed') === 'yes') {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard').style.display    = 'none';
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display    = 'block';
  loadAll();
}

document.getElementById('login-btn').addEventListener('click', () => {
  const pw    = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  if (pw === ADMIN_PASSWORD) {
    sessionStorage.setItem('nw-authed', 'yes');
    showDashboard();
  } else {
    errEl.textContent = 'Incorrect password.';
    document.getElementById('login-password').value = '';
  }
});

document.getElementById('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});

document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('nw-authed');
  showLogin();
});

init();

// ── TABS ──────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
  });
});

// ── LOAD ALL ──────────────────────────────────

async function loadAll() {
  await Promise.all([loadSiteContent(), loadWorkOrder()]);
  await loadWork();
}

// ── WORK ──────────────────────────────────────

async function loadWorkOrder() {
  const { data } = await sb.from('site_content').select('value').eq('key', 'work_order');
  const row = Array.isArray(data) ? data[0] : null;
  const order = row && row.value && Array.isArray(row.value.order) ? row.value.order : [];
  workOrder = order;
}

async function loadWork() {
  const { data } = await sb.from('work_items').select('*').order('created_at', { ascending: false });
  workItems = data || [];

  if (workItems.length) {
    const byId = new Map(workItems.map(w => [w.id, w]));
    let order = Array.isArray(workOrder) ? workOrder.filter(id => byId.has(id)) : [];
    const existingIds = new Set(order);
    const newIds = workItems.map(w => w.id).filter(id => !existingIds.has(id));
    order = [...newIds, ...order];
    workOrder = order;
    const orderMap = new Map(order.map((id, idx) => [id, idx]));
    workItems.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  }

  renderWorkList();
}

function renderWorkList() {
  const el = document.getElementById('admin-work-list');
  if (!workItems.length) {
    el.innerHTML = '<div class="table-empty">No pieces yet — click <strong>+ Add Piece</strong> to get started.</div>';
    return;
  }
  el.innerHTML = workItems.map(item => `
    <div class="work-row">
      <div>
        <div class="work-row-title">${item.title}</div>
        <div class="work-row-meta">${[item.client, item.file_name ? '📄 ' + item.file_name : (item.link ? '🔗 Link' : '')].filter(Boolean).join(' · ')}</div>
      </div>
      <span class="work-row-year">${item.year || ''}</span>
      <span class="work-row-cat">${item.category || ''}</span>
      <div class="row-actions">
        <div class="row-move-group">
          <button class="btn-move" onclick="moveWork('${item.id}', -1)" title="Move up">↑</button>
          <button class="btn-move" onclick="moveWork('${item.id}', 1)" title="Move down">↓</button>
        </div>
        <button class="btn-edit"   onclick="openEditModal('${item.id}')">Edit</button>
        <button class="btn-delete" onclick="deleteWork('${item.id}')">Delete</button>
      </div>
    </div>`).join('');
}

// ── ADD / EDIT MODAL ──────────────────────────

document.getElementById('add-work-btn').addEventListener('click', () => openAddModal());

function openAddModal() {
  editingId   = null;
  pendingFile = null;
  document.getElementById('modal-title').textContent = 'Add Piece';
  clearModal();
  openModal();
}

function openEditModal(id) {
  const item  = workItems.find(w => w.id === id);
  if (!item) return;
  editingId   = id;
  pendingFile = null;
  document.getElementById('modal-title').textContent = 'Edit Piece';
  document.getElementById('m-title').value       = item.title       || '';
  document.getElementById('m-year').value        = item.year        || '';
  document.getElementById('m-client').value      = item.client      || '';
  document.getElementById('m-category').value    = item.category    || 'Writing';
  document.getElementById('m-description').value = item.description || '';
  document.getElementById('m-link').value        = item.link        || '';

  if (item.file_url) {
    setAttachMode('file');
    document.getElementById('current-file-note').textContent =
      `Current file: ${item.file_name || 'attached'}`;
  } else {
    setAttachMode('link');
  }
  openModal();
}

function clearModal() {
  ['m-title','m-year','m-client','m-link','m-description'].forEach(id =>
    document.getElementById(id).value = '');
  document.getElementById('m-category').value = 'Writing';
  document.getElementById('drop-selected').textContent = '';
  document.getElementById('current-file-note').textContent = '';
  document.getElementById('m-file').value = '';
  setAttachMode('link');
}

function openModal()  { document.getElementById('modal-overlay').hidden = false; document.getElementById('m-title').focus(); }
function closeModal() { document.getElementById('modal-overlay').hidden = true; editingId = null; pendingFile = null; }

document.getElementById('modal-close-btn').addEventListener('click',  closeModal);
document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

// ── ATTACH TOGGLE ─────────────────────────────

document.getElementById('toggle-link-btn').addEventListener('click', () => setAttachMode('link'));
document.getElementById('toggle-file-btn').addEventListener('click', () => setAttachMode('file'));

function setAttachMode(mode) {
  const isLink = mode === 'link';
  document.getElementById('toggle-link-btn').classList.toggle('active',  isLink);
  document.getElementById('toggle-file-btn').classList.toggle('active', !isLink);
  document.getElementById('attach-link-area').hidden = !isLink;
  document.getElementById('attach-file-area').hidden =  isLink;
}

// ── DRAG & DROP ───────────────────────────────

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('m-file');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

['dragleave','dragend'].forEach(ev =>
  dropZone.addEventListener(ev, () => dropZone.classList.remove('drag-over'))
);

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

function setFile(file) {
  pendingFile = file;
  document.getElementById('drop-selected').textContent = `✓ ${file.name}`;
}

// ── SAVE WORK ─────────────────────────────────

document.getElementById('modal-save-btn').addEventListener('click', saveWork);

async function saveWork() {
  const title = document.getElementById('m-title').value.trim();
  if (!title) { alert('Please enter a title.'); return; }

  const btn = document.getElementById('modal-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const isFileMode = !document.getElementById('attach-file-area').hidden;

  let fileUrl  = editingId ? (workItems.find(w => w.id === editingId)?.file_url  || null) : null;
  let fileName = editingId ? (workItems.find(w => w.id === editingId)?.file_name || null) : null;
  let link     = isFileMode ? null : (document.getElementById('m-link').value.trim() || null);

  // Upload new file if dropped
  if (isFileMode && pendingFile) {
    const ext  = pendingFile.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await sb.storage.from('work-files').upload(path, pendingFile);
    if (upErr) { alert('File upload failed: ' + upErr.message); btn.disabled = false; btn.textContent = 'Save Piece'; return; }
    const { data: urlData } = sb.storage.from('work-files').getPublicUrl(path);
    fileUrl  = urlData.publicUrl;
    fileName = pendingFile.name;
    link     = null;
  } else if (!isFileMode) {
    fileUrl  = null;
    fileName = null;
  }

  const payload = {
    title,
    year:        document.getElementById('m-year').value.trim()        || null,
    client:      document.getElementById('m-client').value.trim()      || null,
    category:    document.getElementById('m-category').value,
    description: document.getElementById('m-description').value.trim() || null,
    link,
    file_url:  fileUrl,
    file_name: fileName,
  };

  let error;
  if (editingId) {
    ({ error } = await sb.from('work_items').update(payload).eq('id', editingId));
  } else {
    ({ error } = await sb.from('work_items').insert([payload]));
  }

  btn.disabled    = false;
  btn.textContent = 'Save Piece';

  if (error) { alert('Error saving: ' + error.message); return; }
  closeModal();
  await loadWork();
  if (!editingId) {
    await saveWorkOrder();
  }
}

// ── DELETE WORK ───────────────────────────────

async function deleteWork(id) {
  if (!confirm('Delete this piece? This cannot be undone.')) return;
  await sb.from('work_items').delete().eq('id', id);
  await loadWork();
}

async function moveWork(id, direction) {
  const idx = workItems.findIndex(w => w.id === id);
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= workItems.length) return;
  const [moved] = workItems.splice(idx, 1);
  workItems.splice(newIdx, 0, moved);
  workOrder = workItems.map(w => w.id);
  renderWorkList();
  await saveWorkOrder();
}

async function saveWorkOrder() {
  if (!workItems.length) {
    workOrder = [];
    await upsertContent('work_order', { order: [] });
    return;
  }
  workOrder = workItems.map(w => w.id);
  await upsertContent('work_order', { order: workOrder });
}

window.openEditModal = openEditModal;
window.deleteWork    = deleteWork;
window.moveWork      = moveWork;

// ── SITE CONTENT ──────────────────────────────

async function loadSiteContent() {
  const { data } = await sb.from('site_content').select('key, value');
  const map = Object.fromEntries((data || []).map(r => [r.key, r.value]));

  const h = map.hero    || {};
  const a = map.about   || {};
  const c = map.contact || {};

  document.getElementById('hero-eyebrow').value  = h.eyebrow || '';
  document.getElementById('hero-headline').value = h.headline || '';
  document.getElementById('hero-sub').value      = h.sub     || '';
  document.getElementById('hero-cta').value      = h.cta     || '';

  document.getElementById('about-heading').value = a.heading || '';
  const body = a.body || [];
  document.getElementById('about-p1').value   = body[0] || '';
  document.getElementById('about-p2').value   = body[1] || '';
  document.getElementById('about-p3').value   = body[2] || '';
  document.getElementById('about-tags').value = (a.tags || []).join(', ');

  document.getElementById('contact-heading').value  = c.heading  || '';
  document.getElementById('contact-body').value     = c.sub      || '';
  const links = c.links || [];
  const email    = links.find(l => l.label === 'Email');
  const linkedin = links.find(l => l.label === 'LinkedIn');
  const location = links.find(l => l.label === 'Location');
  document.getElementById('contact-email').value    = email    ? email.value    : '';
  document.getElementById('contact-linkedin').value = linkedin ? linkedin.href  : '';
  document.getElementById('contact-location').value = location ? location.value : '';
}

async function upsertContent(key, value) {
  await sb.from('site_content').upsert({ key, value }, { onConflict: 'key' });
}

function flashConfirm(id) {
  const el = document.getElementById(id);
  el.textContent = '✓ Saved';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

document.getElementById('save-hero-btn').addEventListener('click', async () => {
  await upsertContent('hero', {
    eyebrow:  document.getElementById('hero-eyebrow').value.trim(),
    headline: document.getElementById('hero-headline').value.trim(),
    sub:      document.getElementById('hero-sub').value.trim(),
    cta:      document.getElementById('hero-cta').value.trim(),
  });
  flashConfirm('hero-confirm');
});

document.getElementById('save-about-btn').addEventListener('click', async () => {
  const body = [
    document.getElementById('about-p1').value.trim(),
    document.getElementById('about-p2').value.trim(),
    document.getElementById('about-p3').value.trim(),
  ].filter(Boolean);

  const tags = document.getElementById('about-tags').value
    .split(',').map(t => t.trim()).filter(Boolean);

  await upsertContent('about', {
    heading: document.getElementById('about-heading').value.trim(),
    body,
    tags,
  });
  flashConfirm('about-confirm');
});

document.getElementById('save-contact-btn').addEventListener('click', async () => {
  const email    = document.getElementById('contact-email').value.trim();
  const linkedin = document.getElementById('contact-linkedin').value.trim();
  const location = document.getElementById('contact-location').value.trim();

  const links = [];
  if (email)    links.push({ label: 'Email',    value: email,    href: `mailto:${email}` });
  if (linkedin) links.push({ label: 'LinkedIn', value: 'LinkedIn', href: linkedin });
  if (location) links.push({ label: 'Location', value: location, href: null });

  await upsertContent('contact', {
    heading: document.getElementById('contact-heading').value.trim(),
    sub:     document.getElementById('contact-body').value.trim(),
    links,
  });
  flashConfirm('contact-confirm');
});

