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
const VERSES = [["Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.", "Psalms", 46, 10, 0], ["The LORD is my shepherd; I shall not want.", "Psalms", 23, 1, 0], ["The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?", "Psalms", 27, 1, 0], ["O taste and see that the LORD is good: blessed is the man that trusteth in him.", "Psalms", 34, 8, 0], ["Delight thyself also in the LORD ; and he shall give thee the desires of thine heart.", "Psalms", 37, 4, 0], ["He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.", "Psalms", 91, 1, 0], ["Thy word is a lamp unto my feet, and a light unto my path.", "Psalms", 119, 105, 0], ["I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD , which made heaven and earth.", "Psalms", 121, 1, 2], ["I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well.", "Psalms", 139, 14, 0], ["Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.", "Proverbs", 3, 5, 6], ["Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.", "Isaiah", 26, 3, 0], ["But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", "Isaiah", 40, 31, 0], ["Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.", "Isaiah", 41, 10, 0], ["For I know the thoughts that I think toward you, saith the LORD , thoughts of peace, and not of evil, to give you an expected end.", "Jeremiah", 29, 11, 0], ["It is of the LORD’s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.", "Lamentations", 3, 22, 23], ["Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.", "Joshua", 1, 9, 0], ["But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.", "Matthew", 6, 33, 0], ["Come unto me, all ye that labour and are heavy laden, and I will give you rest.", "Matthew", 11, 28, 0], ["For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", "John", 3, 16, 0], ["Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.", "John", 14, 27, 0], ["And we know that all things work together for good to them that love God, to them who are the called according to his purpose.", "Romans", 8, 28, 0], ["And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness. Most gladly therefore will I rather glory in my infirmities, that the power of Christ may rest upon me.", "2 Corinthians", 12, 9, 0], ["For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:", "Ephesians", 2, 8, 0], ["Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.", "Philippians", 4, 6, 0], ["I can do all things through Christ which strengtheneth me.", "Philippians", 4, 13, 0], ["Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you.", "1 Thessalonians", 5, 16, 18], ["Now faith is the substance of things hoped for, the evidence of things not seen.", "Hebrews", 11, 1, 0], ["Draw nigh to God, and he will draw nigh to you. Cleanse your hands, ye sinners; and purify your hearts, ye double minded.", "James", 4, 8, 0], ["Casting all your care upon him; for he careth for you.", "1 Peter", 5, 7, 0], ["Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you alway, even unto the end of the world. Amen.", "Matthew", 28, 20, 0]];
const bibleCache = {};
const bible = async v => bibleCache[v] || (bibleCache[v] = await (await fetch(BUNDLED[v])).json());
let vi = 0, vseq = 0;
const version = () => LS.get(key('version')) || 'KJV';
const passageUrl = (ref, ver) => 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(ref) + '&version=' + ver;
const refOf = v => v[1] + ' ' + v[2] + ':' + v[3] + (v[4] ? '-' + v[4] : '');
async function showVerse() {
  const v = VERSES[vi], ref = refOf(v), ver = version(), link = $('vlink'), my = ++vseq;
  $('rv').value = ver;
  $('read-btn').textContent = 'Read in ' + ver + ' ♡';
  link.hidden = true;
  $('vref').textContent = ref + ' (' + ver + ')';
  let text = ver === 'KJV' ? v[0] : null;
  if (!text && BUNDLED[ver]) {
    try { const d = await bible(ver); text = d[BOOKS.indexOf(v[1])].chapters[v[2] - 1].slice(v[3] - 1, v[4] || v[3]).join(' '); } catch (e) {}
  }
  if (my !== vseq) return;
  if (text) $('verse').textContent = '"' + text + '"';
  else { $('verse').textContent = ref; $('vref').textContent = ''; link.href = passageUrl(ref, ver); link.textContent = 'Read in ' + ver; link.hidden = false; }
}
function nextVerse() { vi = (vi + 1 + Math.floor(Math.random() * (VERSES.length - 1))) % VERSES.length; showVerse(); }
function setVersion(v) { LS.set(key('version'), v); $('ver').value = v; showVerse(); }
function readPassage() {
  const ref = $('bible1').value.trim(), m = $('msg-bible');
  if (!ref) { m.textContent = 'Type a passage first, like Psalm 23.'; return; }
  m.textContent = '';
  window.open(passageUrl(ref, version()), '_blank', 'noopener');
}
async function readBible(book, ch) {
  if (book !== undefined) { $('bk').value = book; $('bch').value = ch; $('bvs').value = ''; }
  const bi = +$('bk').value, c = +$('bch').value || 1, vs = $('bvs').value.trim(), ver = version(), out = $('bible-out');
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
const STICKERS = ['🌸','🎀','🧸','⭐','🌷','🕊️','✨','🦋','💌','☁️','🐈','🍓'];
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
  d.append(main, t);
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
// ---- Username warning, cat friend and cat cursor ----
function checkName(id, msgId) {
  const v = $(id).value.trim(), o = v && byName(v);
  $(msgId).textContent = o && idOf(o) !== uid ? '⚠ That username is already taken on this browser. Try another one.' : '';
}
const catOn = () => LS.get('qp_cat') !== '0';
const setCatClass = () => document.documentElement.classList.toggle('nocat', !catOn());
function setCat() { LS.set('qp_cat', $('cat-on').checked ? '1' : '0'); setCatClass(); }
const cat = {x:0, y:0, tx:0, ty:0, f:1, seen:false};
function moveCat(e) { // the cat only walks on the tiles beside the site, never over the content
  const el = $('cat'), r = document.querySelector('.site').getBoundingClientRect(), W = innerWidth, left = r.left, right = W - r.right;
  if (!catOn() || Math.max(left, right) < 70) { el.style.display = 'none'; return; }
  const useLeft = left >= 70 && (e.clientX < W / 2 || right < 70);
  cat.tx = useLeft ? Math.min(Math.max(e.clientX - 20, 4), left - 48) : Math.min(Math.max(e.clientX - 20, r.right + 6), W - 46);
  cat.ty = Math.min(Math.max(e.clientY - 18, 0), innerHeight - 44);
  if (!cat.seen) { cat.seen = true; cat.x = cat.tx; cat.y = cat.ty; }
  el.style.display = 'block';
}
function tickCat() {
  const dx = cat.tx - cat.x;
  cat.x += dx * .1; cat.y += (cat.ty - cat.y) * .1;
  if (Math.abs(dx) > .5) cat.f = dx > 0 ? -1 : 1;
  $('cat').style.transform = 'translate(' + cat.x + 'px,' + cat.y + 'px) scaleX(' + cat.f + ')';
  requestAnimationFrame(tickCat);
}
function initExtras() {
  const bk = $('bk');
  BOOKS.forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; bk.appendChild(o); });
  $('rv').innerHTML = $('ver').innerHTML;
  setCatClass();
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
