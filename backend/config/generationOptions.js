// PATH: backend/config/generationOptions.js

export const AI_MODELS = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "gemini",
    providerModel: "google/gemini-2.5-flash",
    credits: 5,
  },
];

export const LEGACY_MODEL_MAP = {
  "google/gemini-2.0-flash-exp:free": "gemini-2.5-flash",
  "deepseek/deepseek-r1:free": "gemini-2.5-flash",
  "meta-llama/llama-4-maverick:free": "gemini-2.5-flash",
  "mistralai/mistral-small-3.1-24b-instruct:free": "gemini-2.5-flash",
  "google/gemini-2.5-pro": "gemini-2.5-flash",
  "gpt-5.5": "gemini-2.5-flash",
  "claude-sonnet": "gemini-2.5-flash",
  "claude-opus": "gemini-2.5-flash",
  "deepseek-v3": "gemini-2.5-flash",
  "llama": "gemini-2.5-flash",
  "qwen": "gemini-2.5-flash",
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
  aiModel: "gemini-2.5-flash",
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
