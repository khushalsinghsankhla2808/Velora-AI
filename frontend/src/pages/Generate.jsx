// PATH: frontend/src/pages/Generate.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../redux/userSlice";
import axios from "axios";

// ─── AI Model Options ─────────────────────────────────────────────────────────
const AI_MODELS = [
  {
    label: "Gemini 2.0 Flash — Fast & Smart",
    value: "google/gemini-2.0-flash-exp:free",
  },
  {
    label: "DeepSeek R1 — Deep & Detailed",
    value: "deepseek/deepseek-r1:free",
  },
  {
    label: "Llama 4 Maverick — Creative",
    value: "meta-llama/llama-4-maverick:free",
  },
  {
    label: "Mistral Small — Reliable & Quick",
    value: "mistralai/mistral-small-3.1-24b-instruct:free",
  },
];

// ─── Tech Stack Options ───────────────────────────────────────────────────────
const TECH_OPTIONS = [
  { label: "HTML, CSS & JavaScript", value: "html" },
  { label: "Tailwind CSS", value: "tailwind" },
];

// ─── Progress Phases ──────────────────────────────────────────────────────────
const PHASES = [
  "Analyzing your idea...",
  "Designing layout and structure...",
  "Writing HTML and CSS...",
  "Adding animations and interactions...",
  "Final quality checks...",
];

const Generate = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].value);
  const [selectedTech, setSelectedTech] = useState(TECH_OPTIONS[0].value);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [error, setError] = useState("");

  // ─── Progress Bar Logic ───────────────────────────────────────────────────
  // ✅ Fixed — no direct setState in effect body
  useEffect(() => {
    if (!loading) return;

    let value = 0;
    const interval = setInterval(() => {
      const increment =
        value < 20
          ? Math.random() * 3 * 1.5
          : value < 60
            ? Math.random() * 3 * 1.2
            : Math.random() * 3 * 0.4;

      value = Math.min(value + increment, 93);
      const phase = Math.min(
        Math.floor((value / 100) * PHASES.length),
        PHASES.length - 1,
      );

      setProgress(Math.floor(value));
      setPhaseIndex(phase);
    }, 1200);

    return () => clearInterval(interval);
  }, [loading]);

  // ─── Handle Generate ──────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      setLoading(true);
      setError("");
      setProgress(0); // ✅ reset here instead
      setPhaseIndex(0); // ✅ reset here instead

      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/generate`,
        {
          prompt: `${prompt}. Use ${selectedTech === "tailwind" ? "Tailwind CSS via CDN" : "plain HTML, CSS and JavaScript"}.`,
          model: selectedModel,
        },
        { withCredentials: true },
      );

      setProgress(100);

      dispatch(
        setUserData({
          ...userData,
          credits: res.data.remainingCredits,
        }),
      );

      setTimeout(() => {
        navigate("/editor/" + res.data.websiteId);
      }, 500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 px-6 flex items-center gap-3 border-b border-white/10 bg-black/50 backdrop-blur">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-xl hover:bg-white/10 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-lg">Velora AI</span>
      </header>

      {/* Light Beam Effect */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-600px h-300px">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-400px h-300px bg-linear-to-b from-white/20 via-white/10 to-transparent blur-3xl opacity-40 rounded-full" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200px h-200px bg-white/20 rounded-full blur-[150px]" />
      </div>

      {/* Body */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-16 relative z-10">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
            Build Website with <br />
            <span className="bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Real AI Power
            </span>
          </h1>
          <p className="text-zinc-400 text-lg">
            This process may take several minutes. Velora AI focuses on quality.
          </p>
        </motion.div>

        {/* Selectors Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          {/* AI Model Selector */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-zinc-400 font-medium px-1">
              AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 cursor-pointer"
            >
              {AI_MODELS.map((m) => (
                <option
                  key={m.value}
                  value={m.value}
                  className="bg-[#111] text-white"
                >
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tech Stack Selector */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-zinc-400 font-medium px-1">
              Programming Preference
            </label>
            <select
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 cursor-pointer"
            >
              {TECH_OPTIONS.map((t) => (
                <option
                  key={t.value}
                  value={t.value}
                  className="bg-[#111] text-white"
                >
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Prompt Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-4"
        >
          <label className="block text-xl font-semibold mb-1">
            Describe Your Website
          </label>
          <p className="text-zinc-500 text-sm mb-3">
            Choose how you want the generated code to be structured.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            placeholder="Describe your website in detail..."
            className="w-full h-56 px-6 py-5 rounded-3xl bg-black/60 border border-white/10 text-white text-sm outline-none resize-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-600 disabled:opacity-50"
          />
        </motion.div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm mb-4 text-center"
          >
            {error}
          </motion.p>
        )}

        {/* Generate Button */}
        <div className="flex justify-center mb-8">
          <motion.button
            onClick={handleGenerate}
            disabled={!prompt.trim() || loading}
            whileHover={{ scale: !prompt.trim() || loading ? 1 : 1.05 }}
            whileTap={{ scale: !prompt.trim() || loading ? 1 : 0.96 }}
            className={`px-14 py-4 rounded-2xl font-semibold text-lg transition ${
              !prompt.trim() || loading
                ? "bg-white/20 text-zinc-400 cursor-not-allowed"
                : "bg-white text-black hover:bg-zinc-100"
            }`}
          >
            {loading ? "Generating..." : "Generate Website"}
          </motion.button>
        </div>

        {/* Progress Bar */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            {/* Phase + Percentage */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-zinc-400 italic">
                {PHASES[phaseIndex]}
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                {progress}%
              </span>
            </div>

            {/* Bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full bg-linear-to-r from-white to-zinc-300 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>

            {/* Time estimate */}
            <p className="text-center text-xs text-zinc-500">
              Estimated time remaining: ~8–12 minutes
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Generate;
