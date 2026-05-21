"""Router Handler - Application routing and navigation state management

This module handles URL parsing, navigation state, and breadcrumb trail generation.
Pure business logic with zero DOM coupling.
"""

from typing import List, Optional, Tuple
from enum import Enum
from network_entities import Page, SubTopic, Technology


class RouteType(Enum):
    """Enumeration of route types in the application"""
    HOME = "home"
    MIND_MAP = "mm"
    AI_CHAT = "ai"
    TECHNOLOGY = "tech"      # e.g., 'cisco'
    SUBTOPIC = "subtopic"    # e.g., 'cisco/vpn'
    PAGE = "page"            # e.g., 'cisco/vpn/setup'


class BreadcrumbItem:
    """Represents a single breadcrumb navigation item"""
    
    def __init__(self, label: str, route: str, is_current: bool = False):
        self.label = label
        self.route = route
        self.is_current = is_current
    
    def to_dict(self):
        return {"label": self.label, "route": self.route, "is_current": self.is_current}


class RouterHandler:
    """Manages application routing, navigation state, and breadcrumb generation.
    
    Responsibilities:
    - Parse route strings into RouteType
    - Track current navigation state
    - Generate breadcrumb trails
    - Provide clean navigation methods
    """
    
    def __init__(self, initial_route: str = "home"):
        """Initialize router with optional initial route.
        
        Args:
            initial_route: Starting route (default: 'home')
        """
        self.current_route = initial_route
        self.history: List[str] = [initial_route]
    
    @staticmethod
    def parse_route(route: str) -> Tuple[RouteType, List[str]]:
        """Parse a route string into type and components.
        
        Args:
            route: Route string (e.g., 'cisco/vpn/setup', 'home', 'ai')
            
        Returns:
            Tuple of (RouteType, components list)
        """
        if route == "home":
            return RouteType.HOME, []
        elif route == "mm":
            return RouteType.MIND_MAP, []
        elif route == "ai":
            return RouteType.AI_CHAT, []
        
        parts = route.split("/")
        if len(parts) == 1:
            return RouteType.TECHNOLOGY, parts
        elif len(parts) == 2:
            return RouteType.SUBTOPIC, parts
        elif len(parts) == 3:
            return RouteType.PAGE, parts
        
        return RouteType.HOME, []
    
    def navigate_to(self, target: str) -> str:
        """Navigate to a target route and update state.
        
        Args:
            target: Target route string
            
        Returns:
            The new current route
        """
        self.current_route = target
        self.history.append(target)
        return self.current_route
    
    def go_back(self) -> Optional[str]:
        """Navigate back one step in history.
        
        Returns:
            Previous route or None if at start of history
        """
        if len(self.history) > 1:
            self.history.pop()
            self.current_route = self.history[-1]
            return self.current_route
        return None
    
    def build_breadcrumbs(self, technologies: List[Technology]) -> List[BreadcrumbItem]:
        """Build breadcrumb trail for current route.
        
        Args:
            technologies: List of Technology objects from data layer
            
        Returns:
            List of BreadcrumbItem objects representing the breadcrumb path
        """
        breadcrumbs: List[BreadcrumbItem] = []
        breadcrumbs.append(BreadcrumbItem("NET_HUB", "home", self.current_route == "home"))
        
        route_type, parts = self.parse_route(self.current_route)
        
        if route_type == RouteType.HOME or route_type == RouteType.MIND_MAP or route_type == RouteType.AI_CHAT:
            return breadcrumbs
        
        # Find technology in data
        tech = next((t for t in technologies if t.id == parts[0]), None)
        if not tech:
            return breadcrumbs
        
        breadcrumbs.append(BreadcrumbItem(tech.label, parts[0], route_type == RouteType.TECHNOLOGY))
        
        if len(parts) < 2:
            return breadcrumbs
        
        # Find subtopic
        sub = next((s for s in tech.subs if s.id == parts[1]), None)
        if not sub:
            return breadcrumbs
        
        subtopic_route = f"{parts[0]}/{parts[1]}"
        breadcrumbs.append(BreadcrumbItem(sub.label, subtopic_route, route_type == RouteType.SUBTOPIC))
        
        if len(parts) < 3:
            return breadcrumbs
        
        # Find page
        page = next((p for p in sub.pages if p.id == parts[2]), None)
        if page:
            breadcrumbs.append(BreadcrumbItem(page.label, self.current_route, route_type == RouteType.PAGE))
        
        return breadcrumbs
    
    def get_breadcrumb_dicts(self, technologies: List[Technology]) -> List[dict]:
        """Get breadcrumbs as plain dictionaries (for serialization).
        
        Args:
            technologies: List of Technology objects
            
        Returns:
            List of dictionaries with label, route, is_current keys
        """
        return [item.to_dict() for item in self.build_breadcrumbs(technologies)]
    
    def get_history(self) -> List[str]:
        """Get navigation history.
        
        Returns:
            List of route strings visited
        """
        return self.history.copy()
