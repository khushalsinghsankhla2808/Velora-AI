// PATH: frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { ArrowLeft, Check, Rocket, Share2 } from "lucide-react";
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

  const handleDeploy = async (id) => {
    const result = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/api/website/deploy/${id}`,
      { withCredentials: true },
    );
    window.open(result.data.url, "_blank");
    setWebsites((sites) =>
      sites.map((site) =>
        site._id === id
          ? { ...site, deployed: true, deployUrl: result.data.url }
          : site,
      ),
    );
  };

  const handleCopy = async (site) => {
    await navigator.clipboard.writeText(site.deployUrl);
    setCopiedId(site._id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    const loadWebsites = async () => {
      try {
        setLoading(true);
        const result = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/website/getall`,
          { withCredentials: true },
        );
        setWebsites(result.data);
      } catch (error) {
        setError(error.response?.data?.message || "Unable to load websites");
      } finally {
        setLoading(false);
      }
    };

    loadWebsites();
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
            className="px-5 py-2 rounded-xl bg-white text-black font-semibold hover:scale-105 transition"
          >
            + New Website
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

        {loading && (
          <p className="text-center text-zinc-400">Loading your websites...</p>
        )}
        {error && <p className="text-center text-red-400">{error}</p>}
        {websites?.length === 0 && (
          <p className="text-center text-zinc-400">You have no websites yet.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
          {websites?.map((w, i) => {
            const copied = copiedId === w._id;

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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeploy(w._id);
                      }}
                      className="mt-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-linear-to-r from-indigo-500 to-purple-500 hover:scale-105 transition"
                    >
                      <Rocket size={18} /> Deploy
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
      </main>
    </div>
  );
};

export default Dashboard;
