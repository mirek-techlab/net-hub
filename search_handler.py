"""Search Handler - Full-text indexing and search with relevance ranking

This module manages search indexing for all content and provides intelligent
full-text search with relevance scoring. Pure business logic, zero UI coupling.
"""

from typing import List, Dict
from network_entities import Technology, SubTopic, Page, SearchIndex, EditableContent


class SearchHandler:
    """Manages search indexing and query execution with relevance ranking.
    
    Responsibilities:
    - Build searchable index from Technology/SubTopic/Page objects
    - Index EditableContent (notes and links)
    - Execute full-text search queries
    - Score and rank results by relevance
    """
    
    def __init__(self, technologies: List[Technology]):
        """Initialize search handler and build index.
        
        Args:
            technologies: List of Technology objects from data layer
        """
        self.technologies = technologies
        self.index: List[SearchIndex] = []
        self.content_cache: Dict[str, EditableContent] = {}
        self._build_index()
    
    def _build_index(self) -> None:
        """Build flat search index from all Technology/SubTopic/Page objects."""
        self.index = []
        
        for tech in self.technologies:
            # Index technology
            self.index.append(SearchIndex(
                t=tech.label,
                p=tech.id,
                k=f"{tech.label.lower()} technology vendor",
                v=f"Technology: {tech.label}"
            ))
            
            # Index subtopics and pages
            for sub in tech.subs:
                self.index.append(SearchIndex(
                    t=sub.label,
                    p=f"{tech.id}/{sub.id}",
                    k=f"{sub.label.lower()} {tech.label.lower()}",
                    v=f"{tech.label} → {sub.label}"
                ))
                
                for page in sub.pages:
                    route = f"{tech.id}/{sub.id}/{page.id}"
                    keywords = f"{page.label.lower()} {sub.label.lower()} {tech.label.lower()}"
                    
                    # Add cached content keywords
                    if route in self.content_cache:
                        cached = self.content_cache[route]
                        keywords += f" {cached.notes.lower()}"
                        for link in cached.links:
                            if link.lbl:
                                keywords += f" {link.lbl.lower()}"
                    
                    self.index.append(SearchIndex(
                        t=page.label,
                        p=route,
                        k=keywords,
                        v=f"{tech.label} → {sub.label} → {page.label}"
                    ))
    
    def update_content_cache(self, content: EditableContent) -> None:
        """Update cached content and rebuild index.
        
        Args:
            content: EditableContent object with notes and links
        """
        self.content_cache[content.route_key] = content
        self._build_index()
    
    def _calculate_score(self, query_lower: str, index_item: SearchIndex) -> int:
        """Calculate relevance score for a search result.
        
        Args:
            query_lower: Lowercase query string
            index_item: SearchIndex entry to score
            
        Returns:
            Relevance score (higher is better)
        """
        score = 0
        
        # Exact title match: 100 points
        if query_lower == index_item.t.lower():
            score += 100
        # Title contains query: 50 points
        elif query_lower in index_item.t.lower():
            score += 50
        
        # Keyword match: 10 points per keyword occurrence
        keywords_lower = index_item.k.lower()
        score += keywords_lower.count(query_lower) * 10
        
        # Description/value match: 5 points
        if query_lower in index_item.v.lower():
            score += 5
        
        return score
    
    def execute_search(self, query_string: str, limit: int = 10) -> List[Dict]:
        """Execute full-text search with relevance ranking.
        
        Args:
            query_string: User search query
            limit: Maximum results to return (default: 10)
            
        Returns:
            List of result dictionaries sorted by relevance
        """
        if not query_string or not query_string.strip():
            return []
        
        query_lower = query_string.strip().lower()
        results = []
        
        # Score all index items
        for item in self.index:
            score = self._calculate_score(query_lower, item)
            
            if score > 0:
                results.append({
                    "title": item.t,
                    "route": item.p,
                    "description": item.v,
                    "keywords": item.k,
                    "score": score
                })
        
        # Sort by score descending, then by title
        results.sort(key=lambda x: (-x["score"], x["title"]))
        
        return results[:limit]
    
    def get_all_indexed_routes(self) -> List[str]:
        """Get all indexed route paths.
        
        Returns:
            List of route strings
        """
        return [item.p for item in self.index]
