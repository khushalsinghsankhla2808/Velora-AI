// PATH: frontend/src/pages/Generate.jsx
import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setUserData } from "../redux/userSlice";

const CODE_OPTIONS = [
  { value: "html-css-js", label: "HTML, CSS & JavaScript" },
  { value: "javascript", label: "JavaScript focused" },
  { value: "typescript", label: "TypeScript style" },
  { value: "react", label: "React-style components" },
  { value: "tailwind", label: "Tailwind-style CSS" },
];

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
  const [codePreference, setCodePreference] = useState("html-css-js");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [error, setError] = useState("");

  const handleGenerateWebsite = async () => {
    try {
      setLoading(true);
      setPhaseIndex(0);
      setProgress(0);
      setError("");

      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/generate`,
        { prompt, codePreference },
        { withCredentials: true },
      );

      setProgress(100);
      dispatch(
        setUserData({ ...userData, credits: res.data.remainingCredits }),
      );
      navigate("/editor/" + res.data.websiteId);
    } catch (error) {
      setError(error.response?.data?.message || "Something went wrong");
    } finally {
      setPhaseIndex(0);
      setProgress(0);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      return undefined;
    }

    let value = 0;
    const interval = setInterval(() => {
      let increment = Math.random() * 8 + 4;

      if (value < 20) {
        increment *= 1.5;
      } else if (value < 60) {
        increment *= 1.2;
      } else {
        increment *= 0.6;
      }

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

  return (
    <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-25rem h-25rem bg-linear-to-b from-white/20 via-white/10 to-transparent blur-3xl opacity-40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-25rem h-25rem bg-white/20 rounded-full blur-[150px]" />
      </div>

      <header className="sticky top-0 z-20 backdrop-blur bg-black/50 border-b border-white/10 h-16">
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <p className="font-semibold">Velora AI</p>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Build Website with <br />
            <span className="bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Real AI Power
            </span>
          </h1>
          <p className="mt-5 text-zinc-400">
            This process may take several minutes. Velora AI focuses on quality.
          </p>
        </motion.div>

        <section className="mt-14">
          <div className="mb-5 grid gap-4 md:grid-cols-[1fr_18rem] md:items-end">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Describe Your Website
              </h2>
              <p className="text-sm text-zinc-400">
                Choose how you want the generated code to be structured.
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">
                Programming Preference
              </span>
              <select
                value={codePreference}
                onChange={(e) => setCodePreference(e.target.value)}
                disabled={loading}
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {CODE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-zinc-950 text-white"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-56 p-6 rounded-3xl bg-black/60 border border-white/10 outline-none resize-none text-sm focus:ring-2 focus:ring-white/20"
            placeholder="Describe your website in detail..."
          />
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <div className="mt-8 flex justify-center">
            <motion.button
              disabled={!prompt.trim() || loading}
              onClick={handleGenerateWebsite}
              whileHover={{ scale: !prompt.trim() || loading ? 1 : 1.05 }}
              whileTap={{ scale: !prompt.trim() || loading ? 1 : 0.96 }}
              className={`px-14 py-4 rounded-2xl font-semibold text-lg transition ${
                !prompt.trim() || loading
                  ? "bg-white/20 text-zinc-400 cursor-not-allowed"
                  : "bg-white text-black"
              }`}
            >
              Generate Website
            </motion.button>
          </div>

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto mt-8"
            >
              <div className="flex justify-between text-xs text-zinc-400 mb-3">
                <span>{PHASES[phaseIndex]}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-linear-to-r from-white to-zinc-300"
                />
              </div>
              <p className="mt-3 text-center text-xs text-zinc-400">
                Estimated time remaining: ~8-12 minutes
              </p>
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Generate;
