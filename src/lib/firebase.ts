import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Mengambil kunci dari file .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  
  // KITA KEMBALIKAN KE BAWAAN FIREBASE (Ini wajib untuk aplikasi Next.js di Vercel)
  authDomain: "flash-global.firebaseapp.com", 
  
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton pattern: Mencegah Firebase inisialisasi ulang berkali-kali di Next.js (Hot Reload)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi layanan yang akan kita pakai
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };