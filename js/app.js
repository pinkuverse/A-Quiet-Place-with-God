// A Quiet Place with God - scripts
const $ = id => document.getElementById(id);
const FIELDS = {bible:2, calendar:3, prayers:2, worship:2, notes:2};
const REQ = {bible:[0,1], calendar:[1,2], prayers:[0], worship:[1], notes:[0,1]};
const NAMES = {bible:'study', calendar:'devotion', prayers:'prayer', worship:'song', notes:'note'};
const DRAFTS = ['bible1','bible2','calendar1','calendar2','calendar3','prayers1','prayers2','worship1','worship2','notes1','notes2','sp-q'];
const USERNAME = /^[\p{L}\p{N}._-]{3,20}$/u;

// ---- Browser storage helpers (nothing leaves this browser) ----
const LS = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del: k => { try { localStorage.removeItem(k); } catch (e) {} }
};
let uid = null;
const idOf = u => u.id || u.name.toLowerCase();
const users = () => { try { return JSON.parse(LS.get('qp_users')) || []; } catch (e) { return []; } };
const saveUsers = u => LS.set('qp_users', JSON.stringify(u));
const byName = n => users().find(u => u.name.toLowerCase() === String(n).trim().toLowerCase());
const me = () => users().find(u => idOf(u) === uid);
const update = fn => { const all = users(); fn(all.find(x => idOf(x) === uid)); return saveUsers(all); };
const key = k => 'qp:' + uid + ':' + k;
const hash = async (id, p) => [...new Uint8Array(await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(id.toLowerCase() + ':' + p)))].map(b => b.toString(16).padStart(2, '0')).join('');
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmt = d => { if (!d) return ''; const x = new Date(d + 'T00:00:00'); return isNaN(x) ? d : x.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'}); };

// ---- Pages ----
function showPage(page, button) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  $(page).classList.add('active');
  button.classList.add('active');
  if (page === 'settings') refreshSettings();
  window.scrollTo({top:0, behavior:'smooth'});
}

// ---- Verses: KJV shows the text (public domain); other versions are copyrighted, so they open on BibleGateway ----
const VERSES = [
  ["Draw nigh to God, and he will draw nigh to you.", "James 4:8"],
  ["Be still, and know that I am God.", "Psalm 46:10"],
  ["The Lord is my shepherd; I shall not want.", "Psalm 23:1"],
  ["Casting all your care upon him; for he careth for you.", "1 Peter 5:7"],
  ["Trust in the Lord with all thine heart.", "Proverbs 3:5"],
  ["Come unto me, all ye that labour and are heavy laden, and I will give you rest.", "Matthew 11:28"]
];
let vi = 0;
const version = () => LS.get(key('version')) || 'KJV';
const passageUrl = (ref, ver) => 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(ref) + '&version=' + ver;
function showVerse() {
  const [text, ref] = VERSES[vi], ver = version(), link = $('vlink');
  if (ver === 'KJV') {
    $('verse').textContent = '"' + text + '"';
    $('vref').textContent = ref + ' (KJV)';
    link.hidden = true;
  } else {
    $('verse').textContent = ref;
    $('vref').textContent = '';
    link.href = passageUrl(ref, ver);
    link.textContent = 'Read in ' + ver;
    link.hidden = false;
  }
  $('read-btn').textContent = 'Read in ' + ver + ' ♡';
}
function nextVerse() { vi = (vi + 1) % VERSES.length; showVerse(); }
function setVersion(v) { LS.set(key('version'), v); showVerse(); }
function readPassage() {
  const ref = $('bible1').value.trim(), m = $('msg-bible');
  if (!ref) { m.textContent = 'Type a passage first, like Psalm 23.'; return; }
  m.textContent = '';
  window.open(passageUrl(ref, version()), '_blank', 'noopener');
}

// ---- Spotify: pasted links play inside the page ----
const spotify = u => {
  const m = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/.exec(u);
  return m ? {src:'https://open.spotify.com/embed/' + m[1] + '/' + m[2], h:/^(track|episode)$/.test(m[1]) ? 152 : 352} : null;
};
function spotifySearch() {
  const q = $('sp-q').value.trim(), m = $('msg-worship');
  if (!q) { m.textContent = 'Type a song title first.'; return; }
  m.textContent = 'Copy the song link from Spotify, then paste it above ♡';
  window.open('https://open.spotify.com/search/' + encodeURIComponent(q), '_blank', 'noopener');
}

// ---- Saved entries (per account) ----
const load = k => { try { return JSON.parse(LS.get(key(k))) || []; } catch (e) { return []; } };
const save = (k, v) => LS.set(key(k), JSON.stringify(v));

function saveDraft() {
  const d = {};
  DRAFTS.forEach(i => { const el = $(i); if (el && el.value) d[i] = el.value; });
  LS.set(key('draft'), JSON.stringify(d));
}
function restoreDraft() {
  let d = {};
  try { d = JSON.parse(LS.get(key('draft'))) || {}; } catch (e) {}
  DRAFTS.forEach(i => { $(i).value = d[i] || ''; });
  ['calendar1', 'prayers2'].forEach(i => { if (!$(i).value) $(i).value = today(); });
}
document.addEventListener('input', e => { if (uid && DRAFTS.includes(e.target.id)) saveDraft(); });

function add(k) {
  const v = [];
  for (let i = 1; i <= FIELDS[k]; i++) v.push($(k + i).value.trim());
  const msg = $('msg-' + k);
  if (k === 'worship' && !/^https?:\/\//i.test(v[1])) { msg.textContent = 'Please paste a link that starts with https://'; return; }
  if (!REQ[k].some(i => v[i])) { msg.textContent = 'Write something first ♡'; return; }
  const items = load(k);
  items.unshift({v, done:false, id:Date.now()});
  if (!save(k, items)) { msg.textContent = "Couldn't save in this browser."; return; }
  for (let i = 1; i <= FIELDS[k]; i++) $(k + i).value = '';
  ['calendar1', 'prayers2'].forEach(i => { if (!$(i).value) $(i).value = today(); });
  saveDraft();
  msg.textContent = 'Saved ♡';
  render(k);
}
function setPrayer(k, id, done, date) {
  const a = load(k), it = a.find(x => x.id === id);
  if (it) { it.done = done; if (done) it.ad = date; else delete it.ad; }
  save(k, a); render(k);
}
function remove(k, id) {
  if (confirm('Delete this ' + NAMES[k] + '? This cannot be undone.')) { save(k, load(k).filter(x => x.id !== id)); render(k); }
}
function answerForm(r, k, id) {
  r.textContent = '';
  const d = document.createElement('input'); d.type = 'date'; d.value = today(); d.className = 'mini-date';
  const s = document.createElement('button'); s.className = 'mini'; s.textContent = 'Save answered date';
  s.onclick = () => setPrayer(k, id, true, d.value || today());
  r.append('Answered on ', d, s);
}

function card(k, it) {
  const [a, b, c] = it.v, w = k === 'worship';
  const d = document.createElement(w ? 'div' : 'details');
  d.className = 'item' + (it.done ? ' done' : '');
  const h = document.createElement('h4');
  let text = '';
  if (k === 'bible' || k === 'notes') { h.textContent = a || 'Untitled'; text = b; }
  else if (k === 'calendar') { h.textContent = (b || 'Devotion') + (a ? ' · ' + fmt(a) : ''); text = c; }
  else if (k === 'prayers') {
    h.textContent = '🙏 Requested' + (b ? ' ' + fmt(b) : '') + (it.done ? ' · ✓ Answered ' + fmt(it.ad) : '');
    text = a;
  } else {
    const l = document.createElement('a');
    l.href = b; l.target = '_blank'; l.rel = 'noopener noreferrer'; l.textContent = '♪ ' + (a || b);
    h.appendChild(l);
  }
  if (w) d.appendChild(h);
  else { // drawer: title + short preview; click to open the full text
    const s = document.createElement('summary');
    s.appendChild(h);
    if (text) {
      const pk = document.createElement('p'); pk.className = 'peek'; pk.textContent = text; s.appendChild(pk);
      const f = document.createElement('p'); f.className = 'full'; f.textContent = text;
      d.appendChild(s); d.appendChild(f);
    } else d.appendChild(s);
  }
  if (w) {
    const sp = spotify(b);
    if (sp) {
      const f = document.createElement('iframe');
      f.src = sp.src; f.className = 'sp'; f.style.height = sp.h + 'px'; f.loading = 'lazy';
      f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      d.appendChild(f);
    }
  }
  const r = document.createElement('div'); r.className = 'row';
  if (k === 'prayers') {
    const t = document.createElement('button'); t.className = 'mini';
    t.textContent = it.done ? 'Back to requests' : '✓ Mark answered';
    t.onclick = () => it.done ? setPrayer(k, it.id, false) : answerForm(r, k, it.id);
    r.appendChild(t);
  }
  const x = document.createElement('button'); x.className = 'mini'; x.textContent = 'Delete';
  x.onclick = () => remove(k, it.id); r.appendChild(x);
  d.appendChild(r);
  return d;
}
function fill(el, items, k, empty) {
  el.textContent = '';
  if (!items.length) { const e = document.createElement('p'); e.className = 'empty'; e.textContent = empty; el.appendChild(e); }
  items.forEach(it => el.appendChild(card(k, it)));
}
function render(k) {
  const items = load(k);
  if (k === 'calendar') items.sort((a, b) => (b.v[0] || '').localeCompare(a.v[0] || ''));
  if (k === 'prayers') {
    fill($('list-prayers'), items.filter(i => !i.done), k, 'No prayer requests yet ♡');
    fill($('list-prayers-done'), items.filter(i => i.done), k, 'Answered prayers will appear here ♡');
  } else fill($('list-' + k), items, k, k === 'calendar' ? 'No devotions saved yet ♡' : 'Nothing saved yet ♡');
}

// ---- Theme: any color, plus dark mode (saved per account, also used on the login page) ----
const theme = () => { try { return JSON.parse(LS.get(key('theme'))) || {c:'#f58ab3', dark:false}; } catch (e) { return {c:'#f58ab3', dark:false}; } };
function setTheme(c) {
  if (typeof c === 'string') $('theme-color').value = c;
  const t = {c: $('theme-color').value, dark: $('theme-dark').checked};
  applyTheme(t);
  LS.set(key('theme'), JSON.stringify(t));
  LS.set('qp_theme', JSON.stringify(t));
}
function resetTheme() { $('theme-dark').checked = false; setTheme('#f58ab3'); }

// ---- Settings ----
function paint() {
  const u = me(), n = u.display || u.name;
  $('welcome').textContent = 'Welcome, ' + n + ' ♡';
  $('who').textContent = n;
}
function refreshSettings() {
  const u = me(), t = theme();
  $('set-display').value = u.display || u.name;
  $('set-user').value = u.name;
  $('ver').value = version();
  $('theme-color').value = t.c;
  $('theme-dark').checked = !!t.dark;
  let n = 0;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + localStorage.getItem(k).length; } } catch (e) {}
  $('storage-info').textContent = 'Using about ' + Math.max(1, Math.round(n / 1024)) + ' KB of the roughly 5,000 KB your browser allows for this site.';
}
function saveName() {
  const v = $('set-display').value.trim(), m = $('msg-name');
  if (!v || v.length > 30) { m.textContent = 'Name: 1 to 30 characters.'; return; }
  update(u => { u.display = v; });
  m.textContent = 'Name saved ♡';
  paint();
}
function saveUsername() {
  const v = $('set-user').value.trim(), m = $('msg-user');
  if (!USERNAME.test(v)) { m.textContent = 'Username: 3 to 20 letters, numbers, . _ -'; return; }
  const o = byName(v);
  if (o && idOf(o) !== uid) { m.textContent = 'That username is already taken.'; return; }
  update(u => { u.id = idOf(u); u.name = v; });
  m.textContent = 'Username saved ♡ Use it the next time you log in.';
}
async function changePass() {
  const cur = $('pass-cur').value, nw = $('pass1').value, m = $('msg-pass'), u = me();
  if (nw.length < 4) { m.textContent = 'Use at least 4 characters.'; return; }
  try {
    if (u.h && await hash(idOf(u), cur) !== u.h) { m.textContent = 'Your current passcode is not right.'; return; }
    const h = await hash(idOf(u), nw);
    update(x => { x.h = h; });
  } catch (e) { m.textContent = "Couldn't change the passcode here."; return; }
  $('pass-cur').value = ''; $('pass1').value = '';
  m.textContent = 'Passcode changed ♡';
}
function logout() {
  LS.del('qp_last');
  location.reload();
}
function deleteProfile() {
  if (!confirm('Delete this account and all its entries from this device? This cannot be undone.')) return;
  Object.keys(FIELDS).concat('version', 'theme', 'draft').forEach(k => LS.del(key(k)));
  saveUsers(users().filter(u => idOf(u) !== uid));
  logout();
}

// ---- Backup and restore (current account) ----
function exportData() {
  const data = {}, u = me();
  Object.keys(FIELDS).forEach(k => data[k] = load(k));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({app:'quiet-place', v:2, account:{id:idOf(u), name:u.name, display:u.display || u.name, h:u.h || null}, data, theme:theme(), version:version()})], {type:'application/json'}));
  a.download = 'quiet-place-' + u.name.replace(/\W+/g, '-') + '-' + today() + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $('msg-data').textContent = 'Backup downloaded ♡ Keep the file private.';
}
function importData(input) {
  const f = input.files[0];
  if (!f) return;
  if (!confirm('Restoring replaces the entries saved in this account. Continue?')) { input.value = ''; return; }
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result).data;
      Object.keys(FIELDS).forEach(k => { if (Array.isArray(d[k])) save(k, d[k]); });
      Object.keys(FIELDS).forEach(render);
      $('msg-data').textContent = 'Backup restored ♡';
    } catch (e) { $('msg-data').textContent = "That file doesn't look like a backup."; }
    input.value = '';
  };
  r.readAsText(f);
}

// ---- Accounts: login, create, stay logged in until you log out ----
function startSession(id) {
  uid = id;
  LS.set('qp_last', id);
  document.documentElement.classList.remove('locked');
  const t = theme();
  applyTheme(t);
  LS.set('qp_theme', JSON.stringify(t));
  paint();
  Object.keys(FIELDS).forEach(render);
  restoreDraft();
  showVerse();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
function screen(n) {
  document.documentElement.classList.add('locked');
  ['start', 'login', 'create'].forEach(s => { $(s + '-form').hidden = s !== n; });
  $('msg-lock').textContent = '';
}
function showStart() { screen('start'); $('lock-title').textContent = 'Welcome ♡'; }
function showLogin(pick) {
  const us = users();
  if (!us.length) { showStart(); return; }
  screen('login');
  const sel = $('lock-user');
  sel.textContent = '';
  us.forEach(u => { const o = document.createElement('option'); o.value = idOf(u); o.textContent = u.name; sel.appendChild(o); });
  const want = pick || LS.get('qp_last');
  if (want && us.some(u => idOf(u) === want)) sel.value = want;
  $('lock-title').textContent = 'Welcome back ♡';
  loginChange();
}
function loginChange() {
  const u = users().find(x => idOf(x) === $('lock-user').value);
  $('lockpass').hidden = !(u && u.h);
  $('lockpass').value = '';
}
function showCreate() { screen('create'); $('lock-title').textContent = 'New account ♡'; }
function pickBackup() { $('acct-file').click(); }
function importAccount(input) {
  const f = input.files[0], m = $('msg-lock');
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result), a = d.account;
      if (d.app !== 'quiet-place' || !a || !a.id || !a.name || !d.data) throw 0;
      const same = users().find(u => idOf(u) === a.id);
      if (!same && byName(a.name)) { m.textContent = 'The username "' + a.name + '" is already used on this browser.'; return; }
      if (same && !confirm('This account is already here. Replace its entries with the ones in the file?')) return;
      saveUsers(users().filter(u => idOf(u) !== a.id).concat({id:a.id, name:a.name, display:a.display || a.name, h:a.h || null}));
      const prev = uid; uid = a.id;
      Object.keys(FIELDS).forEach(k => { if (Array.isArray(d.data[k])) save(k, d.data[k]); });
      if (d.theme) LS.set(key('theme'), JSON.stringify(d.theme));
      if (d.version) LS.set(key('version'), d.version);
      uid = prev;
      showLogin(a.id);
      m.textContent = 'Account found ♡ Enter your passcode to log in.';
    } catch (e) { m.textContent = "That doesn't look like a Quiet Place backup file."; }
    input.value = '';
  };
  r.readAsText(f);
}
async function unlock() {
  const u = users().find(x => idOf(x) === $('lock-user').value), m = $('msg-lock');
  if (!u) return;
  try {
    if (u.h && await hash(idOf(u), $('lockpass').value) !== u.h) { m.textContent = 'That passcode is not right.'; return; }
  } catch (e) { m.textContent = "Couldn't check the passcode here."; return; }
  startSession(idOf(u));
}
async function createProfile() {
  const display = $('new-display').value.trim(), name = $('new-name').value.trim(), pass = $('new-pass').value, m = $('msg-lock');
  if (!display || display.length > 30) { m.textContent = 'Enter your name (up to 30 characters).'; return; }
  if (!USERNAME.test(name)) { m.textContent = 'Username: 3 to 20 letters, numbers, . _ -'; return; }
  if (byName(name)) { m.textContent = 'That username is already taken.'; return; }
  if (pass.length < 4) { m.textContent = 'A passcode needs at least 4 characters.'; return; }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  let h;
  try { h = await hash(id, pass); } catch (e) { m.textContent = "Couldn't set a passcode here."; return; }
  const first = !users().length;
  if (!saveUsers(users().concat({id, name, display, h}))) { m.textContent = "Couldn't save in this browser."; return; }
  if (first) { // keep entries written before accounts existed
    uid = id;
    Object.keys(FIELDS).forEach(k => { const v = LS.get('qp_' + k); if (v) { LS.set(key(k), v); LS.del('qp_' + k); } });
    LS.del('qp_pass');
  }
  ['new-display', 'new-name', 'new-pass'].forEach(i => { $(i).value = ''; });
  startSession(id);
}
function boot() {
  const sw = $('swatches');
  if (!sw.children.length) ['#f58ab3', '#b79cf0', '#6fb7f2', '#a8d93f', '#f4a261', '#e86a6a'].forEach(c => {
    const b = document.createElement('button'); b.style.background = c; b.title = c; b.onclick = () => setTheme(c); sw.appendChild(b);
  });
  const last = LS.get('qp_last'), u = last && users().find(x => idOf(x) === last || x.name === last);
  if (u) startSession(idOf(u)); else showLogin();
}
boot();
