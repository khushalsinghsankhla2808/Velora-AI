// PATH: frontend/src/components/BrandPanel.jsx
import React, { useState } from "react";
import { Palette, Sparkles, Loader2, AlertCircle, Check, Type, Square, Wand2 } from "lucide-react";
import axios from "axios";

export default function BrandPanel({ projectId, onApplyBrand }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [brandKit, setBrandKit] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const presets = [
    { name: "Neon Cyberpunk", prompt: "A dark cyberpunk theme with vibrant magenta and cyan neon colors." },
    { name: "Sleek SaaS", prompt: "A modern, premium SaaS dashboard with royal indigo, soft slate, and off-white colors." },
    { name: "Cozy Cafe", prompt: "A warm, natural coffee shop theme with earthy browns, cream, and soft forest green." },
    { name: "Eco Health", prompt: "A clean organic theme with fresh mint green, eucalyptus, and crisp white." },
  ];

  const handleGenerateBrand = async (brandPrompt) => {
    const activePrompt = brandPrompt || prompt;
    if (!activePrompt.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${projectId}/brand`,
        { prompt: activePrompt },
        { withCredentials: true }
      );
      if (res.data?.success) {
        setBrandKit(res.data.data);
        if (!brandPrompt) {
          setPrompt("");
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || "Failed to generate brand identity.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!brandKit || !onApplyBrand) return;
    setApplyLoading(true);
    setError("");
    setSuccess("");
    try {
      await onApplyBrand(brandKit);
      setSuccess("Brand settings applied successfully to stylesheet!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to apply brand settings.");
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/40 text-zinc-200 text-xs">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-zinc-900/40 flex items-center gap-2">
        <Palette className="text-purple-400" size={16} />
        <span className="font-semibold text-sm">AI Brand Generator</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-1.5 animate-pulse">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-1.5">
            <Check size={14} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Generate Input */}
        <div className="space-y-3 bg-white/5 border border-white/10 p-3.5 rounded-2xl">
          <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">Brand Concept Prompt</p>
          <div className="space-y-2">
            <textarea
              placeholder="Describe your brand vibe (e.g. 'A futuristic premium dark mode interface with neon purple highlights')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 resize-none"
            />
            <button
              onClick={() => handleGenerateBrand()}
              disabled={loading || !prompt.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 hover:from-indigo-600 hover:to-purple-600 transition disabled:opacity-50 cursor-pointer active:scale-95 shadow-md shadow-purple-500/10"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Sparkles size={14} />
              )}
              Generate Brand Design
            </button>
          </div>
        </div>

        {/* Presets */}
        {!brandKit && !loading && (
          <div className="space-y-2.5">
            <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">Design Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleGenerateBrand(preset.prompt)}
                  className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-left hover:border-white/10 transition group cursor-pointer"
                >
                  <h4 className="font-semibold text-zinc-200 group-hover:text-purple-400 flex items-center gap-1">
                    <Wand2 size={10} />
                    {preset.name}
                  </h4>
                  <p className="text-[9px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                    {preset.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Brand Kit Output */}
        {brandKit && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Color Palette */}
            <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl space-y-3">
              <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">Color Palette</p>
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(brandKit.colors).map(([name, hex]) => (
                  <div key={name} className="flex flex-col items-center gap-1">
                    <div
                      className="w-8 h-8 rounded-lg shadow-inner border border-white/10"
                      style={{ backgroundColor: hex }}
                      title={`${name}: ${hex}`}
                    />
                    <span className="text-[8px] text-zinc-400 font-mono scale-90">{name}</span>
                    <span className="text-[7px] text-zinc-500 font-mono scale-95 uppercase">{hex}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography */}
            <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl space-y-3">
              <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">Typography</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Type size={14} className="text-indigo-400" />
                  <div>
                    <span className="text-[10px] text-zinc-500">Headings:</span>
                    <span className="font-semibold text-zinc-200 ml-1.5">{brandKit.typography.headingFont}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Type size={14} className="text-purple-400" />
                  <div>
                    <span className="text-[10px] text-zinc-500">Body text:</span>
                    <span className="font-semibold text-zinc-200 ml-1.5">{brandKit.typography.bodyFont}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Micro styles */}
            <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl space-y-3">
              <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">Layout Options</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Square size={14} className="text-amber-400" />
                  <div>
                    <span className="text-[10px] text-zinc-500">Border Radius:</span>
                    <span className="font-mono text-zinc-200 ml-1.5 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">
                      {brandKit.styles.borderRadius}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Logo recommendation */}
            <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl space-y-2">
              <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">Logo Recommendation</p>
              <p className="text-[10px] text-zinc-300 leading-relaxed italic">
                {brandKit.logoRecommendation}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setBrandKit(null)}
                className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 font-semibold py-2 rounded-xl text-center cursor-pointer transition"
              >
                Reset Design
              </button>
              <button
                onClick={handleApply}
                disabled={applyLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
              >
                {applyLoading ? (
                  <Loader2 className="animate-spin" size={13} />
                ) : (
                  <Check size={13} />
                )}
                Apply Brand Kit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
