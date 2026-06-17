// PATH: frontend/src/components/VersionHistoryPanel.jsx
import React, { useEffect, useState } from "react";
import { History, Save, RotateCcw, Loader2, AlertCircle, Sparkles } from "lucide-react";
import axios from "axios";

export default function VersionHistoryPanel({ projectId, onUpdateSuccess }) {
  const [versions, setVersions] = useState([]);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [restoreLoadingId, setRestoreLoadingId] = useState(null);
  const [error, setError] = useState("");

  const fetchVersions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${projectId}/versions`,
        { withCredentials: true }
      );
      if (res.data?.success) {
        setVersions(res.data.data.versions || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load version history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [projectId]);

  const handleSaveSnapshot = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;

    setSaveLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${projectId}/versions`,
        { label, description },
        { withCredentials: true }
      );
      if (res.data?.success) {
        setLabel("");
        setDescription("");
        await fetchVersions();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save snapshot.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRestore = async (versionId) => {
    if (restoreLoadingId) return;
    setRestoreLoadingId(versionId);
    setError("");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${projectId}/versions/${versionId}/restore`,
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        const { latestCode } = res.data.data;
        if (onUpdateSuccess) {
          onUpdateSuccess({ latestCode, remainingCredits: null });
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to restore version.");
    } finally {
      setRestoreLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/40 text-zinc-200 text-xs">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-zinc-900/40 flex items-center gap-2">
        <History className="text-purple-400" size={16} />
        <span className="font-semibold text-sm">Version History</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-1.5 animate-pulse">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Save Form */}
        <form onSubmit={handleSaveSnapshot} className="space-y-3 bg-white/5 border border-white/10 p-3.5 rounded-2xl">
          <p className="font-semibold text-[10px] text-zinc-400 uppercase tracking-wider">Save Snapshot</p>
          <div className="space-y-2.5">
            <input
              type="text"
              placeholder="Version label (e.g. Added Pricing section)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 resize-none"
            />
            <button
              type="submit"
              disabled={saveLoading || !label.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 hover:from-indigo-600 hover:to-purple-600 transition disabled:opacity-50 cursor-pointer"
            >
              {saveLoading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}
              Save Snapshot
            </button>
          </div>
        </form>

        {/* Timeline */}
        <div className="space-y-4">
          <p className="font-semibold text-[10px] text-zinc-400 uppercase tracking-wider">Saved Versions ({versions.length})</p>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-zinc-500">
              <Loader2 className="animate-spin text-purple-500 mr-2" size={16} />
              Loading history...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 italic">No snapshots saved yet.</div>
          ) : (
            <div className="relative border-l border-white/10 ml-3 space-y-5">
              {versions.map((ver) => (
                <div key={ver._id} className="relative pl-6">
                  {/* Timeline bullet */}
                  <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-purple-500 border-2 border-zinc-950" />
                  
                  <div className="bg-white/5 border border-white/5 hover:border-white/10 p-3 rounded-xl transition space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-zinc-100">{ver.label}</h4>
                        <span className="text-[9px] text-zinc-500">
                          {new Date(ver.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRestore(ver._id)}
                        disabled={restoreLoadingId !== null}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-purple-400 hover:text-purple-300 transition cursor-pointer flex items-center gap-1 text-[10px]"
                        title="Restore this version"
                      >
                        {restoreLoadingId === ver._id ? (
                          <Loader2 className="animate-spin" size={10} />
                        ) : (
                          <RotateCcw size={10} />
                        )}
                        Restore
                      </button>
                    </div>
                    {ver.description && (
                      <p className="text-zinc-400 text-[10px] leading-relaxed italic">{ver.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
