// edu.js — study tracks (Edu): exam outlines with per-topic status, links to NET_HUB pages
// and cheat sheets, and a roadmap against job-ad requirements.
// Status is stored in localStorage as nhub_edu_status (so Export/Import includes it).

const EDU_TRACKS = {
  encc: {
    label: 'ENCC 300-440',
    title: 'Cisco ENCC 300-440 &mdash; Designing and Implementing Secure Cloud Connectivity',
    official: true,
    facts: [
      ['Exam', '300-440 ENCC, 90 minutes'],
      ['Associated with', 'CCNP Enterprise certification'],
      ['Outline source', 'Cisco exam topics PDF v1.0 (7/2025)'],
    ],
    domains: [
      { id: 'd1', n: '1.0', label: 'Architecture Models', w: 15, topics: [
        { id: '1.1', lv: 'Describe', t: 'Internet connectivity to AWS / Azure / GCP: native IPsec; Catalyst SD-WAN', gap: ['cloud', 'sdwan'], links: ['theory/security/ike-nat', 'cisco/vpn/theory'], cheats: ['ipsec'] },
        { id: '1.2', lv: 'Describe', t: 'Private connectivity: MPLS provider; colocation; SDCI regional cross-connect', gap: ['cloud'], links: ['cisco/nxos/case-mainframe'] },
        { id: '1.3', lv: 'Describe', t: 'SaaS: direct internet access; via cloud security provider; via centralized internet gateway; dedicated connectivity', gap: ['cloud'], links: ['tools/http/curl', 'theory/security/tls'] },
      ] },
      { id: 'd2', n: '2.0', label: 'Design', w: 15, topics: [
        { id: '2.1', lv: 'Recommend', t: 'HA, resiliency, SLAs, reliability', gap: ['cloud'], links: ['cisco/vpn/case-partner', 'f5/ltm/workflow'] },
        { id: '2.2', lv: 'Recommend', t: 'Bandwidth, QoS, dedicated vs shared, multi-homing, routing', gap: ['cloud'], links: ['cisco/nxos/discards', 'cisco/nxos/case-mainframe'] },
        { id: '2.3', lv: 'Recommend', t: 'Regulatory compliance (NIST, FedRAMP, ISO)', gap: ['cloud'], links: [] },
        { id: '2.4', lv: 'Describe', t: 'Cloud security policies AWS / Azure / GCP (east/west, internet backhaul, inbound)', gap: ['cloud'], links: ['f5/sec/mgmt-exposure'] },
      ] },
      { id: 'd3', n: '3.0', label: 'IPsec Cloud Connectivity', w: 25, topics: [
        { id: '3.1', lv: 'Configure', t: 'GRE/IPsec from on-prem IOS XE to a native cloud endpoint / secure internet gateway', gap: ['cloud'], links: ['cisco/vpn/case-partner', 'theory/security/ike-nat', 'cisco/vpn/setup'], cheats: ['ipsec'] },
        { id: '3.2', lv: 'Configure', t: 'IPsec from on-prem IOS XE to cloud-hosted IOS XE', gap: ['cloud'], links: ['cisco/vpn/case-partner', 'theory/security/ike-nat', 'cisco/vpn/theory'], cheats: ['ipsec'] },
        { id: '3.3', lv: 'Configure', t: 'IOS XE routing for cloud (BGP, OSPF, redistribution, static)', gap: [], links: ['cisco/iosxe/routing', 'theory/routing/bgp'] },
      ] },
      { id: 'd4', n: '4.0', label: 'SD-WAN Cloud Connectivity', w: 25, topics: [
        { id: '4.1', lv: 'Configure', t: 'Catalyst SD-WAN secure cloud connectivity to AWS / Azure / GCP / SIG', gap: ['sdwan', 'cloud'], links: [] },
        { id: '4.2', lv: 'Configure', t: 'Catalyst SD-WAN OnRamp to SaaS', gap: ['sdwan', 'cloud'], links: [] },
        { id: '4.3', lv: 'Configure', t: 'Catalyst SD-WAN policies (N/S, E/W): security, routing, application', gap: ['sdwan'], links: [] },
      ] },
      { id: 'd5', n: '5.0', label: 'Operation', w: 20, topics: [
        { id: '5.1', lv: 'Diagnose', t: 'Diagnose IPsec cloud connectivity from IOS XE', gap: ['cloud'], links: ['cisco/vpn/case-partner', 'theory/security/ike-nat', 'tools/tcp/errors'], cheats: ['ipsec', 'cisco-asa'] },
        { id: '5.2', lv: 'Diagnose', t: 'Diagnose IOS XE routing for cloud', gap: [], links: ['cisco/iosxe/routing', 'cisco/iosxe/asr-crash'] },
        { id: '5.3', lv: 'Diagnose', t: 'Diagnose Catalyst SD-WAN cloud connectivity', gap: ['sdwan'], links: [] },
        { id: '5.4', lv: 'Diagnose', t: 'Diagnose SD-WAN policy issues: security, routing, application', gap: ['sdwan'], links: [] },
      ] },
    ],
  },
  nokia: {
    label: 'Nokia DCF',
    title: 'Nokia Certified Data Center Fabric Professional',
    official: false,
    facts: [
      ['Certification', 'Nokia Certified Data Center Fabric Professional (entry level)'],
      ['Exam', 'Nokia Data Center Fabric Fundamentals, code 4A0-D01 &mdash; multiple choice, Pearson VUE (online or test centre)'],
      ['Training', 'not required; a practice exam is available'],
      ['Validity', '3 years'],
      ['Source', '<a href="https://nokia.com/networks/training/dcf/certification/dcfp" target="_blank" rel="noopener">nokia.com &rsaquo; DCF certification</a>'],
    ],
    domains: [
      { id: 'o1', n: '1', label: 'Modern DC network design (L3, BGP)', topics: [
        { id: 'o1.1', t: 'Modern data center network design with L3 routing and BGP', gap: [], links: ['theory/routing/bgp', 'cisco/aci/theory', 'cisco/nxos/discards'] },
      ] },
      { id: 'o2', n: '2', label: 'SR Linux, platforms, FSS, ZTP', topics: [
        { id: 'o2.1', t: 'SR Linux architecture', gap: [], links: [] },
        { id: 'o2.2', t: '7220 / 7250 IXR platforms', gap: [], links: [] },
        { id: 'o2.3', t: 'Fabric Services System', gap: [], links: [] },
        { id: 'o2.4', t: 'Zero Touch Provisioning', gap: [], links: [] },
      ] },
      { id: 'o3', n: '3', label: 'SR Linux CLI', topics: [
        { id: 'o3.1', t: 'Configure and verify interfaces and routing protocols', gap: [], links: ['cisco/iosxe/routing'] },
        { id: 'o3.2', t: 'Logging and monitoring', gap: [], links: ['cisco/iosxe/asr-crash'] },
        { id: 'o3.3', t: 'Filtering tools', gap: [], links: ['tools/tcp/conn', 'tools/tcp/errors'] },
      ] },
    ],
  },
};

const EDU_GAP = { cloud: ['tb', 'job-ad gap: Cloud'], sdwan: ['ta', 'job-ad gap: SD-WAN'] };
const EDU_ST = ['todo', 'learning', 'done'];

function eduStatus() { return stGet('edu_status') || {} }
function eduGet(key) { return eduStatus()[key] || 'todo' }
function eduSet(key, val, sel) {
  const s = eduStatus(); s[key] = val; stSet('edu_status', s);
  if (sel) sel.className = 'edu-st st-' + val;
  eduRefresh(); setSaveInd('saved');
}
function eduProgress(trackId, domainId) {
  const tr = EDU_TRACKS[trackId]; let all = 0, done = 0, learn = 0;
  tr.domains.filter(d => !domainId || d.id === domainId).forEach(d => d.topics.forEach(t => {
    all++; const st = eduGet(trackId + '/' + t.id); if (st === 'done') done++; else if (st === 'learning') learn++;
  }));
  return { all, done, learn, pct: all ? Math.round((done + learn * 0.5) / all * 100) : 0 };
}
function progBar(p) {
  return '<div class="prog" title="' + p.done + ' done, ' + p.learn + ' learning, ' + p.all + ' topics"><i style="width:' + p.pct + '%"></i></div>'
    + '<span class="prog-t">' + p.done + '/' + p.all + ' done' + (p.learn ? ', ' + p.learn + ' learning' : '') + '</span>';
}
function eduRefresh() {
  document.querySelectorAll('[data-prog]').forEach(el => {
    const [tr, d] = el.dataset.prog.split('|'); el.innerHTML = progBar(eduProgress(tr, d || null));
  });
}

// ── Tree + renderers ──
(function () {
  if (TREE.some(t => t.id === 'edu')) return;
  const subs = Object.keys(EDU_TRACKS).map(k => ({
    id: k, label: EDU_TRACKS[k].label,
    pages: [{ id: 'overview', label: 'Overview' }].concat(EDU_TRACKS[k].domains.map(d => ({ id: d.id, label: d.n + ' ' + d.label })))
  }));
  subs.push({ id: 'roadmap', label: 'Roadmap', pages: [{ id: 'job-ad', label: 'Job-ad requirements' }] });
  TREE.push({ id: 'edu', label: 'Edu', col: '#7fd1ff', subs });
  Object.keys(EDU_TRACKS).forEach(k => {
    RENDERERS['edu/' + k + '/overview'] = () => pgEduOverview(k);
    EDU_TRACKS[k].domains.forEach(d => { RENDERERS['edu/' + k + '/' + d.id] = () => pgEduDomain(k, d.id) });
  });
  RENDERERS['edu/roadmap/job-ad'] = pgEduRoadmap;
})();

function eduHead(tr, extra) {
  return '<div class="ph"><div class="pt">' + tr.title + '</div>' + (extra || '')
    + '<div class="tags">' + tag('tgr', 'Edu') + (tr.official ? tag('tg', 'official exam topics') : tag('ta', 'course learning outcomes')) + '</div></div>';
}
function outlineNote(tr) {
  return tr.official ? '' : co('a', '&#x2139;&#xFE0F;', 'Outline = course learning outcomes, not official exam topics', 'Nokia publishes no formal exam topic list for this exam. The outline below follows the learning outcomes of the course and may not match the exam weighting.');
}
function pgEduOverview(k) {
  const tr = EDU_TRACKS[k];
  return eduHead(tr, '<div class="ps">Study track &middot; set a status per topic on the domain pages; progress is stored in this browser and included in Export</div>')
    + '<div class="content">'
    + outlineNote(tr)
    + tbl(['', ''], tr.facts)
    + eduFilesInfo(k)
    + '<h2>Progress</h2><div class="prog-row" data-prog="' + k + '|">' + progBar(eduProgress(k)) + '</div>'
    + tbl([tr.official ? 'Domain' : 'Area', tr.official ? 'Weight' : '', 'Progress'], tr.domains.map(d => [
      '<a href="#edu/' + k + '/' + d.id + '">' + d.n + ' ' + d.label + '</a>',
      d.w ? d.w + ' %' : '',
      '<div class="prog-row" data-prog="' + k + '|' + d.id + '">' + progBar(eduProgress(k, d.id)) + '</div>'
    ]))
    + '</div>';
}
function eduLinks(t) {
  const pages = (t.links || []).filter(r => findRoute(r).tech).map(r => '<a href="#' + r + '">' + esc(routeLabelShort(r)) + '</a>');
  const cheats = (t.cheats || []).map(c => CMDS.some(x => x.tags.includes(c))
    ? '<a href="#' + cheatRoute(c) + '">&#x1F4CB; ' + esc(tagMeta(c).l) + ' cheat sheet</a>'
    : '<span class="view-hint" title="No commands with this tag in the registry yet">&#x1F4CB; ' + esc(tagMeta(c).l) + ' cheat sheet (not filled yet)</span>');
  const all = pages.concat(cheats);
  return all.length ? all.join('<br>') : '<span class="view-hint">no NET_HUB page yet</span>';
}
function pgEduDomain(k, did) {
  const tr = EDU_TRACKS[k], d = tr.domains.find(x => x.id === did);
  return eduHead(tr, '<div class="ps">' + d.n + ' ' + d.label + (d.w ? ' &middot; ' + d.w + ' % of the exam' : '') + '</div>')
    + '<div class="content">'
    + outlineNote(tr)
    + '<div class="prog-row" data-prog="' + k + '|' + d.id + '">' + progBar(eduProgress(k, d.id)) + '</div>'
    + tbl(['Topic', 'Status', 'Related in NET_HUB'], d.topics.map(t => {
      const key = k + '/' + t.id, st = eduGet(key);
      const has = EDU_CONTENT[key];
      return ['<strong>' + t.id.replace(/^o/, '') + '</strong> ' + t.t + '<div class="edu-gaps">'
        + (t.lv ? '<span class="tag tlv" title="Level from the official exam topic list">' + t.lv + '</span>' : '')
        + (t.gap || []).map(g => tag(EDU_GAP[g][0], EDU_GAP[g][1])).join('')
        + (has ? '<a class="tag tnotes" onclick="document.getElementById(\'edu-n-' + t.id.replace(/\./g, '-') + '\').scrollIntoView({behavior:\'smooth\'})">&#x1F4D8; study notes &darr;</a>' : '') + '</div>',
        '<select class="edu-st st-' + st + '" onchange="eduSet(\'' + key + '\',this.value,this)">' + EDU_ST.map(s => '<option' + (s === st ? ' selected' : '') + '>' + s + '</option>').join('') + '</select>',
        eduLinks(t)];
    }))
    + d.topics.filter(t => EDU_CONTENT[k + '/' + t.id]).map(t => eduNotesHTML(k, d, t)).join('')
    + '<p class="view-hint">Own quick notes for this domain: Notes section below (Edit). Finished study notes: one file per topic, see README &rsaquo; Edu topic files.</p>'
    + '</div>';
}
function pgEduRoadmap() {
  const enc = k => '<div class="prog-row" data-prog="' + k + '">' + progBar(eduProgress(k.split('|')[0], k.split('|')[1] || null)) + '</div>';
  return '<div class="ph"><div class="pt">Roadmap &mdash; job-ad requirements</div>'
    + '<div class="ps">Typical senior network/security engineer requirements vs what NET_HUB already covers and which study topics close the gaps</div>'
    + '<div class="tags">' + tag('tgr', 'Edu') + tag('ta', 'Career') + '</div></div>'
    + '<div class="content">'
    + tbl(['Requirement', 'Already in NET_HUB', 'Gap / next step'], [
      ['Cisco, Palo Alto, Fortinet, Check Point (or equivalent)',
        '<a href="#cisco">Cisco</a> (ASA, ACI, XR, Nexus) &middot; <a href="#fortinet">FortiGate</a> &middot; Palo Alto in <a href="#cisco/vpn/case-partner">the partner VPN case</a>',
        'Check Point: no pages yet'],
      ['SD-WAN, SASE, ZTNA, NAC, microsegmentation',
        'microsegmentation concepts: <a href="#cisco/aci/theory">ACI EPGs / contracts</a>',
        '<strong>SD-WAN:</strong> ENCC 4.x / 5.3 / 5.4 ' + enc('encc|d4') + '<strong>SASE:</strong> ENCC 1.3 (SaaS via cloud security provider) &middot; ZTNA / NAC: no track yet'],
      ['Network automation / IaC: Python, Ansible, APIs',
        'APIC object model / <a href="#cisco/aci/moquery">moquery</a> &middot; <a href="#f5/ltm/monitors">F5 member test script</a> &middot; <a href="#tools/http/curl">curl / REST testing</a>',
        'Python + Ansible: no track yet &mdash; candidate for the next Edu track'],
      ['Cloud environments and secure cloud connectivity',
        'IPsec troubleshooting: <a href="#cisco/vpn/case-partner">partner VPN case</a>, <a href="#theory/security/ike-nat">IKE: NAT &amp; aggressive mode</a>',
        '<strong>ENCC 300-440</strong> ' + enc('encc|')],
    ])
    + '<h2>Tracks</h2>'
    + tbl(['Track', 'Progress'], Object.keys(EDU_TRACKS).map(k => ['<a href="#edu/' + k + '/overview">' + EDU_TRACKS[k].label + '</a>', enc(k + '|')]))
    + '</div>';
}

// Search entries generated from the Edu data (called by app.js)
function eduSearchDocs() {
  const out = [];
  Object.keys(EDU_TRACKS).forEach(k => EDU_TRACKS[k].domains.forEach(d => d.topics.forEach(t => out.push({
    p: 'edu/' + k + '/' + d.id, t: EDU_TRACKS[k].label + ' ' + t.id.replace(/^o/, '') + ' — ' + htmlToText(t.t),
    hay: (EDU_TRACKS[k].label + ' ' + t.id + ' ' + t.t + ' ' + (t.gap || []).join(' ') + ' study exam edu').toLowerCase(),
    v: d.n + ' ' + d.label, kind: 'topic'
  }))));
  Object.keys(EDU_CONTENT).forEach(key => {
    const c = EDU_CONTENT[key], txt = htmlToText(c.summary + '\n' + c.body);
    out.push({ p: c.route, t: EDU_TRACKS[c.track].label + ' ' + c.id.replace(/^o/, '') + ' (study notes)', hay: txt.toLowerCase(), raw: txt, kind: 'text' });
  });
  return out;
}


// ═══════════════════════════════════════════════════════════════════
// Edu topic files: edu/<track>/<topic>.js, listed in edu/manifest.js
// Each file calls eduTopic('<track>', '<topic id>', { … }) — format in README › Edu topic files.
// ═══════════════════════════════════════════════════════════════════
const EDU_CONTENT = {};
const EDU_ERRORS = [];
let EDU_FILES_LOADED = [];

function eduFind(track, id) {
  const tr = EDU_TRACKS[track]; if (!tr) return null;
  for (const d of tr.domains) { const t = d.topics.find(x => x.id === id); if (t) return { tr, d, t } }
  return null;
}
function eduTopic(track, id, data) {
  const where = 'edu/' + track + '/' + id + '.js';
  const f = eduFind(track, id);
  if (!f) { EDU_ERRORS.push(where + ': unknown track or topic id "' + track + '/' + id + '"'); return }
  const errs = [];
  if (!data || typeof data !== 'object') { EDU_ERRORS.push(where + ': second argument must be an object'); return }
  if (typeof data.summary !== 'string' || !data.summary.trim()) errs.push('missing "summary" (string)');
  if (typeof data.body !== 'string' || !data.body.trim()) errs.push('missing "body" (Markdown string)');
  (data.sources || []).forEach((x, i) => { if (!x || x.id === undefined || !x.title) errs.push('sources[' + i + '] needs "id" and "title"') });
  (data.commands || []).forEach((c, i) => { if (!c || !c.cmd || !c.d) errs.push('commands[' + i + '] needs "cmd" and "d"') });
  const route = 'edu/' + track + '/' + f.d.id;
  EDU_CONTENT[track + '/' + id] = Object.assign({ track, id, route, sources: [], commands: [], links: [] }, data, { errors: errs });
  if (errs.length) EDU_ERRORS.push(where + ': ' + errs.join('; '));
  const ok = (data.commands || []).filter(c => c && c.cmd && c.d);
  if (ok.length) defCmds(route, ok.map(c => Object.assign({ tags: [], k: '', grp: 'edu-' + id, lang: '' }, c, { topic: id })));
}
// Markdown → HTML (same converter as the .txt import), then [documented] / [derived] badges and [n] source refs.
// Code blocks and inline code are left untouched.
function eduMarkers(html, key) {
  return html.split(/(<pre>[\s\S]*?<\/pre>|<code>[\s\S]*?<\/code>)/).map((part, i) => i % 2 ? part : part
    .replace(/\[documented\]/g, '<span class="badge b-documented">[documented]</span>')
    .replace(/\[derived\]/g, '<span class="badge b-derived">[derived]</span>')
    .replace(/\[(\d+)\]/g, '<sup class="src-ref"><a onclick="var e=document.getElementById(\'' + key + '-src-$1\');if(e)e.scrollIntoView({behavior:\'smooth\'})">[$1]</a></sup>')).join('');
}
function eduNotesHTML(track, d, t) {
  const c = EDU_CONTENT[track + '/' + t.id], key = 'edu-' + track + '-' + t.id.replace(/\./g, '-');
  const cmds = CMDS.filter(x => x.page === c.route && x.topic === t.id);
  return '<div class="edu-notes" id="edu-n-' + t.id.replace(/\./g, '-') + '">'
    + '<h2>' + t.id.replace(/^o/, '') + ' &mdash; study notes</h2>'
    + (c.errors.length ? co('r', '&#x26A0;&#xFE0F;', 'Problem in this topic file', esc(c.errors.join('; '))) : '')
    + '<p class="edu-sum">' + esc(c.summary || '') + (c.updated ? ' <span class="case-note">updated ' + esc(c.updated) + '</span>' : '') + '</p>'
    + '<div class="edu-body">' + eduMarkers(mdToHtml(c.body || ''), key) + '</div>'
    + (cmds.length ? '<h3>Commands</h3>' + cmdTable(cmds, {}) : '')
    + (c.sources.length ? '<h3>Sources</h3><ol class="edu-src">' + c.sources.map(x => '<li id="' + key + '-src-' + esc(String(x.id)) + '" value="' + (parseInt(x.id) || '') + '">'
      + (x.url ? '<a href="' + esc(safeUrl(x.url)) + '" target="_blank" rel="noopener">' + esc(x.title) + '</a>' : esc(x.title)) + '</li>').join('') + '</ol>' : '')
    + ((c.links || []).length ? '<h3>Related in NET_HUB</h3><p>' + c.links.filter(r => findRoute(r).tech).map(r => '<a href="#' + r + '">' + esc(routeLabelShort(r)) + '</a>').join(' &middot; ') + '</p>' : '')
    + '</div>';
}
function eduFilesInfo(track) {
  const files = Object.keys(EDU_CONTENT).filter(k => k.startsWith(track + '/'));
  const errs = EDU_ERRORS.filter(e => e.startsWith('edu/' + track + '/') || !/^edu\/[^/]+\//.test(e));
  return (files.length ? '<p class="view-hint">&#x1F4D8; Study notes loaded for: ' + files.map(k => {
    const c = EDU_CONTENT[k]; return '<a href="#' + c.route + '">' + esc(c.id.replace(/^o/, '')) + '</a>' }).join(', ') + '</p>' : '')
    + (errs.length ? co('r', '&#x26A0;&#xFE0F;', 'Edu topic files with problems', esc(errs.join(' | '))) : '');
}
// Load the files listed in edu/manifest.js (EDU_FILES = ['encc/3.1', …]) — plain <script> tags, works from file:// too.
function eduLoadFiles() {
  const list = (typeof EDU_FILES !== 'undefined' && Array.isArray(EDU_FILES)) ? EDU_FILES : [];
  if (!list.length) return;
  let left = list.length;
  const done = () => {
    if (--left) return;
    EDU_FILES_LOADED = list.slice();
    if (typeof buildCheatTree === 'function') buildCheatTree();     // commands from topic files → cheat sheets
    if (typeof SEARCH_DOCS !== 'undefined') SEARCH_DOCS = null;       // → search
    if (typeof buildSidebar === 'function') { buildSidebar(); if (/^(edu|cheat)\//.test(CUR)) render(CUR) }
  };
  list.forEach(f => {
    const el = document.createElement('script');
    el.src = 'edu/' + f + '.js';
    el.onload = done;
    el.onerror = () => { EDU_ERRORS.push('edu/' + f + '.js: listed in edu/manifest.js but could not be loaded'); done() };
    document.head.appendChild(el);
  });
}
