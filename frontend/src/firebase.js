// PATH: frontend/src/firebase.js

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";

// Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "velora-ai-32af8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "velora-ai-32af8",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "velora-ai-32af8.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "801465411117",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:801465411117:web:0901017a52d6771ddd3aa4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Set session persistence
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    console.log("Firebase persistence enabled");
  })
  .catch((error) => {
    console.error("Persistence error:", error);
  });

// Google Provider
const provider = new GoogleAuthProvider();

export { auth, provider };
