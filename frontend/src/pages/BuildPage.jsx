// PATH: frontend/src/pages/BuildPage.jsx
import React, { useState } from 'react';
import FileTreePanel from '../components/build/FileTreePanel';
import CodeEditorPanel from '../components/build/CodeEditorPanel';
import LivePreviewPanel from '../components/build/LivePreviewPanel';
import PromptBar from '../components/build/PromptBar';
import GeneratingOverlay from '../components/build/GeneratingOverlay';

const MODELS = [
  { label: 'Gemini 2.5 Flash', value: 'google/gemini-2.5-flash' },
  { label: 'Gemini 1.5 Pro', value: 'google/gemini-1.5-pro' },
  { label: 'GPT-4o Mini', value: 'openai/gpt-4o-mini' },
  { label: 'Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
  { label: 'DeepSeek Coder', value: 'deepseek/deepseek-coder' }
];

const STYLES = [
  { value: 'minimal', label: 'Minimalist' },
  { value: 'enterprise', label: 'Enterprise Layered' },
  { value: 'beginner-friendly', label: 'Beginner Friendly' },
  { value: 'performance-first', label: 'Performance First' },
  { value: 'opinionated', label: 'Opinionated' },
  { value: 'verbose', label: 'Verbose/Explicit' },
  { value: 'functional', label: 'Functional Pure' },
  { value: 'modern', label: 'Modern ES2024' },
  { value: 'secure', label: 'Security Hardened' },
  { value: 'test-driven', label: 'Test Driven' },
  { value: 'microservices', label: 'Microservices Split' },
  { value: 'fullstack-typed', label: 'Fullstack Typed' }
];

export default function BuildPage() {
  const [status, setStatus] = useState('idle');        // idle | generating | done | error
  const [project, setProject] = useState(null);         // full API response
  const [files, setFiles] = useState([]);               // array of { path, content, type }
  const [activeFile, setActiveFile] = useState(null);   // currently selected file
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [style, setStyle] = useState('minimal');
  const [error, setError] = useState('');

  const generate = async ({ prompt, isFollowUp = false }) => {
    setStatus('generating');
    setError('');

    // If it's the first time generating, save the prompt as the original prompt
    let currentOriginalPrompt = originalPrompt;
    if (!isFollowUp) {
      currentOriginalPrompt = prompt;
      setOriginalPrompt(prompt);
    }

    try {
      const body = {
        prompt,
        model,
        style,
        mode: 'website_gen',
        history: isFollowUp
          ? [
              { role: 'user', content: `Build this web app: ${currentOriginalPrompt}` },
              { role: 'assistant', content: JSON.stringify({ files }) }
            ]
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
      
      const newFiles = data.files || [];
      setFiles(newFiles);

      // Auto-select first file if not already editing a specific file path
      if (newFiles.length > 0) {
        if (activeFile) {
          const matchingFile = newFiles.find(f => f.path === activeFile.path);
          setActiveFile(matchingFile ?? newFiles[0]);
        } else {
          setActiveFile(newFiles[0]);
        }
      } else {
        setActiveFile(null);
      }

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
    <div className="h-screen flex flex-col bg-[#0d0d0f] text-white overflow-hidden font-sans">
      {/* Top bar */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-[#0d0d0f]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="p-1.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white transition font-medium"
          >
            ← Dashboard
          </button>
          <span className="font-semibold tracking-tight text-white/95">
            Velora <span className="text-indigo-400 font-mono font-medium">Build</span>
          </span>
        </div>

        {/* Dynamic Model & Style selectors in header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-white/40 tracking-wider font-semibold font-sans">Model</span>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              disabled={status === 'generating'}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-40 font-medium font-sans"
            >
              {MODELS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#0d0d0f] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-white/40 tracking-wider font-semibold font-sans">Style</span>
            <select
              value={style}
              onChange={e => setStyle(e.target.value)}
              disabled={status === 'generating'}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-40 font-medium font-sans"
            >
              {STYLES.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#0d0d0f] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Three panels */}
      <div className="flex flex-1 overflow-hidden relative">
        {status === 'generating' && <GeneratingOverlay />}

        {/* Panel 1 — File Tree */}
        <aside className="w-60 border-r border-white/10 overflow-y-auto shrink-0 bg-[#0d0d0f]">
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
        <aside className="w-[480px] border-l border-white/10 shrink-0">
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
