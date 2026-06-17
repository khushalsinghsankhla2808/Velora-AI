// PATH: frontend/src/components/DiffPreviewModal.jsx
import React, { useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { Check, X, FileCode, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

/**
 * DiffPreviewModal Component
 * Shows a side-by-side diff of proposed changes using Monaco DiffEditor.
 *
 * @param {Object} props
 * @param {Object} props.diff - Proposed diff object containing message, instruction, filesChanged, tokensUsed
 * @param {function} props.onAccept - Callback triggered when user accepts edits
 * @param {function} props.onReject - Callback triggered when user discards edits
 * @param {boolean} props.loading - Boolean indicating if Accept transaction is in progress
 */
const DiffPreviewModal = ({ diff, onAccept, onReject, loading }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!diff || !diff.filesChanged || diff.filesChanged.length === 0) return null;

  const currentFile = diff.filesChanged[selectedIndex];
  const fileExtension = currentFile.path.split(".").pop();
  
  // Resolve language for Monaco editor
  let language = "html";
  if (fileExtension === "js" || fileExtension === "jsx") language = "javascript";
  else if (fileExtension === "ts" || fileExtension === "tsx") language = "typescript";
  else if (fileExtension === "css") language = "css";
  else if (fileExtension === "json") language = "json";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 md:p-6 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="bg-zinc-950 border border-white/10 rounded-2xl w-[95vw] h-[90vh] max-h-[850px] max-w-[1200px] flex flex-col overflow-hidden shadow-2xl shadow-purple-500/5"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-zinc-900/40 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
              Review Proposed AI Changes
            </h2>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-[700px] truncate" title={diff.message}>
              {diff.message}
            </p>
          </div>
          <button
            onClick={onReject}
            disabled={loading}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Files List Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto shrink-0 bg-zinc-950/40 p-3 gap-2">
            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold hidden md:block px-2 mb-1">
              Modified Files ({diff.filesChanged.length})
            </span>
            {diff.filesChanged.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              const isNewFile = file.oldContent === "";
              
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-auto md:w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl text-xs transition gap-3 shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-purple-600/15 border border-purple-500/30 text-purple-300 font-medium"
                      : "bg-white/0 border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode size={14} className={isSelected ? "text-purple-400" : "text-zinc-500"} />
                    <span className="truncate max-w-[120px] md:max-w-none">{file.path}</span>
                  </div>
                  <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${
                    isNewFile 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {isNewFile ? "New" : "Mod"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Monaco Diff Editor Area */}
          <div className="flex-1 min-w-0 h-full relative bg-[#1e1e1e]">
            <div className="absolute top-2 right-4 z-20 flex gap-4 text-[10px] text-zinc-500 bg-zinc-950/80 px-3 py-1 rounded-md border border-white/5 backdrop-blur-xs">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500/80" /> Original</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500/80" /> Modified</span>
            </div>
            <DiffEditor
              height="100%"
              language={language}
              original={currentFile.oldContent}
              modified={currentFile.newContent}
              theme="vs-dark"
              options={{
                readOnly: true,
                originalEditable: false,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderSideBySide: true,
                fontSize: 12,
                lineNumbersMinChars: 3,
                wordWrap: "on",
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-zinc-900/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <AlertTriangle size={13} className="text-zinc-500" />
            <span>Accepting will deduct 2 credits. Discarding will cost nothing.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onReject}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
            >
              Discard Changes
            </button>
            <button
              onClick={onAccept}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-purple-500/10 cursor-pointer disabled:opacity-50 active:scale-95 transition"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Accept Changes
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DiffPreviewModal;
