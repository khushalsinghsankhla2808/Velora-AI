// PATH: frontend/src/components/build/PromptBar.jsx
import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Send, Download, AlertCircle } from 'lucide-react';

export default function PromptBar({ status, hasProject, onGenerate, error, files, project }) {
  const [prompt, setPrompt] = useState('');

  const isGenerating = status === 'generating';

  const handleSubmit = () => {
    if (!prompt.trim() || isGenerating) return;
    onGenerate({ prompt: prompt.trim(), isFollowUp: hasProject });
    setPrompt('');
  };

  const downloadZip = async () => {
    if (!files.length) return;
    try {
      const zip = new JSZip();
      files.forEach(f => zip.file(f.path, f.content));
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `${project?.name ?? 'velora-app'}.zip`);
    } catch (err) {
      console.error('Failed to generate ZIP:', err);
    }
  };

  return (
    <div className="border-t border-white/10 bg-[#0d0d0f] px-6 py-4 shrink-0">
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs mb-3 font-sans bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3 items-center max-w-5xl mx-auto">
        <textarea
          rows={1}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={hasProject ? 'Ask for changes — e.g., "Add user authentication with JWT" or "Make the buttons rounded"' : 'Describe the web application you want to generate...'}
          disabled={isGenerating}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-40 font-sans"
        />

        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isGenerating || !prompt.trim()}
            className="h-[44px] px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 font-sans"
          >
            <Send className="w-4 h-4" />
            <span>{isGenerating ? 'Building...' : hasProject ? 'Refine' : 'Generate'}</span>
          </button>

          {hasProject && (
            <button
              onClick={downloadZip}
              className="h-[44px] px-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-sm rounded-xl transition-all flex items-center gap-2 font-sans"
              title="Download project as ZIP"
            >
              <Download className="w-4 h-4" />
              <span>ZIP</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

