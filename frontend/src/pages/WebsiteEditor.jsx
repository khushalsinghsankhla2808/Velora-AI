// PATH: frontend/src/pages/WebsiteEditor.jsx
import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { Code2, MessageSquare, Monitor, Rocket, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import axios from "axios";
import { setUserData } from "../redux/userSlice";

const CODE_OPTIONS = [
  { value: "keep", label: "Keep current style" },
  { value: "html-css-js", label: "HTML, CSS & JavaScript" },
  { value: "javascript", label: "JavaScript focused" },
  { value: "typescript", label: "TypeScript style" },
  { value: "react", label: "React-style components" },
  { value: "tailwind", label: "Tailwind-style CSS" },
];

const thinkingSteps = [
  "Understanding your request...",
  "Planning layout changes...",
  "Improving responsiveness...",
  "Applying animations...",
  "Finalizing update...",
];

const WebsiteEditor = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const iframeRef = useRef(null);
  const [website, setWebsite] = useState(null);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [codePreference, setCodePreference] = useState("keep");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const handleUpdate = async () => {
    if (!prompt.trim() || updateLoading) {
      return;
    }

    const currentPrompt = prompt;
    setPrompt("");
    setMessages((m) => [...m, { role: "user", content: currentPrompt }]);
    setUpdateLoading(true);

    try {
      const result = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/update/${id}`,
        { prompt: currentPrompt, codePreference },
        { withCredentials: true },
      );

      setMessages((m) => [...m, { role: "ai", content: result.data.message }]);
      setCode(result.data.code);
      dispatch(
        setUserData({ ...userData, credits: result.data.remainingCredits }),
      );
    } catch (error) {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          content: error.response?.data?.message || "Update failed",
        },
      ]);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeploy = async () => {
    const result = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/api/website/deploy/${website._id}`,
      { withCredentials: true },
    );
    setWebsite((current) => ({
      ...current,
      deployed: true,
      deployUrl: result.data.url,
    }));
    window.open(result.data.url, "_blank");
  };

  useEffect(() => {
    if (!updateLoading) {
      return undefined;
    }

    const interval = setInterval(() => {
      setThinkingIndex((i) => (i + 1) % thinkingSteps.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [updateLoading]);

  useEffect(() => {
    if (!iframeRef.current || !code) return;

    iframeRef.current.srcdoc = code;
  }, [code]);

  useEffect(() => {
    const loadWebsite = async () => {
      try {
        const result = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/website/getbyid/${id}`,
          { withCredentials: true },
        );
        setWebsite(result.data);
        setCode(result.data.latestCode);
        setMessages(result.data.conversation || []);
      } catch (error) {
        setError(error.response?.data?.message || "Website not found");
      }
    };

    loadWebsite();
  }, [id]);

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

  const Header = () => (
    <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
      <p className="font-semibold truncate">{website.title}</p>
      <button
        onClick={() => setShowChat(false)}
        className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition"
      >
        <X size={18} />
      </button>
    </div>
  );

  const MessagesArea = () => (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((message, index) => (
        <div
          key={`${message.role}-${index}`}
          className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            message.role === "user"
              ? "ml-auto bg-white text-black"
              : "mr-auto bg-white/5 border border-white/10 text-zinc-200"
          }`}
        >
          {message.content}
        </div>
      ))}

      {updateLoading && (
        <div className="mr-auto max-w-[85%] px-4 py-2.5 rounded-2xl text-xs italic text-zinc-400 bg-white/5 border border-white/10">
          {thinkingSteps[thinkingIndex]}
        </div>
      )}
    </div>
  );

  const InputArea = () => (
    <div className="p-3 border-t border-white/10">
      <label className="mb-2 block">
        <span className="mb-1 block text-xs text-zinc-400">Code Style</span>
        <select
          value={codePreference}
          onChange={(e) => setCodePreference(e.target.value)}
          disabled={updateLoading}
          className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {CODE_OPTIONS.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-zinc-950 text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={updateLoading}
          rows={3}
          className="resize-none flex-1 rounded-2xl px-4 py-3 bg-white/5 border border-white/10 outline-none text-sm text-white disabled:opacity-50"
          placeholder="Ask AI to update this website..."
        />
        <button
          disabled={updateLoading}
          onClick={handleUpdate}
          className="px-4 py-3 rounded-2xl bg-white text-black disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex bg-black text-white overflow-hidden">
      <aside className="hidden lg:flex w-380px border-r border-white/10 bg-black/80 flex-col relative z-50">
        <Header />
        <MessagesArea />
        <InputArea />
      </aside>

      <main className="flex-1 flex flex-col relative">
        <div className="h-14 px-4 flex justify-between items-center border-b border-white/10 bg-black/80">
          <p className="text-xs text-zinc-400">Live Preview</p>
          <div className="flex items-center gap-2">
            {!website.deployed && (
              <button
                onClick={handleDeploy}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-linear-to-r from-indigo-500 to-purple-500"
              >
                <Rocket size={14} /> Deploy
              </button>
            )}
            <button
              onClick={() => setShowChat(true)}
              className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
            >
              <MessageSquare size={18} />
            </button>
            <button
              onClick={() => setShowCode(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
            >
              <Code2 size={18} />
            </button>
            <button
              onClick={() => setShowFullPreview(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
            >
              <Monitor size={18} />
            </button>
          </div>
        </div>

        <iframe
          ref={iframeRef}
          className="flex-1 w-full bg-white relative z-0"
          sandbox="allow-scripts allow-forms"
          title={website.title}
        />
      </main>

      <AnimatePresence>
        {showCode && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed inset-y-0 right-0 w-full lg:w-[45%] z-9999 flex flex-col bg-[#1e1e1e]"
          >
            <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
              <p className="text-sm font-medium">index.html</p>
              <button onClick={() => setShowCode(false)}>
                <X size={18} />
              </button>
            </div>
            <Editor
              theme="vs-dark"
              value={code}
              language="html"
              onChange={(v) => setCode(v)}
            />
          </motion.div>
        )}

        {showFullPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-9999"
          >
            <iframe
              className="w-full h-full bg-white"
              srcDoc={code}
              sandbox="allow-scripts allow-forms"
              title="Full Preview"
            />
            <button
              onClick={() => setShowFullPreview(false)}
              className="absolute top-4 right-4 p-2 bg-black/70 rounded-lg"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}

        {showChat && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-0 z-9999 flex flex-col bg-black"
          >
            <Header />
            <MessagesArea />
            <InputArea />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WebsiteEditor;
