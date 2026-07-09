// PATH: frontend/src/components/build/LivePreviewPanel.jsx
import React, { useEffect, useRef, useState } from 'react';
import { WebContainer } from '@webcontainer/api';
import { Play, RotateCw, Terminal as TermIcon, ShieldAlert, Check } from 'lucide-react';

function convertToWebContainerFiles(files) {
  const tree = {};
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        current[part] = {
          file: {
            contents: file.content
          }
        };
      } else {
        if (!current[part]) {
          current[part] = {
            directory: {}
          };
        }
        current = current[part].directory;
      }
    }
  });
  return tree;
}

// Simple fallback preview for HTML/CSS/JS applications
function buildStaticPreviewHTML(files) {
  const html = files.find(f => f.path.endsWith('index.html'));
  if (!html) return null;

  let content = html.content;
  const css = files.filter(f => f.path.endsWith('.css') && f.type === 'frontend');
  const js = files.filter(f => (f.path.endsWith('.js') || f.path.endsWith('.jsx')) && f.type === 'frontend');

  // Inline CSS
  const styleBlocks = css.map(f => `<style id="${f.path}">${f.content}</style>`).join('\n');
  content = content.replace('</head>', `${styleBlocks}\n</head>`);

  // Inline JS (wrap jsx or ES6 js cleanly)
  const scriptBlocks = js.map(f => `<script type="module" id="${f.path}">${f.content}</script>`).join('\n');
  content = content.replace('</body>', `${scriptBlocks}\n</body>`);

  return content;
}

export default function LivePreviewPanel({ files }) {
  const [webcontainer, setWebcontainer] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [logs, setLogs] = useState([]);
  const [loadingStep, setLoadingStep] = useState('idle'); // idle | booting | installing | running | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [viewLogs, setViewLogs] = useState(false);
  const [isStaticFallback, setIsStaticFallback] = useState(false);

  const logsEndRef = useRef(null);
  const bootedRef = useRef(false);
  const prevFilesRef = useRef(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Determine preview method when files arrive
  const hasFiles = files.length > 0;
  const hasPackageJson = files.some(f => f.path === 'package.json');

  useEffect(() => {
    if (!hasFiles) {
      setLoadingStep('idle');
      setPreviewUrl('');
      setIsStaticFallback(false);
      bootedRef.current = false;
      if (webcontainer) {
        try {
          webcontainer.teardown?.();
        } catch (_) {}
        setWebcontainer(null);
      }
      return;
    }

    if (!hasPackageJson) {
      // Fast static fallback
      setIsStaticFallback(true);
      setLoadingStep('ready');
      return;
    }

    // React/Node app needs WebContainer
    if (bootedRef.current) {
      // WebContainer is already running, apply dynamic filesystem updates
      updateFilesystem();
      return;
    }

    bootedRef.current = true;
    startWebContainer();
  }, [files]);

  const startWebContainer = async () => {
    setLoadingStep('booting');
    setLogs(['Booting WebContainer browser runtime...']);
    setErrorMsg('');

    try {
      const containerTree = convertToWebContainerFiles(files);
      const instance = await WebContainer.boot();
      setWebcontainer(instance);

      setLogs(prev => [...prev, 'Virtual filesystem mounted successfully.', 'Installing packages via npm...']);
      setLoadingStep('installing');
      await instance.mount(containerTree);

      const installProcess = await instance.spawn('npm', ['install']);
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            setLogs(prev => [...prev, data]);
          }
        })
      );

      const installCode = await installProcess.exit;
      if (installCode !== 0) {
        throw new Error(`npm install failed with exit code ${installCode}`);
      }

      setLogs(prev => [...prev, 'Packages installed.', 'Starting dev server (npm run dev)...']);
      setLoadingStep('running');

      const devProcess = await instance.spawn('npm', ['run', 'dev']);
      devProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            setLogs(prev => [...prev, data]);
          }
        })
      );

      instance.on('port', (port, type, url) => {
        setPreviewUrl(url);
        setLoadingStep('ready');
        setLogs(prev => [...prev, `Server running at ${url}`]);
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'WebContainer initialization failed');
      setLoadingStep('error');
      setLogs(prev => [...prev, `[ERROR] ${err.message || err}`]);
    }
  };

  const updateFilesystem = async () => {
    if (!webcontainer) return;
    try {
      const containerTree = convertToWebContainerFiles(files);
      await webcontainer.mount(containerTree);
      setLogs(prev => [...prev, 'Virtual filesystem updated (HMR reloaded).']);
    } catch (err) {
      console.error('Failed to update filesystem:', err);
    }
  };

  const forceRestart = () => {
    bootedRef.current = false;
    if (webcontainer) {
      try {
        webcontainer.teardown?.();
      } catch (_) {}
      setWebcontainer(null);
    }
    startWebContainer();
  };

  // Build static preview content if using static mode
  const staticHtml = isStaticFallback ? buildStaticPreviewHTML(files) : null;

  return (
    <div className="h-full flex flex-col bg-[#0d0d0f] text-white">
      {/* Tab bar header */}
      <div className="h-9 border-b border-white/10 flex items-center justify-between px-3 text-xs bg-[#0d0d0f] shrink-0 font-sans select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wider uppercase text-[10px] text-white/50">Live Preview</span>
          {loadingStep === 'ready' && (
            <span className="flex items-center gap-1 text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-mono">
              <Check className="w-2.5 h-2.5" />
              ONLINE
            </span>
          )}
        </div>
        
        {hasFiles && !isStaticFallback && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewLogs(!viewLogs)}
              className={`p-1 px-2 rounded hover:bg-white/10 transition-colors flex items-center gap-1.5 font-mono text-[10px]
                ${viewLogs ? 'bg-white/10 text-indigo-400' : 'text-white/60'}`}
              title="Show terminal logs"
            >
              <TermIcon className="w-3 h-3" />
              Logs
            </button>
            <button
              onClick={forceRestart}
              className="p-1 px-2 rounded hover:bg-white/10 transition-colors flex items-center gap-1 text-white/60 font-mono text-[10px]"
              title="Restart server"
            >
              <RotateCw className="w-3 h-3" />
              Restart
            </button>
          </div>
        )}
      </div>

      {/* Main Preview Pane */}
      <div className="flex-1 min-h-0 relative bg-white">
        {/* WebContainer Server Preview */}
        {loadingStep === 'ready' && previewUrl && !isStaticFallback && (
          <iframe
            src={previewUrl}
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            title="WebContainer live preview"
          />
        )}

        {/* Static HTML/JS Preview */}
        {isStaticFallback && staticHtml && (
          <iframe
            srcDoc={staticHtml}
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-same-origin"
            title="Static site preview"
          />
        )}

        {/* Loading Overlay */}
        {(loadingStep === 'booting' || loadingStep === 'installing' || loadingStep === 'running') && (
          <div className="absolute inset-0 bg-[#0d0d0f] flex flex-col items-center justify-center p-6 text-center select-none z-10">
            <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-xs uppercase tracking-wider text-white/50 mb-2 font-mono">
              {loadingStep === 'booting' && 'Booting Virtual Runtime...'}
              {loadingStep === 'installing' && 'Installing Packages...'}
              {loadingStep === 'running' && 'Starting Local Server...'}
            </span>
            <button
              onClick={() => setViewLogs(true)}
              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
            >
              Show setup terminal output
            </button>
          </div>
        )}

        {/* Error Diagnostic UI */}
        {loadingStep === 'error' && (
          <div className="absolute inset-0 bg-[#0d0d0f] flex flex-col justify-center p-6 font-sans z-10 overflow-y-auto">
            <div className="flex items-start gap-3 text-red-400 mb-4">
              <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold">WebContainer Boot Blocked</h3>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
            
            <div className="border border-white/10 bg-white/5 rounded-lg p-3 text-xs text-white/70 space-y-2 mb-4 leading-relaxed font-sans">
              <p className="font-semibold text-white/90">Common Causes & Fixes:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Make sure you are loading this page on <code className="bg-black/40 px-1 rounded font-mono">localhost</code>.</li>
                <li>Ensure Cross-Origin isolation headers are present on your hosting platform.</li>
                <li>Verify your browser is Chrome, Edge, or Firefox. Safari and private tabs may block virtual execution.</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsStaticFallback(true);
                  setLoadingStep('ready');
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Force Static Preview
              </button>
              <button
                onClick={forceRestart}
                className="py-2 px-3 bg-white/10 hover:bg-white/15 rounded text-xs font-semibold transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Idle/Welcome Screen */}
        {loadingStep === 'idle' && (
          <div className="absolute inset-0 bg-[#0d0d0f] flex flex-col items-center justify-center text-white/30 text-xs p-6 text-center select-none">
            <p>Your web app preview will render here.</p>
          </div>
        )}

        {/* Terminal Logs Overlay */}
        {viewLogs && (
          <div className="absolute inset-x-0 bottom-0 h-48 bg-[#020203] border-t border-white/10 flex flex-col font-mono text-[10px] text-zinc-300 z-20">
            <div className="h-6 border-b border-white/5 flex items-center justify-between px-3 bg-zinc-900 select-none text-[9px] uppercase tracking-wider text-white/40">
              <span>Terminal Setup Logs</span>
              <button onClick={() => setViewLogs(false)} className="hover:text-white">✕</button>
            </div>
            <div className="flex-1 p-3 overflow-y-auto whitespace-pre-wrap selection:bg-indigo-500/30">
              {logs.map((log, idx) => (
                <div key={idx} className="leading-5">{log}</div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

