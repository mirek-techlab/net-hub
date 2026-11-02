"""Storage Manager - Handles persistence of EditableContent and ChatHistory

This module provides a clean abstraction over localStorage for saving and loading
application state without any UI coupling.
"""

import json
from typing import Any, Dict, List, Optional
from network_entities import EditableContent, Link, ChatMessage, ChatHistory


class StorageManager:
    """Manages persistent storage of application data via localStorage abstraction.
    
    Responsibilities:
    - Serialize/deserialize dataclass instances to/from JSON
    - Persist EditableContent (notes + links) by route
    - Persist ChatHistory conversations
    - Handle storage errors gracefully
    """
    
    PREFIX = "nhub_"
    
    @staticmethod
    def serialize_link(link: Link) -> Dict[str, Any]:
        """Convert Link dataclass to dictionary.
        
        Args:
            link: Link instance
            
        Returns:
            Dictionary with url and optional label
        """
        return {"url": link.url, "lbl": link.lbl}
    
    @staticmethod
    def deserialize_link(data: Dict[str, Any]) -> Link:
        """Convert dictionary to Link dataclass.
        
        Args:
            data: Dictionary with url and optional lbl
            
        Returns:
            Link instance
        """
        return Link(url=data["url"], lbl=data.get("lbl"))
    
    @staticmethod
    def serialize_editable_content(content: EditableContent) -> Dict[str, Any]:
        """Convert EditableContent to JSON-serializable dictionary.
        
        Args:
            content: EditableContent instance
            
        Returns:
            Dictionary with route_key, notes, and links array
        """
        return {
            "route_key": content.route_key,
            "notes": content.notes,
            "links": [StorageManager.serialize_link(link) for link in content.links]
        }
    
    @staticmethod
    def deserialize_editable_content(data: Dict[str, Any]) -> EditableContent:
        """Convert dictionary to EditableContent dataclass.
        
        Args:
            data: Dictionary with route_key, notes, links
            
        Returns:
            EditableContent instance
        """
        links = [StorageManager.deserialize_link(link) for link in data.get("links", [])]
        return EditableContent(
            route_key=data["route_key"],
            notes=data.get("notes", ""),
            links=links
        )
    
    @staticmethod
    def serialize_chat_message(msg: ChatMessage) -> Dict[str, str]:
        """Convert ChatMessage to dictionary.
        
        Args:
            msg: ChatMessage instance
            
        Returns:
            Dictionary with role and content
        """
        return {"role": msg.role, "content": msg.content}
    
    @staticmethod
    def deserialize_chat_message(data: Dict[str, str]) -> ChatMessage:
        """Convert dictionary to ChatMessage dataclass.
        
        Args:
            data: Dictionary with role and content
            
        Returns:
            ChatMessage instance
        """
        return ChatMessage(role=data["role"], content=data["content"])
    
    @staticmethod
    def serialize_chat_history(history: ChatHistory) -> List[Dict[str, str]]:
        """Convert ChatHistory to JSON-serializable list.
        
        Args:
            history: ChatHistory instance
            
        Returns:
            List of message dictionaries
        """
        return [StorageManager.serialize_chat_message(msg) for msg in history.messages]
    
    @staticmethod
    def deserialize_chat_history(data: List[Dict[str, str]]) -> ChatHistory:
        """Convert list to ChatHistory dataclass.
        
        Args:
            data: List of message dictionaries
            
        Returns:
            ChatHistory instance
        """
        messages = [StorageManager.deserialize_chat_message(msg) for msg in data]
        return ChatHistory(messages=messages)
    
    @staticmethod
    def save_content(route_key: str, content: EditableContent, store: Dict[str, Any]) -> None:
        """Save EditableContent to store (localStorage abstraction).
        
        Args:
            route_key: Unique identifier for the content
            content: EditableContent instance to save
            store: Storage backend (dict or localStorage-like interface)
        """
        try:
            key = f"{StorageManager.PREFIX}{route_key}"
            serialized = StorageManager.serialize_editable_content(content)
            store[key] = json.dumps(serialized)
        except Exception as e:
            print(f"Error saving content for {route_key}: {e}")
    
    @staticmethod
    def load_content(route_key: str, store: Dict[str, Any]) -> Optional[EditableContent]:
        """Load EditableContent from store.
        
        Args:
            route_key: Unique identifier for the content
            store: Storage backend
            
        Returns:
            EditableContent instance or None if not found
        """
        try:
            key = f"{StorageManager.PREFIX}{route_key}"
            if key in store:
                data = json.loads(store[key])
                return StorageManager.deserialize_editable_content(data)
        except Exception as e:
            print(f"Error loading content for {route_key}: {e}")
        return None
    
    @staticmethod
    def save_chat_history(conversation_id: str, history: ChatHistory, store: Dict[str, Any]) -> None:
        """Save ChatHistory to store.
        
        Args:
            conversation_id: Unique identifier for the conversation
            history: ChatHistory instance to save
            store: Storage backend
        """
        try:
            key = f"{StorageManager.PREFIX}chat_{conversation_id}"
            serialized = StorageManager.serialize_chat_history(history)
            store[key] = json.dumps(serialized)
        except Exception as e:
            print(f"Error saving chat history for {conversation_id}: {e}")
    
    @staticmethod
    def load_chat_history(conversation_id: str, store: Dict[str, Any]) -> Optional[ChatHistory]:
        """Load ChatHistory from store.
        
        Args:
            conversation_id: Unique identifier for the conversation
            store: Storage backend
            
        Returns:
            ChatHistory instance or None if not found
        """
        try:
            key = f"{StorageManager.PREFIX}chat_{conversation_id}"
            if key in store:
                data = json.loads(store[key])
                return StorageManager.deserialize_chat_history(data)
        except Exception as e:
            print(f"Error loading chat history for {conversation_id}: {e}")
        return None
