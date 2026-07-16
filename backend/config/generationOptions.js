// PATH: backend/config/generationOptions.js

export const AI_MODELS = [
  {
    id: "mistral-large",
    label: "Mistral Large",
    provider: "mistral",
    providerModel: "mistral-large-latest",
    credits: 5,
  },
];

export const LEGACY_MODEL_MAP = {
  "local-builder": "mistral-large",
  "gemini-2.0-flash": "mistral-large",
  "google/gemini-2.0-flash-exp:free": "mistral-large",
  "deepseek/deepseek-r1:free": "mistral-large",
  "meta-llama/llama-4-maverick:free": "mistral-large",
  "mistralai/mistral-small-3.1-24b-instruct:free": "mistral-large",
  "google/gemini-2.5-pro": "mistral-large",
  "google/gemini-2.5-flash": "mistral-large",
  "gpt-5.5": "mistral-large",
  "claude-sonnet": "mistral-large",
  "claude-opus": "mistral-large",
  "deepseek-v3": "mistral-large",
  "llama": "mistral-large",
  "qwen": "mistral-large",
};

export const FRAMEWORKS = [
  { id: "react", label: "React" },
  { id: "next", label: "Next.js" },
  { id: "vue", label: "Vue" },
  { id: "nuxt", label: "Nuxt" },
  { id: "angular", label: "Angular" },
  { id: "svelte", label: "Svelte" },
  { id: "astro", label: "Astro" },
  { id: "html", label: "HTML/CSS/JS" },
];

export const STYLING_OPTIONS = [
  { id: "tailwind", label: "Tailwind" },
  { id: "shadcn", label: "ShadCN" },
  { id: "material-ui", label: "Material UI" },
  { id: "chakra-ui", label: "Chakra UI" },
  { id: "bootstrap", label: "Bootstrap" },
  { id: "custom-css", label: "Custom CSS" },
];

export const BACKEND_OPTIONS = [
  { id: "none", label: "None" },
  { id: "express", label: "Express" },
  { id: "nestjs", label: "NestJS" },
  { id: "fastapi", label: "FastAPI" },
  { id: "django", label: "Django" },
  { id: "laravel", label: "Laravel" },
];

export const COMPLEXITY_LEVELS = [
  { id: "simple", label: "Simple" },
  { id: "standard", label: "Standard" },
  { id: "advanced", label: "Advanced" },
];

export const DEFAULT_GENERATION_SETTINGS = {
  aiModel: "mistral-large",
  framework: "html",
  styling: "custom-css",
  backend: "none",
  complexity: "standard",
};

const optionIds = (options) => new Set(options.map((option) => option.id));

const modelIds = optionIds(AI_MODELS);
const frameworkIds = optionIds(FRAMEWORKS);
const stylingIds = optionIds(STYLING_OPTIONS);
const backendIds = optionIds(BACKEND_OPTIONS);
const complexityIds = optionIds(COMPLEXITY_LEVELS);

export const getModelConfig = (value) => {
  const normalized = LEGACY_MODEL_MAP[value] || value || DEFAULT_GENERATION_SETTINGS.aiModel;
  return AI_MODELS.find((model) => model.id === normalized) || null;
};

export const normalizeGenerationSettings = (settings = {}) => {
  const aiModel = getModelConfig(settings.aiModel || settings.model)?.id;
  const framework = frameworkIds.has(settings.framework)
    ? settings.framework
    : DEFAULT_GENERATION_SETTINGS.framework;
  const styling = stylingIds.has(settings.styling)
    ? settings.styling
    : DEFAULT_GENERATION_SETTINGS.styling;
  const backend = backendIds.has(settings.backend)
    ? settings.backend
    : DEFAULT_GENERATION_SETTINGS.backend;
  const complexity = complexityIds.has(settings.complexity)
    ? settings.complexity
    : DEFAULT_GENERATION_SETTINGS.complexity;

  return {
    aiModel: modelIds.has(aiModel) ? aiModel : DEFAULT_GENERATION_SETTINGS.aiModel,
    framework,
    styling,
    backend,
    complexity,
  };
};

export const getPublicGenerationOptions = () => ({
  models: AI_MODELS.map(({ id, label, credits }) => ({ id, label, credits })),
  frameworks: FRAMEWORKS,
  styling: STYLING_OPTIONS,
  backends: BACKEND_OPTIONS,
  complexity: COMPLEXITY_LEVELS,
});
