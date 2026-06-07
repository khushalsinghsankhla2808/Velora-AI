import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate()
  return (
    <>
      <motion.div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          {/* logo */}
          <div className="flex items-center gap-2 cursor-pointer bg-white/5 p-2 px-4 rounded-2xl border border-zinc-600">
            <img src="ai2.png" alt="" />
            <span className="font-semibold text-lg bg-linear-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
              Dora AI
            </span>
          </div>
        </div>
        <div>
            {/* right side */}
            <div className="flex items-center gap-5">
                <button 
                onClick={()=>navigate('/pricing')}
                className="hidden md:block text-sm text-zinc-400 hover:text-white transition">
                    Pricing
                </button>
            </div>
        </div>
      </motion.div>
    </>
  );
};

export default Navbar;
