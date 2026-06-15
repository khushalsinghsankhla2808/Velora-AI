// PATH: frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Share2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Dashboard = () => {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const [websites, setWebsites] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [deployingId, setDeployingId] = useState(null);
  const [actionError, setActionError] = useState("");

  const handleDeploy = async (id) => {
    try {
      setActionError("");
      setDeployingId(id);
      const result = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/website/deploy/${id}`,
        { withCredentials: true },
      );
      const url = result.data.data.url;
      window.open(url, "_blank", "noopener,noreferrer");
      setWebsites((sites) =>
        sites.map((site) =>
          site._id === id
            ? { ...site, deployed: true, deployUrl: url }
            : site,
        ),
      );
    } catch (error) {
      setActionError(
        error.response?.data?.error?.message || "Unable to deploy website",
      );
    } finally {
      setDeployingId(null);
    }
  };

  const handleCopy = async (site) => {
    try {
      setActionError("");
      await navigator.clipboard.writeText(site.deployUrl);
      setCopiedId(site._id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      setActionError("Unable to copy link. Please open the site and copy the URL.");
    }
  };

  const loadWebsites = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/website/getall`,
        { withCredentials: true },
      );
      setWebsites(result.data.data.websites);
    } catch (error) {
      setError(error.response?.data?.error?.message || "Unable to load websites");
      setWebsites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadWebsites();
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-20 backdrop-blur bg-black/50 border-b border-white/10 h-16">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <p className="font-semibold">Dashboard</p>
          </div>
          <button
            onClick={() => navigate("/generate")}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-white text-black font-semibold hover:scale-105 transition"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Website</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="text-sm text-zinc-400">Welcome Back</p>
          <h1 className="text-3xl font-bold">{userData?.name}</h1>
        </motion.section>

        {actionError && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle size={18} className="shrink-0" />
            <p>{actionError}</p>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-72 rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
              >
                <div className="h-40 bg-white/10 animate-pulse" />
                <div className="p-5 space-y-4">
                  <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse" />
                  <div className="h-10 rounded-xl bg-white/10 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center">
            <AlertCircle size={28} className="mb-4 text-red-400" />
            <p className="font-semibold text-white">Unable to load websites</p>
            <p className="mt-2 text-sm text-zinc-400">{error}</p>
            <button
              onClick={loadWebsites}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}

        {!loading && !error && websites?.length === 0 && (
          <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center">
            <Rocket size={30} className="mb-4 text-indigo-300" />
            <p className="font-semibold text-white">No websites yet</p>
            <p className="mt-2 text-sm text-zinc-400">
              Start with a prompt and your first generated site will appear here.
            </p>
            <button
              onClick={() => navigate("/generate")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              <Plus size={15} />
              Create Website
            </button>
          </div>
        )}

        {!loading && !error && websites?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
          {websites?.map((w, i) => {
            const copied = copiedId === w._id;
            const deploying = deployingId === w._id;

            return (
              <motion.div
                key={w._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -6 }}
                onClick={() => navigate("/editor/" + w._id)}
                className="rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex flex-col overflow-hidden cursor-pointer"
              >
                <div className="relative h-40 bg-black cursor-pointer overflow-hidden">
                  <iframe
                    srcDoc={w.latestCode}
                    className="absolute inset-0 w-[140%] h-[140%] scale-[0.72] origin-top-left pointer-events-none bg-white"
                    title={w.title}
                  />
                  <div className="absolute inset-0 bg-black/30" />
                </div>
                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div>
                    <h2 className="text-base font-semibold line-clamp-2">
                      {w.title}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-2">
                      Last Updated {new Date(w.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {!w.deployed ? (
                    <button
                      disabled={deploying}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeploy(w._id);
                      }}
                      className="mt-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-linear-to-r from-indigo-500 to-purple-500 hover:scale-105 transition disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                    >
                      {deploying ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Deploying
                        </>
                      ) : (
                        <>
                          <Rocket size={18} /> Deploy
                        </>
                      )}
                    </button>
                  ) : (
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(w);
                      }}
                      whileTap={{ scale: 0.95 }}
                      className={`mt-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                        copied
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-white/10 hover:bg-white/20 border border-white/10"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check size={14} /> Link Copied
                        </>
                      ) : (
                        <>
                          <Share2 size={14} /> Share Link
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
