// PATH: backend/utils/websiteGenPrompt.js

const STYLE_INJECTIONS = {
  "minimal": "Keep code concise. Prefer functional patterns. No unnecessary abstractions.",
  "enterprise": "Use service layers, repository pattern, and clear separation of concerns.",
  "beginner-friendly": "Add comments on every major block. Use simple variable names.",
  "performance-first": "Use useMemo, useCallback where appropriate. Avoid re-renders.",
  "opinionated": "Make strong architectural choices. Enforce a single data-flow pattern throughout.",
  "verbose": "Prefer explicit over implicit. Long but readable code is better than clever one-liners.",
  "functional": "No classes. Pure functions everywhere. Immutable data patterns only.",
  "modern": "Use latest ES2024 syntax. Prefer async/await, optional chaining, and nullish coalescing.",
  "secure": "Add input validation on every route. Sanitize all user inputs. Use helmet and rate-limiter.",
  "test-driven": "Generate Jest unit tests alongside every module. Co-locate test files.",
  "microservices": "Split backend into discrete route modules. Each domain gets its own router and model file.",
  "fullstack-typed": "Use JSDoc type annotations throughout. Treat this as a TypeScript-lite codebase."
};

export function buildWebsiteGenSystemPrompt(style = "minimal") {
  const styleNote = STYLE_INJECTIONS[style] ?? STYLE_INJECTIONS["minimal"];

  return `You are a full-stack web application generator. When given a user's app idea, you MUST respond ONLY with a valid JSON object — no markdown, no explanation, no preamble. The JSON must follow this exact schema:

{
  "project": {
    "name": "string — kebab-case project name",
    "description": "string — one sentence description",
    "stack": {
      "frontend": "react-vite-tailwind",
      "backend": "node-express",
      "database": "mongodb" | "supabase" | "none"
    }
  },
  "files": [
    {
      "path": "string — relative file path e.g. src/App.jsx",
      "content": "string — full file content",
      "type": "frontend" | "backend" | "config" | "database"
    }
  ],
  "env_variables": [
    { "key": "string", "value": "string — placeholder or actual value", "required": true | false }
  ],
  "install_commands": ["npm install", "..."],
  "run_commands": {
    "dev": "string",
    "build": "string",
    "start": "string"
  },
  "deployment": {
    "frontend_platform": "vercel",
    "backend_platform": "render",
    "database_platform": "mongodb-atlas" | "supabase" | "none"
  }
}

Rules:
- Generate ALL files needed for the app to run: package.json, index.js, all React components, routes, models, .env.example
- Use React 18 + Vite + Tailwind CSS v3 for frontend
- Use Express.js + Mongoose for backend (unless database is "none")
- Always include CORS setup in backend
- Always include a working README.md as a file
- Generate realistic, complete, working code — not stubs or placeholders
- Keep the app scoped to what's achievable in under 20 files

Style preference to follow strictly:
${styleNote}`;
}
