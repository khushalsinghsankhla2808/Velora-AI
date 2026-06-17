// PATH: frontend/src/components/EditorTabs.jsx
import React from "react";
import { X, Sparkles } from "lucide-react";

const EditorTabs = ({
  openFiles,
  activeFileId,
  unsavedChanges,
  onTabSelect,
  onTabClose,
  saving
}) => {
  const handleMouseUp = (e, fileId) => {
    // Check if middle click (button 1) was pressed to close tab
    if (e.button === 1) {
      e.preventDefault();
      onTabClose(fileId);
    }
  };

  return (
    <div className="h-10 bg-zinc-900 border-b border-white/10 flex items-center justify-between px-2 overflow-x-auto select-none shrink-0 scrollbar-none">
      <div className="flex items-center h-full gap-0.5">
        {openFiles.map((file) => {
          const isActive = file._id === activeFileId;
          const isDirty = unsavedChanges && unsavedChanges[file._id];
          const isSaving = saving && saving[file._id];

          return (
            <div
              key={file._id}
              onClick={() => onTabSelect(file._id)}
              onMouseUp={(e) => handleMouseUp(e, file._id)}
              className={`group h-full px-4 flex items-center gap-2 cursor-pointer border-r border-white/5 text-xs transition relative ${
                isActive
                  ? "bg-zinc-950 text-white border-t-2 border-indigo-500 font-medium"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
              title={file.path}
            >
              <span className="truncate max-w-[120px]">{file.path.split("/").pop()}</span>
              
              {/* Saving / Unsaved indicator / Close button */}
              <div className="flex items-center justify-center w-4 h-4 rounded-full" onClick={(e) => e.stopPropagation()}>
                {isSaving ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                ) : isDirty ? (
                  <span 
                    title="Unsaved changes"
                    className="w-2 h-2 rounded-full bg-amber-500 hover:bg-red-400 cursor-pointer block"
                    onClick={() => onTabClose(file._id)}
                  />
                ) : (
                  <button
                    onClick={() => onTabClose(file._id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Saving status indicator at the right side of the tabs bar */}
      {Object.values(saving || {}).some(Boolean) && (
        <div className="flex items-center gap-1 px-3 text-[10px] text-indigo-400 italic">
          <Sparkles size={10} className="animate-spin" />
          <span>Saving...</span>
        </div>
      )}
    </div>
  );
};

export default EditorTabs;
