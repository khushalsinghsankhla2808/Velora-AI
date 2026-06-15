# TODO - Multi-model/Framework AI Website Builder Upgrade

## Step 1 — Repo understanding (done)
- Reviewed current provider layer, controllers, models, routes, and frontend generation/editor pages.

## Step 2 — Backend: Provider normalization + reliability
- Update providers in `backend/services/ai/*` to return `{ success, content, tokensUsed }`.
- Add retry, timeout, provider-specific error handling, and token usage tracking.
- Keep controllers provider-agnostic; use `providerFactory()`.

## Step 3 — Backend: Prompt builder + stack adaptation
- Create shared prompt builder utilities to adapt generation rules for:
  - Framework
  - Styling
  - Backend
  - Complexity level
  - Editing vs generation
- Enforce strict JSON-only output and schema validation.

## Step 4 — Backend: Model-based credit system
- Replace legacy hardcoded credit costs with centralized pricing from `backend/config/generationOptions.js`.
- Implement centralized credit validation before generation/edit.
- Ensure refunds on invalid AI responses.

## Step 5 — Backend: Version control model + logic
- Add `backend/models/websiteVersionModel.js`.
- Implement creation of version 1 on generation.
- Implement new version creation on each edit.
- Implement restore + compare + version fetch.

## Step 6 — Backend: New/updated endpoints (while keeping backward compatibility)
- Implement endpoints:
  - POST /generate (enhanced but legacy payload supported)
  - POST /edit
  - GET /versions/:websiteId
  - GET /version/:versionId
  - POST /restore/:versionId
  - POST /compare
  - GET /models
  - GET /frameworks
  - GET /pricing
- Wire routes and controllers with validation + authentication.

## Step 7 — Backend: Security upgrades
- Add request validation/sanitization for all new endpoints.
- Add prompt injection protection in prompt builder + output validation.
- Enforce credit abuse prevention.

## Step 8 — Database updates (migration-safe)
- Update `backend/models/websiteModel.js` to store:
  - aiModel, framework, styling, backend, complexity, currentVersion
- Add indexes where necessary.

## Step 9 — Frontend: Generation settings panel
- Update `frontend/src/pages/Generate.jsx` to use multi-selectors:
  - AI Model
  - Framework
  - Styling
  - Backend
  - Complexity
- Persist settings and send them to backend.

## Step 10 — Frontend: Version management UI
- Update `frontend/src/pages/WebsiteEditor.jsx` to add:
  - Version history sidebar
  - Restore version action
  - Compare versions view
  - Download version action

## Step 11 — Frontend: Edit existing website via natural language
- Add instruction-based edit UI integration calling POST /api/website/edit.
- Preserve existing editor update behavior.

## Step 12 — Build & smoke testing
- Run backend start + smoke endpoint calls.
- Run frontend build.
- Verify legacy generate/update still work.


