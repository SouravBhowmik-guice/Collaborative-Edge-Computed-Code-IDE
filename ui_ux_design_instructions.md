# UI/UX Design & Implementation Instructions
**Project:** Collaborative Edge-Computed Code IDE  
**Target Platform:** Web Browser (Desktop Optimized)

## 1. Design Philosophy
The primary goal of an Integrated Development Environment (IDE) is to keep the developer in a state of flow. The UI must be **invisible, responsive, and highly legible**. 
*   **Dark-Theme First:** To reduce eye strain during long coding sessions, the application will default to a dark theme.
*   **High Contrast:** Syntax highlighting and critical AI suggestions must stand out against the background.
*   **Spatial Consistency:** Panes, terminals, and sidebars should be resizable but maintain a rigid overarching grid.

## 2. Color System (Dark Theme Default)
We will utilize a specialized color palette tailored for coding environments. CSS Variables should be mapped to Tailwind CSS configuration.

*   **Backgrounds:**
    *   `App Background`: `#0D1117` (Deep space gray/black - used for the outermost container)
    *   `Editor Background`: `#161B22` (Slightly lighter - used for the Monaco Editor canvas)
    *   `Sidebar/Terminal`: `#010409` (Darkest shade - used for file explorers and output panes)
*   **Accents & Typography:**
    *   `Primary Accent`: `#2F81F7` (Vibrant blue - for active tabs, selected files, primary buttons)
    *   `Primary Text`: `#E6EDF3` (Soft white - high readability)
    *   `Muted Text`: `#8B949E` (Gray - for line numbers, inactive tabs, placeholder text)
*   **Semantic Feedback & Syntax:**
    *   `Success/String`: `#3FB950` (Green)
    *   `Warning/Keyword`: `#D29922` (Yellow/Orange)
    *   `Error/Danger`: `#F85149` (Red)
    *   `AI/Magic`: `#A371F7` (Purple - exclusively used for AWS Bedrock AI suggestions and UI elements)

## 3. Typography
Two distinct font families are required to separate the UI shell from the code canvas.

*   **UI Shell (Sans-Serif):** `Inter` or `system-ui`. Used for menus, file names, chat interfaces, and buttons.
    *   *Weights:* Regular (400) for text, Medium (500) for file names, Semibold (600) for section headers.
*   **Code & Terminal (Monospace):** `JetBrains Mono` or `Fira Code`. Crucial for code readability. 
    *   *Feature requirement:* Must support programming ligatures (e.g., transforming `=>` into an arrow).

## 4. Layout Architecture (CSS Grid/Flexbox)
The layout is a full-screen, non-scrolling single-page application (100vh/100vw), divided into discrete, resizable panes.

1.  **Top Navigation Bar (Height: 48px):** Contains the project name, current user avatars (for multiplayer status), and the "Run/Execute" action button.
2.  **Left Activity Bar (Width: 48px):** Iconic navigation to switch between File Explorer, Search, AI Assistant, and Architecture Canvas.
3.  **Primary Sidebar (Width: 250px, Resizable):** Contextual content based on the Activity Bar selection (e.g., the file tree).
4.  **Editor Group (Flex 1):** The central work area. Features a tabbed navigation bar at the top and the Monaco Editor spanning the remaining space.
5.  **Bottom Panel (Height: 30%, Resizable):** Houses the Wasm Output Terminal, system logs, and error outputs.

## 5. Specific Component Guidelines

### A. Multiplayer Collaboration Cursors
*   Other users' cursors must be rendered as custom styled `<div>` elements overlaid on the Monaco editor.
*   Assign a distinct, bright color (e.g., Neon Pink, Cyan, Lime) to each connected user based on their session ID.
*   Display a small tooltip above the cursor with the user's name that fades out after 2 seconds of inactivity.

### B. AI Pair Programmer Interface
*   **Location:** Integrated into the right-hand sidebar or as a floating, draggable modal.
*   **Styling:** Use the `AI/Magic` purple accent to differentiate AI text from user code.
*   **Animation:** Because the text is streamed via Server-Sent Events (SSE), implement a blinking text cursor at the end of the incoming stream to visually indicate that generation is in progress.

### C. Wasm Execution Terminal
*   **Look & Feel:** Must mimic a native CLI (Command Line Interface).
*   **Font:** Strictly monospace. No margins between lines (`line-height: 1.2`).
*   **Interaction:** Read-only for stdout/stderr logs, with an explicit input line ending in a `$` prompt if interactive stdin is required by the C++ script.

## 6. Implementation Strategy (Tailwind CSS)
To execute this design efficiently within the React frontend:
1.  Initialize Tailwind CSS and configure `tailwind.config.js` to extend the color palette and font families defined above.
2.  Use Tailwind's flexbox utilities (`flex`, `flex-col`, `flex-1`) extensively to manage the complex, full-screen layout panes.
3.  Apply `overflow-hidden` to the root `#root` div to prevent accidental browser scrolling, delegating `overflow-y-auto` only to specific inner containers like the file explorer or terminal output.