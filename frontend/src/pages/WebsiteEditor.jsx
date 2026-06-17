// PATH: frontend/src/pages/WebsiteEditor.jsx
import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { Code2, Download, Loader2, MessageSquare, Monitor, Rocket, Send, X, Github } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import axios from "axios";
import { setUserData } from "../redux/userSlice";
import FileExplorer from "../components/FileExplorer";
import EditorTabs from "../components/EditorTabs";
import ChatPanel from "../components/ChatPanel";
import PreviewToolbar from "../components/PreviewToolbar";
import DiffPreviewModal from "../components/DiffPreviewModal";
import GithubExportModal from "../components/GithubExportModal";

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
  { label: "Gemini 2.0 Flash",  value: "google/gemini-2.0-flash-exp:free" },
  { label: "DeepSeek R1",       value: "deepseek/deepseek-r1:free" },
  { label: "Kimi (Moonshot)",   value: "moonshotai/kimi-vl-a3b-thinking:free" },
  { label: "MiniMax",           value: "minimax/minimax-01" },
  { label: "Qwen 3 235B",       value: "qwen/qwen3-235b-a22b:free" },
  { label: "Llama 4 Maverick",  value: "meta-llama/llama-4-maverick:free" },
  { label: "Mistral Small",     value: "mistralai/mistral-small-3.1-24b-instruct:free" },
];

const thinkingSteps = [
  "Understanding your request...",
  "Planning layout changes...",
  "Improving responsiveness...",
  "Applying animations...",
  "Finalizing update...",
];

const bundleHTMLFrontend = (filesList) => {
  const indexFile = filesList.find(f => f.path === "index.html");
  if (!indexFile) return "";

  let html = indexFile.content;

  // Find css files and inline them
  filesList.forEach(file => {
    if (file.path && file.path.endsWith(".css")) {
      const fileName = file.path;
      const linkRegex = new RegExp(`<link[^>]*href=["']\\.?/?${fileName.replace(".", "\\.")}["'][^>]*>`, "g");
      html = html.replace(linkRegex, `<style>\n${file.content}\n</style>`);
    }
  });

  // Find js/ts files and inline them
  filesList.forEach(file => {
    if (file.path && (file.path.endsWith(".js") || file.path.endsWith(".ts"))) {
      const fileName = file.path;
      const scriptRegex = new RegExp(`<script[^>]*src=["']\\.?/?${fileName.replace(".", "\\.")}["'][^>]*>\\s*</script>`, "g");
      html = html.replace(scriptRegex, `<script>\n${file.content}\n</script>`);
    }
  });

  return html;
};

const WebsiteEditor = () => {
  const { id } = useParams();
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
        `${import.meta.env.VITE_SERVER_URL}/api/website/${id}/export`,
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
  const [showChat, setShowChat] = useState(false);

  const activeFile = files.find(f => f._id === activeFileId);

  // Fetch all files from backend
  const fetchFiles = async () => {
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
  };

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
      const bundled = bundleHTMLFrontend(updatedFiles);
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
      // For virtual folders, we find all files matching the prefix path
      // but standard API path renames specific files. We rename the files individually.
      // Wait, let's keep it simple: rename standard files.
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
      // Flush save before deploying
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

    loadWebsiteData();
  }, [id]);

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
    <div className="h-screen w-screen flex bg-black text-white overflow-hidden">
      {/* Column 1: File Explorer */}
      <aside className="w-60 shrink-0 border-r border-white/10 bg-zinc-950 flex flex-col z-40">
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
      </aside>

      {/* Column 2: AI Chat Sidebar (toggled by showChat) */}
      <AnimatePresence>
        {showChat && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 350, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-white/10 bg-black/80 flex flex-col relative z-30 shrink-0 overflow-hidden"
          >
            <ChatPanel
              projectId={id}
              onClose={() => setShowChat(false)}
              onUpdateSuccess={handleChatUpdateSuccess}
              onFileClick={handleChatFileClick}
              updateLoading={updateLoading}
              setUpdateLoading={setUpdateLoading}
              onProposedDiff={(diffData) => setPendingDiff(diffData)}
              chatRefreshTrigger={chatRefreshTrigger}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Columns 3 & 4 Container */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Column 4: Live Preview Column */}
        <main className="flex-1 flex flex-col min-w-0 bg-black relative">
          <div className="h-12 px-4 flex justify-between items-center border-b border-white/10 bg-black/80 shrink-0">
            <p className="text-xs text-zinc-400">Live Preview</p>
            <PreviewToolbar current={previewMode} onChange={setPreviewMode} />
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadZip}
                disabled={downloadLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white cursor-pointer disabled:opacity-50"
                title="Download Project ZIP"
              >
                {downloadLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Downloading...
                  </>
                ) : (
                  <>
                    <Download size={14} /> Download ZIP
                  </>
                )}
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
                onClick={() => setShowChat(!showChat)}
                className={`p-2 rounded-xl transition cursor-pointer ${showChat ? "bg-white/20 text-white" : "bg-white/10 hover:bg-white/20 text-zinc-400"}`}
                title="Toggle AI Chat"
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
            className="fixed inset-0 bg-black z-[9999]"
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
