# NET_HUB — Network Engineer Knowledge Hub

A personal website for work notes, commands from interesting incidents, references and
technology refreshers (F5, Cisco, Checkpoint, Fortinet, Palo Alto, routing, TLS…).
Static site — no server, no build step. Open `index.html` or publish with GitHub Pages.

## Using it

| What | How |
|---|---|
| Browse | Sidebar tree: technology → topic → page. Clicking a technology/topic opens its overview. |
| Write notes | **✏ Edit** (top right). Toolbar: bold, heading, bullet/numbered lists (Tab / Shift+Tab to indent), code, code block, quote, link. Saves automatically; Ctrl+S saves immediately. |
| Import your .txt files | In Edit mode click **📄 Import .txt**, or drag & drop `.txt` / `.md` / `.log` files onto a page's Notes. Headings, lists, links and CLI lines (`router# show …`, indented blocks, ``` fences) are formatted automatically. |
| New page (e.g. an incident) | Open a topic (e.g. *Cisco › VPN / IPsec*) → **+ New page** card. Custom pages can be deleted from the page itself. |
| Links | Under each page's notes, in Edit mode. |
| Search | Ctrl+K — page names, built-in content, **commands from the registry**, Edu topics and your own notes. ↑/↓ + Enter. |
| Cheat sheets | Sidebar **Cheat sheets** — one page per tag, generated from the command registry: filter box, copy button per command, link back to the page where it was used. |
| Edu | Study tracks (ENCC 300-440, Nokia DCF) with a status per topic (todo / learning / done, stored like notes and included in Export) and a job-ad roadmap. |
| Mind map | Generated from the tree; shows which pages have built-in content / your notes. Filter by technology; **show commands** (off by default) adds the registry commands under their pages. Each technology page has its own small map. ⛶ = full window. |
| AI assistant | Needs your own Anthropic API key (console.anthropic.com), stored only in your browser. Pick a page as context, ask, and **Save to notes** puts the answer on that page. In the editor, **✨ AI fill** drafts extra notes for the current page for you to review. |
| Backup / move to another computer | Sidebar **⇩ Export** downloads a JSON backup of all notes, links, custom pages and chat; **⇧ Import** loads it. |

> **Where is my data?** Notes are saved in the browser's local storage — per browser and per
> address. Notes written while opening the file from disk (`file://…`) are not visible on the
> GitHub Pages address and vice versa. Use Export/Import to move them.

## Files

```
index.html        page layout + styles
js/content.js     technology tree, older built-in pages (Cisco ASA/VPN), concept search keywords (IDX)
js/commands.js    command registry (defCmds), cheat sheets, cmdBlock / cmdTable, caseRender template
js/edu.js         study tracks (ENCC, Nokia DCF), topic status, roadmap
js/pages-*.js     built-in reference pages per vendor (cisco, fortinet, f5, f5 cases & CVEs, theory, testing tools, cases)
tools/            helper scripts, e.g. f5-test-members.sh (test pool members from the BIG-IP)
js/app.js         navigation, editor, .txt import, custom pages, search, mind map, backup
js/ai.js          AI assistant (Claude API, called directly from the browser)
net-hub.html      redirect to index.html (old address)
```

### Adding built-in reference pages
Add a page to `TREE` and a renderer function to `RENDERERS` (see `js/pages-*.js`)
(see `pgF5Mon` for an example using the `cb()` code-block, `co()` callout and `tbl()` table helpers).

### Adding a command (registry)
Write each command **once**, in the page file where it was used, next to the page renderer:

```js
defCmds('cisco/asa/case-multicontext', [
  { cmd: 'show nameif',                       // the command; placeholders: <peer-ip> <self-ip> <rd> <acl>
    d: 'interfaces of THIS context',          // short description
    tags: ['cisco-asa', 'asa-multicontext'],  // cheat sheets it appears in (labels/families: TAG_META in js/commands.js)
    k: 'which interfaces does this context have, egress ifc not found',  // how you'd remember the problem
    grp: 'context', lang: 'ASA (in a context)' },                        // group on the page + code-block label
]);
```

It then shows up automatically in the cheat sheets, in Ctrl+K search and (toggle) in the mind map.
On a normal page render a group with `cmdBlock('<page>', '<grp>')`. Do **not** add commands to `IDX`
— `IDX` is only for concepts that are not commands.

### How to add a case
1. Pick the page id, e.g. `cisco/asa/case-<short-name>`, and add it to the right sub-topic in `TREE`
   (see the IIFE at the top of each case in `js/pages-cases.js`).
2. Register the commands with `defCmds(<page>, [...])` (see above).
3. Render the page with `caseRender`:

```js
RENDERERS['cisco/asa/case-x'] = () => caseRender({
  page: 'cisco/asa/case-x',
  title: 'Case: …', subtitle: 'one or two sentences', tags: [['tp', 'Cisco ASA']],
  summary: [['Symptom', '…'], ['Cause', '…'], ['Fix', '…']],
  problem: '<p>…</p>',
  environment: tbl(['Item', 'Value'], [['Platform', '…']]),          // anonymised
  investigation: [{ title: 'step', body: '<p>…</p>' }, { title: 'theory that failed', body: '…', dead: true }],
  commandGroups: { system: 'System context', context: 'Inside a context' },  // order + titles of the registry groups
  rootCause: [{ src: 'documented', text: '…' }, { src: 'derived', text: '…' }],
  resolution: '<p>…</p>', rollback: '<p>…</p>',
  lessons: ['…', '…'],
});
```

**Anonymise everything** — the repository is public: no customer or company names, people, hostnames,
serial numbers, ticket/change numbers, internal URLs or real IP addresses. Use documentation ranges
(192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24, 10.x) or placeholders like `<self-ip>`, `<rd>`.
