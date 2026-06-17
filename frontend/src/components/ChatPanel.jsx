// PATH: frontend/src/components/ChatPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import { Send, X, AlertCircle, Loader2, Sparkles, FileCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const thinkingSteps = [
  "Analyzing website structure...",
  "Planning edits for targeted files...",
  "Writing clean code changes...",
  "Inlining styles and scripts...",
  "Updating workspace preview...",
];

export default function ChatPanel({
  projectId,
  onClose,
  onUpdateSuccess,
  onFileClick,
  updateLoading,
  setUpdateLoading,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Load chat history
  const fetchChatHistory = async (before = "") => {
    try {
      setLoadingHistory(true);
      const url = `${import.meta.env.VITE_SERVER_URL}/api/website/${projectId}/chat${
        before ? `?before=${before}` : ""
      }`;
      const response = await axios.get(url, { withCredentials: true });
      if (response.data?.success) {
        const { messages: newMessages, hasMore: moreAvailable } = response.data.data;
        if (before) {
          setMessages((prev) => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
          // Scroll to bottom on initial load
          setTimeout(scrollToBottom, 50);
        }
        setHasMore(moreAvailable);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
      setError("Failed to load chat history");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, [projectId]);

  // Handle thinking ticker animation
  useEffect(() => {
    if (!updateLoading) return undefined;
    const interval = setInterval(() => {
      setThinkingIndex((i) => (i + 1) % thinkingSteps.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [updateLoading]);

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || updateLoading) return;

    setError("");
    const instructionText = input;
    setInput("");

    // optimistic user message append
    const tempUserMsg = {
      _id: `temp-user-${Date.now()}`,
      role: "user",
      message: instructionText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setTimeout(scrollToBottom, 50);

    setUpdateLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/website/${projectId}/chat`,
        { instruction: instructionText },
        { withCredentials: true }
      );

      if (response.data?.success) {
        const { chat: assistantMsg, remainingCredits, latestCode, filesChanged } = response.data.data;
        // Append assistant reply
        setMessages((prev) => [...prev, assistantMsg]);
        setTimeout(scrollToBottom, 50);

        // Notify parent workspace to sync
        if (onUpdateSuccess) {
          onUpdateSuccess({ remainingCredits, latestCode, filesChanged });
        }
      }
    } catch (err) {
      console.error("Chat edit error:", err);
      const errMsg = err.response?.data?.error?.message || "Something went wrong. Please try again.";
      setError(errMsg);
      // Remove the optimistic user message if failed to maintain sync
      setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
    } finally {
      setUpdateLoading(false);
    }
  };

  const loadOlderMessages = () => {
    if (messages.length > 0) {
      const oldestTimestamp = messages[0].createdAt;
      fetchChatHistory(oldestTimestamp);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/90 text-zinc-100 select-none">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-zinc-900/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="text-purple-400" size={16} />
          <span className="font-semibold text-sm tracking-wide bg-gradient-to-r from-purple-200 to-zinc-100 bg-clip-text text-transparent">
            AI Targeted Edit
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages list */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 bg-gradient-to-b from-zinc-950 to-zinc-900/40"
      >
        {hasMore && (
          <div className="flex justify-center shrink-0">
            <button
              onClick={loadOlderMessages}
              disabled={loadingHistory}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {loadingHistory ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="animate-spin" size={12} /> Loading...
                </span>
              ) : (
                "Load older messages"
              )}
            </button>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={message._id || `${message.role}-${message.createdAt}`}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[90%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-lg ${
                  isUser
                    ? "bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 text-white rounded-br-none"
                    : "bg-white/5 border border-white/10 text-zinc-200 rounded-bl-none backdrop-blur-xs"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.message}</p>

                {/* Files changed chips */}
                {!isUser && message.filesChanged && message.filesChanged.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/5">
                    <span className="text-[10px] text-zinc-400 block mb-1.5">Files changed:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {message.filesChanged.map((filePath) => (
                        <button
                          key={filePath}
                          onClick={() => onFileClick && onFileClick(filePath)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/5 text-purple-300 hover:text-purple-200 transition cursor-pointer active:scale-95 shadow-sm hover:shadow-indigo-500/10"
                        >
                          <FileCode size={11} className="text-purple-400" />
                          <span className="truncate max-w-[120px]">{filePath}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-zinc-500 mt-1 px-1">
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </motion.div>
          );
        })}

        {updateLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2.5 mr-auto bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-none text-xs text-zinc-400"
          >
            <Loader2 className="animate-spin text-purple-400 shrink-0" size={14} />
            <span>{thinkingSteps[thinkingIndex]}</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer input form */}
      <div className="p-3 border-t border-white/10 bg-zinc-900/60 backdrop-blur-md shrink-0">
        {error && (
          <div className="mb-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-1.5 animate-pulse">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            disabled={updateLoading}
            rows={2}
            className="flex-1 resize-none rounded-xl bg-white/5 border border-white/10 outline-none text-xs text-white p-2.5 placeholder-zinc-500 focus:border-purple-500/50 focus:bg-white/10 transition disabled:opacity-50 min-h-[40px] max-h-[100px]"
            placeholder="Ask AI to make targeted edits..."
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={updateLoading || !input.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold shadow-md shadow-indigo-500/10 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center shrink-0 w-10 h-10 active:scale-95"
          >
            <Send size={15} />
          </button>
        </form>
        <div className="mt-2 text-[10px] text-center text-zinc-500">
          Each chat edit costs <span className="text-zinc-400 font-semibold">2 credits</span>.
        </div>
      </div>
    </div>
  );
}
