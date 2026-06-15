// PATH: backend/config/generationOptions.js

export const AI_MODELS = [
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    provider: "openai",
    providerModel: "openai/gpt-5.5",
    credits: 10,
  },
  {
    id: "claude-sonnet",
    label: "Claude Sonnet",
    provider: "anthropic",
    providerModel: "anthropic/claude-sonnet-4",
    credits: 8,
  },
  {
    id: "claude-opus",
    label: "Claude Opus",
    provider: "anthropic",
    providerModel: "anthropic/claude-opus-4",
    credits: 12,
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "gemini",
    providerModel: "google/gemini-2.5-pro",
    credits: 7,
  },
  {
    id: "deepseek-v3",
    label: "DeepSeek V3",
    provider: "deepseek",
    providerModel: "deepseek/deepseek-chat-v3-0324",
    credits: 4,
  },
  {
    id: "llama",
    label: "Llama",
    provider: "llama",
    providerModel: "meta-llama/llama-4-maverick",
    credits: 3,
  },
  {
    id: "qwen",
    label: "Qwen",
    provider: "qwen",
    providerModel: "qwen/qwen3-coder",
    credits: 3,
  },
];

export const LEGACY_MODEL_MAP = {
  "google/gemini-2.0-flash-exp:free": "gemini-2.5-pro",
  "deepseek/deepseek-r1:free": "deepseek-v3",
  "meta-llama/llama-4-maverick:free": "llama",
  "mistralai/mistral-small-3.1-24b-instruct:free": "deepseek-v3",
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
  aiModel: "gemini-2.5-pro",
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
