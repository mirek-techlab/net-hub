"""Content Handler - Content retrieval, editing state, and data updates

This module manages content lookups, editing state, and updates to EditableContent.
Pure business logic with zero DOM coupling.
"""

from typing import Optional, Union
from network_entities import Page, SubTopic, Technology, EditableContent, Link


class ContentHandler:
    """Manages content retrieval, editing state, and content updates.
    
    Responsibilities:
    - Resolve route strings to Technology/SubTopic/Page objects
    - Track editing state per route
    - Update EditableContent properties
    - Maintain content state without DOM interaction
    """
    
    def __init__(self, technologies: list):
        """Initialize content handler with technology data.
        
        Args:
            technologies: List of Technology objects from data layer
        """
        self.technologies = technologies
        self.edit_state: dict = {}  # Maps route -> is_editing boolean
        self.content_cache: dict = {}  # Maps route -> EditableContent
    
    def resolve_content(self, route: str) -> Optional[Union[Technology, SubTopic, Page]]:
        """Resolve a route string to its corresponding data object.
        
        Args:
            route: Route string ('cisco', 'cisco/vpn', 'cisco/vpn/setup', 'home', etc.)
            
        Returns:
            Technology, SubTopic, Page object, or None if not found
        """
        if route in ("home", "mm", "ai"):
            return None
        
        parts = route.split("/")
        
        # Find technology
        tech = next((t for t in self.technologies if t.id == parts[0]), None)
        if not tech:
            return None
        
        if len(parts) == 1:
            return tech
        
        # Find subtopic
        sub = next((s for s in tech.subs if s.id == parts[1]), None)
        if not sub:
            return None
        
        if len(parts) == 2:
            return sub
        
        # Find page
        page = next((p for p in sub.pages if p.id == parts[2]), None)
        return page
    
    def set_edit_mode(self, route: str, enabled: bool) -> bool:
        """Set editing state for a route.
        
        Args:
            route: Route string
            enabled: True for edit mode, False for view mode
            
        Returns:
            The new edit state
        """
        self.edit_state[route] = enabled
        return enabled
    
    def get_edit_mode(self, route: str) -> bool:
        """Check if a route is in edit mode.
        
        Args:
            route: Route string
            
        Returns:
            True if in edit mode, False otherwise
        """
        return self.edit_state.get(route, False)
    
    def toggle_edit_mode(self, route: str) -> bool:
        """Toggle edit mode for a route.
        
        Args:
            route: Route string
            
        Returns:
            The new edit state after toggle
        """
        current = self.get_edit_mode(route)
        return self.set_edit_mode(route, not current)
    
    def update_notes(self, route: str, notes_text: str) -> EditableContent:
        """Update notes for a route and return the updated content.
        
        Args:
            route: Route string
            notes_text: New notes content
            
        Returns:
            Updated EditableContent object
        """
        if route not in self.content_cache:
            self.content_cache[route] = EditableContent(route_key=route)
        
        self.content_cache[route].notes = notes_text
        return self.content_cache[route]
    
    def add_link(self, route: str, url: str, label: str = "") -> EditableContent:
        """Add a link to a route's EditableContent.
        
        Args:
            route: Route string
            url: Link URL
            label: Optional link label
            
        Returns:
            Updated EditableContent object
        """
        if route not in self.content_cache:
            self.content_cache[route] = EditableContent(route_key=route)
        
        link = Link(url=url, lbl=label if label else None)
        self.content_cache[route].links.append(link)
        return self.content_cache[route]
    
    def remove_link(self, route: str, link_index: int) -> EditableContent:
        """Remove a link from a route's EditableContent.
        
        Args:
            route: Route string
            link_index: Index of link to remove
            
        Returns:
            Updated EditableContent object
        """
        if route in self.content_cache and 0 <= link_index < len(self.content_cache[route].links):
            self.content_cache[route].links.pop(link_index)
        
        return self.content_cache[route]
    
    def get_content(self, route: str) -> EditableContent:
        """Get or create EditableContent for a route.
        
        Args:
            route: Route string
            
        Returns:
            EditableContent object
        """
        if route not in self.content_cache:
            self.content_cache[route] = EditableContent(route_key=route)
        
        return self.content_cache[route]
    
    def clear_edit_state(self, route: str) -> None:
        """Clear edit state for a specific route.
        
        Args:
            route: Route string
        """
        if route in self.edit_state:
            del self.edit_state[route]
