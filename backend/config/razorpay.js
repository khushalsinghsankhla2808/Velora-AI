// PATH: backend/config/razorpay.js
import Razorpay from "razorpay";

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "placeholder_key",
  key_secret: process.env.RAZORPAY_SECRET || "placeholder_secret",
});

export default instance;
