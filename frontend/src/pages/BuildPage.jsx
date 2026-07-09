// PATH: frontend/src/pages/BuildPage.jsx
import React, { useState } from 'react';
import GeneratingOverlay from '../components/build/GeneratingOverlay';

const STYLES = [
  { value: 'html-css-js', label: 'HTML + CSS + JavaScript' },
  { value: 'tailwind', label: 'HTML + Tailwind CSS + JavaScript' },
  { value: 'bootstrap', label: 'HTML + Bootstrap 5 + JavaScript' }
];

export default function BuildPage() {
  const [status, setStatus] = useState('idle');        // idle | generating | done | error
  const [previewHtml, setPreviewHtml] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [style, setStyle] = useState('html-css-js');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = async ({ prompt, isFollowUp = false }) => {
    setStatus('generating');
    setError('');

    let currentOriginalPrompt = originalPrompt;
    if (!isFollowUp) {
      currentOriginalPrompt = prompt;
      setOriginalPrompt(prompt);
    }

    try {
      const body = {
        prompt,
        style,
        history: isFollowUp
          ? [
              { role: 'user', content: `Build this web app: ${currentOriginalPrompt}` },
              { role: 'assistant', content: previewHtml }
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
      setPreviewHtml(data.html);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleSubmit = () => {
    if (!promptInput.trim() || status === 'generating') return;
    generate({ prompt: promptInput.trim(), isFollowUp: !!previewHtml });
    setPromptInput('');
  };

  const downloadHtml = () => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'velora-website.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(previewHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy HTML:', err);
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

        {/* Style Selector only in header */}
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
      </header>

      {/* Main Preview Container */}
      <div className="flex-1 overflow-hidden relative bg-white">
        {status === 'generating' && <GeneratingOverlay />}
        
        {previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-none bg-white"
            title="Preview"
          />
        ) : (
          <div className="absolute inset-0 bg-[#0d0d0f] flex flex-col items-center justify-center text-white/30 text-xs p-6 text-center select-none">
            <p>Your web app preview will render here. Enter a prompt below to generate.</p>
          </div>
        )}
      </div>

      {/* Simplified Prompt & Action Bar at bottom */}
      <div className="border-t border-white/10 bg-[#0d0d0f] px-6 py-4 shrink-0">
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs mb-3 font-sans bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg max-w-5xl mx-auto">
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 items-center max-w-5xl mx-auto">
          <textarea
            rows={1}
            value={promptInput}
            onChange={e => setPromptInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={previewHtml ? 'Ask for changes — e.g., "Change the background color to dark purple"' : 'Describe the website you want to generate...'}
            disabled={status === 'generating'}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-40 font-sans"
          />

          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleSubmit}
              disabled={status === 'generating' || !promptInput.trim()}
              className="h-[44px] px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 font-sans"
            >
              <span>{status === 'generating' ? 'Building...' : previewHtml ? 'Refine' : 'Generate'}</span>
            </button>

            {previewHtml && (
              <>
                <button
                  onClick={downloadHtml}
                  className="h-[44px] px-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-sm rounded-xl transition-all flex items-center gap-2 font-sans"
                  title="Download HTML file"
                >
                  Download HTML
                </button>
                <button
                  onClick={copyHtml}
                  className="h-[44px] px-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-sm rounded-xl transition-all flex items-center gap-2 font-sans"
                  title="Copy HTML to clipboard"
                >
                  {copied ? 'Copied!' : 'Copy HTML'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

