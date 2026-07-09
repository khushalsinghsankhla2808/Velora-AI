// PATH: frontend/src/components/AuditPanel.jsx
import React, { useState } from "react";
import { ShieldAlert, Play, CheckCircle2, AlertTriangle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import axios from "axios";

export default function AuditPanel({ projectId }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const handleRunAudit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${projectId}/audit`,
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        setReport(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || "Failed to complete audit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    if (score >= 70) return "text-amber-400 border-amber-500/20 bg-amber-500/5";
    return "text-red-400 border-red-500/20 bg-red-500/5";
  };

  const categories = [
    { key: "seo", label: "SEO Score" },
    { key: "accessibility", label: "A11y Score" },
    { key: "performance", label: "Performance" },
    { key: "ux", label: "UX / Best Practices" },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950/40 text-zinc-200 text-xs">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-zinc-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-purple-400" size={16} />
          <span className="font-semibold text-sm">AI Quality Audit</span>
        </div>
        {report && (
          <button
            onClick={handleRunAudit}
            disabled={loading}
            className="p-1 rounded hover:bg-white/5 text-zinc-400 hover:text-white transition cursor-pointer"
            title="Re-run Audit"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-1.5 animate-pulse">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!report && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 animate-bounce">
              <ShieldAlert size={36} />
            </div>
            <div className="space-y-1 max-w-[220px]">
              <h4 className="font-semibold text-zinc-200">Audit Your Website</h4>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Scan your workspace files for SEO metadata, WCAG accessibility, design consistencies, and performance bugs.
              </p>
            </div>
            <button
              onClick={handleRunAudit}
              className="bg-gradient-to r from-indigo-500 to-purple-500 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-1.5 hover:from-indigo-600 hover:to-purple-600 transition cursor-pointer active:scale-95 shadow-lg shadow-purple-500/10"
            >
              <Play size={12} fill="white" /> Run Full Audit
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <Loader2 className="animate-spin text-purple-500 w-8 h-8" />
            <h4 className="font-medium text-zinc-200">Analyzing Project Files...</h4>
            <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed">
              Evaluating semantic HTML tags, contrast ratios, and resource deferral settings.
            </p>
          </div>
        )}

        {report && !loading && (
          <div className="space-y-5">
            {/* Scores Grid */}
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => {
                const score = report[cat.key];
                return (
                  <div
                    key={cat.key}
                    className={`border p-3.5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 transition ${getScoreColor(
                      score
                    )}`}
                  >
                    <span className="text-xl font-black">{score}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">{cat.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Recommendations Timeline */}
            {report.recommendations && report.recommendations.length > 0 && (
              <div className="space-y-3">
                <p className="font-semibold text-[10px] text-zinc-400 uppercase tracking-wider">Fix Recommendations</p>
                <div className="space-y-3">
                  {report.recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/5 hover:border-white/10 p-3.5 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/20 text-purple-300">
                          {rec.category}
                        </span>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <AlertTriangle size={11} className="text-amber-500" /> Improvement
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-200 leading-tight mb-1">{rec.issue}</h4>
                        <p className="text-[10px] text-zinc-400 leading-relaxed bg-black/30 p-2 rounded-xl border border-white/5 font-mono">
                          {rec.fix}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit details details list */}
            {report.details && Object.keys(report.details).length > 0 && (
              <div className="space-y-3">
                <p className="font-semibold text-[10px] text-zinc-400 uppercase tracking-wider">Audit Details</p>
                <div className="space-y-3">
                  {Object.keys(report.details).map((key) => (
                    <div key={key} className="space-y-1.5">
                      <h5 className="font-bold text-[10px] text-zinc-400 uppercase pl-1">{key}</h5>
                      <ul className="space-y-1.5">
                        {(report.details[key] || []).map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] leading-relaxed text-zinc-300"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
