// commands.js — command registry, cheat sheets and the case-page template.
//
// A command is written ONCE, in the page file where it was used:
//
//   defCmds('cisco/asa/case-multicontext', [
//     { cmd: 'show nameif', d: 'interfaces of this context', tags: ['cisco-asa'],
//       k: 'which interfaces does this context have', grp: 'context', lang: 'ASA' },
//   ]);
//
// From there it appears automatically on the page (cmdBlock / caseRender), in the
// per-tag cheat sheets, in Ctrl+K search and (optionally) in the mind map.
// Use placeholders (<peer-ip>, <self-ip>, <rd>, <acl>) — never real names or addresses.

const CMDS = [];

function defCmds(page, list) {
  list.forEach(c => CMDS.push(Object.assign({ page, tags: [], k: '', grp: '', lang: '' }, c)));
}
function cmdsFor(page, grp) { return CMDS.filter(c => c.page === page && (!grp || c.grp === grp)) }

// Code block in the usual look, generated from the registry: "command   # description".
// cc = comment character ('#' default, '!' for Cisco config). Multi-line commands (heredoc,
// config snippets) get their description as a comment line above them.
function cmdBlock(page, grp, lang, cc) {
  const list = cmdsFor(page, grp);
  if (!list.length) return '';
  cc = cc || '#';
  const single = list.filter(c => !c.cmd.includes('\n'));
  const w = Math.min(64, Math.max(0, ...single.map(c => c.cmd.length)));
  const code = list.map(c => c.cmd.includes('\n')
    ? (c.d ? cc + ' ' + c.d + '\n' : '') + c.cmd
    : (c.d ? (c.cmd.length >= w + 2 ? c.cmd + '  ' : c.cmd.padEnd(w + 2)) + cc + ' ' + c.d : c.cmd)).join('\n');
  return cb(lang || list[0].lang || 'cli', code);
}

// ── Tag metadata: label + family (= sub-topic in "Cheat sheets") ──
const CMD_FAMILIES = { cisco: 'Cisco', vpn: 'VPN / IPsec', f5: 'F5 BIG-IP', paloalto: 'Palo Alto', fortinet: 'Fortinet', tools: 'Tools', other: 'Other' };
const TAG_META = {
  'cisco-asa': { l: 'Cisco ASA', f: 'cisco' },
  'asa-multicontext': { l: 'ASA multi-context', f: 'cisco' },
  'cisco-iosxe': { l: 'Cisco IOS XE', f: 'cisco' },
  'cisco-iosxr': { l: 'Cisco IOS XR', f: 'cisco' },
  'aci-moquery': { l: 'ACI moquery', f: 'cisco' },
  'nxos': { l: 'Nexus / NX-OS', f: 'cisco' },
  'ipsec': { l: 'IPsec / IKE', f: 'vpn' },
  'f5': { l: 'F5 general', f: 'f5' },
  'f5-cve': { l: 'F5 security / CVE', f: 'f5' },
  'palo-alto': { l: 'Palo Alto', f: 'paloalto' },
  'fortigate': { l: 'FortiGate', f: 'fortinet' },
  'linux': { l: 'Linux / bash', f: 'tools' },
  'tcpdump': { l: 'tcpdump', f: 'tools' },
  'edu-example': { l: 'Edu example (placeholder)', f: 'other' },
};
const tagSlug = t => String(t).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
function tagMeta(t) { return TAG_META[t] || { l: t, f: 'other' } }
function cheatRoute(t) { return 'cheat/' + tagMeta(t).f + '/' + tagSlug(t) }

// ── Command table (cheat sheets and the Commands section of case pages) ──
function cmdRow(c, showSrc) {
  const hay = (c.cmd + ' ' + c.d + ' ' + c.k + ' ' + c.tags.join(' ')).toLowerCase();
  return '<tr class="cmdr" data-s="' + esc(hay) + '">'
    + '<td class="cmdc"><code>' + esc(c.cmd) + '</code></td>'
    + '<td class="cmdb"><button class="cp" onclick="cpCmd(this)" title="Copy command">copy</button></td>'
    + '<td class="cmdd">' + esc(c.d) + '</td>'
    + (showSrc ? '<td class="cmds"><a href="#' + c.page + '" title="Source page">&#x2197; ' + esc(routeLabelShort(c.page)) + '</a></td>' : '')
    + '</tr>';
}
function cmdTable(list, opts) {
  opts = opts || {};
  if (!list.length) return '<p class="view-hint">No commands yet.</p>';
  let rows = '', last = null;
  list.forEach(c => {
    const g = opts.groupBy === 'page' ? c.page : opts.groupBy === 'grp' ? c.grp : null;
    if (g !== null && g !== last) {
      const title = opts.groupBy === 'page' ? routeLabelShort(c.page) : ((opts.groupTitles || {})[g] || g || 'Commands');
      rows += '<tr class="cmdg"><td colspan="' + (opts.showSrc ? 4 : 3) + '">' + esc(title) + '</td></tr>';
      last = g;
    }
    rows += cmdRow(c, opts.showSrc);
  });
  return '<div class="tw"><table class="cmdt">' + rows + '</table></div>';
}
function cpCmd(btn) {
  const t = btn.closest('tr').querySelector('.cmdc code').textContent;
  const done = () => { btn.textContent = '✓'; btn.classList.add('ok'); setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('ok') }, 1200) };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => fallbackCopy(t, done));
  else fallbackCopy(t, done);
}
function fallbackCopy(t, done) {
  const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done() } catch (e) { } ta.remove();
}
function cmdFilter(inp) {
  const words = inp.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const tb = inp.closest('.content').querySelector('table.cmdt'); if (!tb) return;
  let n = 0, group = null, groupHas = false;
  const flushGroup = () => { if (group) group.style.display = groupHas ? '' : 'none' };
  [...tb.rows].forEach(r => {
    if (r.classList.contains('cmdg')) { flushGroup(); group = r; groupHas = false; return }
    const ok = words.every(w => r.dataset.s.includes(w));
    r.style.display = ok ? '' : 'none'; if (ok) { n++; groupHas = true }
  });
  flushGroup();
  const cnt = inp.closest('.content').querySelector('.cmd-count'); if (cnt) cnt.textContent = n + ' command' + (n === 1 ? '' : 's');
}
function routeLabelShort(route) {
  const p = route.split('/'); const t = TREE.find(x => x.id === p[0]);
  const s = t && t.subs.find(x => x.id === p[1]); const pg = s && s.pages.find(x => x.id === p[2]);
  return pg ? pg.label : route;
}

// ── Cheat sheets: built from the tags in the registry (called once by app.js before the first render) ──
function buildCheatTree() {
  // safe to call again (e.g. after Edu topic files added commands): rebuild from scratch
  const old = TREE.findIndex(t => t.id === 'cheat');
  if (old >= 0) TREE.splice(old, 1);
  Object.keys(RENDERERS).filter(k => k.startsWith('cheat/')).forEach(k => delete RENDERERS[k]);
  const tags = [...new Set(CMDS.flatMap(c => c.tags))].sort();
  const fams = {};
  tags.forEach(t => { const f = tagMeta(t).f; (fams[f] = fams[f] || []).push(t) });
  const subs = [{ id: 'all', label: 'All', pages: [{ id: 'all', label: 'All commands' }] }];
  Object.keys(CMD_FAMILIES).filter(f => fams[f]).forEach(f => {
    subs.push({ id: f, label: CMD_FAMILIES[f], pages: fams[f].map(t => ({ id: tagSlug(t), label: tagMeta(t).l })) });
    fams[f].forEach(t => { RENDERERS[cheatRoute(t)] = () => pgCheat(t) });
  });
  RENDERERS['cheat/all/all'] = () => pgCheat(null);
  TREE.push({ id: 'cheat', label: 'Cheat sheets', col: '#c4d4e0', subs });
}
function pgCheat(t) {
  const list = (t ? CMDS.filter(c => c.tags.includes(t)) : CMDS.slice())
    .sort((a, b) => a.page.localeCompare(b.page));
  const title = t ? tagMeta(t).l : 'All commands';
  return '<div class="ph"><div class="pt">Cheat sheet &mdash; ' + esc(title) + '</div>'
    + '<div class="ps">Generated from the command registry &middot; every command links back to the page where it was used</div>'
    + '<div class="tags">' + tag('tg', t ? esc(t) : 'all tags') + '</div></div>'
    + '<div class="content">'
    + '<div class="cmd-bar"><input class="cmd-filter" placeholder="Filter: command, description, how you remember the problem…" oninput="cmdFilter(this)" autocomplete="off">'
    + '<span class="cmd-count">' + list.length + ' command' + (list.length === 1 ? '' : 's') + '</span></div>'
    + cmdTable(list, { groupBy: 'page', showSrc: true })
    + '</div>';
}

// ── Case page template ──
// caseRender({ page, title, subtitle, tags:[[cls,txt]], summary:[[k,v]],
//   problem, environment, investigation:[{ title, body, dead }], evidence,
//   commandGroups:{ grp: 'title' }, rootCause:[{ text, src:'documented'|'derived' }],
//   resolution, rollback, lessons:[...] })
function caseRender(o) {
  const sec = (h, body) => body ? '<h2>' + h + '</h2>' + body : '';
  const cmds = cmdsFor(o.page);
  const order = Object.keys(o.commandGroups || {});
  cmds.sort((a, b) => (order.indexOf(a.grp) + 1 || 99) - (order.indexOf(b.grp) + 1 || 99));
  return '<div class="ph"><div class="pt">' + o.title + '</div>'
    + (o.subtitle ? '<div class="ps">' + o.subtitle + '</div>' : '')
    + '<div class="tags">' + (o.tags || []).map(([c, t]) => tag(c, t)).join('') + tag('tr', 'Case') + '</div></div>'
    + '<div class="content">'
    + (o.summary ? tbl(['Summary', ''], o.summary) : '')
    + sec('Problem', o.problem)
    + sec('Environment <span class="case-note">(anonymised)</span>', o.environment)
    + sec('Investigation', o.investigation ? '<div class="flow">' + o.investigation.map((s, i) =>
      '<div class="fs' + (s.dead ? ' dead' : '') + '"><div class="fsn">' + (i + 1) + '</div><div class="fsb"><div class="fst">' + s.title
      + (s.dead ? ' <span class="badge b-dead">dead end</span>' : '') + '</div>' + s.body + '</div></div>').join('') + '</div>' : '')
    + (o.evidence || '')
    + sec('Commands', cmds.length ? '<div class="cmd-bar"><input class="cmd-filter" placeholder="Filter commands…" oninput="cmdFilter(this)" autocomplete="off"><span class="cmd-count">' + cmds.length + ' commands</span></div>'
      + cmdTable(cmds, { groupBy: 'grp', groupTitles: o.commandGroups }) + '<p class="view-hint">Also in the cheat sheets: ' + [...new Set(cmds.flatMap(c => c.tags))].map(t => '<a href="#' + cheatRoute(t) + '">' + esc(tagMeta(t).l) + '</a>').join(' &middot; ') + '</p>' : '')
    + sec('Root cause', o.rootCause ? '<ul class="rc">' + o.rootCause.map(r => '<li><span class="badge b-' + r.src + '">[' + r.src + ']</span> ' + r.text + '</li>').join('') + '</ul>' : '')
    + sec('Resolution', o.resolution)
    + (o.rollback ? '<h3>Rollback</h3>' + o.rollback : '')
    + sec('Lessons learned', o.lessons ? '<ul style="margin:0 0 10px 22px">' + o.lessons.map(l => '<li>' + l + '</li>').join('') + '</ul>' : '')
    + '</div>';
}
