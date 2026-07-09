// PATH: frontend/src/components/MarketplacePanel.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Grid, Search, PlusCircle, Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import axios from "axios";

export default function MarketplacePanel({ projectId, activeFile, onUpdateSuccess }) {
  const [components, setComponents] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Save state
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [compName, setCompName] = useState("");
  const [compDesc, setCompDesc] = useState("");
  const [compCat, setCompCat] = useState("Custom");

  const categories = ["All", "Header", "Footer", "Hero", "Pricing", "Form", "Card", "Navigation", "Custom"];

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (category && category !== "All") params.set("category", category);
      if (search) params.set("search", search);
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/website/marketplace${queryString}`,
        { withCredentials: true }
      );
      if (res.data?.success) {
        setComponents(res.data.data.components || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch marketplace components.");
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchComponents();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchComponents]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComponents();
  };

  const handleSaveToMarketplace = async (e) => {
    e.preventDefault();
    if (!compName.trim() || !activeFile) return;

    setSaveLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/marketplace`,
        {
          name: compName,
          description: compDesc,
          category: compCat,
          code: activeFile.content,
        },
        { withCredentials: true }
      );
      if (res.data?.success) {
        setCompName("");
        setCompDesc("");
        setShowSaveForm(false);
        setSuccess("Component saved to Marketplace successfully!");
        await fetchComponents();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to publish component.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleImport = async (componentId) => {
    if (importingId) return;
    setImportingId(componentId);
    setError("");
    setSuccess("");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${projectId}/marketplace/${componentId}/import`,
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        setSuccess("Component imported successfully into explorer!");
        const { latestCode } = res.data.data;
        if (onUpdateSuccess) {
          onUpdateSuccess({ latestCode, remainingCredits: null });
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to import component.");
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/40 text-zinc-200 text-xs">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-zinc-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid className="text-purple-400" size={16} />
          <span className="font-semibold text-sm">Component Marketplace</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-1.5 animate-pulse">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-1.5">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Save Current File */}
        {activeFile && (
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider">Publish Element</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Save active tab code to gallery</p>
              </div>
              {!showSaveForm && (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="bg-white/10 hover:bg-white/20 border border-white/5 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <PlusCircle size={12} /> Share File
                </button>
              )}
            </div>

            {showSaveForm && (
              <form onSubmit={handleSaveToMarketplace} className="space-y-2.5 pt-2 border-t border-white/5">
                <input
                  type="text"
                  placeholder="Component Name (e.g. Modern Pricing Card)"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
                  required
                />
                <input
                  type="text"
                  placeholder="Short description"
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
                />
                <div className="flex gap-2">
                  <select
                    value={compCat}
                    onChange={(e) => setCompCat(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    {categories.slice(1).map(c => (
                      <option key={c} value={c} className="bg-zinc-900">{c}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={saveLoading || !compName.trim()}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    {saveLoading ? <Loader2 className="animate-spin" size={13} /> : "Publish"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSaveForm(false)}
                  className="w-full text-center text-zinc-500 hover:text-zinc-300 py-1"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        )}

        {/* Search / Category Filter */}
        <div className="space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={13} />
            <input
              type="text"
              placeholder="Search components..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
            />
          </form>

          {/* Categories Horizontal scrolling */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
            {categories.map((c) => {
              const isSelected = (c === "All" && !category) || category === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c === "All" ? "" : c)}
                  className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-purple-600/15 border-purple-500/30 text-purple-300"
                      : "bg-white/0 border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Components Grid */}
        <div className="space-y-3 pt-2">
          <p className="font-semibold text-[10px] text-zinc-400 uppercase tracking-wider">Browse Components ({components.length})</p>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-zinc-500">
              <Loader2 className="animate-spin text-purple-500 mr-2" size={16} />
              Loading gallery...
            </div>
          ) : components.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 italic">No components found.</div>
          ) : (
            <div className="space-y-3">
              {components.map((comp) => (
                <div key={comp._id} className="bg-white/5 border border-white/5 hover:border-white/10 p-3.5 rounded-2xl transition space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-zinc-100">{comp.name}</h4>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider mt-0.5">{comp.category}</p>
                    </div>
                    <button
                      onClick={() => handleImport(comp._id)}
                      disabled={importingId !== null}
                      className="p-1.5 rounded-lg bg-purple-600/15 border border-purple-500/30 text-purple-300 hover:text-purple-200 transition cursor-pointer flex items-center gap-1 text-[10px]"
                    >
                      {importingId === comp._id ? (
                        <Loader2 className="animate-spin" size={11} />
                      ) : (
                        <Download size={11} />
                      )}
                      Import
                    </button>
                  </div>
                  {comp.description && (
                    <p className="text-zinc-400 text-[10px] leading-relaxed">{comp.description}</p>
                  )}
                  {comp.authorId && (
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5 text-[9px] text-zinc-500">
                      <span>By {comp.authorId.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
