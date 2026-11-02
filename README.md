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
| Search | Ctrl+K — page names, built-in content and your own notes. ↑/↓ + Enter. |
| Mind map | Generated from the tree; shows which pages have built-in content / your notes. Filter by technology. Each technology page has its own small map. |
| AI assistant | Needs your own Anthropic API key (console.anthropic.com), stored only in your browser. Pick a page as context, ask, and **Save to notes** puts the answer on that page. In the editor, **✨ AI fill** drafts extra notes for the current page for you to review. |
| Backup / move to another computer | Sidebar **⇩ Export** downloads a JSON backup of all notes, links, custom pages and chat; **⇧ Import** loads it. |

> **Where is my data?** Notes are saved in the browser's local storage — per browser and per
> address. Notes written while opening the file from disk (`file://…`) are not visible on the
> GitHub Pages address and vice versa. Use Export/Import to move them.

## Files

```
index.html        page layout + styles
js/content.js     technology tree, older built-in pages (Cisco ASA/VPN), search keywords
js/pages-*.js     built-in reference pages per vendor (cisco, fortinet, f5, f5 cases & CVEs, theory, testing tools)
tools/            helper scripts, e.g. f5-test-members.sh (test pool members from the BIG-IP)
js/app.js         navigation, editor, .txt import, custom pages, search, mind map, backup
js/ai.js          AI assistant (Claude API, called directly from the browser)
net-hub.html      redirect to index.html (old address)
legacy/           old Python sketch — not used by the site
```

### Adding built-in reference pages
Add a page to `TREE` and a renderer function to `RENDERERS` (see `js/pages-*.js`)
(see `pgF5Mon` for an example using the `cb()` code-block, `co()` callout and `tbl()` table helpers).
