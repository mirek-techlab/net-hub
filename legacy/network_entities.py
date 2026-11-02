"""Data models for NET_HUB Network Engineering Knowledge Base"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Page:
    """Represents a single page/topic in the knowledge base"""
    id: str
    label: str


@dataclass
class SubTopic:
    """Represents a sub-category within a technology"""
    id: str
    label: str
    pages: List[Page] = field(default_factory=list)


@dataclass
class Technology:
    """Represents a major technology category (Cisco, F5, etc.)"""
    id: str
    label: str
    col: str  # hex color code
    subs: List[SubTopic] = field(default_factory=list)


@dataclass
class SearchIndex:
    """Represents a searchable entry in the knowledge base"""
    t: str  # title
    p: str  # page route
    k: str  # keywords
    v: str  # value/description


@dataclass
class Link:
    """Represents a reference link"""
    url: str
    lbl: Optional[str] = None  # label (optional)


@dataclass
class EditableContent:
    """Represents notes and links for a specific route"""
    route_key: str
    notes: str = ""
    links: List[Link] = field(default_factory=list)


@dataclass
class ViewBox:
    """Represents SVG viewBox state for mind map"""
    x: float
    y: float
    w: float
    h: float


@dataclass
class ChatMessage:
    """Represents a single chat message"""
    role: str  # 'user' or 'assistant'
    content: str


@dataclass
class ChatHistory:
    """Represents chat conversation history"""
    messages: List[ChatMessage] = field(default_factory=list)
    
    def add_message(self, role: str, content: str) -> None:
        """Add a message to history"""
        self.messages.append(ChatMessage(role=role, content=content))
