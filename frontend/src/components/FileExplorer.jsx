// PATH: frontend/src/components/FileExplorer.jsx
import React, { useState } from "react";
import { Folder, FolderOpen, File, MoreVertical, Plus, Trash2, Edit, X, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const buildTree = (files) => {
  const root = { name: "root", isFolder: true, children: {}, path: "" };

  files.forEach(file => {
    if (file.path.endsWith("/.keep") || file.path === ".keep") {
      const parts = file.path.split("/");
      parts.pop();
      let current = root;
      let curPath = "";
      parts.forEach(part => {
        curPath = curPath ? `${curPath}/${part}` : part;
        if (!current.children[part]) {
          current.children[part] = { name: part, isFolder: true, children: {}, path: curPath };
        }
        current = current.children[part];
      });
      return;
    }

    const parts = file.path.split("/");
    let current = root;
    let curPath = "";
    parts.forEach((part, index) => {
      curPath = curPath ? `${curPath}/${part}` : part;
      const isLast = index === parts.length - 1;
      if (isLast) {
        current.children[part] = {
          name: part,
          isFolder: false,
          fileId: file._id,
          path: file.path,
          language: file.language,
          content: file.content
        };
      } else {
        if (!current.children[part]) {
          current.children[part] = { name: part, isFolder: true, children: {}, path: curPath };
        }
        current = current.children[part];
      }
    });
  });

  return root;
};

const TreeItem = ({ node, depth, activeFileId, onFileSelect, onRename, onDelete, onCreateFile, onCreateFolder }) => {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [error, setError] = useState("");

  const handleToggle = (e) => {
    e.stopPropagation();
    if (node.isFolder) {
      setExpanded(!expanded);
    }
  };

  const handleItemClick = () => {
    if (!node.isFolder && onFileSelect) {
      onFileSelect(node);
    } else {
      setExpanded(!expanded);
    }
  };

  const handleRenameSubmit = async (e) => {
    e?.preventDefault();
    if (!editName.trim() || editName === node.name) {
      setIsEditing(false);
      return;
    }
    try {
      setError("");
      const parts = node.path.split("/");
      parts[parts.length - 1] = editName.trim();
      const newPath = parts.join("/");
      await onRename(node.fileId || node.path, newPath, node.isFolder);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Rename failed");
    }
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === "Enter") handleRenameSubmit();
    if (e.key === "Escape") {
      setEditName(node.name);
      setIsEditing(false);
    }
  };

  const handleDeleteConfirm = async (e) => {
    e.stopPropagation();
    try {
      setError("");
      await onDelete(node.fileId || node.path, node.isFolder);
      setShowConfirmDelete(false);
      setShowMenu(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Delete failed");
    }
  };

  const handleCreateSubmit = async (e) => {
    e?.preventDefault();
    if (!newItemName.trim()) {
      setIsAddingFile(false);
      setIsAddingFolder(false);
      return;
    }
    try {
      setError("");
      const itemPath = node.path ? `${node.path}/${newItemName.trim()}` : newItemName.trim();
      if (isAddingFile) {
        await onCreateFile(itemPath);
      } else {
        await onCreateFolder(itemPath);
      }
      setNewItemName("");
      setIsAddingFile(false);
      setIsAddingFolder(false);
      setExpanded(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Creation failed");
    }
  };

  const handleCreateKeyDown = (e) => {
    if (e.key === "Enter") handleCreateSubmit();
    if (e.key === "Escape") {
      setNewItemName("");
      setIsAddingFile(false);
      setIsAddingFolder(false);
    }
  };

  const sortedChildren = node.isFolder
    ? Object.values(node.children).sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      })
    : [];

  return (
    <div className="select-none">
      {/* Node element row */}
      {node.name !== "root" && (
        <div
          onClick={handleItemClick}
          onMouseEnter={() => setShowMenu(true)}
          onMouseLeave={() => {
            setShowMenu(false);
            setShowConfirmDelete(false);
          }}
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer text-sm transition group relative ${
            !node.isFolder && activeFileId === node.fileId
              ? "bg-white/10 text-white font-medium"
              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {node.isFolder ? (
              <span onClick={handleToggle} className="text-zinc-500 hover:text-zinc-300">
                {expanded ? <FolderOpen size={16} /> : <Folder size={16} />}
              </span>
            ) : (
              <File size={16} className="text-zinc-500" />
            )}

            {isEditing ? (
              <input
                autoFocus
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="bg-zinc-800 text-white border border-white/20 rounded px-1 text-xs py-0.5 outline-none w-full"
              />
            ) : (
              <span className="truncate">{node.name}</span>
            )}
          </div>

          {/* Error display inline */}
          {error && (
            <span className="text-[10px] text-red-400 absolute right-8 bg-black/90 px-1.5 py-0.5 rounded border border-red-500/20 max-w-[150px] truncate z-50">
              {error}
            </span>
          )}

          {/* Item Options Menu */}
          {showMenu && !isEditing && (
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {showConfirmDelete ? (
                <div className="flex items-center gap-1 text-[10px] bg-red-950/80 border border-red-800 rounded px-1">
                  <span className="text-zinc-300">Delete?</span>
                  <button onClick={handleDeleteConfirm} className="text-red-400 hover:text-red-200 font-bold px-0.5">Y</button>
                  <span className="text-zinc-600">/</span>
                  <button onClick={() => setShowConfirmDelete(false)} className="text-zinc-400 hover:text-white font-bold px-0.5">N</button>
                </div>
              ) : (
                <>
                  {node.isFolder && (
                    <>
                      <button
                        title="New File"
                        onClick={() => setIsAddingFile(true)}
                        className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/10"
                      >
                        <Plus size={12} />
                      </button>
                    </>
                  )}
                  <button
                    title="Rename"
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/10"
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => setShowConfirmDelete(true)}
                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/20"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input box for new items creation */}
      {(isAddingFile || isAddingFolder) && (
        <div
          className="flex items-center gap-2 py-1 px-2 rounded-lg"
          style={{ paddingLeft: `${(node.name === "root" ? 0 : depth + 1) * 12 + 8}px` }}
        >
          {isAddingFolder ? <Folder size={16} className="text-zinc-500" /> : <File size={16} className="text-zinc-500" />}
          <form onSubmit={handleCreateSubmit} className="flex-1 flex items-center gap-1">
            <input
              autoFocus
              type="text"
              placeholder={isAddingFolder ? "folder name..." : "file.html..."}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onBlur={handleCreateSubmit}
              onKeyDown={handleCreateKeyDown}
              className="bg-zinc-800 text-white border border-white/20 rounded px-1.5 py-0.5 text-xs outline-none w-full"
            />
          </form>
        </div>
      )}

      {/* Children elements */}
      {node.isFolder && expanded && (
        <div>
          {sortedChildren.map((child, idx) => (
            <TreeItem
              key={`${child.path || child.name}-${idx}`}
              node={child}
              depth={node.name === "root" ? 0 : depth + 1}
              activeFileId={activeFileId}
              onFileSelect={onFileSelect}
              onRename={onRename}
              onDelete={onDelete}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer = ({
  files,
  activeFileId,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onDeleteFile,
  loading
}) => {
  const [isAddingRootFile, setIsAddingRootFile] = useState(false);
  const [isAddingRootFolder, setIsAddingRootFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [error, setError] = useState("");

  const handleCreateRootSubmit = async (e) => {
    e?.preventDefault();
    if (!newItemName.trim()) {
      setIsAddingRootFile(false);
      setIsAddingRootFolder(false);
      return;
    }
    try {
      setError("");
      if (isAddingRootFile) {
        await onCreateFile(newItemName.trim());
      } else {
        await onCreateFolder(newItemName.trim());
      }
      setNewItemName("");
      setIsAddingRootFile(false);
      setIsAddingRootFolder(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Creation failed");
    }
  };

  const handleCreateRootKeyDown = (e) => {
    if (e.key === "Enter") handleCreateRootSubmit();
    if (e.key === "Escape") {
      setNewItemName("");
      setIsAddingRootFile(false);
      setIsAddingRootFolder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col p-4 gap-3">
        <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-4/5 bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  const rootNode = buildTree(files || []);
  const hasFiles = files && files.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950/80 border-r border-white/10">
      {/* Explorer header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/5">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Files</span>
        <div className="flex items-center gap-1">
          <button
            title="New File"
            onClick={() => setIsAddingRootFile(true)}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Explorer Tree Body */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {/* Error banner */}
        {error && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/30 rounded p-2 mb-2 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-zinc-500 hover:text-white">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Root input forms */}
        {(isAddingRootFile || isAddingRootFolder) && (
          <div className="flex items-center gap-2 py-1.5 px-2 bg-white/5 rounded-lg mb-1">
            {isAddingRootFolder ? <Folder size={16} className="text-zinc-500" /> : <File size={16} className="text-zinc-500" />}
            <form onSubmit={handleCreateRootSubmit} className="flex-1 flex items-center gap-1">
              <input
                autoFocus
                type="text"
                placeholder={isAddingRootFolder ? "folder name..." : "filename.html..."}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onBlur={handleCreateRootSubmit}
                onKeyDown={handleCreateRootKeyDown}
                className="bg-zinc-800 text-white border border-white/20 rounded px-1.5 py-0.5 text-xs outline-none w-full"
              />
            </form>
          </div>
        )}

        {!hasFiles && !isAddingRootFile && !isAddingRootFolder ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-xs text-zinc-500 px-4">
            <p className="mb-1">No files in project.</p>
            <button
              onClick={() => setIsAddingRootFile(true)}
              className="text-white underline hover:text-zinc-300"
            >
              Create a file
            </button>
          </div>
        ) : (
          <TreeItem
            node={rootNode}
            depth={-1}
            activeFileId={activeFileId}
            onFileSelect={onFileSelect}
            onRename={onRenameFile}
            onDelete={onDeleteFile}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
          />
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
