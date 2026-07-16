// PATH: frontend/src/components/LoginModal.jsx
import React, { useState } from "react";
import { motion } from "motion/react";
import { Loader2, Sparkles, X } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";

const LoginModal = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthErrorMessage = (error) => {
    const firebaseCode = error.code;
    const backendMessage = error.response?.data?.error?.message;

    if (firebaseCode === "auth/unauthorized-domain") {
      return "This domain is not allowed in Firebase. Open http://localhost:5173 or add 127.0.0.1 in Firebase Auth.";
    }

    if (firebaseCode === "auth/popup-closed-by-user") {
      return "Google popup was closed before login finished.";
    }

    if (firebaseCode) {
      return `Google login failed: ${firebaseCode}`;
    }

    return backendMessage || "Login failed. Please try again.";
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const { data } = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/auth/google`,
        { idToken },
        { withCredentials: true },
      );

      dispatch(setUserData(data.data.user));
      onClose();
    } catch (error) {
      console.log("Auth Error:", error.response?.data || error.message);
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 flex z-100 items-center justify-center bg-black/80 backdrop-blur-xl px-4"
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 60 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md p-px rounded-3xl bg-linear-to-br from-purple-500/40 via-blue-500/30 to-transparent"
          >
            <div className="relative rounded-3xl bg-[#0b0b0b] border border-white/10 shadow-[0_30px_120px_rgba(0,0,0,0.8)] overflow-hidden">
              {/* glow background */}
              <motion.div
                animate={{ opacity: [0.25, 0.4, 0.25] }}
                transition={{ duration: 6, repeat: Infinity }}
                className="absolute -top-32 -left-32 w-80 h-80 bg-purple-500/30 blur-[140px]"
              />
              <motion.div
                animate={{ opacity: [0.2, 0.35, 0.2] }}
                transition={{ duration: 6, repeat: Infinity, delay: 2 }}
                className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-500/25 blur-[140px]"
              />

              <button
                onClick={onClose}
                className="absolute top-5 right-5 z-20 text-zinc-400 hover:text-white transition text-lg"
              >
                <X />
              </button>
              <div className="relative px-8 pt-14 pb-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 border border-white/10 rounded-full bg-white/5 backdrop-blur">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-300">
                    AI Website Builder
                  </span>
                </div>
                <h2 className="text-3xl font-semibold leading-tight mb-3 space-x-2 text-white">
                  Welcome to{" "}
                  <span className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Velora AI
                  </span>
                </h2>
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <motion.button
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="group relative w-full h-13 rounded-xl bg-white text-black font-semibold shadow-xl overflow-hidden"
                >
                  <div className="relative flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </div>
                </motion.button>

                <div className="flex items-center gap-4 my-10">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs tracking-tight text-zinc-500">
                    Secure Login
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  By continuing you agree to our{" "}
                  <span className="underline cursor-pointer hover:text-zinc-300">
                    Terms of Services
                  </span>{" "}
                  and{" "}
                  <span className="underline cursor-pointer hover:text-zinc-300">
                    Privacy Policy
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default LoginModal;
