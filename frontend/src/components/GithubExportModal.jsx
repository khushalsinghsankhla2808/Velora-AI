// PATH: frontend/src/components/GithubExportModal.jsx
import React, { useState } from "react";
import { X, Github, Key, ExternalLink, CheckCircle2, AlertTriangle, Loader2, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

/**
 * GithubExportModal Component
 * Prompts user for details to export their project directly to GitHub.
 *
 * @param {Object} props
 * @param {string} props.id - Project ID
 * @param {Object} props.website - Website model object
 * @param {function} props.onClose - Callback triggered on closing modal
 */
const GithubExportModal = ({ id, website, onClose }) => {
  const defaultRepoName = (website?.title || "my-website")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const [githubToken, setGithubToken] = useState("");
  const [repoName, setRepoName] = useState(defaultRepoName);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [exportType, setExportType] = useState("html");

  // States: 'idle' | 'auth' | 'success' | 'error'
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [repoUrl, setRepoUrl] = useState("");

  const handleExport = async (e) => {
    e.preventDefault();
    if (!githubToken) {
      setErrorMsg("GitHub Personal Access Token is required");
      setStatus("error");
      return;
    }
    if (!repoName) {
      setErrorMsg("Repository name is required");
      setStatus("error");
      return;
    }

    setStatus("auth");
    setErrorMsg("");

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/export/github`,
        {
          githubToken,
          repoName,
          isPrivate,
          exportType,
        },
        { withCredentials: true }
      );

      if (response.data?.success) {
        setRepoUrl(response.data.data.repoUrl);
        setStatus("success");
      } else {
        setErrorMsg(response.data?.error?.message || "Export failed. Please check your inputs.");
        setStatus("error");
      }
    } catch (err) {
      console.error("GitHub Export Error:", err);
      const msg = err.response?.data?.error?.message || "Server error exporting to GitHub";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-purple-500/5 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-zinc-900/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Github size={18} className="text-zinc-200" />
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
              Export to GitHub
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={status === "auth"}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition cursor-pointer disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {status === "idle" && (
            <form onSubmit={handleExport} className="space-y-5">
              {/* Token Input */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-400">
                  Personal Access Token (PAT)
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showToken ? "text" : "password"}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full pl-10 pr-10 py-2.5 bg-zinc-900/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/80 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 hover:text-zinc-300 font-medium px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    {showToken ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-zinc-500">
                    Requires <code className="text-zinc-300 font-mono">repo</code> scope
                  </p>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Velora%20AI%20Exporter"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 hover:underline font-medium"
                  >
                    Generate Token <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {/* Repo Name */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-400">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, "-"))}
                  placeholder="my-cool-site"
                  className="w-full px-3.5 py-2.5 bg-zinc-900/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/80 transition"
                  required
                />
              </div>

              {/* Export Format Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-400">
                  Export Format
                </label>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/80 transition cursor-pointer"
                >
                  <option value="html" className="bg-zinc-950 text-white">HTML / CSS / JS (Vanilla)</option>
                  <option value="react" className="bg-zinc-950 text-white">React + Vite Scaffolding</option>
                  <option value="nextjs" className="bg-zinc-950 text-white">Next.js App Router Structure</option>
                </select>
              </div>

              {/* Privacy Toggle */}
              <div className="bg-zinc-900/30 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-zinc-300">Private Repository</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Restrict repository access to yourself</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`w-11 h-6 rounded-full p-1 transition duration-200 focus:outline-none cursor-pointer ${isPrivate ? "bg-purple-600" : "bg-zinc-800"}`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transform transition duration-200 ${isPrivate ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-purple-500/10 cursor-pointer active:scale-95 transition"
                >
                  Export Project
                </button>
              </div>
            </form>
          )}

          {/* Loading States */}
          {status === "auth" && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              <div className="text-center">
                <h4 className="text-xs font-medium text-zinc-200">
                  Exporting to GitHub...
                </h4>
                <p className="text-[10px] text-zinc-500 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                  Authenticating token, generating empty repository, and committing project files sequentially.
                </p>
              </div>
            </div>
          )}

          {/* Success Screen */}
          {status === "success" && (
            <div className="text-center py-6 space-y-5">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-100">Project Exported Successfully!</h3>
                <p className="text-xs text-zinc-400 max-w-[320px] mx-auto leading-relaxed">
                  Your project has been successfully committed and pushed to the repository.
                </p>
              </div>

              {/* Repo Link */}
              <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">GitHub Repository</p>
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold mt-2 flex items-center justify-center gap-1.5 hover:underline"
                >
                  <Link2 size={13} />
                  {repoUrl.replace("https://github.com/", "")}
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Error Screen */}
          {status === "error" && (
            <div className="space-y-5">
              <div className="text-center py-2 space-y-4">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-zinc-200">GitHub Export Failed</h3>
                  <p className="text-[11px] text-red-400/90 leading-relaxed px-4 py-2 bg-red-500/5 rounded-xl border border-red-500/10 mt-3 text-left">
                    {errorMsg}
                  </p>
                </div>
              </div>

              {/* Controls to reset/retry */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer active:scale-95 transition"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default GithubExportModal;
