// A Quiet Place with God - scripts
const $ = id => document.getElementById(id);
const FIELDS = {bible:2, calendar:3, prayers:3, worship:2, notes:2};
const REQ = {bible:[0,1], calendar:[1,2], prayers:[0], worship:[1], notes:[0,1]};
const NAMES = {bible:'study', calendar:'devotion', prayers:'prayer', worship:'song', notes:'note'};
const DRAFTS = ['bible1','bible2','calendar1','calendar2','calendar3','prayers1','prayers2','prayers3','worship1','worship2','notes1','notes2','sp-q'];
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

// ---- Bible: KJV and BBE are public domain, so their text is bundled in /data. NIV, ESV, NLT, NKJV are copyrighted, so they open on BibleGateway ----
const BOOKS = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];
const BUNDLED = {KJV:'data/kjv.json', BBE:'data/bbe.json'};
let VOTD = null;
const rnd = n => Math.floor(Math.random() * n);
const votd = async () => VOTD || (VOTD = await (await fetch('data/votd.json')).json());
const dayIndex = () => { const n = new Date(); return (Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 864e5) - 1) % 365; };
const bibleCache = {};
const bible = async v => bibleCache[v] || (bibleCache[v] = await (await fetch(BUNDLED[v])).json());
let vi = -1, vseq = 0;
const version = () => LS.get(key('version')) || 'KJV';
const passageUrl = (ref, ver) => 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(ref) + '&version=' + ver;
async function showVerse() {
  const my = ++vseq, ver = version(), link = $('vlink');
  let v;
  try { const d = await votd(); v = d[vi < 0 ? (vi = dayIndex()) : vi]; }
  catch (e) { v = ['John', 3, 16, 0, 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.']; }
  const ref = v[0] + ' ' + v[1] + ':' + v[2] + (v[3] ? '-' + v[3] : '');
  $('read-btn').textContent = 'Read in ' + ver + ' ♡';
  link.hidden = true;
  $('vref').textContent = ref + ' (' + ver + ')';
  let text = ver === 'KJV' ? v[4] : null;
  if (!text && BUNDLED[ver]) {
    try { const d = await bible(ver); text = d[BOOKS.indexOf(v[0])].chapters[v[1] - 1].slice(v[2] - 1, v[3] || v[2]).join(' '); } catch (e) {}
  }
  if (my !== vseq) return;
  if (text) $('verse').textContent = '"' + text + '"';
  else { $('verse').textContent = ref; $('vref').textContent = ''; link.href = passageUrl(ref, ver); link.textContent = 'Read in ' + ver; link.hidden = false; }
}
function nextVerse() { votd().then(d => { vi = (vi + 1 + rnd(d.length - 1)) % d.length; showVerse(); }); }
function setVersion(v) { LS.set(key('version'), v); $('ver').value = v; $('rv').value = v; showVerse(); }
function readPassage() {
  const ref = $('bible1').value.trim(), m = $('msg-bible');
  if (!ref) { m.textContent = 'Type a passage first, like Psalm 23.'; return; }
  m.textContent = '';
  window.open(passageUrl(ref, version()), '_blank', 'noopener');
}
async function readBible(book, ch) {
  if (book !== undefined) { $('bk').value = book; $('bch').value = ch; $('bvs').value = ''; }
  const bi = +$('bk').value, c = +$('bch').value || 1, vs = $('bvs').value.trim(), ver = $('rv').value, out = $('bible-out');
  const ref = BOOKS[bi] + ' ' + c + (vs ? ':' + vs : '');
  out.textContent = '';
  if (!BUNDLED[ver]) {
    const a = document.createElement('a'); a.href = passageUrl(ref, ver); a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'mini';
    a.textContent = 'Open ' + ref + ' in the ' + ver + ' on BibleGateway';
    out.append('The ' + ver + ' is copyrighted, so it opens on BibleGateway. ', a);
    return;
  }
  out.textContent = 'Loading…';
  try {
    const d = await bible(ver), chap = d[bi].chapters[c - 1];
    if (!chap) { out.textContent = BOOKS[bi] + ' has ' + d[bi].chapters.length + ' chapters.'; return; }
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(vs), from = m ? +m[1] : 1, to = m ? +(m[2] || m[1]) : chap.length;
    out.textContent = '';
    const h = document.createElement('h4'), box = document.createElement('div'), nav = document.createElement('div');
    h.textContent = ref + ' (' + ver + ')'; box.className = 'chap'; nav.className = 'row';
    chap.forEach((t, i) => {
      if (i + 1 < from || i + 1 > to) return;
      const s = document.createElement('span'), n = document.createElement('sup');
      n.textContent = i + 1; s.append(n, ' ' + t + ' '); box.appendChild(s);
    });
    const btn = (label, fn) => { const b = document.createElement('button'); b.className = 'mini'; b.textContent = label; b.onclick = fn; nav.appendChild(b); };
    if (c > 1) btn('◀ Chapter ' + (c - 1), () => readBible(bi, c - 1));
    if (c < d[bi].chapters.length) btn('Chapter ' + (c + 1) + ' ▶', () => readBible(bi, c + 1));
    btn('Use this passage ♡', () => { $('bible1').value = ref; saveDraft(); $('msg-bible').textContent = 'Added to "Today\'s Reading" below ♡'; });
    out.append(h, box, nav);
  } catch (e) { out.textContent = "Couldn't load the Bible text. Check your connection and try again."; }
}

// ---- Songs: Spotify and YouTube links play inside the page ----
const spotify = u => {
  const m = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/.exec(u);
  return m ? {src:'https://open.spotify.com/embed/' + m[1] + '/' + m[2], h:/^(track|episode)$/.test(m[1]) ? 152 : 352} : null;
};
const youtube = u => {
  let m = /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(u);
  if (m) return {src:'https://www.youtube-nocookie.com/embed/' + m[1], yt:true};
  m = /^https?:\/\/(?:www\.|m\.|music\.)?youtube\.com\/(?:playlist|watch)\?(?:[^#]*&)?list=([\w-]+)/.exec(u);
  return m ? {src:'https://www.youtube-nocookie.com/embed/videoseries?list=' + m[1], yt:true} : null;
};
const embed = u => spotify(u) || youtube(u);
function songSearch(base, label) {
  const q = $('sp-q').value.trim(), m = $('msg-worship');
  if (!q) { m.textContent = 'Type a song title first.'; return; }
  m.textContent = 'Copy the song link from ' + label + ', then paste it above ♡';
  window.open(base + encodeURIComponent(q), '_blank', 'noopener');
}
const spotifySearch = () => songSearch('https://open.spotify.com/search/', 'Spotify');
const youtubeSearch = () => songSearch('https://www.youtube.com/results?search_query=', 'YouTube');

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
const STICKERS = ['⭐','🕊️','✨','🔥','⛰️','🌿','☀️','🌙','📖','✝️','🙏','⚓','🦁','🌊','💡','🛡️'];
function patch(k, id, fn) { const a = load(k), it = a.find(x => x.id === id); if (it) fn(it); save(k, a); render(k); }
function setPrayer(k, id, done, date) {
  const a = load(k), it = a.find(x => x.id === id);
  if (it) { it.done = done; if (done) it.ad = date; else delete it.ad; }
  save(k, a); render(k); closeSheet();
}
function remove(k, id) {
  if (confirm('Delete this ' + NAMES[k] + '? This cannot be undone.')) { save(k, load(k).filter(x => x.id !== id)); render(k); closeSheet(); }
}
function answerForm(r, k, id) {
  r.textContent = '';
  const d = document.createElement('input'); d.type = 'date'; d.value = today(); d.className = 'mini-date';
  const s = document.createElement('button'); s.className = 'mini'; s.textContent = 'Save answered date';
  s.onclick = () => setPrayer(k, id, true, d.value || today());
  r.append('Answered on ', d, s);
}

function describe(k, it) {
  const [a, b, c] = it.v;
  if (k === 'bible' || k === 'notes') return {title: a || 'Untitled', text: b};
  if (k === 'calendar') return {title: (b || 'Devotion') + (a ? ' \u00b7 ' + fmt(a) : ''), text: c};
  return {title: c || 'Prayer', text: a, meta: 'Requested' + (b ? ' ' + fmt(b) : '') + (it.done ? ' \u00b7 \u2713 Answered ' + fmt(it.ad) : '')};
}
function card(k, it) {
  const w = k === 'worship', d = document.createElement('div');
  d.className = 'item' + (w ? '' : ' rc') + (it.done ? ' done' : '');
  if (w) {
    const h = document.createElement('h4'), l = document.createElement('a');
    l.href = it.v[1]; l.target = '_blank'; l.rel = 'noopener noreferrer'; l.textContent = '\u266a ' + (it.v[0] || it.v[1]);
    h.appendChild(l); d.appendChild(h);
    const sp = embed(it.v[1]);
    if (sp) {
      const f = document.createElement('iframe');
      f.src = sp.src; f.className = 'sp' + (sp.yt ? ' yt' : ''); if (!sp.yt) f.style.height = sp.h + 'px'; f.loading = 'lazy'; f.allowFullscreen = true;
      f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      d.appendChild(f);
    }
    const r = document.createElement('div'); r.className = 'row';
    const x = document.createElement('button'); x.className = 'mini'; x.textContent = 'Delete';
    x.onclick = () => remove(k, it.id); r.appendChild(x); d.appendChild(r);
    return d;
  }
  const {title, text, meta} = describe(k, it); // compact row: tap it to open the drawer
  const main = document.createElement('div'); main.className = 'rc-main';
  const h = document.createElement('h4'); h.textContent = (it.st ? it.st + ' ' : '') + title; main.appendChild(h);
  if (meta) { const sm = document.createElement('small'); sm.textContent = meta; main.appendChild(sm); }
  if (text) { const pk = document.createElement('p'); pk.className = 'peek'; pk.textContent = text; main.appendChild(pk); }
  const t = document.createElement('button'); t.className = 'mini trash'; t.title = 'Delete'; t.setAttribute('aria-label', 'Delete'); t.textContent = '\ud83d\uddd1';
  t.onclick = e => { e.stopPropagation(); remove(k, it.id); };
  if (k === 'prayers') {
    const a = document.createElement('button'); a.className = 'mini trash'; a.title = it.done ? 'Back to requests' : 'Mark as answered'; a.setAttribute('aria-label', a.title); a.textContent = it.done ? '↩' : '✓';
    a.onclick = e => { e.stopPropagation(); setPrayer(k, it.id, !it.done, today()); };
    d.append(main, a, t);
  } else d.append(main, t);
  d.tabIndex = 0; d.setAttribute('role', 'button');
  d.onclick = () => openSheet(k, it);
  d.onkeydown = e => { if (e.key === 'Enter' && e.target === d) openSheet(k, it); };
  return d;
}
let sheetTimer = null;
function openSheet(k, it) {
  const {title, text, meta} = describe(k, it), r = $('sheet-actions'), s = $('sheet');
  $('sheet-title').textContent = (it.st ? it.st + ' ' : '') + title;
  $('sheet-body').textContent = (meta ? meta + '\n\n' : '') + (text || '(nothing written)');
  let st = $('sheet-stk');
  if (!st) { st = document.createElement('div'); st.id = 'sheet-stk'; r.parentNode.insertBefore(st, r); }
  st.textContent = '';
  STICKERS.forEach(e => {
    const b = document.createElement('button'); b.textContent = e; b.className = it.st === e ? 'on' : ''; b.title = 'Sticker / bookmark';
    b.onclick = () => { patch(k, it.id, x => { x.st = x.st === e ? '' : e; }); openSheet(k, load(k).find(x => x.id === it.id)); };
    st.appendChild(b);
  });
  r.textContent = '';
  if (k === 'prayers') {
    const t = document.createElement('button'); t.className = 'mini';
    t.textContent = it.done ? 'Back to requests' : '\u2713 Mark answered';
    t.onclick = () => it.done ? setPrayer(k, it.id, false) : answerForm(r, k, it.id);
    r.appendChild(t);
  }
  if (k === 'prayers' && it.done) { const cd = document.createElement('button'); cd.className = 'mini'; cd.textContent = 'Change answered date'; cd.onclick = () => answerForm(r, k, it.id); r.appendChild(cd); }
  const x = document.createElement('button'); x.className = 'mini'; x.textContent = 'Delete'; x.onclick = () => remove(k, it.id);
  const c = document.createElement('button'); c.className = 'mini'; c.textContent = 'Close'; c.onclick = closeSheet;
  r.append(x, c);
  clearTimeout(sheetTimer);
  s.classList.add('show');
  setTimeout(() => s.classList.add('open'), 20);
}
function closeSheet() {
  const s = $('sheet');
  s.classList.remove('open');
  clearTimeout(sheetTimer);
  sheetTimer = setTimeout(() => s.classList.remove('show'), 300);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
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
  $('cat-on').checked = catOn();
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
  $('rv').value = version();
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
      let name = a.name;
      if (!same && byName(name)) {
        let n = 2; while (byName(a.name + n)) n++;
        name = a.name + n;
        if (!confirm('This browser already has a different account named "' + a.name + '". Restore the file\'s account as "' + name + '" instead?')) return;
      }
      if (same && !confirm('This account is already here. Replace its entries with the ones in the file?')) return;
      saveUsers(users().filter(u => idOf(u) !== a.id).concat({id:a.id, name, display:a.display || a.name, h:a.h || null}));
      const prev = uid; uid = a.id;
      Object.keys(FIELDS).forEach(k => { if (Array.isArray(d.data[k])) save(k, d.data[k]); });
      if (d.theme) LS.set(key('theme'), JSON.stringify(d.theme));
      if (d.version) LS.set(key('version'), d.version);
      uid = prev;
      showLogin(a.id);
      m.textContent = 'Account found' + (name !== a.name ? ' as "' + name + '"' : '') + ' ♡ Enter your passcode to log in.';
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
// ---- Bible quizzes ----
const QN = 10;
const CHAPS = [50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22];
const TRIVIA = [["Who built the ark?", "Noah", "Moses", "Abraham", "Jonah", "Noah obeyed God and built the ark to save his family and the animals from the flood (Genesis 6–9)."], ["Who was swallowed by a great fish?", "Jonah", "Elijah", "Daniel", "Peter", "Jonah ran from God's call to Nineveh, was swallowed by a great fish, and prayed from inside it (Jonah 1–2)."], ["Which disciple walked on water toward Jesus?", "Peter", "John", "Thomas", "Andrew", "Peter stepped out of the boat, but began to sink when he looked at the waves (Matthew 14:29–31)."], ["How many days did God spend creating before he rested?", "Six", "Seven", "Three", "Forty", "God created in six days and rested on the seventh (Genesis 1–2)."], ["Who was thrown into the lions' den?", "Daniel", "Joseph", "David", "Samson", "Daniel kept praying to God, and God shut the lions' mouths (Daniel 6)."], ["What did David use to defeat Goliath?", "A sling and a stone", "A sword", "A spear", "A bow and arrow", "David trusted the Lord and struck Goliath with a stone from his sling (1 Samuel 17)."], ["Who led the Israelites out of Egypt?", "Moses", "Joshua", "Aaron", "Abraham", "God used Moses to bring Israel out of slavery in Egypt (Exodus 3–14)."], ["In which town was Jesus born?", "Bethlehem", "Nazareth", "Jerusalem", "Capernaum", "Jesus was born in Bethlehem, as the prophet Micah foretold (Micah 5:2; Luke 2:4–7)."], ["How many disciples did Jesus choose to be his closest followers?", "Twelve", "Seven", "Ten", "Forty", "Jesus chose twelve disciples to be with him and to send out (Mark 3:13–19)."], ["Who betrayed Jesus for thirty pieces of silver?", "Judas Iscariot", "Peter", "Thomas", "Pilate", "Judas handed Jesus over to the chief priests for thirty pieces of silver (Matthew 26:14–16)."], ["Who was the first man God created?", "Adam", "Cain", "Noah", "Seth", "God formed Adam from the dust of the ground (Genesis 2:7)."], ["Which sea did God part so Israel could cross on dry ground?", "The Red Sea", "The Dead Sea", "The Sea of Galilee", "The Mediterranean Sea", "The Lord parted the Red Sea and Israel crossed on dry ground (Exodus 14)."], ["Who was the mother of Jesus?", "Mary", "Martha", "Elizabeth", "Ruth", "Mary was the young woman chosen to bear Jesus (Luke 1:26–38)."], ["Where did Jesus pray the night before he was arrested?", "Gethsemane", "Eden", "Bethany", "Gilgal", "Jesus prayed in the garden of Gethsemane (Matthew 26:36–46)."], ["Who wrote many of the New Testament letters, like Romans and Philippians?", "Paul", "Peter", "James", "Jude", "Paul wrote many letters to churches and friends that are now part of the New Testament."], ["How many plagues did God send on Egypt?", "Ten", "Seven", "Twelve", "Three", "Ten plagues, ending with the death of the firstborn, led Pharaoh to let Israel go (Exodus 7–12)."], ["Which woman risked her life to save her people from Haman's plot?", "Esther", "Ruth", "Deborah", "Naomi", "Queen Esther approached the king uninvited to plead for her people (Esther 4–8)."], ["Whose strength was tied to his uncut hair?", "Samson", "Gideon", "Saul", "Jonathan", "Samson was a Nazirite, and his long hair was a sign of his vow to God (Judges 13–16)."], ["What did God give Moses on Mount Sinai?", "The Ten Commandments", "The ark of the covenant", "Manna", "Plans for the temple", "God gave the Ten Commandments written on two stone tablets (Exodus 20; 31:18)."], ["Who anointed David to be the future king of Israel?", "Samuel", "Nathan", "Eli", "Elijah", "Samuel anointed the youngest son of Jesse, David (1 Samuel 16:1–13)."], ["Who baptized Jesus in the Jordan River?", "John the Baptist", "Peter", "Paul", "Philip", "John baptized Jesus, and the Spirit came down like a dove (Matthew 3:13–17)."], ["What did Jesus use to feed more than five thousand people?", "Five loaves and two fish", "Seven loaves and a few fish", "Manna from heaven", "Bread from the temple", "Jesus gave thanks for five loaves and two fish and fed the crowd (John 6:1–14)."], ["Who was Abraham's wife?", "Sarah", "Rebekah", "Rachel", "Leah", "Sarah gave birth to Isaac in her old age, as God had promised (Genesis 21:1–3)."], ["Which prophet was taken up to heaven in a whirlwind with chariots of fire?", "Elijah", "Elisha", "Isaiah", "Jeremiah", "Elijah went up in a whirlwind, and Elisha received his mantle (2 Kings 2:11–13)."], ["Who was sold by his brothers and later became a ruler in Egypt?", "Joseph", "Benjamin", "Reuben", "Judah", "Joseph forgave his brothers, saying God meant it for good (Genesis 37–50; 50:20)."], ["Which is the shortest verse in the English King James Bible?", "\"Jesus wept.\"", "\"God is love.\"", "\"Pray without ceasing.\"", "\"Be still.\"", "\"Jesus wept.\" (John 11:35) shows Jesus' compassion at the grave of his friend Lazarus."], ["Which disciple said he would not believe until he saw Jesus' wounds?", "Thomas", "Peter", "Philip", "Andrew", "Thomas then said, \"My Lord and my God\" (John 20:24–29)."], ["On which day did the women find Jesus' tomb empty?", "The first day of the week", "Friday", "Saturday", "Thursday", "They found the stone rolled away on the first day of the week (Luke 24:1–6)."], ["How many books are in the (Protestant) Bible?", "66", "39", "27", "72", "There are 39 Old Testament books and 27 New Testament books, making 66."], ["Who asked God for wisdom instead of riches?", "Solomon", "David", "Saul", "Hezekiah", "Solomon asked for an understanding heart, and God gave him wisdom and more (1 Kings 3:5–12)."], ["What was Jesus' first miracle in John's Gospel?", "Turning water into wine", "Healing a blind man", "Walking on water", "Feeding the five thousand", "At the wedding in Cana, Jesus turned water into wine (John 2:1–11)."], ["Who denied knowing Jesus three times?", "Peter", "Judas", "John", "Thomas", "Peter wept bitterly, and Jesus later restored him (Luke 22:54–62; John 21:15–17)."], ["Where was Saul when Jesus appeared to him in a bright light?", "On the road to Damascus", "In Jerusalem", "In Rome", "In Antioch", "Saul became Paul, the apostle to the Gentiles (Acts 9:1–19)."], ["What did Jesus call the greatest commandment?", "Love the Lord your God with all your heart", "Keep the Sabbath", "Honor your father and mother", "Do not steal", "Jesus said to love God with all your heart, soul and mind (Matthew 22:37–38)."]];
const STOP = new Set(['shall','which','their','these','those','there','unto','thee','thou','thy','thine','with','from','have','will','that','this','them','they','were','your','also','into','upon','being','hath','doth','said','saith','before','because','would','could','should','where','when','what','whom','whose','every','other']);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const k = rnd(i + 1); [a[i], a[k]] = [a[k], a[i]]; } return a; };
const section = b => b < 5 ? 'a book of the Law (Old Testament)' : b < 17 ? 'a history book (Old Testament)' : b < 22 ? 'a wisdom and poetry book (Old Testament)' : b < 27 ? 'a Major Prophets book (Old Testament)' : b < 39 ? 'a Minor Prophets book (Old Testament)' : b < 43 ? 'a Gospel (New Testament)' : b === 43 ? 'the story of the early church (New Testament)' : b < 57 ? "one of Paul's letters (New Testament)" : b < 65 ? 'one of the General Letters (New Testament)' : 'the book of prophecy that closes the New Testament';
const vref = v => v[0] + ' ' + v[1] + ':' + v[2] + (v[3] ? '-' + v[3] : '');
const word = w => w.replace(/[^A-Za-z']/g, '');
const goodWord = w => word(w).length >= 5 && !STOP.has(word(w).toLowerCase());
const others = (b, same) => shuffle(BOOKS.map((n, i) => i).filter(i => i !== b && (!same || (i >= 39) === (b >= 39)))).slice(0, 3).map(i => BOOKS[i]);
function triviaQ() {
  if (Math.random() < .45) { const i = rnd(TRIVIA.length), t = TRIVIA[i]; return {id:'t' + i, q:t[0], opts:t.slice(1, 5), why:t[5]}; }
  const b = rnd(66), kind = rnd(3), name = BOOKS[b];
  if (kind === 0 && b < 65) return {id:'n' + b + 'a', q:'Which book comes right after ' + name + '?', opts:[BOOKS[b + 1]].concat(others(b + 1, false).filter(n => n !== name)).slice(0, 4), why:BOOKS[b + 1] + ' comes right after ' + name + ' in the Bible.'};
  if (kind === 1) {
    const set = new Set([CHAPS[b]]);
    while (set.size < 4) { const n = CHAPS[b] + rnd(25) - 12; if (n > 0) set.add(n); }
    return {id:'n' + b + 'b', q:'How many chapters does ' + name + ' have?', opts:[...set].map(String), why:name + ' has ' + CHAPS[b] + ' chapter' + (CHAPS[b] > 1 ? 's' : '') + '.'};
  }
  const nt = b >= 39;
  return {id:'n' + b + 'c', q:'Is ' + name + ' in the Old Testament or the New Testament?', opts:[nt ? 'New Testament' : 'Old Testament', nt ? 'Old Testament' : 'New Testament'], why:name + ' is ' + section(b) + '.'};
}
function verseQ() {
  const i = rnd(VOTD.length), v = VOTD[i], words = v[4].split(/\s+/), cand = words.map((w, k) => k).filter(k => goodWord(words[k]));
  if (!cand.length) return null;
  const k = cand[rnd(cand.length)], target = word(words[k]), cap = /^[A-Z]/.test(target), opts = [target];
  for (let n = 0; n < 300 && opts.length < 4; n++) {
    const ow = VOTD[rnd(VOTD.length)][4].split(/\s+/).filter(goodWord);
    if (!ow.length) continue;
    let w = word(ow[rnd(ow.length)]).toLowerCase(); if (cap) w = w[0].toUpperCase() + w.slice(1);
    if (w.toLowerCase() !== target.toLowerCase() && Math.abs(w.length - target.length) <= 2 && !opts.some(o => o.toLowerCase() === w.toLowerCase())) opts.push(w);
  }
  if (opts.length < 4) return null;
  return {id:'v' + i, q:'Complete the verse:\n"' + words.map((w, j) => j === k ? w.replace(target, '_____') : w).join(' ') + '"', opts, why:vref(v) + ' (KJV): "' + v[4] + '"'};
}
function bookQ() {
  const i = rnd(VOTD.length), v = VOTD[i], b = BOOKS.indexOf(v[0]);
  return {id:'b' + i, q:'Which book is this verse from?\n"' + v[4] + '"', opts:[v[0]].concat(others(b, true)), why:vref(v) + ' — ' + v[0] + ' is ' + section(b) + '.'};
}
const MAKERS = {trivia:triviaQ, verse:verseQ, book:bookQ}, POOL = {trivia:() => TRIVIA.length + 198, verse:() => VOTD.length, book:() => VOTD.length};
let quiz = null;
function makeQ() { // never repeats a question until the whole pool has been played
  const g = quiz.g, k = key('seen_' + g); let seen;
  try { seen = new Set(JSON.parse(LS.get(k)) || []); } catch (e) { seen = new Set(); }
  if (seen.size >= POOL[g]() - 8) seen.clear();
  let q = null;
  for (let n = 0; n < 400 && !q; n++) { const c = MAKERS[g](); if (c && !seen.has(c.id) && !quiz.ids.has(c.id)) q = c; }
  while (!q) q = MAKERS[g]();
  seen.add(q.id); quiz.ids.add(q.id); LS.set(k, JSON.stringify([...seen]));
  return q;
}
async function startQuiz(g) {
  if (g !== 'trivia') { try { await votd(); } catch (e) { $('quiz-menu').insertAdjacentText('beforeend', 'This game needs an internet connection the first time.'); return; } }
  else { try { await votd(); } catch (e) {} }
  quiz = {g, i:0, score:0, ids:new Set(), done:false};
  $('quiz-menu').hidden = true; $('quiz-play').hidden = false;
  showQ();
}
function quitQuiz() { $('quiz-play').hidden = true; $('quiz-menu').hidden = false; quiz = null; }
function showQ() {
  $('q-why').hidden = true; $('q-next').hidden = true; $('q-opts').hidden = false;
  const q = quiz.q = makeQ();
  quiz.correct = q.opts[0];
  $('q-n').textContent = 'Question ' + (quiz.i + 1) + ' of ' + QN;
  $('q-score').textContent = '⭐ ' + quiz.score;
  $('q-bar').style.width = (quiz.i / QN * 100) + '%';
  $('q-text').textContent = q.q;
  const box = $('q-opts'); box.textContent = '';
  shuffle(q.opts.slice()).forEach(o => {
    const b = document.createElement('button'); b.className = 'qopt'; b.textContent = o;
    b.onclick = () => answerQ(b, o); box.appendChild(b);
  });
}
function answerQ(btn, o) {
  const good = o === quiz.correct;
  document.querySelectorAll('#q-opts .qopt').forEach(b => { b.disabled = true; if (b.textContent === quiz.correct) b.classList.add('good'); });
  if (!good) btn.classList.add('bad'); else quiz.score++;
  $('q-score').textContent = '⭐ ' + quiz.score;
  $('q-why').textContent = (good ? '✓ Correct! ' : '✗ The answer is ' + quiz.correct + '. ') + quiz.q.why;
  $('q-why').hidden = false;
  $('q-next').textContent = quiz.i + 1 >= QN ? 'See my score' : 'Next ▶'; $('q-next').hidden = false;
}
function nextQ() {
  if (quiz.done) { startQuiz(quiz.g); return; }
  if (++quiz.i < QN) { showQ(); return; }
  quiz.done = true;
  const bk = key('best_' + quiz.g), best = Math.max(+LS.get(bk) || 0, quiz.score); LS.set(bk, best);
  const s = quiz.score;
  $('q-bar').style.width = '100%'; $('q-n').textContent = 'Round finished'; $('q-score').textContent = '⭐ ' + s;
  $('q-text').textContent = 'You got ' + s + ' out of ' + QN + '!\n' + (s >= 9 ? 'Amazing! You really know your Bible ♡' : s >= 7 ? 'Great job! Keep growing ♡' : s >= 4 ? 'Nice try! Every round teaches something ♡' : 'Good start! Read a little and try again ♡') + '\nYour best: ' + best + '/' + QN;
  $('q-opts').hidden = true; $('q-why').hidden = true;
  $('q-next').textContent = 'Play again ↻'; $('q-next').hidden = false;
}

// ---- Review bubbles on the login screen ----
const REVIEWS = ["I love the colors and design also the devotion reminder.", "This is so cute", "I like that I can change the color and theme of the website.", "I like the part where in I can put a song link and it plays the song while I can still write my devotions while the song is playing.", "I like the Bible Study cause you can literally learn the content of the scripture. More improvement to the website."];
let chatI = 0;
function chatLoop() {
  const box = $('chat');
  if (!document.documentElement.classList.contains('locked')) { box.textContent = ''; setTimeout(chatLoop, 1500); return; }
  const b = document.createElement('div'), s = document.createElement('small'), p = document.createElement('p'), text = REVIEWS[chatI++ % REVIEWS.length], hold = 3600 + text.length * 45;
  s.textContent = '💬 Review'; p.className = 'dots';
  for (let i = 0; i < 3; i++) p.appendChild(document.createElement('i'));
  b.className = 'bubble'; b.append(s, p); box.appendChild(b);
  setTimeout(() => { p.className = ''; p.textContent = text; }, 1100);
  setTimeout(() => b.classList.add('out'), 1100 + hold);
  setTimeout(() => b.remove(), 1700 + hold);
  setTimeout(chatLoop, 1100 + hold);
}

// ---- Username warning, cat friend and cat cursor ----
function checkName(id, msgId) {
  const v = $(id).value.trim(), o = v && byName(v);
  $(msgId).textContent = o && idOf(o) !== uid ? '⚠ That username is already taken on this browser. Try another one.' : '';
}
const catOn = () => LS.get('qp_cat') !== '0';
const setCatClass = () => document.documentElement.classList.toggle('nocat', !catOn());
function setCat() { LS.set('qp_cat', $('cat-on').checked ? '1' : '0'); setCatClass(); placeCat(); }
const cat = {x:0, y:0, tx:0, ty:0, side:0, seen:false, state:'sit', until:0, next:0, idleSince:0, last:0};
const CAT = 72;
function catState(s) { if (cat.state !== s) { cat.state = s; $('cat').className = 's-' + s; } }
function placeCat() {
  const r = document.querySelector('.site').getBoundingClientRect(), W = innerWidth, L = r.left, R = W - r.right, need = CAT + 20, el = $('cat');
  if (!catOn() || Math.max(L, R) < need) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  if (!cat.seen) { cat.seen = true; cat.side = L >= need ? 1 : 2; cat.x = cat.tx = cat.side === 1 ? Math.max(4, L / 2 - CAT / 2) : r.right + (R - CAT) / 2; cat.y = cat.ty = innerHeight - CAT - 24; }
}
function moveCat(e) { // follows only while the cursor is on the tiles; over the site the cat stays where it was left
  const r = document.querySelector('.site').getBoundingClientRect(), W = innerWidth, L = r.left, R = W - r.right, need = CAT + 20;
  if (!catOn() || Math.max(L, R) < need) { $('cat').style.display = 'none'; return; }
  $('cat').style.display = 'block';
  const left = e.clientX < r.left - 6 && L >= need, right = e.clientX > r.right + 6 && R >= need;
  if (!left && !right) return;
  const side = left ? 1 : 2;
  cat.tx = left ? Math.min(Math.max(e.clientX - CAT / 2, 4), L - CAT - 6) : Math.min(Math.max(e.clientX - CAT / 2, r.right + 6), W - CAT - 4);
  cat.ty = Math.min(Math.max(e.clientY - CAT * .6, 0), innerHeight - CAT - 4);
  if (!cat.seen || cat.side !== side) { cat.x = cat.tx; cat.y = cat.ty; cat.seen = true; }
  cat.side = side; cat.last = performance.now();
}
function tickCat(t) {
  const dx = cat.tx - cat.x, dy = cat.ty - cat.y;
  cat.x += dx * .09; cat.y += dy * .09;
  if (Math.hypot(dx, dy) > 8 && t - cat.last < 700) { catState('walk'); cat.idleSince = 0; }
  else if (cat.state === 'walk') { catState('sit'); cat.idleSince = t; cat.next = t + 1800; }
  else if (!cat.idleSince) { cat.idleSince = t; cat.next = t + 1500; }
  else if (cat.state !== 'sit' && t > cat.until) { catState('sit'); cat.next = t + 2200 + Math.random() * 2800; }
  else if (cat.state === 'sit' && t > cat.next) {
    const pick = t - cat.idleSince > 12000 && Math.random() < .5 ? 'sleep' : ['lick', 'yawn', 'happy', 'lick'][rnd(4)];
    catState(pick); cat.until = t + ({lick:3600, yawn:2600, happy:2600, sleep:9000})[pick];
  }
  $('cat').style.transform = 'translate(' + cat.x + 'px,' + cat.y + 'px)';
  requestAnimationFrame(tickCat);
}
function initExtras() {
  const bk = $('bk');
  BOOKS.forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; bk.appendChild(o); });
  $('rv').innerHTML = $('ver').innerHTML;
  setCatClass();
  placeCat();
  addEventListener('resize', placeCat);
  setTimeout(chatLoop, 900);
  if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
    document.addEventListener('mousemove', moveCat);
    requestAnimationFrame(tickCat);
  }
}
function boot() {
  initExtras();
  const sw = $('swatches');
  if (!sw.children.length) ['#f58ab3', '#b79cf0', '#6fb7f2', '#a8d93f', '#f4a261', '#e86a6a'].forEach(c => {
    const b = document.createElement('button'); b.style.background = c; b.title = c; b.onclick = () => setTheme(c); sw.appendChild(b);
  });
  const last = LS.get('qp_last'), u = last && users().find(x => idOf(x) === last || x.name === last);
  if (u) startSession(idOf(u)); else showLogin();
}
boot();
