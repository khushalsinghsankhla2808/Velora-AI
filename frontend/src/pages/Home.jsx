import React from "react";
import Navbar from "../components/Navbar";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const Home = () => {
  return (
    <>
      <Navbar />
      <section className="relative min-h-screen bg-[#050505] text-white overflow-hidden  ">
        {/* glow-background */}
        <div className="absolute inset-0 pointer-events-none ">
          <div className="absolute -top-40 -left-40 w-125 h-125 bg-indigo-700/20 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-0 w-125 h-125 bg-purple-600/20 rounded-full blur-[140px]" />
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
            <span className="tsxt-sm text-gray-300">AI Website Builder</span>
          </motion.div>

          {/* heading */}
          <motion.h1
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold leading-tight"
          >
            Build Websites with <br />
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
            Generate stunning, reponsive, websites instantly using AI. No coding
            requries. Perfect for Startups, Creators and Freelancers.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9 }}
            className="flex flex-col sm:flex-row justify-center gap-4 mt-10"
          >
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-800 rounded-xl font-semibold transition">
              Start Building <ArrowRight size={18} />{" "}
            </button>
            <button className="px-6 py-3 border border-white/10 hover:bg-white/30 rounded-xl transition">
              Watch Demo
            </button>
          </motion.div>


          {/* Features Card */}
        </div>
      </section>
    </>
  );
};

export default Home;
