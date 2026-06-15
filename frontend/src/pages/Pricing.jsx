// PATH: frontend/src/pages/Pricing.jsx
import React from "react";
import { ArrowLeft, Check, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setUserData } from "../redux/userSlice";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    credits: 100,
    description: "Perfect to explore Velora AI",
    features: [
      "AI website generation",
      "Responsive HTML output",
      "Basic animations",
    ],
    popular: false,
    button: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹499",
    credits: 500,
    description: "For serious creators and freelancers",
    features: [
      "Everything in Free",
      "Faster generations",
      "Edit and regenerate",
      "Download source code",
    ],
    popular: true,
    button: "Upgrade to Pro",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "₹1499",
    credits: 1000,
    description: "For teams and power users",
    features: [
      "Unlimited iterations",
      "Highest priority",
      "Team collaboration",
      "Dedicated support",
    ],
    popular: false,
    button: "Contact Sales",
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const loadRazorpay = async () => {
    if (window.Razorpay) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(script);
    await new Promise((resolve) => {
      script.onload = resolve;
    });
  };

  const handlePayment = async (plan) => {
    try {
      if (plan.id === "free") {
        navigate("/dashboard");
        return;
      }

      await loadRazorpay();

      const result = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/payment/order`,
        { planId: plan.id },
        { withCredentials: true },
      );

      const order = result.data.data.order;
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "Velora AI",
        description: plan.name + " - " + plan.credits + " Credits",
        order_id: order.id,
        handler: async function (response) {
          const verify = await axios.post(
            `${import.meta.env.VITE_SERVER_URL}/api/payment/verify`,
            response,
            { withCredentials: true },
          );
          dispatch(setUserData(verify.data.data.user));
          navigate("/dashboard");
        },
        theme: { color: "#4f46e5" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.log(error.response?.data || error.message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white px-6 pt-16 pb-24">
      <div className="absolute -top-40 -left-40 w-31.25rem h-31.25rem bg-indigo-600/20 rounded-full blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-31.25rem h-31.25rem bg-purple-600/20 rounded-full blur-[120px]" />

      <button
        onClick={() => navigate("/")}
        className="relative z-10 mb-8 flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-14"
      >
        <h1 className="text-4xl md:text-5xl font-bold">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-zinc-400 text-lg">
          Buy credit once. Build anytime.
        </p>
      </motion.section>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {plans.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
            whileHover={{ y: -14, scale: 1.03 }}
            className={`relative p-8 rounded-2xl border backdrop-blur ${
              p.popular
                ? "border-indigo-500 bg-linear-to-b from-indigo-500/20 to-transparent shadow-2xl shadow-indigo-500/30"
                : "border-white/10 bg-white/5 hover:border-indigo-400 hover:bg-white/10"
            }`}
          >
            {p.popular && (
              <span className="absolute top-5 right-5 px-3 py-1 text-xs rounded-full bg-indigo-500">
                Most Popular
              </span>
            )}

            <h2 className="text-xl font-semibold mb-2">{p.name}</h2>
            <p className="text-zinc-400 text-sm mb-6">{p.description}</p>
            <div className="mb-1">
              <span className="text-4xl font-bold">{p.price}</span>
              <span className="text-sm text-zinc-400"> /one-time</span>
            </div>
            <div className="flex items-center gap-2 font-semibold mb-8">
              <Coins size={18} className="text-yellow-400" />
              {p.credits} Credits
            </div>

            <ul className="space-y-3 mb-10">
              {p.features.map((feature) => (
                <li
                  key={feature}
                  className="flex gap-2 text-sm text-zinc-300"
                >
                  <Check size={16} className="text-green-400 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePayment(p)}
              className={`w-full py-3 rounded-xl font-semibold transition ${
                p.popular
                  ? "bg-indigo-500 hover:bg-indigo-600"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {p.button}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Pricing;
