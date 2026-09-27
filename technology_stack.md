# Technology Stack Specification

This project leverages a highly specific, modern stack to ensure high performance, security, and developer ergonomics.

## 1. Programming Languages
*   **TypeScript:** Primary language for the React frontend and Node.js backend. Ensures end-to-end type safety.
*   **HTML/CSS:** For UI structuring and styling (often via Tailwind CSS within the React components).
*   **C++:** Used for writing performance-critical modules or algorithms that are subsequently compiled down to WebAssembly.
*   **Python:** The industry standard for AI. Used strictly for the AI microservice interfacing with AWS Bedrock.

## 2. Frameworks & Libraries
*   **React:** UI component library.
*   **Vite:** Build tool and development server, chosen for its lightning-fast Hot Module Replacement (HMR).
*   **Node.js:** Backend runtime for the primary API gateway and project management logic.
*   **WebAssembly (Wasm):** The compilation target for C++ to enable native-speed execution in the browser.

## 3. Databases & Backend Services
*   **MongoDB:** Document database used for storing flexible project metadata, user profiles, and application logs.
*   **Supabase:** Serves a dual purpose:
    *   *Realtime:* Handles WebSocket connections for CRDT-based multiplayer syncing.
    *   *pgvector:* PostgreSQL extension used as a vector database for Retrieval-Augmented Generation (RAG) for the AI assistant.

## 4. Cloud, Deployment & Containerization
*   **Docker:** Containerizes the Node.js and Python microservices to ensure environment consistency across dev and production.
*   **Vercel:** Edge network hosting for the static React/Vite frontend.
*   **AWS Academy Generative AI Foundations (Amazon Bedrock):** The managed service providing access to top-tier Large Language Models (LLMs) with enterprise guardrails.
*   **AWS ECR/ECS or Lambda:** For hosting the Dockerized backend microservices.

## 5. Developer Tools & Build Systems
*   **Turborepo:** Monorepo build system to manage the frontend, backend, and shared TypeScript types in one Git repository.
*   **Git / GitHub:** Version control and CI/CD hosting.
*   **Visual Studio Code:** Primary IDE for development.