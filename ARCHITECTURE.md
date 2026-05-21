```mermaid
graph TB
    subgraph Entities["🗂️ Data Layer"]
        Page["Page<br/>id, label"]
        SubTopic["SubTopic<br/>id, label, pages[]"]
        Technology["Technology<br/>id, label, col, subs[]"]
        Link["Link<br/>url, lbl"]
        EditableContent["EditableContent<br/>route_key, notes, links[]"]
        ChatMessage["ChatMessage<br/>role, content"]
        ChatHistory["ChatHistory<br/>messages[]"]
        SearchIndex["SearchIndex<br/>t, p, k, v"]
        ViewBox["ViewBox<br/>x, y, w, h"]
    end

    subgraph Storage["💾 Storage Layer"]
        StorageManager["StorageManager<br/>- serialize/deserialize<br/>- save/load content<br/>- save/load chat<br/>- error handling"]
    end

    subgraph API["🔌 API / Business Logic Layer"]
        SearchHandler["SearchHandler<br/>- index search<br/>- filter results<br/>- highlight matches"]
        RouterHandler["RouterHandler<br/>- navigate routes<br/>- build navigation<br/>- breadcrumb logic"]
        ChatHandler["ChatHandler<br/>- send messages<br/>- call LLM API<br/>- format responses"]
        ContentHandler["ContentHandler<br/>- manage pages<br/>- load renderers<br/>- handle tech map"]
    end

    subgraph UI["🎨 UI / Presentation Layer"]
        IndexHTML["index.html<br/>- DOM rendering<br/>- event listeners<br/>- styling"]
    end

    subgraph External["🌐 External Services"]
        LocalStorage["Browser localStorage<br/>or Session Storage"]
        AnthropicAPI["Anthropic Claude API<br/>LLM Chat"]
    end

    %% Dependencies
    Entities -->|imports| StorageManager
    Entities -->|imports| SearchHandler
    Entities -->|imports| RouterHandler
    Entities -->|imports| ChatHandler
    Entities -->|imports| ContentHandler

    StorageManager -->|uses| LocalStorage
    ChatHandler -->|calls| AnthropicAPI

    SearchHandler -->|used by| IndexHTML
    RouterHandler -->|used by| IndexHTML
    ChatHandler -->|used by| IndexHTML
    ContentHandler -->|used by| IndexHTML

    LocalStorage -->|persists| StorageManager

    %% Styling
    classDef dataLayer fill:#e1f5ff,stroke:#01579b,stroke-width:2px,color:#000
    classDef storageLayer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#000
    classDef apiLayer fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px,color:#000
    classDef uiLayer fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000
    classDef external fill:#fce4ec,stroke:#880e4f,stroke-width:2px,color:#000

    class Page,SubTopic,Technology,Link,EditableContent,ChatMessage,ChatHistory,SearchIndex,ViewBox dataLayer
    class StorageManager storageLayer
    class SearchHandler,RouterHandler,ChatHandler,ContentHandler apiLayer
    class IndexHTML uiLayer
    class LocalStorage,AnthropicAPI external
```

## Architecture Overview

**File Structure:**
```
net-hub/
├── network_entities.py       # 🗂️ Pure data models (9 classes)
├── storage_manager.py        # 💾 Persistence layer (JSON serialization)
├── search_handler.py         # 🔍 Search & indexing (next)
├── router_handler.py         # 🛣️ Navigation & routing (next)
├── chat_handler.py           # 💬 AI chat interactions (next)
├── content_handler.py        # 📄 Page rendering logic (next)
├── architecture.md           # 📋 This diagram
└── index.html                # 🎨 UI layer (no business logic)
```

## Key Principles

✅ **Separation of Concerns** - Each layer has single responsibility  
✅ **No Circular Dependencies** - Data layer imports nothing, UI imports all  
✅ **Loose Coupling** - Layers communicate via data objects only  
✅ **Testability** - Each handler can be tested independently  
✅ **Scalability** - New features go into new files, not existing ones  

---

## 📁 Files Created So Far

| File | Status | Purpose |
|------|--------|---------|
| `network_entities.py` | ✅ Uploaded | 9 dataclasses (Page, Technology, ChatHistory, etc.) |
| `storage_manager.py` | ✅ Uploaded | JSON serialization + localStorage abstraction |

**Next Steps:**
1. `search_handler.py` - Search indexing & filtering
2. `router_handler.py` - Navigation & breadcrumb logic
3. `chat_handler.py` - LLM API interactions
4. `content_handler.py` - Page rendering & tech maps

Ready to build the next layer? 🚀
