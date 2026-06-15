import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Coins, LayoutDashboard, Loader2, X } from "lucide-react";
import LoginModel from "./LoginModal";
import { useSelector, useDispatch } from "react-redux";

import axios from "axios";
import { removeUserData } from "../redux/userSlice";

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [openLogin, setOpenLogin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showCreditHistory, setShowCreditHistory] = useState(false);
  const [creditHistory, setCreditHistory] = useState([]);
  const [creditHistoryLoading, setCreditHistoryLoading] = useState(false);
  const [creditHistoryError, setCreditHistoryError] = useState("");
  const { userData } = useSelector((state) => state.user);

  const loadCreditHistory = async () => {
    try {
      setShowCreditHistory(true);
      setCreditHistoryLoading(true);
      setCreditHistoryError("");

      const { data } = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/credits/history`,
        { withCredentials: true },
      );

      setCreditHistory(data.data.transactions);
    } catch (error) {
      setCreditHistoryError(
        error.response?.data?.error?.message || "Unable to load credit history",
      );
    } finally {
      setCreditHistoryLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/auth/logout`,
        {},
        { withCredentials: true },
      );

      console.log(response.data);

      // remove redux user
      dispatch(removeUserData());

      // close menus
      setShowMenu(false);
      setShowLogoutPopup(false);

      // optional redirect
      navigate("/");
    } catch (error) {
      console.log("Logout Error:", error.response?.data || error.message);
    }
  };
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
              {userData && (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="hidden md:flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
              )}

              <button
                onClick={() => navigate("/pricing")}
                className="hidden md:block text-sm font-semibold text-zinc-300 hover:text-white transition"
              >
                PRICING
              </button>

              {/* credits */}
              {userData && (
                <button
                  onClick={loadCreditHistory}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm cursor-pointer hover:bg-white/10 transition"
                >
                  <Coins size={14} className="text-yellow-400" />
                  <span className="text-white">{userData.credits}</span>
                  <span className="text-zinc-200">Credits</span>
                  <span className="font-semibold text-zinc-200">+</span>
                </button>
              )}
              {/* profile or login */}
              {userData ? (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center"
                  >
                    <img
                      referrerPolicy="no-referrer"
                      src={userData.avatar}
                      alt=""
                      className="w-9 h-9 rounded-full border border-white/20 object-cover hover:scale-105 transition"
                    />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-3 w-40 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          navigate("/dashboard");
                        }}
                        className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm text-zinc-200 hover:bg-white/10 transition"
                      >
                        <LayoutDashboard size={15} />
                        Dashboard
                      </button>
                      <button
                        onClick={() => setShowLogoutPopup(true)}
                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 transition"
                      >
                        Logout
                      </button>
                    </div>
                  )}
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

      {showLogoutPopup && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-3">
              Confirm Logout
            </h2>

            <p className="text-zinc-400 text-sm mb-6">
              Are you sure you want to logout?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutPopup(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreditHistory && (
        <div
          onClick={() => setShowCreditHistory(false)}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
                  <Coins size={20} className="text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Credit History
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Current balance: {userData?.credits ?? 0} credits
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCreditHistory(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {creditHistoryLoading && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-400">
                  <Loader2 size={18} className="animate-spin" />
                  Loading history...
                </div>
              )}

              {creditHistoryError && (
                <p className="py-10 text-center text-sm text-red-400">
                  {creditHistoryError}
                </p>
              )}

              {!creditHistoryLoading &&
                !creditHistoryError &&
                creditHistory.length === 0 && (
                  <p className="py-10 text-center text-sm text-zinc-400">
                    No credit activity yet.
                  </p>
                )}

              {!creditHistoryLoading &&
                !creditHistoryError &&
                creditHistory.length > 0 && (
                  <div className="space-y-3">
                    {creditHistory.map((item) => {
                      const isCredit = item.type === "credit";

                      return (
                        <div
                          key={item._id}
                          className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {item.description}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              Balance after: {item.balanceAfter}
                            </p>
                          </div>

                          <div
                            className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                              isCredit
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {isCredit ? "+" : "-"}
                            {item.amount}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
