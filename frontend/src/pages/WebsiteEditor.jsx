// PATH: frontend/src/pages/WebsiteEditor.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Code2, Download, Loader2, MessageSquare, Monitor, Rocket, Send, X, Github, History, ShieldAlert, Palette, Users, Grid, Play, Bug, Share2, FileCode, Check, AlertCircle, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { setUserData } from "../redux/userSlice";
import FileExplorer from "../components/FileExplorer";
import EditorTabs from "../components/EditorTabs";
import ChatPanel from "../components/ChatPanel";
import PreviewToolbar from "../components/PreviewToolbar";
import DiffPreviewModal from "../components/DiffPreviewModal";
import GithubExportModal from "../components/GithubExportModal";
import VersionHistoryPanel from "../components/VersionHistoryPanel";
import AuditPanel from "../components/AuditPanel";
import BrandPanel from "../components/BrandPanel";
import CollaborationPanel from "../components/CollaborationPanel";
import MarketplacePanel from "../components/MarketplacePanel";

const CODE_OPTIONS = [
  { value: "keep",          label: "Keep current style" },
  { value: "html-css-js",  label: "HTML, CSS & JavaScript" },
  { value: "tailwind",     label: "Tailwind CSS" },
  { value: "bootstrap",    label: "Bootstrap 5" },
  { value: "glassmorphism",label: "Glassmorphism UI" },
  { value: "neumorphism",  label: "Neumorphism / Soft UI" },
  { value: "material",     label: "Material Design" },
  { value: "animations",   label: "Animation Focused" },
  { value: "vue",          label: "Vue Style" },
  { value: "react",        label: "React Style" },
  { value: "scss",          label: "SCSS Architecture" },
  { value: "javascript",   label: "JavaScript Heavy" },
  { value: "typescript",   label: "TypeScript Style" },
];

const EDITOR_MODELS = [
  { label: "Gemini 2.5 Flash",  value: "google/gemini-2.5-flash" },
];

const thinkingSteps = [
  "Understanding your request...",
  "Planning layout changes...",
  "Improving responsiveness...",
  "Applying animations...",
  "Finalizing update...",
];

const bundleHTMLFrontend = (filesList, entryPath = "index.html") => {
  const indexFile = filesList.find(f => f.path === entryPath);
  if (!indexFile) return "";

  let html = indexFile.content;

  // Find css files and inline them
  filesList.forEach(file => {
    if (file.path && file.path.endsWith(".css")) {
      const fileName = file.path;
      const safeFileName = fileName.replace(/\./g, "\\.");
      const linkRegex = new RegExp(`<link[^>]*href=["']\\.?/?${safeFileName}["'][^>]*>`, "g");
      html = html.replace(linkRegex, `<style>\n${file.content}\n</style>`);
    }
  });

  // Find js/ts files and inline them
  filesList.forEach(file => {
    if (file.path && (file.path.endsWith(".js") || file.path.endsWith(".ts"))) {
      const fileName = file.path;
      const safeFileName = fileName.replace(/\./g, "\\.");
      const scriptRegex = new RegExp(`<script[^>]*src=["']\\.?/?${safeFileName}["'][^>]*>\\s*</script>`, "g");
      html = html.replace(scriptRegex, `<script>\n${file.content}\n</script>`);
    }
  });

  // Inject preview navigation and console error capturing interceptor script
  const interceptorScript = `
<script>
// Capture navigation clicks
document.addEventListener('click', function(e) {
  const anchor = e.target.closest('a');
  if (anchor && anchor.getAttribute('href')) {
    const href = anchor.getAttribute('href').trim();
    if (href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#')) {
      e.preventDefault();
      window.parent.postMessage({ type: 'NAVIGATE_PREVIEW', path: href }, '*');
    }
  }
});

// Capture window script errors
window.onerror = function(message, source, lineno, colno, error) {
  window.parent.postMessage({
    type: 'CONSOLE_ERROR',
    error: {
      message: message,
      source: source || 'inline',
      lineno: lineno || 0,
      colno: colno || 0,
      stack: error ? error.stack : ''
    }
  }, '*');
  return false;
};

// Capture promise rejections
window.addEventListener('unhandledrejection', function(event) {
  window.parent.postMessage({
    type: 'CONSOLE_ERROR',
    error: {
      message: event.reason ? (event.reason.message || String(event.reason)) : 'Unhandled Promise Rejection',
      stack: event.reason ? event.reason.stack : ''
    }
  }, '*');
});

// Capture console error calls
const originalConsoleError = console.error;
console.error = function(...args) {
  originalConsoleError.apply(console, args);
  window.parent.postMessage({
    type: 'CONSOLE_ERROR',
    error: {
      message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
    }
  }, '*');
};
</script>
`;

  if (html.includes("</body>")) {
    html = html.replace("</body>", `${interceptorScript}\n</body>`);
  } else {
    html += interceptorScript;
  }

  return html;
};

const WebsiteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const iframeRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Core Website state
  const [website, setWebsite] = useState(null);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState("desktop");

  const [pendingDiff, setPendingDiff] = useState(null);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [chatRefreshTrigger, setChatRefreshTrigger] = useState(0);
  const [showGithubModal, setShowGithubModal] = useState(false);

  const handleAcceptDiff = async () => {
    if (!pendingDiff) return;
    setAcceptLoading(true);
    try {
      const payload = {
        projectId: id,
        instruction: pendingDiff.instruction,
        message: pendingDiff.message,
        tokensUsed: pendingDiff.tokensUsed,
        files: pendingDiff.filesChanged.map(f => ({
          path: f.path,
          content: f.newContent,
        })),
      };
      
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/chat/accept`,
        payload,
        { withCredentials: true }
      );
      
      if (response.data?.success) {
        const { remainingCredits, latestCode, filesChanged } = response.data.data;
        
        await handleChatUpdateSuccess({ remainingCredits, latestCode, filesChanged });
        
        setChatRefreshTrigger(prev => prev + 1);
        setPendingDiff(null);
      }
    } catch (err) {
      console.error("Failed to accept diff changes:", err);
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleRejectDiff = () => {
    setPendingDiff(null);
  };

  const handleDownloadZip = async () => {
    setDownloadLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/export?exportType=${zipExportType}`,
        {
          responseType: "blob",
          withCredentials: true,
        }
      );
      
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const contentDisposition = response.headers["content-disposition"];
      let filename = `${website?.title?.replace(/[^a-zA-Z0-9-_]/g, "_") || "project"}_export.zip`;
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP download failed:", err.response?.data || err.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleFork = async () => {
    try {
      setUpdateLoading(true);
      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/fork`,
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        navigate(`/editor/${res.data.data.websiteId}`);
        window.location.reload();
      }
    } catch (err) {
      console.error("Fork failed:", err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleApplyBrand = async (brandData) => {
    const styleFile = files.find(f => f.path === "style.css");
    const indexFile = files.find(f => f.path === "index.html");

    if (!styleFile || !indexFile) {
      throw new Error("Could not find style.css or index.html in project files.");
    }

    const cssVars = `:root {\n  --primary-color: ${brandData.colors.primary};\n  --secondary-color: ${brandData.colors.secondary};\n  --bg-color: ${brandData.colors.background};\n  --text-color: ${brandData.colors.text};\n  --neutral-color: ${brandData.colors.neutral};\n  --font-family: '${brandData.typography.bodyFont}', sans-serif;\n  --heading-font: '${brandData.typography.headingFont}', sans-serif;\n  --border-radius: ${brandData.styles.borderRadius};\n  --box-shadow: ${brandData.styles.boxShadow};\n}\n\nbody {\n  background-color: var(--bg-color);\n  color: var(--text-color);\n  font-family: var(--font-family);\n}\n\nh1, h2, h3, h4, h5, h6 {\n  font-family: var(--heading-font);\n}\n\n`;

    let cleanedStyleContent = styleFile.content;
    if (cleanedStyleContent.includes(":root {")) {
      const rootEndIndex = cleanedStyleContent.indexOf("}", cleanedStyleContent.indexOf(":root {"));
      if (rootEndIndex !== -1) {
        cleanedStyleContent = cleanedStyleContent.substring(rootEndIndex + 1);
      }
    }
    const newStyleContent = cssVars + cleanedStyleContent;

    const fontLinks = `\n    <link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link href="${brandData.typography.headingLink}" rel="stylesheet">\n    <link href="${brandData.typography.bodyLink}" rel="stylesheet">\n`;
    
    let newIndexContent = indexFile.content;
    if (!newIndexContent.includes(brandData.typography.bodyLink)) {
      newIndexContent = newIndexContent.replace("</head>", `${fontLinks}\n</head>`);
    }

    await axios.put(
      `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/files/${styleFile._id}`,
      { content: newStyleContent },
      { withCredentials: true }
    );

    await axios.put(
      `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/files/${indexFile._id}`,
      { content: newIndexContent },
      { withCredentials: true }
    );

    await handleChatUpdateSuccess({
      remainingCredits: null,
      latestCode: bundleHTMLFrontend(
        files.map(f => {
          if (f.path === "style.css") return { ...f, content: newStyleContent };
          if (f.path === "index.html") return { ...f, content: newIndexContent };
          return f;
        })
      ),
      filesChanged: ["style.css", "index.html"]
    });
  };

  const handleRunAIDebugger = async (errorLog) => {
    if (debugLoading) return;
    setDebugLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/debug`,
        {
          errorMessage: errorLog.message,
          errorStack: errorLog.stack,
        },
        { withCredentials: true }
      );
      if (response.data?.success) {
        const proposedDiff = response.data.data;
        setPendingDiff({
          instruction: `Auto-fix console runtime error: ${errorLog.message}`,
          message: proposedDiff.message,
          filesChanged: proposedDiff.filesChanged,
          tokensUsed: 0,
        });
      }
    } catch (err) {
      console.error("AI Debugger repair request failed:", err);
    } finally {
      setDebugLoading(false);
    }
  };

  // Multi-file Workspace state
  const [files, setFiles] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [saving, setSaving] = useState({});
  const [savedContents, setSavedContents] = useState({});
  const [explorerLoading, setExplorerLoading] = useState(false);

  // UI Panel Layout states
  const [showCode, setShowCode] = useState(true);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState(null);
  const [showExplorer, setShowExplorer] = useState(true);
  
  // Console logs state for standard errors
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);

  // Active page preview (defaults to "index.html")
  const [activePreviewPage, setActivePreviewPage] = useState("index.html");

  // ZIP export framework stack
  const [zipExportType, setZipExportType] = useState("html");

  const activeFile = files.find(f => f._id === activeFileId);

  // Fetch all files from backend
  const fetchFiles = useCallback(async () => {
    try {
      setExplorerLoading(true);
      const result = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/files`,
        { withCredentials: true }
      );
      const fetchedFiles = result.data.data.files || [];
      setFiles(fetchedFiles);
      
      const contents = {};
      fetchedFiles.forEach(f => {
        contents[f._id] = f.content;
      });
      setSavedContents(contents);
      return fetchedFiles;
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setExplorerLoading(false);
    }
  }, [id]);

  // Immediate Save Flush Function
  const flushSave = async (fileId) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const fileToSave = files.find(f => f._id === fileId);
    if (!fileToSave) return;

    setSaving(prev => ({ ...prev, [fileId]: true }));
    try {
      await axios.put(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/files/${fileId}`,
        { content: fileToSave.content },
        { withCredentials: true }
      );
      setUnsavedChanges(prev => ({ ...prev, [fileId]: false }));
      setSavedContents(prev => ({ ...prev, [fileId]: fileToSave.content }));

      // Update bundled code in iframe
      const updatedFiles = files.map(f => f._id === fileId ? { ...f, content: fileToSave.content } : f);
      const bundled = bundleHTMLFrontend(updatedFiles, activePreviewPage);
      setCode(bundled);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(prev => ({ ...prev, [fileId]: false }));
    }
  };

  // Switch tabs (flushes unsaved changes on old tab first)
  const selectTab = async (fileId) => {
    if (fileId === activeFileId) return;
    if (activeFileId && unsavedChanges[activeFileId]) {
      await flushSave(activeFileId);
    }
    setActiveFileId(fileId);
  };

  // Close tabs (flushes unsaved changes first)
  const closeTab = async (fileId) => {
    if (unsavedChanges[fileId]) {
      await flushSave(fileId);
    }

    if (activeFileId === fileId) {
      const remaining = openFiles.filter(f => f._id !== fileId);
      if (remaining.length > 0) {
        setActiveFileId(remaining[remaining.length - 1]._id);
      } else {
        setActiveFileId(null);
      }
    }

    setOpenFiles(prev => prev.filter(f => f._id !== fileId));
  };

  // Monaco Editor Change Listener
  const handleEditorChange = (value) => {
    if (!activeFileId) return;

    setFiles(prev =>
      prev.map(f => (f._id === activeFileId ? { ...f, content: value } : f))
    );

    const isDirty = value !== savedContents[activeFileId];
    setUnsavedChanges(prev => ({ ...prev, [activeFileId]: isDirty }));

    if (isDirty) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        flushSave(activeFileId);
      }, 500);
    }
  };

  // File explorer node clicks
  const handleFileSelect = (node) => {
    const isAlreadyOpen = openFiles.some(f => f._id === node.fileId);
    if (!isAlreadyOpen) {
      const selectedFile = files.find(f => f._id === node.fileId);
      if (selectedFile) {
        setOpenFiles(prev => [...prev, selectedFile]);
      }
    }
    selectTab(node.fileId);
  };

  const handleCreateFile = async (path) => {
    const result = await axios.post(
      `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/files`,
      { path, content: "" },
      { withCredentials: true }
    );
    const newFile = result.data.data.file;
    setFiles(prev => [...prev, newFile]);
    setSavedContents(prev => ({ ...prev, [newFile._id]: "" }));
    setOpenFiles(prev => [...prev, newFile]);
    selectTab(newFile._id);
  };

  const handleCreateFolder = async (path) => {
    const result = await axios.post(
      `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/folders`,
      { path },
      { withCredentials: true }
    );
    await fetchFiles();
  };

  const handleRenameFile = async (fileId, newPath, isFolder) => {
    if (isFolder) {
      return;
    }
    const result = await axios.patch(
      `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/files/${fileId}/rename`,
      { newPath },
      { withCredentials: true }
    );
    const updatedFile = result.data.data.file;
    setFiles(prev => prev.map(f => f._id === fileId ? updatedFile : f));
    setOpenFiles(prev => prev.map(f => f._id === fileId ? updatedFile : f));
    setSavedContents(prev => ({ ...prev, [fileId]: updatedFile.content }));
  };

  const handleDeleteFile = async (fileId, isFolder) => {
    if (isFolder) {
      return;
    }
    await axios.delete(
      `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/files/${fileId}`,
      { withCredentials: true }
    );
    await closeTab(fileId);
    setFiles(prev => prev.filter(f => f._id !== fileId));
    setOpenFiles(prev => prev.filter(f => f._id !== fileId));
    setSavedContents(prev => {
      const copy = { ...prev };
      delete copy[fileId];
      return copy;
    });
  };

  const handleDeploy = async () => {
    try {
      if (activeFileId && unsavedChanges[activeFileId]) {
        await flushSave(activeFileId);
      }
      const result = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/website/deploy/${website._id}`,
        { withCredentials: true },
      );
      const url = result.data.data.url;
      setWebsite((current) => ({
        ...current,
        deployed: true,
        deployUrl: url,
      }));
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Deploy failed:", err.response?.data || err.message);
    }
  };

  const handleChatUpdateSuccess = async ({ remainingCredits, latestCode, filesChanged }) => {
    if (remainingCredits !== null && remainingCredits !== undefined) {
      dispatch(
        setUserData({ ...userData, credits: remainingCredits })
      );
    }
    setCode(latestCode);

    // Re-sync all files
    const refreshedFiles = await fetchFiles();

    // Update open tabs list references
    setOpenFiles(prev => {
      return prev.map(openF => {
        const match = refreshedFiles.find(rf => rf.path === openF.path);
        return match || openF;
      });
    });
  };

  const handleChatFileClick = (filePath) => {
    const file = files.find(f => f.path === filePath);
    if (file) {
      handleFileSelect({ fileId: file._id });
    }
  };

  const handleTabClick = (tab) => {
    if (activeSidebarTab === tab) {
      setActiveSidebarTab(null);
    } else {
      setActiveSidebarTab(tab);
    }
  };

  // Handle iframe message forwarding (console errors & multi-page navigation)
  useEffect(() => {
    const handleIframeMessage = (event) => {
      if (!event.data) return;

      if (event.data.type === "NAVIGATE_PREVIEW") {
        const path = event.data.path;
        const cleanPath = path.replace(/^(\.\/|\/)/, "");
        setActivePreviewPage(cleanPath);
      }

      if (event.data.type === "CONSOLE_ERROR") {
        const err = event.data.error;
        setConsoleLogs((prev) => [...prev, { ...err, timestamp: new Date() }]);
        setShowConsole(true);
      }
    };

    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, []);

  // Update compiled iframe source doc when active page changes or files reload
  useEffect(() => {
    if (files && files.length > 0) {
      const compiled = bundleHTMLFrontend(files, activePreviewPage);
      if (compiled) {
        const timer = setTimeout(() => {
          setCode(compiled);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [files, activePreviewPage]);

  // Set iframe preview source doc
  useEffect(() => {
    if (!iframeRef.current || !code) return;
    iframeRef.current.srcdoc = code;
  }, [code]);

  // Initial data loading
  useEffect(() => {
    const loadWebsiteData = async () => {
      try {
        const result = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/website/getbyid/${id}`,
          { withCredentials: true },
        );
        setWebsite(result.data.data.website);
        setCode(result.data.data.website.latestCode);

        // Fetch project files
        const loadedFiles = await fetchFiles();
        if (loadedFiles && loadedFiles.length > 0) {
          const indexHtml = loadedFiles.find(f => f.path === "index.html");
          if (indexHtml) {
            setOpenFiles([indexHtml]);
            setActiveFileId(indexHtml._id);
          } else {
            setOpenFiles([loadedFiles[0]]);
            setActiveFileId(loadedFiles[0]._id);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || "Website not found");
      }
    };

    const timer = setTimeout(() => {
      loadWebsiteData();
    }, 0);
    return () => clearTimeout(timer);
  }, [id, fetchFiles]);

  // Cleanup active save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-red-400">
        {error}
      </div>
    );
  }

  if (!website) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-black text-white overflow-hidden select-none">
      {/* Activity Bar (Vertical Dock) */}
      <div className="w-16 shrink-0 bg-zinc-950 border-r border-white/10 flex flex-col items-center py-4 justify-between z-50">
        {/* Top group */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* File Explorer Toggle */}
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className={`p-2.5 rounded-xl transition relative cursor-pointer ${showExplorer ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            title="Toggle File Explorer"
          >
            <FileCode size={20} />
          </button>

          <hr className="w-8 border-white/5" />

          {/* AI Chat */}
          <button
            onClick={() => handleTabClick("chat")}
            className={`p-2.5 rounded-xl transition relative cursor-pointer ${activeSidebarTab === "chat" ? "bg-purple-600/20 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title="AI Chat Assistant"
          >
            {activeSidebarTab === "chat" && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-purple-500 rounded-r" />}
            <MessageSquare size={20} />
          </button>

          {/* Version History */}
          <button
            onClick={() => handleTabClick("versions")}
            className={`p-2.5 rounded-xl transition relative cursor-pointer ${activeSidebarTab === "versions" ? "bg-purple-600/20 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title="Version History"
          >
            {activeSidebarTab === "versions" && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-purple-500 rounded-r" />}
            <History size={20} />
          </button>

          {/* Quality Audit */}
          <button
            onClick={() => handleTabClick("audit")}
            className={`p-2.5 rounded-xl transition relative cursor-pointer ${activeSidebarTab === "audit" ? "bg-purple-600/20 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title="AI Quality Audit"
          >
            {activeSidebarTab === "audit" && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-purple-500 rounded-r" />}
            <ShieldAlert size={20} />
          </button>

          {/* Brand Palette */}
          <button
            onClick={() => handleTabClick("brand")}
            className={`p-2.5 rounded-xl transition relative cursor-pointer ${activeSidebarTab === "brand" ? "bg-purple-600/20 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title="AI Brand Identity"
          >
            {activeSidebarTab === "brand" && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-purple-500 rounded-r" />}
            <Palette size={20} />
          </button>

          {/* Collaboration */}
          <button
            onClick={() => handleTabClick("team")}
            className={`p-2.5 rounded-xl transition relative cursor-pointer ${activeSidebarTab === "team" ? "bg-purple-600/20 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title="Team Collaboration"
          >
            {activeSidebarTab === "team" && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-purple-500 rounded-r" />}
            <Users size={20} />
          </button>

          {/* Component Marketplace */}
          <button
            onClick={() => handleTabClick("marketplace")}
            className={`p-2.5 rounded-xl transition relative cursor-pointer ${activeSidebarTab === "marketplace" ? "bg-purple-600/20 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title="Component Marketplace"
          >
            {activeSidebarTab === "marketplace" && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-purple-500 rounded-r" />}
            <Grid size={20} />
          </button>
        </div>

        {/* Bottom group */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Fork Project */}
          <button
            onClick={handleFork}
            className="p-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition cursor-pointer"
            title="Fork Project (Clone)"
          >
            <Share2 size={20} />
          </button>

          {/* Console / Terminal logs */}
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`p-2.5 rounded-xl transition relative cursor-pointer ${showConsole ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            title="Console Logs"
          >
            <Bug size={20} />
            {consoleLogs.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white scale-90 border border-zinc-950 animate-pulse">
                {consoleLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Column 1: File Explorer */}
      <AnimatePresence>
        {showExplorer && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="shrink-0 border-r border-white/10 bg-zinc-950 flex flex-col z-40 overflow-hidden"
          >
            <FileExplorer
              files={files}
              activeFileId={activeFileId}
              onFileSelect={handleFileSelect}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onRenameFile={handleRenameFile}
              onDeleteFile={handleDeleteFile}
              loading={explorerLoading}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Column 2: Side Panel (AI Chat, History, etc.) */}
      <AnimatePresence>
        {activeSidebarTab !== null && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 350, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-white/10 bg-black/85 flex flex-col relative z-30 shrink-0 overflow-hidden"
          >
            {activeSidebarTab === "chat" && (
              <ChatPanel
                projectId={id}
                onClose={() => setActiveSidebarTab(null)}
                onUpdateSuccess={handleChatUpdateSuccess}
                onFileClick={handleChatFileClick}
                updateLoading={updateLoading}
                setUpdateLoading={setUpdateLoading}
                onProposedDiff={(diffData) => setPendingDiff(diffData)}
                chatRefreshTrigger={chatRefreshTrigger}
              />
            )}
            {activeSidebarTab === "versions" && (
              <VersionHistoryPanel
                projectId={id}
                onUpdateSuccess={handleChatUpdateSuccess}
              />
            )}
            {activeSidebarTab === "audit" && (
              <AuditPanel
                projectId={id}
              />
            )}
            {activeSidebarTab === "brand" && (
              <BrandPanel
                projectId={id}
                onApplyBrand={handleApplyBrand}
              />
            )}
            {activeSidebarTab === "team" && (
              <CollaborationPanel
                projectId={id}
              />
            )}
            {activeSidebarTab === "marketplace" && (
              <MarketplacePanel
                projectId={id}
                activeFile={activeFile}
                onUpdateSuccess={handleChatUpdateSuccess}
              />
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Columns 3 & 4 Container */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Column 4: Live Preview Column */}
        <main className="flex-1 flex flex-col min-w-0 bg-black relative">
          <div className="h-12 px-4 flex justify-between items-center border-b border-white/10 bg-black/80 shrink-0">
            {/* Dynamic Preview Router Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold">Preview Page:</span>
              <select
                value={activePreviewPage}
                onChange={(e) => setActivePreviewPage(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg text-xs px-2.5 py-1 text-white outline-none cursor-pointer focus:border-purple-500/50"
              >
                {files.filter(f => f.path && f.path.endsWith('.html')).map(f => (
                  <option key={f.path} value={f.path} className="bg-zinc-900">
                    {f.path}
                  </option>
                ))}
              </select>
            </div>
            
            <PreviewToolbar current={previewMode} onChange={setPreviewMode} />
            <div className="flex items-center gap-2">
              {/* Premium ZIP Export Select Dropdown */}
              <div className="relative flex items-center bg-white/10 rounded-xl overflow-hidden hover:bg-white/15 transition border border-white/5">
                <button
                  onClick={() => handleDownloadZip(zipExportType)}
                  disabled={downloadLoading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white border-r border-white/10 cursor-pointer disabled:opacity-50 hover:bg-white/5"
                >
                  {downloadLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  ZIP
                </button>
                <select
                  value={zipExportType}
                  onChange={(e) => setZipExportType(e.target.value)}
                  className="bg-zinc-950 text-white text-[10px] pl-2 pr-6 py-2 outline-none cursor-pointer hover:bg-white/5 appearance-none font-semibold"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 6px center',
                    backgroundSize: '10px',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <option value="html" className="bg-zinc-950">HTML</option>
                  <option value="react" className="bg-zinc-950">React</option>
                  <option value="nextjs" className="bg-zinc-950">Next.js</option>
                </select>
              </div>

              {/* Fork button */}
              <button
                onClick={handleFork}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title="Fork Project (Create Copy)"
              >
                <Share2 size={14} /> Fork
              </button>

              <button
                onClick={() => setShowGithubModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title="Export to GitHub"
              >
                <Github size={14} /> Export to GitHub
              </button>

              {!website.deployed && (
                <button
                  onClick={handleDeploy}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-linear-to-r from-indigo-500 to-purple-500 cursor-pointer"
                >
                  <Rocket size={14} /> Deploy
                </button>
              )}
              <button
                onClick={() => handleTabClick(activeSidebarTab ? null : "chat")}
                className={`p-2 rounded-xl transition cursor-pointer ${activeSidebarTab ? "bg-white/20 text-white" : "bg-white/10 hover:bg-white/20 text-zinc-400"}`}
                title="Toggle Panels"
              >
                <MessageSquare size={18} />
              </button>
              <button
                onClick={() => setShowCode(!showCode)}
                className={`p-2 rounded-xl transition cursor-pointer ${showCode ? "bg-white/20 text-white" : "bg-white/10 hover:bg-white/20 text-zinc-400"}`}
                title="Toggle Code Editor"
              >
                <Code2 size={18} />
              </button>
              <button
                onClick={() => setShowFullPreview(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-400 cursor-pointer"
                title="Full Screen Preview"
              >
                <Monitor size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-zinc-950/40 overflow-auto flex justify-center items-center p-6 relative">
            <iframe
              ref={iframeRef}
              className={`bg-white relative z-0 border-none transition-all duration-300 ${
                previewMode === "mobile"
                  ? "w-[375px] h-[667px] max-h-full rounded-3xl ring-12 ring-zinc-900 border border-zinc-800 shadow-2xl"
                  : previewMode === "tablet"
                  ? "w-[768px] h-[1024px] max-h-full rounded-3xl ring-12 ring-zinc-900 border border-zinc-800 shadow-2xl"
                  : "w-full h-full"
              }`}
              sandbox="allow-scripts allow-forms allow-same-origin"
              title={website.title}
            />
          </div>
        </main>

        {/* Column 3: Tabbed Monaco Code Editor (toggled by showCode) */}
        <AnimatePresence>
          {showCode && (
            <motion.div
              initial={{ flexGrow: 0, width: 0 }}
              animate={{ flexGrow: 1, width: "auto" }}
              exit={{ flexGrow: 0, width: 0 }}
              className="flex flex-col border-l border-white/10 min-w-0 bg-[#1e1e1e] overflow-hidden"
            >
              <EditorTabs
                openFiles={openFiles}
                activeFileId={activeFileId}
                unsavedChanges={unsavedChanges}
                onTabSelect={selectTab}
                onTabClose={closeTab}
                saving={saving}
              />
              <div className="flex-1 min-h-0 relative">
                {activeFileId && activeFile ? (
                  <Editor
                    theme="vs-dark"
                    value={activeFile.content}
                    language={activeFile.language}
                    onChange={handleEditorChange}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm gap-2">
                    <p>No file open.</p>
                    <p className="text-xs text-zinc-600">Select a file from the explorer to start editing</p>
                  </div>
                )}
              </div>

              {/* Console Drawer */}
              <AnimatePresence>
                {showConsole && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 260 }}
                    exit={{ height: 0 }}
                    className="border-t border-white/10 bg-zinc-950 flex flex-col overflow-hidden text-zinc-300 font-mono text-xs z-20 shrink-0"
                  >
                    {/* Console Header */}
                    <div className="h-9 px-4 border-b border-white/5 bg-zinc-900 flex items-center justify-between shrink-0">
                      <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <Bug size={12} className="text-red-400" />
                        Console Logs ({consoleLogs.length})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setConsoleLogs([])}
                          className="px-2 py-0.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition text-[10px] cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setShowConsole(false)}
                          className="p-1 rounded hover:bg-white/5 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Console Output */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 select-text">
                      {consoleLogs.length === 0 ? (
                        <div className="text-zinc-600 italic py-6 text-center text-[10px]">No logs captured yet. Sandbox output will appear here.</div>
                      ) : (
                        consoleLogs.map((log, index) => (
                          <div key={index} className="p-2.5 rounded-xl border border-red-500/10 bg-red-500/5 hover:border-red-500/20 transition space-y-2">
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <p className="text-red-400 font-semibold leading-relaxed break-all select-text">
                                  {log.message}
                                </p>
                                {log.source && (
                                  <p className="text-[10px] text-zinc-500 select-all font-mono">
                                    Source: {log.source}:{log.lineno}:{log.colno}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleRunAIDebugger(log)}
                                disabled={debugLoading}
                                className="shrink-0 bg-red-500/20 hover:bg-red-500/35 border border-red-500/25 px-2.5 py-1 rounded-lg text-red-300 font-semibold flex items-center gap-1 transition text-[10px] active:scale-95 disabled:opacity-50 cursor-pointer"
                              >
                                {debugLoading ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <Sparkles size={10} />
                                )}
                                Fix with AI
                              </button>
                            </div>
                            {log.stack && (
                              <details className="mt-1 cursor-pointer">
                                <summary className="text-[9px] text-zinc-500 select-none hover:text-zinc-300 font-sans">Show Stack Trace</summary>
                                <pre className="mt-1.5 p-2 bg-black/40 rounded-lg text-[9px] text-zinc-500 max-h-24 overflow-auto border border-white/5 font-mono whitespace-pre select-text">
                                  {log.stack}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full Preview Modal */}
      <AnimatePresence>
        {showFullPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-9999"
          >
            <iframe
              className="w-full h-full bg-white border-none"
              srcDoc={code}
              sandbox="allow-scripts allow-forms allow-same-origin"
              title="Full Preview"
            />
            <button
              onClick={() => setShowFullPreview(false)}
              className="absolute top-4 right-4 p-2 bg-black/70 rounded-lg text-white cursor-pointer hover:bg-black"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proposed Diff Preview Modal */}
      <AnimatePresence>
        {pendingDiff && (
          <DiffPreviewModal
            diff={pendingDiff}
            onAccept={handleAcceptDiff}
            onReject={handleRejectDiff}
            loading={acceptLoading}
          />
        )}
      </AnimatePresence>

      {/* GitHub Export Modal */}
      <AnimatePresence>
        {showGithubModal && (
          <GithubExportModal
            id={id}
            website={website}
            onClose={() => setShowGithubModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default WebsiteEditor;
