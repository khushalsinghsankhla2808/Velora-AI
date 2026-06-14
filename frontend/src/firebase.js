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
  authDomain: "velora-ai-32af8.firebaseapp.com",
  projectId: "velora-ai-32af8",
  storageBucket: "velora-ai-32af8.firebasestorage.app",
  messagingSenderId: "801465411117",
  appId: "1:801465411117:web:0901017a52d6771ddd3aa4",
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