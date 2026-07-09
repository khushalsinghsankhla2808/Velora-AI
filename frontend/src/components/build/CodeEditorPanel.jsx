// PATH: frontend/src/components/build/CodeEditorPanel.jsx
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Check } from 'lucide-react';

const LANG_MAP = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  json: 'json', css: 'css', md: 'markdown', env: 'plaintext', html: 'html'
};

function detectLanguage(path = '') {
  const ext = path.split('.').pop();
  return LANG_MAP[ext] ?? 'plaintext';
}

export default function CodeEditorPanel({ file, onChange }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [file?.path]);

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-white/20 text-sm font-sans bg-[#0d0d0f]">
        Select a file from the tree
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* File path tab */}
      <div className="h-9 border-b border-white/10 flex items-center justify-between px-4 gap-2 text-xs text-white/50 font-mono shrink-0 bg-[#0d0d0f]">
        <span className="text-white/80 font-sans tracking-wide">{file.path}</span>
        <button
          onClick={handleCopy}
          className="hover:text-white/90 hover:bg-white/10 transition-all bg-white/5 px-2.5 py-1 rounded border border-white/10 flex items-center gap-1.5 font-sans"
          title="Copy file content"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-[#1e1e1e]">
        <Editor
          height="100%"
          language={detectLanguage(file.path)}
          value={file.content}
          onChange={(value) => onChange(file.path, value ?? '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            padding: { top: 12 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            renderLineHighlight: 'gutter',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
          }}
        />
      </div>
    </div>
  );
}

