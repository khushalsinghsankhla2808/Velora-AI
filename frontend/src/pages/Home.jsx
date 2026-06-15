// PATH: frontend/src/pages/Home.jsx
import React, { useState } from "react";
import Navbar from "../components/Navbar";
import {
  ArrowRight,
  Download,
  Layout,
  LayoutTemplate,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);

  return (
    <>
      <Navbar />
      <section className="relative min-h-screen bg-[#050505] text-white overflow-hidden  ">
        {/* glow-background */}
        <div className="absolute inset-0 pointer-events-none ">
          <div className="absolute -top-40 -left-40 w-500px h-500px bg-indigo-700/20 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-0 w-500px h-500px bg-purple-600/20 rounded-full blur-[140px]" />
        </div>

        {/* grid-background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff15 1px , transparent 1px), linear-gradient(to bottom, #ffffff15 1px , transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>

        {/* content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20 text-center">
          {/* badge */}
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 border border-white/10 rounded-full bg-white/5 backdrop-blur"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">AI Website Builder</span>
          </motion.div>

          {/* heading */}
          <motion.h1
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold leading-tight"
          >
            Create Stunning Websites with <br />
            <span className="bg-linear-to-r from-purple-700 to-indigo-500 bg-clip-text text-transparent">
              AI in Seconds
            </span>
          </motion.h1>

          {/* description */}
          <motion.p
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9 }}
            className="max-w-2xl mx-auto mt-6 text-lg text-gray-300"
          >
            Create stunning, fully responsive websites with AI, no coding
            needed. Built for startups, creators, and freelancers.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9 }}
            className="flex flex-col sm:flex-row justify-center gap-4 mt-10"
          >
            <button
              onClick={() => navigate("/generate")}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-800 rounded-xl font-semibold transition"
            >
              Start Building <ArrowRight size={18} />{" "}
            </button>
            <button
              onClick={() => setShowDemo(true)}
              className="px-6 py-3 border border-white/10 hover:bg-white/30 rounded-xl transition"
            >
              Watch Demo
            </button>
          </motion.div>

          {/* Features Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:border-indigo-500 transition">
              <Zap className="text-yellow-400 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Instant Generation</h3>
              <p className="text-sm text-gray-400 ">
                Describe your vision and let AI build a professional website
                automatically.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:border-indigo-500 transition">
              <LayoutTemplate className="text-indigo-400 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Responsive Layout</h3>
              <p className="text-sm text-gray-400 ">
                Responsive designs that look sharp on phones, tablets, laptops,
                and desktops.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur hover:border-indigo-500 transition">
              <Download className="text-green-400 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Export Code</h3>
              <p className="text-sm text-gray-400 ">
                Get lightweight, well structured HTML, CSS, and JS generated
                instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {showDemo && (
        <div
          onClick={() => setShowDemo(false)}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-xl px-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl rounded-3xl border border-white/10 bg-[#0b0b0b] overflow-hidden shadow-2xl p-2"
          >
            <button
              onClick={() => setShowDemo(false)}
              className="absolute top-4 right-4 z-20 rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            >
              <X size={20} />
            </button>
            <div className="relative pt-[56.25%] w-full rounded-2xl overflow-hidden bg-black">
              <iframe
                className="absolute inset-0 w-full h-full border-0"
                src="https://www.youtube.com/embed/14d0s7M3vV8?autoplay=1"
                title="Velora AI Demo Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
