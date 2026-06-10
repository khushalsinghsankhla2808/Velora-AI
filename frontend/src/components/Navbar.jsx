import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
import LoginModel from "./LoginModel";

const Navbar = () => {
  const navigate = useNavigate();
  const [openLogin, setOpenLogin] = useState(false);
  let userData = false;
  return (
    <>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          {/* logo */}
          <div className="flex items-center gap-2 cursor-pointer bg-white/5 p-2 px-4 rounded-2xl border border-zinc-600">
            <img src="ai2.png" alt="" />
            <span className="font-semibold text-lg bg-linear-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
              Velora AI
            </span>
          </div>

          {/* right side */}
          <div>
            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate("/pricing")}
                className="hidden md:block text-sm text-zinc-400 hover:text-white transition"
              >
                Pricing
              </button>

              {/* credits */}
              {userData && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border-white/10 text-sm cursor-pointer hover:bg-white/10 transition">
                  <Coins size={14} className="text-yellow-400" />
                  <span className="text-white">100</span>
                  <span className="text-zinc-200">Credits</span>
                  <span className="font-semibold text-zinc-200">+</span>
                </div>
              )}
              {/* profile or login */}
              {userData ? (
                <div className="relative">
                  <button className="flex items-center">
                    <img
                      src="https://ui-avatars.com/api/?name=Khushal+Singh+Sankhla"
                      alt=""
                      className="w-9 h-9 rounded-full border border-white/20 object-cover hover:scale-105 transition"
                    />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setOpenLogin(true)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-800 font-semibold text-sm transition text-white"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {openLogin && (
        <LoginModel open={openLogin} onClose={() => setOpenLogin(false)} />
      )}
    </>
  );
};

export default Navbar;
