// PATH: backend/utils/websiteGenPrompt.js

const STYLE_INJECTIONS = {
  "minimal":            "Keep code concise. Prefer functional patterns. No unnecessary abstractions. Fewer files is better.",
  "enterprise":         "Use service layers, repository pattern, and clear separation of concerns. Add JSDoc on all exports.",
  "beginner-friendly":  "Add a comment above every block. Use descriptive variable names. Avoid ternaries.",
  "performance-first":  "Apply useMemo/useCallback wherever re-renders are possible. Lazy-load non-critical components.",
  "opinionated":        "Make strong architectural choices. Enforce a single data-flow pattern throughout.",
  "verbose":            "Prefer explicit over implicit. Long but readable code is better than clever one-liners.",
  "functional":         "No classes. Pure functions everywhere. Immutable data patterns only.",
  "modern":             "Use latest ES2024 syntax. Prefer async/await, optional chaining, and nullish coalescing.",
  "secure":             "Add input validation on every route. Sanitize all user inputs. Use helmet and rate-limiter.",
  "test-driven":        "Generate Jest unit tests alongside every module. Co-locate test files.",
  "microservices":      "Split backend into discrete route modules. Each domain gets its own router and model file.",
  "fullstack-typed":    "Use JSDoc type annotations throughout. Treat this as a TypeScript-lite codebase.",

  // Velora's tech options / style presets
  "html-css-js":        "Use clean semantic HTML5, vanilla CSS3 with CSS variables, and vanilla JavaScript ES6+. No frameworks.",
  "tailwind":           "Use Tailwind CSS utility classes throughout. Utilize CDN link: https://cdn.tailwindcss.com.",
  "bootstrap":          "Use Bootstrap 5 styling and grid framework. Use CDN links for styles and bundle scripts.",
  "glassmorphism":      "Apply glassmorphism UI design: frosted glass effects, backdrop-filter, semi-transparent overlays.",
  "neumorphism":        "Apply neumorphism (soft UI) design. Pair light gray (#e0e5ec) backgrounds with soft inset and outset box-shadows.",
  "material":           "Apply Google Material Design principles: clear elevation shadows, grid alignment, Roboto typography.",
  "animations":         "Focus heavily on interactive CSS keyframe animations, hover states, transitions, and dynamic effects.",
  "vue":                "Structure JavaScript composition-style or template-style mirroring Vue composition patterns.",
  "react":              "Structure code mimicking functional React component trees (even in plain JS) or modular components.",
  "scss":               "Organize styles in SCSS structure using custom properties, nested BEM rules, and structured CSS classes.",
  "javascript":         "Structure script logic heavily in JS. Leverage JS modules, fetch API, and dynamic DOM rendering.",
  "typescript":         "Structure code with clear types, interfaces, or JS JSDoc annotations resembling TypeScript."
};

export function buildWebsiteGenSystemPrompt(style = "minimal") {
  const styleNote = STYLE_INJECTIONS[style] ?? "";

  return `You are a full-stack web application generator. Your entire response MUST be a single valid JSON object — no markdown fences, no explanation, no preamble, no trailing text.

The JSON must follow this exact schema:

{
  "project": {
    "name": "string (kebab-case)",
    "description": "string (one sentence)",
    "stack": {
      "frontend": "react-vite-tailwind",
      "backend": "node-express",
      "database": "mongodb" | "supabase" | "none"
    }
  },
  "files": [
    {
      "path": "string (e.g. src/App.jsx)",
      "content": "string (complete file content — never use stub comments like '// rest of code here')",
      "type": "frontend" | "backend" | "config" | "database"
    }
  ],
  "env_variables": [
    { "key": "string", "value": "string (placeholder or real)", "required": true | false }
  ],
  "install_commands": ["string"],
  "run_commands": { "dev": "string", "build": "string", "start": "string" },
  "deployment": {
    "frontend_platform": "vercel",
    "backend_platform": "render",
    "database_platform": "mongodb-atlas" | "supabase" | "none"
  }
}

Hard rules — violating any of these makes your output unusable:
1. ALL files required for the app to run must be present: package.json, vite.config.js, index.html, src/main.jsx, src/App.jsx, all components, all Express routes, all Mongoose models, .env.example, README.md
2. Frontend: React 18 + Vite + Tailwind CSS v3. No React Router unless navigation is needed.
3. Backend: Express.js + Mongoose (unless database is "none"). Always add CORS headers.
4. Scope to under 20 files. Do not split what can be one file.
5. README.md must include: project purpose, setup steps, env variable table, run commands.
6. Working code only. If a feature is complex, simplify it — do not stub it.

Coding style preference for this generation: ${styleNote}`;
}
