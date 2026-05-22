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
        
        // Mock data structure (replace with real handlers)
        this.mockData = {
            technologies: [
                { id: "cisco", label: "Cisco", color: "#9b80f8" },
                { id: "f5", label: "F5 BIG-IP", color: "#00bfa0" },
                { id: "checkpoint", label: "Checkpoint", color: "#e84444" }
            ]
        };
        
        this.init();
    }

    /**
     * Initialize application on page load
     */
    init() {
        try {
            this.setupEventListeners();
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

    /**
     * Handle window hash changes (routing)
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
        // Show home by default
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
            // For routes like "cisco/vpn/setup"
            if (parts.length > 0 && parts[0] !== "home") {
                const tech = this.mockData.technologies.find(t => t.id === parts[0]);
                if (tech) {
                    html += `<span class="bc-sep">/</span>`;
                    html += `<a onclick="app.navigate('${parts[0]}')" style="cursor: pointer; color: var(--text3);">${tech.label}</a>`;
                }
            }
            if (parts.length > 1) {
                html += `<span class="bc-sep">/</span>`;
                html += `<a onclick="app.navigate('${parts.slice(0, 2).join('/')}')" style="cursor: pointer; color: var(--text3);">${parts[1]}</a>`;
            }
            if (parts.length > 2) {
                html += `<span class="bc-sep">/</span>`;
                html += `<span class="bc-cur">${parts[2]}</span>`;
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
            // Stub view for any other route
            pcContainer.innerHTML = this.renderPageStub(route);
        }

        // Reapply edit mode styling
        this.applyEditModeStyles();
    }

    /**
     * Render home page
     */
    renderHome() {
        const cards = this.mockData.technologies.map(tech => `
            <div class="card" style="border-top: 2px solid ${tech.color};" onclick="app.navigate('${tech.id}')">
                <div class="ctit">${tech.label}</div>
                <div class="cdesc">Click to explore topics</div>
                <div class="ccnt">Network documentation</div>
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
     * Render stub page for any content
     */
    renderPageStub(route) {
        return `
            <div class="ph">
                <div class="pt">${this.formatRouteTitle(route)}</div>
                <div class="ps">Route: <code style="color: var(--teal);">${route}</code></div>
            </div>
            <div class="content">
                <p>Content for <strong>${route}</strong> goes here.</p>
                <p>Toggle <strong>✏️ Edit</strong> to add notes.</p>
                ${this.renderEditZone(route)}
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

        // Mock search results
        const mockResults = [
            { title: "Cisco VPN Setup", route: "cisco/vpn/setup", desc: "Configure IKEv2 peer" },
            { title: "F5 LTM Workflow", route: "f5/ltm/workflow", desc: "Pool provisioning steps" }
        ];

        const filtered = mockResults.filter(r =>
            r.title.toLowerCase().includes(query.toLowerCase()) ||
            r.desc.toLowerCase().includes(query.toLowerCase())
        );

        const resultsHtml = filtered.map(r => `
            <div class="sr3" onclick="app.navigate('${r.route}'); app.closeSearch();">
                <div class="srl">${r.route}</div>
                <div class="srp">${r.title}</div>
                <div class="srv">${r.desc}</div>
            </div>
        `).join("");

        const sr = document.getElementById("sr");
        if (sr) sr.innerHTML = resultsHtml || '<div class="se">No results found</div>';
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
        this.searchOpen = false;
    }

    // ─────────────────────────────────────────────────
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
