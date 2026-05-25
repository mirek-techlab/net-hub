/**
 * main.js - Application Controller Layer
 * Binds browser DOM to modular business logic handlers.
 * 
 * Architecture:
 *   User Action → Event Listener → Handler Method → DOM Update
 *   No business logic here; purely orchestrates handler + DOM.
 */

class AppController {
    constructor() {
        this.currentEditMode = false;
        this.currentRoute = "home";
        this.searchOpen = false;
        this.saveTimer = null;
        this.openTechs = new Set();
        this.openSubs = new Set();
        
        // Complete technology data structure
        this.treeData = [
            {
                id: 'cisco',
                label: 'Cisco',
                color: '#9b80f8',
                subs: [
                    {
                        id: 'aci',
                        label: 'ACI',
                        pages: [
                            { id: 'moquery', label: 'moquery' },
                            { id: 'tshoot', label: 'Troubleshoot' },
                            { id: 'theory', label: 'Theory' }
                        ]
                    },
                    {
                        id: 'iosxe',
                        label: 'IOS XE / XR',
                        pages: [
                            { id: 'routing', label: 'Routing' },
                            { id: 'debug', label: 'Debug & Show' }
                        ]
                    },
                    {
                        id: 'asa',
                        label: 'ASA Firewall',
                        pages: [
                            { id: 'debug', label: 'FW Debug' },
                            { id: 'theory', label: 'Theory & Objects' }
                        ]
                    },
                    {
                        id: 'vpn',
                        label: 'VPN / IPsec',
                        pages: [
                            { id: 'setup', label: 'Setup' },
                            { id: 'debug', label: 'Debug' },
                            { id: 'theory', label: 'Theory' }
                        ]
                    }
                ]
            },
            {
                id: 'f5',
                label: 'F5 BIG-IP',
                color: '#00bfa0',
                subs: [
                    {
                        id: 'ltm',
                        label: 'BIG-IP LTM',
                        pages: [
                            { id: 'workflow', label: 'Provisioning' },
                            { id: 'monitors', label: 'HTTPS Monitors' },
                            { id: 'cli', label: 'CLI Reference' }
                        ]
                    },
                    {
                        id: 'logs',
                        label: 'Logs & Debug',
                        pages: [
                            { id: 'ltm', label: 'LTM Logs' },
                            { id: 'certs', label: 'Certificates' }
                        ]
                    },
                    {
                        id: 'apm',
                        label: 'APM / SSL-VPN',
                        pages: [
                            { id: 'setup', label: 'Setup' },
                            { id: 'debug', label: 'Debug' }
                        ]
                    }
                ]
            },
            {
                id: 'checkpoint',
                label: 'Checkpoint',
                color: '#e84444',
                subs: [
                    {
                        id: 'gw',
                        label: 'Gateway / Mgmt',
                        pages: [
                            { id: 'policy', label: 'Policy' },
                            { id: 'objects', label: 'Objects' },
                            { id: 'tshoot', label: 'Troubleshoot' }
                        ]
                    },
                    {
                        id: 'vpn',
                        label: 'VPN',
                        pages: [
                            { id: 'setup', label: 'Setup' },
                            { id: 'debug', label: 'Debug' }
                        ]
                    }
                ]
            },
            {
                id: 'fortinet',
                label: 'Fortinet',
                color: '#f0980a',
                subs: [
                    {
                        id: 'fg',
                        label: 'FortiGate FW',
                        pages: [
                            { id: 'policy', label: 'Policy & NAT' },
                            { id: 'tshoot', label: 'Troubleshoot' }
                        ]
                    },
                    {
                        id: 'vpn',
                        label: 'VPN',
                        pages: [
                            { id: 'ipsec', label: 'IPsec VPN' },
                            { id: 'ssl', label: 'SSL-VPN' }
                        ]
                    },
                    {
                        id: 'cli',
                        label: 'CLI Reference',
                        pages: [
                            { id: 'commands', label: 'Commands' }
                        ]
                    }
                ]
            },
            {
                id: 'paloalto',
                label: 'Palo Alto',
                color: '#56a0f0',
                subs: [
                    {
                        id: 'policy',
                        label: 'Policies',
                        pages: [
                            { id: 'security', label: 'Security Policy' },
                            { id: 'nat', label: 'NAT' },
                            { id: 'qos', label: 'QoS' }
                        ]
                    },
                    {
                        id: 'vpn',
                        label: 'VPN',
                        pages: [
                            { id: 'ipsec', label: 'IPsec' },
                            { id: 'gp', label: 'GlobalProtect' }
                        ]
                    },
                    {
                        id: 'panorama',
                        label: 'Panorama',
                        pages: [
                            { id: 'setup', label: 'Setup' },
                            { id: 'mgmt', label: 'Management' }
                        ]
                    }
                ]
            },
            {
                id: 'theory',
                label: 'General / RFCs',
                color: '#30c97a',
                subs: [
                    {
                        id: 'routing',
                        label: 'Routing Protocols',
                        pages: [
                            { id: 'bgp', label: 'BGP' },
                            { id: 'ospf', label: 'OSPF' },
                            { id: 'isis', label: 'IS-IS' }
                        ]
                    },
                    {
                        id: 'security',
                        label: 'Network Security',
                        pages: [
                            { id: 'tls', label: 'TLS / SSL' },
                            { id: 'aaa', label: 'AAA & RADIUS' },
                            { id: 'acls', label: 'ACLs' }
                        ]
                    },
                    {
                        id: 'rfcs',
                        label: 'Key RFCs',
                        pages: [
                            { id: 'list', label: 'RFC Reference' }
                        ]
                    }
                ]
            }
        ];

        // Search index with pre-redesign data
        this.searchIndex = [
            { t: 'IKEv2 peer IP change — setup', p: 'cisco/vpn/setup', k: 'cisco asa ikev2 peer ip crypto map tunnel-group', v: 'Change peer IP: crypto map + tunnel-group recreate on ASA' },
            { t: 'clear crypto ikev2 sa', p: 'cisco/vpn/debug', k: 'clear crypto ikev2 sa peer ghost stale', v: 'Clear stale IKEv2 SA after peer IP change' },
            { t: 'IKEv2 debug commands', p: 'cisco/vpn/debug', k: 'debug crypto ikev2 protocol platform proposal psk', v: 'debug crypto ikev2 protocol 5 — proposal mismatch, PSK fail' },
            { t: 'ASA failover configuration', p: 'cisco/asa/debug', k: 'failover active standby sync configure', v: 'Always configure on active — changes sync automatically' },
            { t: 'ASA packet capture', p: 'cisco/asa/debug', k: 'capture cap interface match ip host show', v: 'capture CAP1 interface outside match ip host <src> host <dst>' },
            { t: 'F5 pool creation', p: 'f5/ltm/workflow', k: 'pool f5 ltm health monitor least connections members nodes', v: 'Create pool: monitor, LB method least connections, add members' },
            { t: 'F5 virtual server creation', p: 'f5/ltm/workflow', k: 'virtual server f5 ltm destination route domain pool snat irule', v: 'VS: destination IP%RD, pool, iRule *snat-<VLAN>, traffic group' },
            { t: 'Traffic group Intranet Floating', p: 'f5/ltm/workflow', k: 'traffic group intranet floating vip failover', v: 'Intranet VIPs MUST use Intranet (Floating) traffic group' },
            { t: 'Route domain IP%10', p: 'f5/ltm/workflow', k: 'route domain ip%10 bash rdsh vsx notation', v: 'IP%10 = IP in route domain 10; bash rdsh 10 to enter' },
            { t: 'F5 HTTPS monitor send string', p: 'f5/ltm/monitors', k: 'monitor send string get post http/1.1 crlf connection close', v: 'GET /path HTTP/1.1\\r\\nHost: IP\\r\\nConnection: close\\r\\n\\r\\n' },
        ];
        
        this.init();
    }

    /**
     * Initialize application on page load
     */
    init() {
        try {
            this.setupEventListeners();
            this.buildSidebar();
            this.renderInitialView();
            console.log("✓ AppController initialized");
        } catch (err) {
            console.error("AppController init failed:", err);
        }
    }

    /**
     * Attach all DOM event listeners
     */
    setupEventListeners() {
        // Hash routing (browser back/forward)
        window.addEventListener("hashchange", () => this.onHashChange());

        // Keyboard shortcuts
        window.addEventListener("keydown", (e) => {
            const isInput = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);
            
            if (e.key === "Escape") {
                this.closeSearch();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "k" && !isInput) {
                e.preventDefault();
                this.openSearch();
            }
        });

        // Search input live filtering
        const searchInput = document.getElementById("si");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => this.onSearchInput(e.target.value));
            searchInput.addEventListener("keydown", (e) => this.onSearchKeydown(e));
        }

        // Edit button
        const editBtn = document.getElementById("edit-btn");
        if (editBtn) {
            editBtn.addEventListener("click", () => this.toggleEditMode());
        }

        // Search overlay click-to-close
        const searchOverlay = document.getElementById("so");
        if (searchOverlay) {
            searchOverlay.addEventListener("click", (e) => {
                if (e.target.id === "so") this.closeSearch();
            });
        }
    }

    // ─────────────────────────────────────────────────
    // SIDEBAR NAVIGATION BUILDER
    // ─────────────────────────────────────────────────

    /**
     * Build complete sidebar navigation tree
     */
    buildSidebar() {
        const navTree = document.getElementById("nav-tree");
        if (!navTree) return;

        let html = '';

        this.treeData.forEach(tech => {
            const isTechOpen = this.openTechs.has(tech.id) || this.currentRoute.startsWith(tech.id + '/');
            
            // Tech level (L1)
            html += '<div>';
            html += `<div class="t1h ${this.currentRoute.startsWith(tech.id) ? 'page-active' : ''}" onclick="app.toggleTech('${tech.id}')">`;
            html += `<div class="t1-dot" style="background: ${tech.color};"></div>`;
            html += `<span style="flex: 1;">${tech.label}</span>`;
            html += `<span class="chev ${isTechOpen ? 'open' : ''}">▸</span>`;
            html += '</div>';

            if (isTechOpen) {
                html += '<div class="t1-kids">';
                tech.subs.forEach(sub => {
                    const subKey = `${tech.id}/${sub.id}`;
                    const isSubOpen = this.openSubs.has(subKey) || this.currentRoute.startsWith(subKey + '/');

                    // Sub-topic level (L2)
                    html += '<div>';
                    html += `<div class="t2h ${this.currentRoute === subKey || this.currentRoute.startsWith(subKey + '/') ? 'page-active' : ''}" onclick="app.toggleSub('${subKey}')">`;
                    html += `<span class="chev ${isSubOpen ? 'open' : ''}">▸</span>`;
                    html += `<span class="t2h-lbl">${sub.label}</span>`;
                    html += '</div>';

                    if (isSubOpen) {
                        html += '<div class="t2-kids">';
                        sub.pages.forEach(page => {
                            const route = `${tech.id}/${sub.id}/${page.id}`;
                            html += `<div class="t3i ${this.currentRoute === route ? 'active' : ''}" onclick="app.navigate('${route}')">`;
                            html += `<span class="t3-lbl">${page.label}</span>`;
                            html += '</div>';
                        });
                        html += '</div>';
                    }
                    html += '</div>';
                });
                html += '</div>';
            }
            html += '</div>';
        });

        navTree.innerHTML = html;
    }

    /**
     * Toggle technology expansion
     */
    toggleTech(techId) {
        if (this.openTechs.has(techId)) {
            this.openTechs.delete(techId);
        } else {
            this.openTechs.add(techId);
        }
        this.buildSidebar();
    }

    /**
     * Toggle sub-topic expansion
     */
    toggleSub(subKey) {
        if (this.openSubs.has(subKey)) {
            this.openSubs.delete(subKey);
        } else {
            this.openSubs.add(subKey);
        }
        this.buildSidebar();
    }

    /**
     * Handle hash change routing
     */
    onHashChange() {
        const newRoute = window.location.hash.slice(1) || "home";
        if (newRoute !== this.currentRoute) {
            this.currentRoute = newRoute;
            this.renderView();
        }
    }

    /**
     * Navigate to a new route
     */
    navigate(route) {
        window.location.hash = `#${route}`;
    }

    /**
     * Render initial view on app load
     */
    renderInitialView() {
        if (!window.location.hash) {
            window.location.hash = "#home";
        } else {
            this.onHashChange();
        }
    }

    /**
     * Main view renderer - calls appropriate content renderer
     */
    renderView() {
        this.closeSearch();
        this.buildSidebar();
        this.updateBreadcrumb();
        this.updatePrimaryContent();
    }

    /**
     * Update breadcrumb navigation
     */
    updateBreadcrumb() {
        const bcContainer = document.getElementById("breadcrumb");
        if (!bcContainer) return;

        const route = this.currentRoute;
        const parts = route.split("/");
        
        let html = `<a onclick="app.navigate('home')" style="cursor: pointer;">⬛ NET_HUB</a>`;

        if (route !== "home") {
            // Find tech info
            if (parts.length > 0 && parts[0] !== "home") {
                const tech = this.treeData.find(t => t.id === parts[0]);
                if (tech) {
                    html += `<span class="bc-sep">/</span>`;
                    html += `<a onclick="app.navigate('${parts[0]}')" style="cursor: pointer; color: var(--text3);">${tech.label}</a>`;
                    
                    // Find sub-topic info
                    if (parts.length > 1) {
                        const sub = tech.subs.find(s => s.id === parts[1]);
                        if (sub) {
                            html += `<span class="bc-sep">/</span>`;
                            html += `<a onclick="app.navigate('${parts[0]}/${parts[1]}')" style="cursor: pointer; color: var(--text3);">${sub.label}</a>`;
                            
                            // Find page info
                            if (parts.length > 2) {
                                const page = sub.pages.find(p => p.id === parts[2]);
                                html += `<span class="bc-sep">/</span>`;
                                html += `<span class="bc-cur">${page ? page.label : parts[2]}</span>`;
                            }
                        }
                    }
                }
            }
        }

        bcContainer.innerHTML = html;
    }

    /**
     * Update primary content area
     */
    updatePrimaryContent() {
        const pcContainer = document.getElementById("pc");
        if (!pcContainer) return;

        const route = this.currentRoute;

        if (route === "home") {
            pcContainer.innerHTML = this.renderHome();
        } else {
            const parts = route.split("/");
            if (parts.length === 1) {
                // Technology overview page
                pcContainer.innerHTML = this.renderTechPage(parts[0]);
            } else if (parts.length === 2) {
                // Sub-topic page
                pcContainer.innerHTML = this.renderSubPage(parts[0], parts[1]);
            } else {
                // Detailed page
                pcContainer.innerHTML = this.renderDetailPage(route);
            }
        }

        // Reapply edit mode styling
        this.applyEditModeStyles();
        
        // Scroll to top
        document.getElementById("main").scrollTop = 0;
    }

    /**
     * Render home page with technology cards
     */
    renderHome() {
        const cards = this.treeData.map(tech => `
            <div class="card" style="border-top: 2px solid ${tech.color};" onclick="app.navigate('${tech.id}')">
                <div class="ctit">${tech.label}</div>
                <div class="cdesc">${tech.subs.map(s => s.label).join(' · ')}</div>
                <div class="ccnt">${tech.subs.reduce((a, s) => a + s.pages.length, 0)} pages</div>
            </div>
        `).join("");

        return `
            <div class="ph">
                <div class="pt">NET_HUB</div>
                <div class="ps">Network Engineering Knowledge Base</div>
            </div>
            <div class="content">
                <h2>Technologies</h2>
                <div class="cg">${cards}</div>
            </div>
        `;
    }

    /**
     * Render technology page with sub-topics
     */
    renderTechPage(techId) {
        const tech = this.treeData.find(t => t.id === techId);
        if (!tech) return this.renderPageNotFound(techId);

        const cards = tech.subs.map(sub => `
            <div class="card" style="border-top: 2px solid ${tech.color};" onclick="app.navigate('${techId}/${sub.id}')">
                <div class="ctit">${sub.label}</div>
                <div class="cdesc">${sub.pages.map(p => p.label).join(' · ')}</div>
                <div class="ccnt">${sub.pages.length} pages</div>
            </div>
        `).join("");

        return `
            <div class="ph">
                <div class="pt">${tech.label}</div>
                <div class="ps">Select a topic to explore</div>
            </div>
            <div class="content">
                <h2>Topics</h2>
                <div class="cg">${cards}</div>
            </div>
        `;
    }

    /**
     * Render sub-topic page with pages
     */
    renderSubPage(techId, subId) {
        const tech = this.treeData.find(t => t.id === techId);
        if (!tech) return this.renderPageNotFound(techId);
        
        const sub = tech.subs.find(s => s.id === subId);
        if (!sub) return this.renderPageNotFound(`${techId}/${subId}`);

        const cards = sub.pages.map(page => `
            <div class="card" style="border-top: 2px solid ${tech.color};" onclick="app.navigate('${techId}/${subId}/${page.id}')">
                <div class="ctit">${page.label}</div>
                <div class="ccnt">View documentation</div>
            </div>
        `).join("");

        return `
            <div class="ph">
                <div class="pt">${sub.label}</div>
                <div class="ps">${tech.label} → ${sub.label}</div>
            </div>
            <div class="content">
                <h2>Pages</h2>
                <div class="cg">${cards}</div>
                ${this.renderEditZone(`${techId}/${subId}`)}
            </div>
        `;
    }

    /**
     * Render detailed page with content
     */
    renderDetailPage(route) {
        const parts = route.split("/");
        const tech = this.treeData.find(t => t.id === parts[0]);
        const sub = tech ? tech.subs.find(s => s.id === parts[1]) : null;
        const page = sub ? sub.pages.find(p => p.id === parts[2]) : null;

        let content = `
            <div class="ph">
                <div class="pt">${page ? page.label : parts[2]}</div>
                <div class="ps">${tech ? tech.label : ''} ${sub ? '→ ' + sub.label : ''}</div>
            </div>
            <div class="content">
                <p>Documentation content for <strong>${route}</strong></p>
                ${this.renderEditZone(route)}
            </div>
        `;

        return content;
    }

    /**
     * Render page not found
     */
    renderPageNotFound(route) {
        return `
            <div class="ph">
                <div class="pt">Page Not Found</div>
                <div class="ps">Route: ${route}</div>
            </div>
            <div class="content">
                <p>The page you're looking for doesn't exist.</p>
                <button onclick="app.navigate('home')" class="card" style="border: 1px solid var(--border); padding: 10px 20px; cursor: pointer;">
                    ← Back to Home
                </button>
            </div>
        `;
    }

    /**
     * Render editable notes + links section
     */
    renderEditZone(route) {
        const routeKey = route.replace(/\//g, "_");
        const notes = this.loadFromStorage(`${routeKey}_notes`) || "";
        const links = this.loadFromStorage(`${routeKey}_links`) || [];

        const linksHtml = links.map((link, idx) => `
            <div class="link-item">
                <a href="${this.escapeHtml(link.url)}" target="_blank">
                    ${this.escapeHtml(link.lbl || link.url)}
                </a>
                <button class="link-del" onclick="app.removeLink('${routeKey}', ${idx})">×</button>
            </div>
        `).join("");

        return `
            <div class="edit-zone">
                <h2>📝 Notes</h2>
                <div 
                    class="notes-pad" 
                    id="notes_${routeKey}"
                    data-route-key="${routeKey}"
                    contenteditable="${this.currentEditMode}"
                    oninput="app.onNotesChange('${routeKey}', this.innerHTML)">
                    ${notes}
                </div>
                
                <h2 style="margin-top: 20px;">🔗 Links</h2>
                <div class="link-list" id="links_${routeKey}">
                    ${linksHtml}
                </div>
                
                <div class="add-link-form" id="form_${routeKey}">
                    <input id="url_${routeKey}" placeholder="https://..." style="flex: 2;">
                    <input id="lbl_${routeKey}" placeholder="Label (optional)" style="flex: 1;">
                    <button onclick="app.addLink('${routeKey}')">+ Add</button>
                </div>
            </div>
        `;
    }

    // ─────────────────────────────────────────────────
    // EDIT MODE
    // ─────────────────────────────────────────────────

    /**
     * Toggle edit mode on/off
     */
    toggleEditMode() {
        this.currentEditMode = !this.currentEditMode;
        const editBtn = document.getElementById("edit-btn");
        const body = document.body;

        if (editBtn) {
            editBtn.textContent = this.currentEditMode ? "💾 Exit Edit" : "✏️ Edit";
            editBtn.classList.toggle("active", this.currentEditMode);
        }

        body.classList.toggle("edit-mode", this.currentEditMode);
        this.applyEditModeStyles();
    }

    /**
     * Apply edit mode to all note pads and forms
     */
    applyEditModeStyles() {
        document.querySelectorAll(".notes-pad").forEach(el => {
            el.contentEditable = this.currentEditMode;
        });

        document.querySelectorAll(".add-link-form").forEach(form => {
            form.style.display = this.currentEditMode ? "flex" : "none";
        });

        document.querySelectorAll(".link-del").forEach(btn => {
            btn.style.display = this.currentEditMode ? "block" : "none";
        });
    }

    // ─────────────────────────────────────────────────
    // NOTES & LINKS
    // ─────────────────────────────────────────────────

    /**
     * Handle notes input with debounce
     */
    onNotesChange(routeKey, htmlContent) {
        clearTimeout(this.saveTimer);
        this.updateSaveIndicator("saving");

        this.saveTimer = setTimeout(() => {
            this.saveToStorage(`${routeKey}_notes`, htmlContent);
            this.updateSaveIndicator("saved");
            setTimeout(() => this.updateSaveIndicator(""), 1500);
        }, 600);
    }

    /**
     * Add link to route
     */
    addLink(routeKey) {
        const urlInput = document.getElementById(`url_${routeKey}`);
        const lblInput = document.getElementById(`lbl_${routeKey}`);

        if (!urlInput || !urlInput.value.trim()) return;

        const links = this.loadFromStorage(`${routeKey}_links`) || [];
        links.push({
            url: urlInput.value.trim(),
            lbl: lblInput ? lblInput.value.trim() : ""
        });

        this.saveToStorage(`${routeKey}_links`, links);
        urlInput.value = "";
        if (lblInput) lblInput.value = "";

        this.refreshLinks(routeKey, links);
    }

    /**
     * Remove link from route
     */
    removeLink(routeKey, index) {
        const links = this.loadFromStorage(`${routeKey}_links`) || [];
        links.splice(index, 1);
        this.saveToStorage(`${routeKey}_links`, links);
        this.refreshLinks(routeKey, links);
    }

    /**
     * Refresh links display
     */
    refreshLinks(routeKey, links) {
        const linkList = document.getElementById(`links_${routeKey}`);
        if (!linkList) return;

        linkList.innerHTML = links.map((link, idx) => `
            <div class="link-item">
                <a href="${this.escapeHtml(link.url)}" target="_blank">
                    ${this.escapeHtml(link.lbl || link.url)}
                </a>
                <button class="link-del" onclick="app.removeLink('${routeKey}', ${idx})">×</button>
            </div>
        `).join("");
    }

    // ─────────────────────────────────────────────────
    // SEARCH
    // ─────────────────────────────────────────────────

    /**
     * Handle search input
     */
    onSearchInput(query) {
        if (!query.trim()) {
            const sr = document.getElementById("sr");
            if (sr) sr.innerHTML = '<div class="se">Type to search...</div>';
            return;
        }

        const Q = query.toLowerCase().trim();
        
        // Filter search index
        const results = this.searchIndex.filter(r =>
            r.t.toLowerCase().includes(Q) ||
            r.k.toLowerCase().includes(Q) ||
            r.v.toLowerCase().includes(Q)
        ).slice(0, 10);

        const resultsHtml = results.map(r => `
            <div class="sr3" onclick="app.navigate('${r.p}'); app.closeSearch();">
                <div class="srl">${r.p}</div>
                <div class="srp">${this.highlightMatch(r.t, Q)}</div>
                <div class="srv">${r.v}</div>
            </div>
        `).join("");

        const sr = document.getElementById("sr");
        if (sr) sr.innerHTML = resultsHtml || '<div class="se">No results found</div>';
    }

    /**
     * Highlight matching text in search results
     */
    highlightMatch(text, query) {
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx < 0) return text;
        return text.slice(0, idx) + 
               `<mark>${text.slice(idx, idx + query.length)}</mark>` + 
               text.slice(idx + query.length);
    }

    /**
     * Handle search keyboard shortcuts
     */
    onSearchKeydown(e) {
        if (e.key === "Escape") {
            this.closeSearch();
        } else if (e.key === "Enter") {
            const firstResult = document.querySelector(".sr3");
            if (firstResult) firstResult.click();
        }
    }

    /**
     * Open search overlay
     */
    openSearch() {
        const overlay = document.getElementById("so");
        const input = document.getElementById("si");
        if (overlay) overlay.classList.add("open");
        if (input) setTimeout(() => input.focus(), 50);
        this.searchOpen = true;
    }

    /**
     * Close search overlay
     */
    closeSearch() {
        const overlay = document.getElementById("so");
        if (overlay) overlay.classList.remove("open");
        const input = document.getElementById("si");
        if (input) input.value = "";
        this.searchOpen = false;
    }

    // ────��────────────────────────────────────────────
    // STORAGE & UTILITIES
    // ─────────────────────────────────────────────────

    /**
     * Load from localStorage
     */
    loadFromStorage(key) {
        try {
            const item = localStorage.getItem(`nhub_${key}`);
            return item ? JSON.parse(item) : null;
        } catch (err) {
            console.warn(`Storage read failed for ${key}:`, err);
            return null;
        }
    }

    /**
     * Save to localStorage
     */
    saveToStorage(key, value) {
        try {
            localStorage.setItem(`nhub_${key}`, JSON.stringify(value));
        } catch (err) {
            console.warn(`Storage write failed for ${key}:`, err);
        }
    }

    /**
     * Update save indicator
     */
    updateSaveIndicator(state) {
        const ind = document.getElementById("save-ind");
        if (!ind) return;

        if (state === "saving") {
            ind.textContent = "saving…";
            ind.className = "saving";
        } else if (state === "saved") {
            ind.textContent = "saved ✓";
            ind.className = "saved";
        } else {
            ind.textContent = "";
            ind.className = "";
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Format route into readable title
     */
    formatRouteTitle(route) {
        return route
            .split("/")
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" → ");
    }
}

// ═════════════════════════════════════════════════════
// GLOBAL BOOTSTRAP
// ═════════════════════════════════════════════════════

window.app = new AppController();
