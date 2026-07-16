# Velora AI — Frontend Client

The modern, high-fidelity user interface for the AI-powered website builder platform.

Interact with the AI, manage your virtual project workspace, edit files side-by-side, preview in real time, and export directly to GitHub or ZIP.

![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Redux](https://img.shields.io/badge/Redux-Toolkit-764ABC?style=flat-square&logo=redux&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)

---

## Key Frontend Features

The Velora AI client is a full-featured online IDE environment, designed to be fast, interactive, and responsive:

- **Interactive AI Assistant Panel** — Describe adjustments in natural language, review suggested revisions, and apply them dynamically.
- **Monaco Code Editor** — Fully featured, tabbed editor powered by the VS Code engine, offering syntax highlighting and auto-formatting.
- **Virtual File Explorer** — Add, remove, and rename files inside a reactive tree layout synced seamlessly with the database.
- **Live Sandbox Preview Engine** — Instantly bundle CSS/JS resources and render the generated application in an isolated sandbox frame on the left.
- **Side-by-Side Diff Previews** — Evaluate AI's proposed file edits in a dual-pane editor before committing or discarding changes.
- **Responsive Bezels** — Quick-switch between Desktop, Tablet (768px), and Mobile (375px) device preview frames.
- **Razorpay Payments UI** — Premium pricing checkout flow verifying and applying token/credit package purchases.
- **AI Error Capture & Debugger** — Captures console exceptions in the preview frame and sends them to the AI to suggest automatic code repairs.
- **Brand Kit Panel** — Interactively customize color schemes, typography, and border radii, immediately propagating them as CSS custom properties.

---

## Tech Stack

- **Core framework:** React 19 (Functional components, hooks, custom state hooks)
- **Build tool & HMR:** Vite 7 (Optimized bundles, lightning-fast HMR)
- **Styling & UI:** Tailwind CSS v4 (Modern CSS variables based configuration, sleek custom animations, dark-theme layout)
- **State Management:** Redux Toolkit & Redux Persist (Centralized user session persistence, credits tracking, workspace active files)
- **Animations:** Framer Motion (Fluid transitions, sidebar toggles, and modal states)
- **Editor & Diffs:** Monaco Editor React Wrapper (`@monaco-editor/react`)
- **Authentication:** Firebase Authentication (Secure Google OAuth popup integration)

---

## Directory Structure

Here are the key directories inside the `frontend/src` directory:

```bash
frontend/src/
├── components/
│   ├── ChatPanel.jsx         # AI chat panel with prompt history and action logs
│   ├── DiffPreviewModal.jsx   # Monaco DiffEditor side-by-side code review modal
│   ├── EditorTabs.jsx        # Navigation tabs for open Monaco editor files
│   ├── FileExplorer.jsx      # Virtual folder structure list and file actions
│   ├── LoginModal.jsx        # Google Authentication modal with embedded vector assets
│   ├── Navbar.jsx            # User profile, login state, and credit balance displays
│   ├── PreviewToolbar.jsx    # Controls for scale, responsive bezels, and links
│   └── ErrorBoundary.jsx     # Catch-all component preventing client crashes
│
├── pages/
│   ├── Home.jsx              # Product marketing and onboarding landing page
│   ├── Dashboard.jsx         # Grid view of user's generated projects
│   ├── Generate.jsx          # Initial prompt screen with generative progress status
│   ├── WebsiteEditor.jsx     # Core IDE layout (left preview, center editor, right chat)
│   ├── Pricing.jsx           # Buy credit plans with Razorpay SDK modal integration
│   └── LiveSite.jsx          # Deployed website viewer
│
├── redux/
│   ├── store.js              # Redux configuration with persistor middlewares
│   └── userSlice.js          # Authentication state, credits balance, and token updates
│
├── firebase.js               # Firebase Client SDK initialization
├── App.jsx                   # Central page routes and navigation wrapper
└── main.jsx                  # React DOM renderer entry point
```

---

## Local Development Setup

### 1. Install Dependencies

Run from the `frontend/` folder:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `frontend/` directory with the following variables:

```env
VITE_SERVER_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id_here
```

### 3. Run Dev Server

Launch the development environment:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Scripts

- `npm run dev` — Launches the Vite server with Hot Module Replacement (HMR).
- `npm run build` — Compiles optimized production assets to the `dist/` directory.
- `npm run lint` — Runs ESLint configuration audits across project files.
- `npm run preview` — Locally hosts the generated production bundle for validation.
- `npm run test` — Runs frontend test suites via Vitest.

---

## Security and Performance Optimizations

- **Firebase Authentication Cross-Origin Policy:** We modified local and production headers to resolve authentication popup blocks by setting `Cross-Origin-Opener-Policy: same-origin-allow-popups`. Restrictive embedder headers (`COEP`) were relaxed to allow communication with the Firebase popups.
- **Asset Isolation:** The Google login button's logo is embedded inside [LoginModal.jsx](file:///d:/AI%20Website%20Builder%20with%20MERN%20Stack/frontend/src/components/LoginModal.jsx) as a high-fidelity inline SVG path. This avoids any external asset fetches or COEP blocks.
