// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "velora-ai-32af8.firebaseapp.com",
  projectId: "velora-ai-32af8",
  storageBucket: "velora-ai-32af8.firebasestorage.app",
  messagingSenderId: "801465411117",
  appId: "1:801465411117:web:0901017a52d6771ddd3aa4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider()

export {auth,provider}