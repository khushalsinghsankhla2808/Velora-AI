// PATH: frontend/src/pages/BuildPage.jsx
import React, { useState } from 'react';
import FileTreePanel from '../components/build/FileTreePanel';
import CodeEditorPanel from '../components/build/CodeEditorPanel';
import LivePreviewPanel from '../components/build/LivePreviewPanel';
import PromptBar from '../components/build/PromptBar';
import GeneratingOverlay from '../components/build/GeneratingOverlay';

export default function BuildPage() {
  const [status, setStatus] = useState('idle');        // idle | generating | done | error
  const [project, setProject] = useState(null);         // full API response
  const [files, setFiles] = useState([]);               // array of { path, content, type }
  const [activeFile, setActiveFile] = useState(null);   // currently selected file
  const [history, setHistory] = useState([]);           // for iterative editing
  const [error, setError] = useState('');

  const generate = async ({ prompt, style, isFollowUp = false }) => {
    setStatus('generating');
    setError('');

    try {
      const body = {
        prompt,
        style,
        history: isFollowUp
          ? [...history, { role: 'assistant', content: JSON.stringify({ files }) }]
          : []
      };

      const apiBase = import.meta.env.VITE_SERVER_URL || '';
      const res = await fetch(`${apiBase}/api/generate-website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Generation failed');
      }

      const data = await res.json();
      setProject(data.project);
      setFiles(data.files || []);
      setActiveFile(data.files?.[0] ?? null);

      // Store history for follow-up
      setHistory(prev => [
        ...prev,
        { role: 'user', content: `Build this web app: ${prompt}` }
      ]);

      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const updateFileContent = (path, newContent) => {
    setFiles(prev => prev.map(f => f.path === path ? { ...f, content: newContent } : f));
    if (activeFile && activeFile.path === path) {
      setActiveFile(prev => ({ ...prev, content: newContent }));
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d0d0f] text-white overflow-hidden">
      {/* Top bar */}
      <header className="h-12 border-b border-white/10 flex items-center justify-between px-4 shrink-0 bg-[#0d0d0f]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="p-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white transition font-mono"
          >
            ← Dashboard
          </button>
          <span className="font-semibold tracking-tight text-white/90 font-sans">
            Velora <span className="text-indigo-400 font-mono">Build</span>
          </span>
        </div>
      </header>

      {/* Three panels */}
      <div className="flex flex-1 overflow-hidden relative">
        {status === 'generating' && <GeneratingOverlay />}

        {/* Panel 1 — File Tree */}
        <aside className="w-56 border-r border-white/10 overflow-y-auto shrink-0 bg-[#0d0d0f]">
          <FileTreePanel
            files={files}
            activeFile={activeFile}
            onSelect={setActiveFile}
          />
        </aside>

        {/* Panel 2 — Code Editor */}
        <main className="flex-1 overflow-hidden bg-[#1e1e1e]">
          <CodeEditorPanel
            file={activeFile}
            onChange={updateFileContent}
          />
        </main>

        {/* Panel 3 — Live Preview */}
        <aside className="w-[420px] border-l border-white/10 shrink-0">
          <LivePreviewPanel files={files} />
        </aside>
      </div>

      {/* Prompt bar at bottom */}
      <PromptBar
        status={status}
        hasProject={files.length > 0}
        onGenerate={generate}
        error={error}
        files={files}
        project={project}
      />
    </div>
  );
}
