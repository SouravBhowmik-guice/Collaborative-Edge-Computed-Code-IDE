# Monorepo and DevOps Workflow

Managing a multi-language, full-stack application requires strict DevOps practices. We utilize a Monorepo strategy.

## 1. Repository Structure (Turborepo)
The codebase is housed in a single Git repository organized by Turborepo:
*   `/apps/web`: The React/Vite frontend.
*   `/apps/api-node`: The Node.js MongoDB orchestrator.
*   `/apps/api-python`: The FastAPI AI microservice.
*   `/packages/shared-types`: TypeScript interfaces shared between `/web` and `/api-node`.
*   `/packages/wasm-core`: The raw C++ code and Emscripten build scripts.

## 2. Local Development Loop
1.  **Start Services:** Running `npm run dev` at the root triggers Turborepo to start the Vite frontend, Node server, and Python server in parallel.
2.  **Smart Caching:** If a developer only changes React UI code, Turborepo skips recompiling the C++ Wasm modules, saving significant time.
3.  **Wasm Compilation:** C++ code is compiled using the Emscripten toolchain (`emcc`). The output `.wasm` and `.js` glue code are automatically piped into the React public assets folder.

## 3. CI/CD Pipeline (GitHub Actions)
Every pull request to the `main` branch triggers an automated pipeline:
*   **Step 1: Lint & Test:** Runs ESLint, Prettier, and unit tests across all packages.
*   **Step 2: Wasm Build:** Sets up the Emscripten SDK and compiles the C++ edge-compute modules.
*   **Step 3: Multi-Stage Docker Build:** 
    *   Builds the Python API and Node.js API using multi-stage Dockerfiles.
    *   *Builder Stage:* Installs heavy dependencies (`node_modules`, `pip install`).
    *   *Runtime Stage:* Copies only the compiled code into a lightweight Alpine Linux image to reduce container size and cloud costs.
*   **Step 4: AWS Authentication:** Uses OpenID Connect (OIDC) to securely authenticate GitHub Actions with AWS without hardcoding IAM secrets.
*   **Step 5: Push & Deploy:** 
    *   Pushes Docker images to Amazon Elastic Container Registry (ECR).
    *   Triggers a Vercel deployment for the React frontend.