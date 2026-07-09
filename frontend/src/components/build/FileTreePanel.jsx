// PATH: frontend/src/components/build/FileTreePanel.jsx
import React from 'react';
import { File, Folder, Database, Terminal, Settings } from 'lucide-react';

const TYPE_COLORS = {
  frontend:  'text-blue-400 hover:bg-blue-500/10',
  backend:   'text-green-400 hover:bg-green-500/10',
  config:    'text-zinc-400 hover:bg-zinc-500/10',
  database:  'text-orange-400 hover:bg-orange-500/10'
};

const TYPE_BORDER = {
  frontend:  'border-blue-500/20',
  backend:   'border-green-500/20',
  config:    'border-zinc-500/20',
  database:  'border-orange-500/20'
};

function getFileIcon(path, type) {
  if (type === 'database') return <Database className="w-3.5 h-3.5" />;
  if (path.includes('config') || path.endsWith('.json') || path.startsWith('.')) return <Settings className="w-3.5 h-3.5" />;
  if (path.endsWith('.sh') || path.endsWith('.cmd')) return <Terminal className="w-3.5 h-3.5" />;
  return <File className="w-3.5 h-3.5" />;
}

function groupByDir(files) {
  const groups = {};
  files.forEach(f => {
    const parts = f.path.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '_root';
    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(f);
  });
  return groups;
}

export default function FileTreePanel({ files, activeFile, onSelect }) {
  const groups = groupByDir(files);

  if (!files.length) {
    return (
      <div className="p-4 text-xs text-white/30 leading-relaxed font-sans">
        Your generated files will appear here. Describe your app concept below to begin.
      </div>
    );
  }

  // Sort groups so _root files are at the top, then other directories alphabetically
  const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
    if (a === '_root') return 1;
    if (b === '_root') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="p-3 text-xs font-mono select-none">
      <div className="text-[10px] uppercase text-white/40 tracking-wider font-semibold mb-3 px-1 font-sans">
        Workspace Files
      </div>
      <div className="space-y-3">
        {sortedGroups.map(([dir, dirFiles]) => (
          <div key={dir} className="flex flex-col">
            {dir !== '_root' && (
              <div className="flex items-center gap-1.5 text-white/50 px-1 py-1 font-semibold tracking-wide font-sans mb-1">
                <Folder className="w-3.5 h-3.5 text-indigo-400/80 fill-indigo-400/10" />
                <span>{dir}</span>
              </div>
            )}
            <div className={`space-y-0.5 border-l border-white/5 ml-2.5 pl-2`}>
              {dirFiles.map(file => {
                const name = file.path.split('/').pop();
                const isActive = activeFile?.path === file.path;
                const typeColor = TYPE_COLORS[file.type] ?? 'text-white/70';
                
                return (
                  <button
                    key={file.path}
                    onClick={() => onSelect(file)}
                    className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded transition-all font-mono
                      ${isActive 
                        ? 'bg-white/10 text-white border border-white/10 font-medium' 
                        : `text-white/75 border border-transparent hover:text-white ${typeColor}`
                      }`}
                  >
                    <span className="opacity-70">{getFileIcon(file.path, file.type)}</span>
                    <span className="truncate" title={file.path}>{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
