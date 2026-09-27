# System Architecture Design

## 1. High-Level Overview
The system employs a distributed microservices architecture tailored for edge computing and real-time synchronization. The heavy lifting is decoupled from the cloud and pushed to the client-side browser using WebAssembly. 

## 2. Architectural Layers

### A. The Edge Client (Frontend)
*   **Framework:** React + TypeScript + Vite.
*   **Editor:** Monaco Editor (the core of VS Code) integrated into the React DOM.
*   **Compute Engine:** C++ applications and interpreters (like CPython) compiled to WebAssembly. Code written by the user is passed into the Wasm memory space and executed locally.
*   **Security:** Wasm operates in a capability-based sandbox. Malicious code cannot access the user's local file system or network.

### B. Real-Time Synchronization Layer
*   **Protocol:** WebSockets (Bi-directional).
*   **Engine:** Supabase Realtime.
*   **Mechanism:** Uses Yjs or Automerge (CRDT libraries). When User A and User B edit the same file, the CRDT algorithm mathematically resolves the state changes and broadcasts them via Supabase WebSockets, preventing conflicts.

### C. Artificial Intelligence Layer
*   **Backend:** Python (FastAPI).
*   **Integration:** AWS Bedrock (Foundation Models) & LangChain.
*   **Transport:** Server-Sent Events (SSE). The Python microservice receives prompts, queries the LLM, and yields chunks of text back to the React client via an `EventSource` connection for a typewriter-like effect.

### D. Data Persistence & Orchestration Layer
*   **User Data & Projects:** Node.js orchestrator communicating with MongoDB for flexible, schema-less project configurations and user profiles.
*   **Vector Search (RAG):** Supabase (PostgreSQL with `pgvector`) stores embeddings of AWS/coding documentation to ground the AI's responses.

## 3. Data Flow Diagram
1. **User Types Code** -> Monaco Editor updates local state.
2. **Local State** -> CRDT Engine calculates delta -> Broadcasts via Supabase WebSocket.
3. **Execution** -> User clicks "Run" -> Code string is passed to WebAssembly C++ runtime -> Outputs result directly to UI (No backend involved).
4. **AI Help** -> User highlights code -> Frontend sends HTTP request -> Python FastAPI queries AWS Bedrock -> Response streamed via SSE back to client.