// app.js — router, sidebar, editor, search, mind map, backup.
// Data (TREE, RENDERERS, IDX, helpers) comes from content.js; the AI assistant lives in ai.js.

// ── STATE ────────────────────────────────────────────────────
let CUR = 'home';          // current route
let LAST_PAGE = 'home';    // last non-special route (used as AI context)
let EDIT = false;
const OPEN_T = new Set(), OPEN_S = new Set();
let saveTimer = null, pendingPad = null;

// ── STORAGE (same keys as the original app: nhub_<route_with_underscores>_notes / _links) ──
function stGet(k) { try { const v = localStorage.getItem('nhub_' + k); return v ? JSON.parse(v) : null } catch { return null } }
function stSet(k, v) { try { localStorage.setItem('nhub_' + k, JSON.stringify(v)); return true } catch (e) { console.warn(e); toast('⚠ Could not save — browser storage is full or blocked'); return false } }
const rkOf = route => route.replace(/\//g, '_');
function getNotes(route) { return stGet(rkOf(route) + '_notes') || '' }
function getLinks(route) { return stGet(rkOf(route) + '_links') || [] }
function hasUserData(route) {
  const n = getNotes(route);
  return (n && htmlToText(n).trim().length > 0) || getLinks(route).length > 0;
}
function htmlToText(html) { const d = document.createElement('div'); d.innerHTML = html; return d.innerText || d.textContent || '' }

// ── TREE LOOKUP ──────────────────────────────────────────────
function findRoute(route) {
  const p = route.split('/');
  const tech = TREE.find(t => t.id === p[0]);
  const sub = tech && p[1] ? tech.subs.find(s => s.id === p[1]) : null;
  const page = sub && p[2] ? sub.pages.find(x => x.id === p[2]) : null;
  return { tech, sub, page, parts: p };
}
function routeLabel(route) {
  if (route === 'home') return 'Home';
  const { tech, sub, page } = findRoute(route);
  return [tech && tech.label, sub && sub.label, page && page.label].filter(Boolean).join(' › ') || route;
}
function allPages() {
  const out = [];
  TREE.forEach(t => t.subs.forEach(s => s.pages.forEach(p => out.push({ route: t.id + '/' + s.id + '/' + p.id, tech: t, sub: s, page: p }))));
  return out;
}
function pageHasContent(route) { return !!RENDERERS[route] || hasUserData(route) }

// ── SIDEBAR ──────────────────────────────────────────────────
function buildSidebar() {
  let html = '';
  TREE.forEach(tech => {
    const isOT = OPEN_T.has(tech.id);
    const nPages = tech.subs.reduce((a, s) => a + s.pages.length, 0);
    html += '<div style="--guide:' + tech.col + '40">';
    html += '<div class="tr-row t1h ' + (CUR === tech.id || CUR.startsWith(tech.id + '/') ? 'page-active' : '') + '" onclick="tTog(\'' + tech.id + '\')">'
      + '<span class="chev ' + (isOT ? 'open' : '') + '" onclick="event.stopPropagation();tFold(\'' + tech.id + '\')" title="Expand / collapse">&#9654;</span>'
      + '<span class="t1-dot" style="background:' + tech.col + '"></span>'
      + '<span class="lbl">' + tech.label + '</span><span class="cnt">' + nPages + '</span></div>';
    if (isOT) {
      html += '<div class="t1-kids">';
      tech.subs.forEach(sub => {
        const sk = tech.id + '/' + sub.id;
        const isOS = OPEN_S.has(sk);
        html += '<div class="tr-row t2h ' + (CUR === sk || CUR.startsWith(sk + '/') ? 'page-active' : '') + '" onclick="sTog(\'' + sk + '\')">'
          + '<span class="chev ' + (isOS ? 'open' : '') + '" onclick="event.stopPropagation();sFold(\'' + sk + '\')" title="Expand / collapse">&#9654;</span>'
          + '<span class="lbl">' + sub.label + '</span></div>';
        if (isOS) {
          html += '<div class="t2-kids">';
          sub.pages.forEach(pg => {
            const route = sk + '/' + pg.id;
            html += '<div class="tr-row t3i ' + (CUR === route ? 'active ' : '') + (pageHasContent(route) ? 'has' : '') + '" onclick="go(\'' + route + '\')" title="' + (pageHasContent(route) ? 'Has content' : 'Empty — add notes in Edit mode') + '">'
              + '<span class="bul"></span><span class="lbl">' + pg.label + '</span></div>';
          });
          html += '</div>';
        }
      });
      html += '</div>';
    }
    html += '</div>';
  });
  document.getElementById('nav-tree').innerHTML = html;
  ['home', 'mm', 'ai'].forEach(id => { const el = document.getElementById('qn-' + id); if (el) el.classList.toggle('active', CUR === id) });
}
// Chevron = expand/collapse only. Label = open the overview page (and expand);
// clicking the label of the overview you are already on collapses it.
function tFold(tid) { OPEN_T.has(tid) ? OPEN_T.delete(tid) : OPEN_T.add(tid); buildSidebar() }
function sFold(key) { OPEN_S.has(key) ? OPEN_S.delete(key) : OPEN_S.add(key); buildSidebar() }
function tTog(tid) {
  if (CUR === tid && OPEN_T.has(tid)) { OPEN_T.delete(tid); buildSidebar(); return }
  OPEN_T.add(tid); go(tid);
}
function sTog(key) {
  if (CUR === key && OPEN_S.has(key)) { OPEN_S.delete(key); buildSidebar(); return }
  OPEN_S.add(key); OPEN_T.add(key.split('/')[0]); go(key);
}

// ── BREADCRUMB ───────────────────────────────────────────────
function buildBC() {
  const bcEl = document.getElementById('breadcrumb');
  let html = '<a onclick="go(\'home\')">&#x2B21; NET_HUB</a>';
  if (CUR === 'mm') html += '<span class="bc-sep">/</span><span class="bc-cur">Mind Map</span>';
  else if (CUR === 'ai') html += '<span class="bc-sep">/</span><span class="bc-cur">AI Assistant</span>';
  else if (CUR !== 'home') {
    const { tech, sub, parts } = findRoute(CUR);
    if (tech) {
      html += '<span class="bc-sep">/</span><a onclick="go(\'' + parts[0] + '\')">' + tech.label + '</a>';
      if (sub) {
        html += '<span class="bc-sep">/</span><a onclick="go(\'' + parts[0] + '/' + parts[1] + '\')">' + sub.label + '</a>';
        if (parts[2]) { const pg = sub.pages.find(p => p.id === parts[2]); html += '<span class="bc-sep">/</span><span class="bc-cur">' + (pg ? pg.label : esc(parts[2])) + '</span>' }
      }
    }
  }
  bcEl.innerHTML = html;
}

// ── ROUTER (URL hash keeps the page on refresh and makes Back work) ──
function go(route) {
  if (location.hash.slice(1) !== route) { location.hash = route; return } // hashchange → render
  render(route);
}
function render(route) {
  flushSave();
  CUR = route || 'home';
  if (!['home', 'mm', 'ai'].includes(CUR)) LAST_PAGE = CUR;
  if (findRoute(CUR).tech) { const pp = CUR.split('/'); OPEN_T.add(pp[0]); if (pp.length > 2) OPEN_S.add(pp[0] + '/' + pp[1]) }
  document.body.classList.remove('nav-open', 'mm-full-open');
  closeSrch();
  buildSidebar(); buildBC();
  const pc = document.getElementById('pc');
  const parts = CUR.split('/');
  if (CUR === 'home') pc.innerHTML = pgHome();
  else if (CUR === 'mm') { pc.innerHTML = pgMM(); initMM('mm-svg', null) }
  else if (CUR === 'ai') { pc.innerHTML = window.AI ? window.AI.page() : '<div class="content"><p>Loading AI module…</p></div>'; window.AI && window.AI.mount() }
  else if (!findRoute(CUR).tech) pc.innerHTML = pgNotFound(CUR);
  else if (parts.length === 1) { pc.innerHTML = pgTech(parts[0]); initMM('tmap', parts[0]) }
  else if (parts.length === 2) pc.innerHTML = pgSub(parts[0], parts[1]);
  else {
    const fn = RENDERERS[CUR];
    pc.innerHTML = (fn ? fn() : pgStub(CUR)) + '<div class="content" style="padding-top:0">' + renderEditZone(CUR) + '</div>';
  }
  document.getElementById('main').scrollTop = 0;
  applyEditMode();
}
window.addEventListener('hashchange', () => render(decodeURIComponent(location.hash.slice(1)) || 'home'));

// ── PAGES ────────────────────────────────────────────────────
function pgHome() {
  const pages = allPages();
  const withNotes = pages.filter(p => hasUserData(p.route));
  return '<div class="ph"><div class="pt">NET_HUB</div><div class="ps">Network Engineering Knowledge Base &middot; '
    + pages.length + ' pages &middot; ' + Object.keys(RENDERERS).length + ' with built-in content &middot; ' + withNotes.length + ' with your notes</div></div>'
    + '<div class="content"><h2>Technologies</h2><div class="cg">'
    + TREE.map(t => {
      const n = t.subs.reduce((a, s) => a + s.pages.length, 0);
      const filled = t.subs.reduce((a, s) => a + s.pages.filter(p => pageHasContent(t.id + '/' + s.id + '/' + p.id)).length, 0);
      return '<div class="card" style="border-top:2px solid ' + t.col + '" onclick="go(\'' + t.id + '\')">'
        + '<div class="ctit">' + t.label + '</div><div class="cdesc">' + t.subs.map(s => s.label).join(' &middot; ') + '</div>'
        + '<div class="ccnt">' + filled + ' / ' + n + ' pages with content</div></div>';
    }).join('')
    + '</div>'
    + (withNotes.length ? '<h2>Your notes</h2><div class="cg">' + withNotes.map(p =>
      '<div class="card" style="border-top:2px solid ' + p.tech.col + '" onclick="go(\'' + p.route + '\')"><div class="ctit">' + p.page.label + '</div>'
      + '<div class="cdesc">' + esc(htmlToText(getNotes(p.route)).slice(0, 90)) + '</div><div class="ccnt">' + p.tech.label + ' › ' + p.sub.label + '</div></div>').join('') + '</div>' : '')
    + '<h2>Built-in content</h2><div class="cg">'
    + Object.keys(RENDERERS).map(r => { const f = findRoute(r); return '<div class="card" style="border-top:2px solid ' + f.tech.col + '" onclick="go(\'' + r + '\')"><div class="ctit">' + f.page.label + '</div><div class="ccnt">' + f.tech.label + ' › ' + f.sub.label + '</div></div>' }).join('')
    + '</div>'
    + '<h2>Tools</h2><div class="cg">'
    + '<div class="card" style="border-top:2px solid var(--teal)" onclick="go(\'mm\')"><div class="ctit">&#x1F578; Mind Map</div><div class="cdesc">All technologies, topics and pages — built from your data</div></div>'
    + '<div class="card" style="border-top:2px solid var(--teal)" onclick="go(\'ai\')"><div class="ctit">&#x25C8; AI Assistant</div><div class="cdesc">Ask with page context, save answers into notes</div></div>'
    + '</div></div>';
}

function pgTech(tid) {
  const tech = TREE.find(t => t.id === tid);
  const tagCls = { cisco: 'tp', f5: 'tg', checkpoint: 'tr', fortinet: 'ta', paloalto: 'tb', theory: 'tgr' }[tid] || 'tg';
  let html = '<div class="ph"><div class="pt">' + tech.label + '</div><div class="ps">' + tech.subs.map(s => s.label).join(' &middot; ') + '</div><div class="tags">' + tag(tagCls, tech.label) + '</div></div>';
  html += '<div class="content"><h2>Sub-topics</h2><div class="cg">';
  tech.subs.forEach(s => {
    const filled = s.pages.filter(p => pageHasContent(tid + '/' + s.id + '/' + p.id)).length;
    html += '<div class="card" style="border-top:2px solid ' + tech.col + '" onclick="go(\'' + tid + '/' + s.id + '\')">'
      + '<div class="ctit">' + s.label + '</div><div class="cdesc">' + s.pages.map(p => p.label).join(' &middot; ') + '</div>'
      + '<div class="ccnt">' + filled + ' / ' + s.pages.length + ' pages with content</div></div>';
  });
  html += '</div><h2>Map</h2><div class="mm-wrap"><svg id="tmap" class="mm-svg small"></svg>' + zoomBtns('tmap') + '</div>';
  html += renderEditZone(tid) + '</div>';
  return html;
}

function pgSub(tid, sid) {
  const { tech, sub } = findRoute(tid + '/' + sid);
  if (!sub) return pgNotFound(tid + '/' + sid);
  let html = '<div class="ph"><div class="pt">' + sub.label + '</div><div class="ps">' + tech.label + ' &rarr; ' + sub.label + '</div></div>';
  html += '<div class="content"><h2>Pages</h2><div class="cg">';
  sub.pages.forEach(p => {
    const route = tid + '/' + sid + '/' + p.id;
    const built = !!RENDERERS[route], mine = hasUserData(route);
    html += '<div class="card" style="border-top:2px solid ' + tech.col + '" onclick="go(\'' + route + '\')"><div class="ctit">' + p.label + '</div>'
      + '<div class="ccnt" style="' + (built || mine ? 'color:var(--teal)' : '') + '">' + (built ? 'built-in content' : '') + (built && mine ? ' + ' : '') + (mine ? 'your notes' : '') + (!built && !mine ? 'empty — add notes' : '') + '</div></div>';
  });
  html += '<div class="card" style="border:1px dashed var(--border2);display:flex;flex-direction:column;gap:6px;cursor:default">'
    + '<div class="ctit" style="color:var(--text2)">+ New page</div>'
    + '<input id="np_' + tid + '_' + sid + '" placeholder="e.g. INC-12345 tunnel flap" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 8px;font-size:13px;outline:none" onkeydown="if(event.key===\'Enter\')addPage(\'' + tid + '\',\'' + sid + '\')">'
    + '<button class="btn sm" onclick="addPage(\'' + tid + '\',\'' + sid + '\')">Create</button></div>';
  html += '</div>' + renderEditZone(tid + '/' + sid) + '</div>';
  return html;
}

function pgStub(route) {
  const { tech, sub, page, parts } = findRoute(route);
  return '<div class="ph"><div class="pt">' + (page ? page.label : esc(parts[parts.length - 1])) + '</div>'
    + '<div class="ps">' + (tech ? tech.label : '') + (sub ? ' &rarr; ' + sub.label : '') + '</div></div>'
    + (page && page.custom ? '<div class="content" style="padding-bottom:0"><button class="btn sm" onclick="delPage(\'' + route + '\')">&#x1F5D1; Delete this page</button></div>' : '')
    + '<div class="content" style="padding-bottom:0">' + (hasUserData(route) ? '' : co('t', '&#x1F4DD;', 'No built-in content', 'Click <strong>&#x270F; Edit</strong> (top right) to write notes and add links below — or use <strong>&#x2728; AI fill</strong> in the editor to draft them.')) + '</div>';
}
function pgNotFound(route) {
  return '<div class="ph"><div class="pt">Page not found</div><div class="ps">' + esc(route) + '</div></div><div class="content"><button class="btn" onclick="go(\'home\')">&larr; Home</button></div>';
}

// ── EDIT ZONE ────────────────────────────────────────────────
function renderEditZone(route) {
  const rk = rkOf(route);
  return '<div class="edit-zone" data-route="' + route + '" ondragover="event.preventDefault();this.classList.add(\'drop\')" ondragleave="this.classList.remove(\'drop\')" ondrop="dropTxt(event,\'' + route + '\',this)">'
    + '<h2>&#x1F4DD; Notes</h2>'
    + '<div class="ed-bar" onmousedown="if(event.target.tagName===\'BUTTON\')event.preventDefault()">'
    + edBtn('bold', '<b>B</b>', 'Bold (Ctrl+B)') + edBtn('italic', '<i>I</i>', 'Italic (Ctrl+I)')
    + edBtn('h3', 'H', 'Heading') + edBtn('ul', '&bull; List', 'Bullet list') + edBtn('ol', '1. List', 'Numbered list')
    + edBtn('indent', '&rarr;', 'Indent list item (Tab)') + edBtn('outdent', '&larr;', 'Outdent (Shift+Tab)')
    + '<span class="sep"></span>'
    + edBtn('code', '&lt;/&gt;', 'Inline code') + edBtn('pre', '{ }', 'Code block') + edBtn('quote', '&ldquo;', 'Quote') + edBtn('link', '&#x1F517;', 'Link')
    + '<span class="sep"></span>'
    + edBtn('undo', '&#x21B6;', 'Undo (Ctrl+Z)') + edBtn('clear', '&#x2716; fmt', 'Clear formatting')
    + '<span class="sep"></span>'
    + '<button onclick="pickTxt(\'' + route + '\')" title="Import .txt / .md / .log files into these notes (or drag &amp; drop files here)">&#x1F4C4; Import .txt</button>'
    + '<button class="ai-btn" onclick="aiFill(\'' + route + '\')" title="Let the AI draft additional notes for this page using its content as context">&#x2728; AI fill</button>'
    + '</div>'
    + '<div class="notes-pad" id="npad_' + rk + '" data-route="' + route + '" contenteditable="false" data-ph="No notes yet. Click ✏ Edit (top right) to write." '
    + 'oninput="onNoteInput(this)" onblur="flushSave()" onkeydown="padKey(event,this)" onpaste="padPaste(event)">' + getNotes(route) + '</div>'
    + '<div class="view-hint">Tip: drag &amp; drop .txt / .md files anywhere here to import them into this page.</div>'
    + '<div class="edit-hint">Drop .txt / .md files here to import · Saved automatically · Ctrl+S saves now · Tab / Shift+Tab indents lists · paste is converted to plain text</div>'
    + '<div id="aid_' + rk + '"></div>'
    + '<h2 style="margin-top:20px">&#x1F517; Links</h2>'
    + '<div class="link-list" id="ll_' + rk + '">' + linksHTML(route) + '</div>'
    + '<div class="add-link-form"><input id="li_u_' + rk + '" placeholder="https://..." style="flex:2" onkeydown="if(event.key===\'Enter\')addLink(\'' + route + '\')">'
    + '<input id="li_l_' + rk + '" placeholder="Label (optional)" style="flex:1" onkeydown="if(event.key===\'Enter\')addLink(\'' + route + '\')">'
    + '<button onclick="addLink(\'' + route + '\')">+ Add</button></div>'
    + '</div>';
}
function edBtn(cmd, label, title) { return '<button onclick="edCmd(\'' + cmd + '\',this)" title="' + title + '">' + label + '</button>' }
function linksHTML(route) {
  const links = getLinks(route);
  if (!links.length) return '<div class="view-hint">No links yet.</div>';
  return links.map((l, i) => '<div class="link-item"><a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.lbl || l.url) + '</a>'
    + (l.lbl ? '<span class="lbl">' + esc(l.url) + '</span>' : '')
    + '<button class="link-del" onclick="rmLink(\'' + route + '\',' + i + ')" title="Remove">&#x2715;</button></div>').join('');
}
function safeUrl(u) { u = String(u || '').trim(); if (/^(javascript|data|vbscript):/i.test(u)) return '#'; if (!/^[a-z]+:/i.test(u)) u = 'https://' + u; return u }

function padOf(btn) { return btn.closest('.edit-zone').querySelector('.notes-pad') }
function edCmd(cmd, btn) {
  const pad = padOf(btn);
  if (!EDIT) toggleEdit();
  pad.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount || !pad.contains(sel.anchorNode)) { const r = document.createRange(); r.selectNodeContents(pad); r.collapse(false); sel.removeAllRanges(); sel.addRange(r) }
  switch (cmd) {
    case 'bold': case 'italic': case 'undo': case 'indent': case 'outdent': document.execCommand(cmd); break;
    case 'ul': document.execCommand('insertUnorderedList'); break;
    case 'ol': document.execCommand('insertOrderedList'); break;
    case 'h3': document.execCommand('formatBlock', false, blockIs(pad, 'H3') ? 'div' : 'h3'); break;
    case 'pre': document.execCommand('formatBlock', false, blockIs(pad, 'PRE') ? 'div' : 'pre'); break;
    case 'quote': document.execCommand('formatBlock', false, blockIs(pad, 'BLOCKQUOTE') ? 'div' : 'blockquote'); break;
    case 'code': {
      const t = sel.toString();
      if (t) document.execCommand('insertHTML', false, '<code>' + esc(t) + '</code>&#8203;');
      break;
    }
    case 'link': {
      const u = prompt('Link URL:', 'https://');
      if (u && u !== 'https://') {
        if (sel.toString()) document.execCommand('createLink', false, safeUrl(u));
        else document.execCommand('insertHTML', false, '<a href="' + esc(safeUrl(u)) + '" target="_blank">' + esc(u) + '</a>&nbsp;');
      }
      break;
    }
    case 'clear': document.execCommand('removeFormat'); document.execCommand('formatBlock', false, 'div'); break;
  }
  onNoteInput(pad);
}
function blockIs(pad, tagName) {
  let n = window.getSelection().anchorNode;
  while (n && n !== pad) { if (n.nodeName === tagName) return true; n = n.parentNode }
  return false;
}
function padKey(e, pad) {
  if (!EDIT) return;
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); flushSave(); return }
  if (e.key === 'Tab') {
    if (blockIs(pad, 'LI')) { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent') }
    else if (blockIs(pad, 'PRE')) { e.preventDefault(); document.execCommand('insertText', false, '  ') }
  }
  if (e.key === 'Escape') { pad.blur(); toggleEdit() }
}
function padPaste(e) {
  if (!EDIT) return;
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, t);
}
function onNoteInput(el) {
  pendingPad = el;
  clearTimeout(saveTimer); setSaveInd('saving');
  saveTimer = setTimeout(flushSave, 600);
}
function flushSave() {
  clearTimeout(saveTimer);
  if (!pendingPad) return;
  const el = pendingPad; pendingPad = null;
  let html = el.innerHTML.trim();
  if (htmlToText(html).trim() === '' && !/<(img|pre|li)/i.test(html)) html = '';
  if (stSet(rkOf(el.dataset.route) + '_notes', html)) setSaveInd('saved');
  buildSidebar();
}
function addLink(route) {
  const rk = rkOf(route);
  const u = document.getElementById('li_u_' + rk), l = document.getElementById('li_l_' + rk);
  if (!u || !u.value.trim()) { u && u.focus(); return }
  const links = getLinks(route);
  links.push({ url: safeUrl(u.value), lbl: l ? l.value.trim() : '' });
  stSet(rk + '_links', links); u.value = ''; if (l) l.value = '';
  refreshLinks(route); u.focus(); setSaveInd('saved'); buildSidebar();
}
function rmLink(route, idx) {
  const links = getLinks(route).filter((_, i) => i !== idx);
  stSet(rkOf(route) + '_links', links); refreshLinks(route); buildSidebar();
}
function refreshLinks(route) { const ll = document.getElementById('ll_' + rkOf(route)); if (ll) ll.innerHTML = linksHTML(route) }
function setSaveInd(s) {
  const el = document.getElementById('save-ind'); if (!el) return;
  el.textContent = s === 'saving' ? 'saving…' : s === 'saved' ? 'saved ✓' : ''; el.className = s;
  if (s === 'saved') setTimeout(() => { if (el.className === 'saved') { el.textContent = ''; el.className = '' } }, 2000);
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ── EDIT MODE ────────────────────────────────────────────────
// Single source of truth: only the inline onclick on #edit-btn calls this (the old main.js
// also attached a second click listener, so every click toggled twice and Edit never turned on).
function toggleEdit() {
  if (EDIT) flushSave();
  EDIT = !EDIT;
  const btn = document.getElementById('edit-btn');
  btn.innerHTML = EDIT ? '&#x2714; Done' : '&#x270F; Edit';
  btn.classList.toggle('active', EDIT);
  applyEditMode();
  if (EDIT) { const p = document.querySelector('.notes-pad'); if (p && !['home', 'mm', 'ai'].includes(CUR)) p.focus() }
}
function applyEditMode() {
  document.body.classList.toggle('edit-mode', EDIT);
  document.querySelectorAll('.notes-pad').forEach(el => { el.contentEditable = EDIT ? 'true' : 'false' });
  document.querySelectorAll('.notes-pad').forEach(el => el.dataset.ph = EDIT ? 'Start typing your notes here…' : 'No notes yet. Click ✏ Edit (top right) to write.');
}

// ── AI FILL (draft extra notes for a page; implemented in ai.js) ──
function aiFill(route) {
  if (!window.AI) { toast('AI module is still loading'); return }
  window.AI.fill(route, document.getElementById('aid_' + rkOf(route)));
}
// Append HTML to a page's notes (used by the AI module).
function appendToNotes(route, html) {
  flushSave();
  const cur = getNotes(route);
  stSet(rkOf(route) + '_notes', (cur ? cur + '<div><br></div>' : '') + html);
  const pad = document.getElementById('npad_' + rkOf(route));
  if (pad) pad.innerHTML = getNotes(route);
  buildSidebar(); setSaveInd('saved');
}
// Plain-text snapshot of a page (built-in content + notes + links) for AI context.
function pageText(route) {
  let txt = '';
  if (RENDERERS[route]) txt += htmlToText(RENDERERS[route]()).replace(/\bcopy\b/g, '').replace(/\n{3,}/g, '\n\n');
  const n = htmlToText(getNotes(route)).trim();
  if (n) txt += '\n\n## My notes\n' + n;
  const links = getLinks(route);
  if (links.length) txt += '\n\n## My links\n' + links.map(l => '- ' + (l.lbl ? l.lbl + ': ' : '') + l.url).join('\n');
  return txt.trim();
}

// ── SEARCH (built-in index + every page title + built-in page text + your notes) ──
let SEARCH_DOCS = null;
function buildSearchDocs() {
  const docs = IDX.map(r => ({ p: r.p, t: r.t, hay: (r.t + ' ' + r.k + ' ' + r.v).toLowerCase(), v: r.v, kind: 'topic' }));
  allPages().forEach(({ route, tech, sub, page }) => {
    docs.push({ p: route, t: page.label + ' — ' + sub.label, hay: (tech.label + ' ' + sub.label + ' ' + page.label).toLowerCase(), v: tech.label + ' › ' + sub.label, kind: 'page' });
    if (RENDERERS[route]) { const txt = htmlToText(RENDERERS[route]()); docs.push({ p: route, t: page.label + ' (content)', hay: txt.toLowerCase(), raw: txt, kind: 'text' }) }
  });
  return docs;
}
function noteDocs() {
  const out = [];
  TREE.forEach(t => {
    const routes = [t.id];
    t.subs.forEach(s => { routes.push(t.id + '/' + s.id); s.pages.forEach(p => routes.push(t.id + '/' + s.id + '/' + p.id)) });
    routes.forEach(r => {
      const txt = htmlToText(getNotes(r)) + ' ' + getLinks(r).map(l => (l.lbl || '') + ' ' + l.url).join(' ');
      if (txt.trim()) out.push({ p: r, t: routeLabel(r) + ' (your notes)', hay: txt.toLowerCase(), raw: txt, kind: 'note' });
    });
  });
  return out;
}
function openSearch() { const si = document.getElementById('si'); document.getElementById('so').classList.add('open'); si.focus(); doSrch(si.value) }
function closeSrch(e) {
  if (e && e.target !== document.getElementById('so')) return; // click inside the box must not close it
  document.getElementById('so').classList.remove('open'); document.getElementById('si').value = '';
}
function srchKey(e) {
  const items = [...document.querySelectorAll('.sr3')];
  let i = items.findIndex(x => x.classList.contains('sel'));
  if (e.key === 'Escape') closeSrch();
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); if (!items.length) return;
    if (i >= 0) items[i].classList.remove('sel');
    i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[i].classList.add('sel'); items[i].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && items.length) (items[i] || items[0]).click();
}
function doSrch(q) {
  const Q = q.toLowerCase().trim(); const el = document.getElementById('sr');
  if (!Q) { el.innerHTML = '<div class="se">Search page names, commands, built-in content and your notes</div>'; return }
  if (!SEARCH_DOCS) SEARCH_DOCS = buildSearchDocs();
  const words = Q.split(/\s+/);
  const seen = new Set(), res = [];
  [...SEARCH_DOCS, ...noteDocs()].forEach(d => {
    if (!words.every(w => d.hay.includes(w))) return;
    const key = d.p + '|' + d.kind; if (seen.has(key)) return; seen.add(key);
    let snip = d.v || '';
    if (d.raw) { const i = d.raw.toLowerCase().indexOf(words[0]); snip = (i > 30 ? '…' : '') + d.raw.slice(Math.max(0, i - 30), i + 90).replace(/\s+/g, ' ') }
    const score = (d.t.toLowerCase().includes(Q) ? 0 : 1) + ({ topic: 0, page: 0, note: 1, text: 2 }[d.kind]);
    res.push({ d, snip, score });
  });
  res.sort((a, b) => a.score - b.score);
  if (!res.length) { el.innerHTML = '<div class="se">No results</div>'; return }
  el.innerHTML = res.slice(0, 15).map(({ d, snip }) => '<div class="sr3" onclick="closeSrch();go(\'' + d.p + '\')"><div class="srl">' + esc(d.p) + '</div><div class="srp">' + hl(esc(d.t), Q) + '</div><div class="srv">' + hl(esc(snip), words[0]) + '</div></div>').join('');
}
function hl(t, q) { const i = t.toLowerCase().indexOf(q.toLowerCase()); if (i < 0 || !q) return t; return t.slice(0, i) + '<mark>' + t.slice(i, i + q.length) + '</mark>' + t.slice(i + q.length) }
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch() }
  else if (e.key === 'Escape' && document.getElementById('so').classList.contains('open')) closeSrch();
});

// ── MIND MAP (generated from TREE + which pages have content / notes) ──
function pgMM() {
  return '<div class="ph"><div class="pt">Knowledge Mind Map</div><div class="ps">Generated from your technologies, topics and pages &middot; drag to pan &middot; scroll / pinch to zoom &middot; click a node to open it</div></div>'
    + '<div class="mm-tools"><span>Technology</span><select id="mm-f" onchange="initMM(\'mm-svg\',this.value||null)"><option value="">All</option>'
    + TREE.map(t => '<option value="' + t.id + '">' + t.label + '</option>').join('') + '</select>'
    + '<label><input type="checkbox" id="mm-only" onchange="initMM(\'mm-svg\',document.getElementById(\'mm-f\').value||null)"> only pages with content</label>'
    + '<div class="mm-legend"><span><i style="background:var(--teal)"></i>built-in</span><span><i style="background:var(--amber)"></i>your notes</span><span><i style="border:1px solid var(--text3)"></i>empty</span></div></div>'
    + '<div class="mm-wrap"><svg id="mm-svg" class="mm-svg"></svg>' + zoomBtns('mm-svg') + '</div>';
}
function zoomBtns(id) {
  return '<div class="mm-zoom">'
    + '<button onclick="mmFull(\'' + id + '\',this)" title="Expand to full window (Esc to close)">&#x26F6;</button>'
    + '<button onclick="mmZoom(\'' + id + '\',0.8)" title="Zoom in">+</button>'
    + '<button onclick="mmZoom(\'' + id + '\',1.25)" title="Zoom out">&minus;</button>'
    + '<button onclick="mmZoom(\'' + id + '\',0)" title="Reset view">&#x27F2;</button></div>';
}
// Expand a map over the whole window (and back).
function mmFull(id, btn) {
  const wrap = document.getElementById(id).closest('.mm-wrap');
  const on = !wrap.classList.contains('full');
  wrap.classList.toggle('full', on);
  document.body.classList.toggle('mm-full-open', on);
  const b = btn || wrap.querySelector('.mm-zoom button');
  b.innerHTML = on ? '&#x2715;' : '&#x26F6;';
  b.title = on ? 'Close full window (Esc)' : 'Expand to full window (Esc to close)';
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const w = document.querySelector('.mm-wrap.full');
  if (w) mmFull(w.querySelector('svg').id);
});
function mkEl(tagName, attrs) { const e = document.createElementNS('http://www.w3.org/2000/svg', tagName); for (const k in attrs || {}) e.setAttribute(k, attrs[k]); return e }
const MM = {}; // per-svg view state

function initMM(svgId, techFilter) {
  const svg = document.getElementById(svgId); if (!svg) return;
  const onlyFilled = svgId === 'mm-svg' && document.getElementById('mm-only') && document.getElementById('mm-only').checked;
  svg.innerHTML = '';
  const gEdges = mkEl('g'), gNodes = mkEl('g'); svg.appendChild(gEdges); svg.appendChild(gNodes);

  // Build the tree that will be drawn
  const techs = TREE.filter(t => !techFilter || t.id === techFilter).map(t => ({
    t, subs: t.subs.map(s => ({ s, pages: s.pages.filter(p => !onlyFilled || pageHasContent(t.id + '/' + s.id + '/' + p.id)) }))
      .filter(x => !onlyFilled || x.pages.length)
  })).filter(x => !onlyFilled || x.subs.length);
  const leaves = x => Math.max(1, x.pages.length);
  const totalLeaves = techs.reduce((a, t) => a + t.subs.reduce((b, s) => b + leaves(s), 0), 0) || 1;

  // Radial layout: angle range of each node is proportional to its number of pages
  const R1 = techFilter ? 0 : 150, R2 = techFilter ? 150 : 300, R3 = techFilter ? 290 : 440;
  const root = techFilter ? null : { x: 0, y: 0 };
  if (root) node(gNodes, 0, 0, 'NET_HUB', '#00bfa0', 'root', () => go('home'));
  let a0 = -Math.PI / 2;
  const span = Math.PI * 2;
  techs.forEach(({ t, subs }) => {
    const tl = subs.reduce((b, s) => b + leaves(s), 0) || 1;
    const ta = span * tl / totalLeaves, tmid = a0 + ta / 2;
    const tp = techFilter ? { x: 0, y: 0 } : { x: R1 * Math.cos(tmid), y: R1 * Math.sin(tmid) };
    if (root) edge(gEdges, root, tp, t.col, 0.45, 2);
    let sa = a0;
    subs.forEach(({ s, pages }) => {
      const sl = leaves({ pages }), sAng = ta * sl / tl, smid = sa + sAng / 2;
      const sp = { x: R2 * Math.cos(smid), y: R2 * Math.sin(smid) };
      edge(gEdges, tp, sp, t.col, 0.35, 1.5);
      pages.forEach((p, i) => {
        const pa = sa + sAng * (i + 0.5) / pages.length;
        const pp = { x: R3 * Math.cos(pa), y: R3 * Math.sin(pa) };
        const route = t.id + '/' + s.id + '/' + p.id;
        const built = !!RENDERERS[route], mine = hasUserData(route);
        edge(gEdges, sp, pp, t.col, built || mine ? 0.35 : 0.12, 1);
        leaf(gNodes, pp, pa, p.label, built ? '#00bfa0' : mine ? '#f0980a' : null, t.col, () => go(route));
      });
      node(gNodes, sp.x, sp.y, s.label, t.col, 'sub', () => go(t.id + '/' + s.id));
      sa += sAng;
    });
    node(gNodes, tp.x, tp.y, t.label, t.col, 'tech', () => go(t.id));
    a0 += ta;
  });

  // Fit view
  // Fit the view to what was actually drawn (labels included)
  let bb; try { bb = svg.getBBox() } catch { bb = null }
  if (!bb || !bb.width) { const e = R3 + 115; bb = { x: -e, y: -e, width: 2 * e, height: 2 * e } }
  const m = 16;
  MM[svgId] = { home: { x: bb.x - m, y: bb.y - m, w: bb.width + 2 * m, h: bb.height + 2 * m } };
  MM[svgId].vb = { ...MM[svgId].home };
  setVB(svg, MM[svgId].vb);
  if (!svg.dataset.bound) { bindPanZoom(svg); svg.dataset.bound = '1' }
}
function edge(g, a, b, col, op, w) { g.appendChild(mkEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: col, 'stroke-width': w, opacity: op })) }
function node(g, x, y, lbl, col, kind, cb) {
  const el = mkEl('g', { class: 'nd' });
  const fs = kind === 'root' ? 15 : kind === 'tech' ? 13.5 : 12;
  const w = Math.max(lbl.length * fs * 0.56 + 22, 60), h = kind === 'sub' ? 24 : 30;
  el.appendChild(mkEl('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 6, fill: col, 'fill-opacity': kind === 'sub' ? 0.15 : kind === 'root' ? 1 : 0.85, stroke: col, 'stroke-width': 1 }));
  const t = mkEl('text', { x, y: y + fs * 0.35, 'text-anchor': 'middle', fill: kind === 'sub' ? col : '#000', 'font-size': fs, 'font-family': 'Rajdhani,sans-serif', 'font-weight': 700 });
  t.textContent = lbl; el.appendChild(t);
  const ti = mkEl('title'); ti.textContent = 'Open ' + lbl; el.appendChild(ti);
  el.addEventListener('click', e => { if (!el.ownerSVGElement.dataset.moved) cb() });
  g.appendChild(el);
}
function leaf(g, p, ang, lbl, fillCol, col, cb) {
  const el = mkEl('g', { class: 'nd' });
  el.appendChild(mkEl('circle', { cx: p.x, cy: p.y, r: 5, fill: fillCol || '#07090c', stroke: fillCol || col, 'stroke-width': 1.2 }));
  const right = Math.cos(ang) >= 0;
  const t = mkEl('text', { x: p.x + (right ? 9 : -9), y: p.y + 4, 'text-anchor': right ? 'start' : 'end', fill: fillCol ? '#c4d4e0' : '#607a90', 'font-size': 11.5, 'font-family': 'Source Sans 3,sans-serif' });
  t.textContent = lbl; el.appendChild(t);
  el.addEventListener('click', () => { if (!el.ownerSVGElement.dataset.moved) cb() });
  g.appendChild(el);
}
function setVB(svg, vb) { svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h) }
function mmZoom(id, f) {
  const svg = document.getElementById(id), st = MM[id]; if (!svg || !st) return;
  if (!f) st.vb = { ...st.home };
  else { const cx = st.vb.x + st.vb.w / 2, cy = st.vb.y + st.vb.h / 2; st.vb.w *= f; st.vb.h *= f; st.vb.x = cx - st.vb.w / 2; st.vb.y = cy - st.vb.h / 2 }
  setVB(svg, st.vb);
}
function bindPanZoom(svg) {
  const pts = new Map(); let start = null;
  const st = () => MM[svg.id];
  const scale = () => Math.max(st().vb.w / svg.clientWidth, st().vb.h / svg.clientHeight); // viewBox units per pixel (preserveAspectRatio=meet)
  svg.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    start = { x: e.clientX, y: e.clientY, vb: { ...st().vb }, dist: pinchDist() };
    delete svg.dataset.moved;
  });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !start) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) { svg.dataset.moved = '1'; svg.classList.add('drag'); if (!svg.hasPointerCapture(e.pointerId)) svg.setPointerCapture(e.pointerId) }
    if (!svg.dataset.moved) return;
    const vb = st().vb;
    if (pts.size >= 2 && start.dist) {
      const f = start.dist / pinchDist();
      vb.w = start.vb.w * f; vb.h = start.vb.h * f;
      vb.x = start.vb.x + (start.vb.w - vb.w) / 2; vb.y = start.vb.y + (start.vb.h - vb.h) / 2;
    } else {
      const s = Math.max(start.vb.w / svg.clientWidth, start.vb.h / svg.clientHeight);
      vb.x = start.vb.x - dx * s; vb.y = start.vb.y - dy * s;
    }
    setVB(svg, vb);
  });
  const end = e => { pts.delete(e.pointerId); svg.classList.remove('drag'); start = pts.size ? { ...start, vb: { ...st().vb }, dist: pinchDist() } : null; setTimeout(() => delete svg.dataset.moved, 0) };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const vb = st().vb, f = e.deltaY > 0 ? 1.12 : 0.89, r = svg.getBoundingClientRect(), s = scale();
    const ox = (svg.clientWidth - vb.w / s) / 2, oy = (svg.clientHeight - vb.h / s) / 2; // letterbox offset
    const mx = vb.x + (e.clientX - r.left - ox) * s, my = vb.y + (e.clientY - r.top - oy) * s;
    vb.x = mx - (mx - vb.x) * f; vb.y = my - (my - vb.y) * f; vb.w *= f; vb.h *= f;
    setVB(svg, vb);
  }, { passive: false });
  function pinchDist() { const a = [...pts.values()]; return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }
}

// ── BACKUP: export / import all notes, links and AI chat (never the API key) ──
function exportData() {
  flushSave();
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('nhub_') && k !== 'nhub_ai_key') data[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify({ app: 'net-hub', version: 1, exported: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'net-hub-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Exported ' + Object.keys(data).length + ' items');
}
function importData(input) {
  const f = input.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const j = JSON.parse(rd.result); const data = j.data || j; let n = 0;
      for (const k in data) if (k.startsWith('nhub_') && k !== 'nhub_ai_key') { localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k])); n++ }
      toast('Imported ' + n + ' items'); render(CUR);
    } catch (e) { alert('Import failed: ' + e.message) }
    input.value = '';
  };
  rd.readAsText(f);
}

// ── CUSTOM PAGES (stored in nhub_custom_pages, merged into TREE) ──
function loadCustomPages() {
  (stGet('custom_pages') || []).forEach(c => {
    const { sub } = findRoute(c.tid + '/' + c.sid);
    if (sub && !sub.pages.some(p => p.id === c.id)) sub.pages.push({ id: c.id, label: c.label, custom: true });
  });
}
function addPage(tid, sid) {
  const inp = document.getElementById('np_' + tid + '_' + sid);
  const label = inp.value.trim(); if (!label) { inp.focus(); return }
  const { sub } = findRoute(tid + '/' + sid);
  let id = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
  let base = id, n = 2; while (sub.pages.some(p => p.id === id)) id = base + '-' + n++;
  const list = stGet('custom_pages') || []; list.push({ tid, sid, id, label }); stSet('custom_pages', list);
  sub.pages.push({ id, label, custom: true }); SEARCH_DOCS = null;
  go(tid + '/' + sid + '/' + id);
  if (!EDIT) toggleEdit();
}
function delPage(route) {
  const { sub, page, parts } = findRoute(route);
  if (!page || !page.custom) return;
  if (!confirm('Delete page "' + page.label + '" including its notes and links?')) return;
  stSet('custom_pages', (stGet('custom_pages') || []).filter(c => !(c.tid === parts[0] && c.sid === parts[1] && c.id === parts[2])));
  try { localStorage.removeItem('nhub_' + rkOf(route) + '_notes'); localStorage.removeItem('nhub_' + rkOf(route) + '_links') } catch {}
  sub.pages.splice(sub.pages.indexOf(page), 1); SEARCH_DOCS = null;
  go(parts[0] + '/' + parts[1]);
}

// ── TEXT FILE IMPORT (.txt / .md / .log / .conf → formatted notes) ──
// Light Markdown: ``` code fences, # headings, - / 1. lists, `inline`, **bold**, links.
// Lines that look like CLI commands/output (indented, prompts like "#", ">", "$") become code blocks.
function mdToHtml(src) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  let out = '', i = 0;
  const inl = t => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  const isCli = l => /^(\s{4,}|\t)\S/.test(l) || /^[\w.\-()\/:@\[\]~]+[#>$]\s?\S/.test(l) || /^\$\s\S/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*```/.test(l)) { const buf = []; i++; while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]); i++; out += '<pre>' + esc(buf.join('\n')) + '</pre>'; continue }
    if (isCli(l)) { const buf = []; while (i < lines.length && lines[i].trim() && isCli(lines[i])) buf.push(lines[i++]); out += '<pre>' + esc(buf.join('\n')) + '</pre>'; continue }
    let m;
    if ((m = l.match(/^\s*#{1,6}\s+(.*)/))) { out += '<h3>' + inl(m[1]) + '</h3>'; i++; continue }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d/.test(l); const items = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ''));
      out += (ordered ? '<ol>' : '<ul>') + items.map(x => '<li>' + inl(x) + '</li>').join('') + (ordered ? '</ol>' : '</ul>'); continue;
    }
    if (/^\s*>\s?/.test(l) && !isCli(l)) { out += '<blockquote>' + inl(l.replace(/^\s*>\s?/, '')) + '</blockquote>'; i++; continue }
    out += l.trim() ? '<div>' + inl(l) + '</div>' : '<div><br></div>'; i++;
  }
  return out;
}
let txtTarget = null;
function pickTxt(route) {
  txtTarget = route;
  let f = document.getElementById('txt-file');
  if (!f) { f = document.createElement('input'); f.type = 'file'; f.id = 'txt-file'; f.multiple = true; f.accept = '.txt,.md,.log,.conf,.cfg,.text,text/*'; f.style.display = 'none'; f.onchange = () => { importTxtFiles([...f.files], txtTarget); f.value = '' }; document.body.appendChild(f) }
  f.click();
}
function dropTxt(e, route, zone) {
  e.preventDefault(); zone.classList.remove('drop');
  const files = [...(e.dataTransfer.files || [])];
  if (files.length) importTxtFiles(files, route);
}
async function importTxtFiles(files, route) {
  let n = 0;
  for (const f of files) {
    if (f.size > 2e6) { toast('Skipped ' + f.name + ' (over 2 MB)'); continue }
    const txt = await f.text();
    if (/\u0000/.test(txt)) { toast('Skipped ' + f.name + ' (not a text file)'); continue }
    appendToNotes(route, '<h3>&#x1F4C4; ' + esc(f.name) + '</h3>' + mdToHtml(txt)); n++;
  }
  if (n) { toast('Imported ' + n + ' file' + (n > 1 ? 's' : '') + ' into ' + routeLabel(route)); SEARCH_DOCS = null }
}

// ── INIT ──────────────────────────────────────────────────────
loadCustomPages();
OPEN_T.add('cisco'); OPEN_T.add('f5');
OPEN_S.add('cisco/vpn'); OPEN_S.add('f5/ltm');
render(decodeURIComponent(location.hash.slice(1)) || 'home');
