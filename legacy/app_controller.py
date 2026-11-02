"""Application Controller - Thin UI application layer

This module acts as the glue between business logic handlers and the DOM.
Responsibilities:
- Instantiate and manage handlers
- Bind event listeners
- Handle URL hash changes
- Update DOM with data from handlers
"""

# Import handlers
from router_handler import RouterHandler
from content_handler import ContentHandler
from search_handler import SearchHandler
from storage_manager import StorageManager
from network_entities import Technology, SubTopic, Page

# Application state
class AppController:
    """Main application controller that bridges handlers and DOM."""
    
    def __init__(self, technologies_data):
        """Initialize application with business logic handlers.
        
        Args:
            technologies_data: List of Technology objects
        """
        self.technologies = technologies_data
        self.router = RouterHandler("home")
        self.content = ContentHandler(technologies_data)
        self.search = SearchHandler(technologies_data)
        self.storage = StorageManager()
        self.edit_mode = False
        
        # Storage backend (simulating localStorage)
        self.store = {}
        
        self._setup_event_listeners()
        self._init_view()
    
    def _setup_event_listeners(self):
        """Bind all DOM event listeners (called once on init)."""
        # Navigation links - delegated to onclick handlers in HTML
        # Search input
        search_input = self._get_element("si")
        if search_input:
            search_input.addEventListener("input", lambda e: self._on_search_input(e.target.value))
            search_input.addEventListener("keydown", lambda e: self._on_search_keydown(e))
        
        # Edit mode toggle button
        edit_btn = self._get_element("edit-btn")
        if edit_btn:
            edit_btn.addEventListener("click", lambda: self._toggle_edit_mode())
        
        # Chat input
        chat_input = self._get_element("ci")
        if chat_input:
            chat_input.addEventListener("keydown", lambda e: self._on_chat_keydown(e))
        
        # Hash change listener
        window.addEventListener("hashchange", lambda: self._on_hash_change())
    
    def _get_element(self, element_id):
        """Safe DOM element retrieval.
        
        Args:
            element_id: Element ID
            
        Returns:
            DOM element or None
        """
        try:
            return document.getElementById(element_id)
        except:
            return None
    
    def _set_element_html(self, element_id, html_content):
        """Set innerHTML of an element.
        
        Args:
            element_id: Target element ID
            html_content: HTML string to insert
        """
        el = self._get_element(element_id)
        if el:
            el.innerHTML = html_content
    
    def navigate(self, route):
        """Navigate to a new route and render content.
        
        Args:
            route: Route string (e.g., 'cisco/vpn/setup')
        """
        # Update router state
        self.router.navigate_to(route)
        
        # Update URL hash
        window.location.hash = f"#{route}"
        
        # Render new view
        self._render_view()
    
    def _on_hash_change(self):
        """Handle browser back/forward buttons."""
        hash_route = window.location.hash.slice(1) or "home"
        self.router.current_route = hash_route
        self._render_view()
    
    def _render_view(self):
        """Render current view based on router state."""
        route = self.router.current_route
        route_type, parts = self.router.parse_route(route)
        
        # Get content from handler
        content_obj = self.content.resolve_content(route)
        breadcrumbs = self.router.get_breadcrumb_dicts(self.technologies)
        
        # Update breadcrumb
        self._render_breadcrumb(breadcrumbs)
        
        # Update main content
        pc = self._get_element("pc")
        if pc:
            if route == "home":
                pc.innerHTML = self._render_home()
            elif route == "mm":
                pc.innerHTML = self._render_mind_map()
            elif route == "ai":
                pc.innerHTML = self._render_ai_chat()
            else:
                pc.innerHTML = self._render_content_page(route, content_obj)
            
            # Update edit zone
            self._render_edit_zone(route)
        
        # Reset scroll
        main = self._get_element("main")
        if main:
            main.scrollTop = 0
    
    def _render_breadcrumb(self, breadcrumbs):
        """Render breadcrumb navigation.
        
        Args:
            breadcrumbs: List of breadcrumb dicts from router
        """
        bc_html = ""
        for item in breadcrumbs:
            separator = ' <span class="bc-sep">/</span> ' if item != breadcrumbs[0] else ""
            if item["is_current"]:
                bc_html += f'{separator}<span class="bc-cur">{item["label"]}</span>'
            else:
                bc_html += f'{separator}<a onclick="app.navigate(\'{item["route"]}\')"> {item["label"]}</a>'
        
        self._set_element_html("breadcrumb", bc_html)
    
    def _render_home(self):
        """Render home page."""
        tech_cards = ""
        for tech in self.technologies:
            tech_cards += f'''
            <div class="card" style="border-top:2px solid {tech.col}" onclick="app.navigate('{tech.id}')">
                <div class="ctit">{tech.label}</div>
                <div class="cdesc">{', '.join(s.label for s in tech.subs)}</div>
                <div class="ccnt">{sum(len(s.pages) for s in tech.subs)} pages</div>
            </div>
            '''
        
        return f'''
        <div class="ph"><div class="pt">NET_HUB</div><div class="ps">Network Engineering Knowledge Base</div></div>
        <div class="content"><h2>Technologies</h2><div class="cg">{tech_cards}</div></div>
        '''
    
    def _render_mind_map(self):
        """Render mind map page."""
        return '<div class="ph"><div class="pt">Knowledge Mind Map</div></div>'
    
    def _render_ai_chat(self):
        """Render AI chat interface."""
        return '<div class="ph"><div class="pt">AI Assistant</div></div>'
    
    def _render_content_page(self, route, content_obj):
        """Render content page.
        
        Args:
            route: Current route
            content_obj: Technology/SubTopic/Page object
        """
        if isinstance(content_obj, Page):
            label = content_obj.label
        elif isinstance(content_obj, SubTopic):
            label = content_obj.label
        elif isinstance(content_obj, Technology):
            label = content_obj.label
        else:
            label = route.split("/")[-1]
        
        return f'''
        <div class="ph"><div class="pt">{label}</div></div>
        <div class="content"><p>Content for {label}</p></div>
        '''
    
    def _render_edit_zone(self, route):
        """Render edit zone with notes and links.
        
        Args:
            route: Current route
        """
        editable = self.content.get_content(route)
        
        links_html = ""
        for i, link in enumerate(editable.links):
            links_html += f'''
            <div class="link-item">
                <a href="{link.url}" target="_blank">{link.lbl or link.url}</a>
                <button class="link-del" onclick="app.remove_link('{route}', {i})">×</button>
            </div>
            '''
        
        edit_zone_html = f'''
        <div class="edit-zone">
            <h2>📝 Notes</h2>
            <div class="notes-pad" id="npad_{route.replace('/', '_')}" 
                 contenteditable="{str(self.edit_mode).lower()}" 
                 data-rk="{route}"
                 onblur="app.save_notes('{route}', this.innerHTML)">
                {editable.notes}
            </div>
            <h2 style="margin-top:20px">🔗 Links</h2>
            <div class="link-list" id="ll_{route.replace('/', '_')}">{links_html}</div>
            <div class="add-link-form" id="alf_{route.replace('/', '_')}" style="display:{'flex' if self.edit_mode else 'none'};gap:8px;margin-top:8px;">
                <input id="li_u_{route.replace('/', '_')}" placeholder="https://..." style="flex:2">
                <input id="li_l_{route.replace('/', '_')}" placeholder="Label (optional)" style="flex:1">
                <button onclick="app.add_link('{route}')">+ Add</button>
            </div>
        </div>
        '''
        
        pc = self._get_element("pc")
        if pc:
            pc.innerHTML += edit_zone_html
    
    def _toggle_edit_mode(self):
        """Toggle between edit and view mode."""
        self.edit_mode = not self.edit_mode
        
        edit_btn = self._get_element("edit-btn")
        if edit_btn:
            edit_btn.textContent = "💾 Exit Edit" if self.edit_mode else "✏️ Edit"
            edit_btn.classList.toggle("active", self.edit_mode)
        
        # Update all note pads
        note_pads = document.querySelectorAll(".notes-pad")
        for pad in note_pads:
            pad.contentEditable = str(self.edit_mode).lower()
        
        # Update add-link forms
        forms = document.querySelectorAll(".add-link-form")
        for form in forms:
            form.style.display = "flex" if self.edit_mode else "none"
    
    def save_notes(self, route, content_html):
        """Save notes for a route.
        
        Args:
            route: Route string
            content_html: HTML content of notes
        """
        self.content.update_notes(route, content_html)
        self.storage.save_content(route, self.content.get_content(route), self.store)
    
    def add_link(self, route):
        """Add a link to current content.
        
        Args:
            route: Route string
        """
        url_input = self._get_element(f"li_u_{route.replace('/', '_')}")
        lbl_input = self._get_element(f"li_l_{route.replace('/', '_')}")
        
        if url_input and url_input.value:
            url = url_input.value
            label = lbl_input.value if lbl_input else ""
            
            self.content.add_link(route, url, label)
            url_input.value = ""
            if lbl_input:
                lbl_input.value = ""
            
            # Re-render edit zone
            self._render_view()
    
    def remove_link(self, route, index):
        """Remove a link from current content.
        
        Args:
            route: Route string
            index: Index of link to remove
        """
        self.content.remove_link(route, index)
        self._render_view()
    
    def _on_search_input(self, query):
        """Handle search input changes.
        
        Args:
            query: Search query string
        """
        results = self.search.execute_search(query, limit=10)
        
        sr_el = self._get_element("sr")
        if not sr_el:
            return
        
        if not query:
            sr_el.innerHTML = '<div class="se">Type to search across all topics</div>'
            return
        
        if not results:
            sr_el.innerHTML = '<div class="se">No results found</div>'
            return
        
        results_html = ""
        for result in results:
            results_html += f'''
            <div class="sr3" onclick="app.navigate('{result['route']}'); app.close_search()">
                <div class="srl">{result['route']}</div>
                <div class="srp">{result['title']}</div>
                <div class="srv">{result['description']}</div>
            </div>
            '''
        
        sr_el.innerHTML = results_html
    
    def _on_search_keydown(self, event):
        """Handle search keyboard events.
        
        Args:
            event: Keyboard event
        """
        if event.key == "Escape":
            self.close_search()
        elif event.key == "Enter":
            first_result = document.querySelector(".sr3")
            if first_result:
                first_result.click()
    
    def _on_chat_keydown(self, event):
        """Handle chat input keyboard events.
        
        Args:
            event: Keyboard event
        """
        if event.key == "Enter" and not event.shiftKey:
            event.preventDefault()
            send_btn = self._get_element("cs")
            if send_btn:
                send_btn.click()
    
    def open_search(self):
        """Open search overlay."""
        so = self._get_element("so")
        if so:
            so.classList.add("open")
            si = self._get_element("si")
            if si:
                si.focus()
    
    def close_search(self):
        """Close search overlay."""
        so = self._get_element("so")
        if so:
            so.classList.remove("open")
            si = self._get_element("si")
            if si:
                si.value = ""
    
    def _init_view(self):
        """Initialize view on app boot."""
        self._render_view()


# Global app instance
app = None

def init_app(technologies_data):
    """Initialize the application.
    
    Args:
        technologies_data: List of Technology objects
    """
    global app
    app = AppController(technologies_data)
