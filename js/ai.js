// ai.js — AI assistant (Claude) with page context, saving answers into notes, and "AI fill" drafts.
// Runs fully in the browser with the user's own Anthropic API key, stored only in this browser's localStorage.
// Uses globals from app.js / content.js: TREE, LAST_PAGE, pageText, routeLabel, appendToNotes, mdToHtml, esc, toast, stGet, stSet.

(() => {
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.135.0/+esm';
const MODELS = [
  ['claude-opus-5-5', 'Claude Opus 5.5 (best)'],
  ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (faster, cheaper)'],
  ['claude-haiku-5-5', 'Claude Haiku 5.5 (fastest, cheapest)'],
];
const SYSTEM = 'You are a senior network engineer embedded in NET_HUB, a personal knowledge base of work notes, incident commands and technology references '
  + '(F5 BIG-IP, Cisco ASA/IOS/ACI, IPsec/IKEv2, Checkpoint, Fortinet, Palo Alto, BGP/OSPF/IS-IS, TLS). '
  + 'Give concise, practical answers with exact CLI commands in fenced code blocks (```lang). '
  + 'When page context is provided, ground your answer in it and say when something is not covered by it. '
  + 'Answer in the language the user writes in.';

let Anthropic = null, sdkErr = null;
async function sdk() {
  if (Anthropic) return Anthropic;
  try { Anthropic = (await import(SDK_URL)).default; return Anthropic }
  catch (e) { sdkErr = e; throw new Error('Could not load the Anthropic SDK from the CDN (' + e.message + ')') }
}
const key = () => stGet('ai_key') || '';
const model = () => stGet('ai_model') || MODELS[0][0];
let hist = stGet('ai_chat') || [];   // [{role, content, ctx?}]
let ctxRoute = null, busy = false;

function allRoutes() {
  const r = [];
  TREE.forEach(t => { r.push(t.id); t.subs.forEach(s => { r.push(t.id + '/' + s.id); s.pages.forEach(p => r.push(t.id + '/' + s.id + '/' + p.id)) }) });
  return r;
}

// ── formatting of model output: escape first, then light Markdown (shared with .txt import) ──
const fmt = t => mdToHtml(t);

// ── Claude call (streaming) ──
async function ask({ system, messages, onText }) {
  const A = await sdk();
  if (!key()) throw new Error('Add your Anthropic API key in the bar above first.');
  const client = new A({ apiKey: key(), dangerouslyAllowBrowser: true });
  const params = { model: model(), max_tokens: 16000, system, messages };
  if (model() !== 'claude-haiku-5-5') {
    // If the model declines on a safety classifier, the API retries on a suitable fallback model in the same call.
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }
  try {
    const stream = client.beta.messages.stream(params);
    if (onText) stream.on('text', onText);
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal') throw new Error('The model declined this request' + (msg.stop_details && msg.stop_details.category ? ' (' + msg.stop_details.category + ')' : '') + '. Try rephrasing.');
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
    return text + (msg.stop_reason === 'max_tokens' ? '\n\n_(answer cut off — too long)_' : '');
  } catch (e) {
    if (e instanceof A.AuthenticationError) throw new Error('Invalid API key (401). Check the key in the bar above.');
    if (e instanceof A.PermissionDeniedError) throw new Error('This API key has no access to ' + model() + ' (403).');
    if (e instanceof A.RateLimitError) throw new Error('Rate limit hit (429) — wait a moment and try again.');
    if (e instanceof A.APIConnectionError) throw new Error('Network error — could not reach api.anthropic.com.');
    if (e instanceof A.APIError) throw new Error('API error ' + (e.status || '') + ': ' + e.message);
    throw e;
  }
}

// ── AI page ──
function page() {
  ctxRoute = (typeof LAST_PAGE !== 'undefined' && LAST_PAGE !== 'home') ? LAST_PAGE : null;
  const k = key();
  return '<div class="chat-c">'
    + '<div class="ph" style="padding-bottom:10px"><div class="pt">&#x25C8; AI Assistant</div><div class="ps" style="margin-bottom:0">Ask with the content and notes of any page as context &middot; save useful answers straight into that page</div></div>'
    + '<div class="ai-set">'
    + '<span>API key</span><input id="ai-key" type="password" placeholder="sk-ant-..." value="' + (k ? '••••••••' + esc(k.slice(-4)) : '') + '" onfocus="if(this.value.startsWith(\'••\'))this.value=\'\'" autocomplete="off">'
    + '<button class="btn sm" onclick="AI.saveKey()">Save key</button>'
    + (k ? '<button class="btn sm" onclick="AI.forgetKey()">Forget</button>' : '')
    + '<span class="' + (k ? 'ok' : 'warn') + '">' + (k ? '&#x2714; key stored in this browser only' : '&#x26A0; needs an API key from console.anthropic.com') + '</span>'
    + '<span style="margin-left:auto">Model</span><select onchange="AI.setModel(this.value)">' + MODELS.map(([id, l]) => '<option value="' + id + '"' + (id === model() ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>'
    + '</div>'
    + '<div class="chat-m" id="cm"></div>'
    + '<div class="ctx-bar"><label><input type="checkbox" id="ai-ctx-on"' + (ctxRoute ? ' checked' : '') + '> Use page as context:</label>'
    + '<select id="ai-ctx" onchange="AI.setCtx(this.value)"><option value="">— none —</option>' + allRoutes().map(r => '<option value="' + r + '"' + (r === ctxRoute ? ' selected' : '') + '>' + esc(routeLabel(r)) + '</option>').join('') + '</select>'
    + '<button class="btn sm" style="margin-left:auto" onclick="AI.clear()">Clear chat</button></div>'
    + '<div class="cia"><textarea id="ci" placeholder="Ask about a command, an incident, a config… (Enter = send, Shift+Enter = new line)" rows="1" onkeydown="AI.key(event)" oninput="this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,140)+\'px\'"></textarea><button id="cs" onclick="AI.send()">Send</button></div>'
    + '</div>';
}
function mount() {
  const cm = document.getElementById('cm'); if (!cm) return;
  cm.innerHTML = '';
  if (!hist.length) addMsg('assistant', 'Ready. Pick a page below as context (e.g. an incident page or *F5 › HTTPS Monitors*) and ask — for example:\n- Summarise the key commands on this page\n- What would you check next for this incident?\n- Turn my notes into a step-by-step checklist\n\nEvery answer has a **Save to notes** button that appends it to the selected page.', -1);
  hist.forEach((m, i) => addMsg(m.role, m.content, i));
}
function addMsg(role, text, idx) {
  const cm = document.getElementById('cm'); if (!cm) return null;
  const el = document.createElement('div'); el.className = 'msg ' + role;
  el.innerHTML = '<div class="ml">' + (role === 'user' ? 'You' : 'NET_HUB AI') + '</div><div class="mb">' + fmt(text) + '</div>'
    + (role === 'assistant' && idx >= 0 ? '<div class="mact"><button class="btn sm" onclick="AI.saveAnswer(' + idx + ')">&#x1F4BE; Save to notes</button><button class="btn sm" onclick="AI.copy(' + idx + ',this)">copy</button></div>' : '');
  cm.appendChild(el); cm.scrollTop = cm.scrollHeight;
  return el;
}
function persist() { stSet('ai_chat', hist.slice(-60)) }

async function send() {
  const inp = document.getElementById('ci'); const q = inp.value.trim();
  if (!q || busy) return;
  busy = true; inp.value = ''; inp.style.height = 'auto'; document.getElementById('cs').disabled = true;
  const useCtx = document.getElementById('ai-ctx-on').checked && ctxRoute;
  hist.push({ role: 'user', content: q }); addMsg('user', q, hist.length - 1);
  const live = addMsg('assistant', '…', -1); const mb = live.querySelector('.mb');
  mb.innerHTML = '<div class="thn"><span></span><span></span><span></span></div>';
  let acc = '';
  try {
    let system = SYSTEM;
    if (useCtx) system += '\n\n<page_context page="' + routeLabel(ctxRoute) + '">\n' + (pageText(ctxRoute) || '(page is empty)') + '\n</page_context>';
    const text = await ask({
      system, messages: hist.map(m => ({ role: m.role, content: m.content })),
      onText: d => { acc += d; mb.innerHTML = fmt(acc); document.getElementById('cm').scrollTop = 1e9 }
    });
    live.remove();
    hist.push({ role: 'assistant', content: text, ctx: useCtx ? ctxRoute : null });
    addMsg('assistant', text, hist.length - 1); persist();
  } catch (e) {
    live.remove(); hist.pop(); persist();
    addMsg('assistant', '⚠ ' + e.message, -1);
    inp.value = q;
  }
  busy = false; document.getElementById('cs').disabled = false; inp.focus();
}

function saveAnswer(i) {
  const m = hist[i]; if (!m) return;
  const target = (document.getElementById('ai-ctx') || {}).value || m.ctx;
  if (!target) { toast('Pick a page in "Use page as context" first — the answer is saved there'); document.getElementById('ai-ctx').focus(); return }
  const q = hist[i - 1] && hist[i - 1].role === 'user' ? hist[i - 1].content : '';
  appendToNotes(target, '<h3>&#x25C8; AI: ' + esc(q.slice(0, 100)) + '</h3>' + fmt(m.content));
  toast('Saved to notes of ' + routeLabel(target));
}

// ── "AI fill": draft additional notes for a page, shown for review before inserting ──
async function fill(route, box) {
  if (!box) return;
  if (!key()) { box.innerHTML = '<div class="ai-draft"><div class="hd">AI FILL</div>Add your API key on the <a href="#ai" style="color:var(--teal)">AI Assistant</a> page first.</div>'; return }
  box.innerHTML = '<div class="ai-draft"><div class="hd">&#x2728; AI DRAFT FOR ' + esc(routeLabel(route).toUpperCase()) + '</div><div class="mb" id="dr_body"><div class="thn"><span></span><span></span><span></span></div></div></div>';
  const body = box.querySelector('#dr_body'); let acc = '';
  try {
    const text = await ask({
      system: SYSTEM,
      messages: [{
        role: 'user', content: 'Page: ' + routeLabel(route) + '\n\nCurrent content of the page:\n<page>\n' + (pageText(route) || '(empty)') + '\n</page>\n\n'
          + 'Write additional reference notes for this page that a network engineer would want for a quick refresh: key concepts, the most useful CLI commands (show / debug / verify), common gotchas and a short troubleshooting checklist. '
          + 'Do not repeat what the page already contains. Use short Markdown: "#" headings, "-" bullets, fenced code blocks. Keep it under ~350 words.'
      }],
      onText: d => { acc += d; body.innerHTML = fmt(acc) }
    });
    body.innerHTML = fmt(text);
    const act = document.createElement('div'); act.className = 'act';
    act.innerHTML = '<button class="btn pri">Insert into notes</button><button class="btn">Discard</button>';
    act.children[0].onclick = () => { appendToNotes(route, '<h3>&#x2728; AI notes</h3>' + fmt(text)); box.innerHTML = ''; toast('Inserted — edit it as you like') };
    act.children[1].onclick = () => { box.innerHTML = '' };
    box.firstChild.appendChild(act);
  } catch (e) {
    box.innerHTML = '<div class="ai-draft"><div class="hd">AI FILL</div>&#x26A0; ' + esc(e.message) + ' <button class="btn sm" onclick="this.closest(\'.ai-draft\').remove()">close</button></div>';
  }
}

window.AI = {
  page, mount, send, fill, saveAnswer,
  key: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } },
  saveKey() { const v = document.getElementById('ai-key').value.trim(); if (!v || v.startsWith('••')) return; stSet('ai_key', v); render('ai'); toast('API key saved in this browser') },
  forgetKey() { localStorage.removeItem('nhub_ai_key'); render('ai') },
  setModel(v) { stSet('ai_model', v) },
  setCtx(v) { ctxRoute = v || null; document.getElementById('ai-ctx-on').checked = !!v },
  clear() { if (!confirm('Clear the whole chat history?')) return; hist = []; persist(); mount() },
  copy(i, btn) { navigator.clipboard.writeText(hist[i].content).then(() => { btn.textContent = '✓'; setTimeout(() => btn.textContent = 'copy', 1200) }) },
};
// The page may have been opened directly at #ai before this module loaded.
if (typeof CUR !== 'undefined' && CUR === 'ai') render('ai');
sdk().catch(() => {}); // warm up the SDK download
})();
