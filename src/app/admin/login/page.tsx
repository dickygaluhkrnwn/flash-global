"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, ShieldAlert, Package } from "lucide-react";
import Image from "next/image";

// --- IMPORT FIREBASE CORE ---
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const allowedRoles = ["superadmin", "admin_finance", "admin_operational"];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Logic verifikasi otorisasi dari Firestore
  const verifyAdminRole = async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData?.role || "";
        
        if (allowedRoles.includes(userRole)) {
          router.push("/admin"); // REVISI: Dilempar ke halaman Home/Dashboard Utama Admin
        } else {
          await signOut(auth);
          setErrorMsg("Akses ditolak. Akun Anda tidak memiliki hak akses Administrator.");
        }
      } else {
        await signOut(auth);
        setErrorMsg("Akses ditolak. Data admin tidak ditemukan di database.");
      }
    } catch (error) {
      console.error("ERROR Fatal saat verifikasi Firestore:", error);
      setErrorMsg("Koneksi ke database gagal.");
      await signOut(auth);
    }
  };

  // Login dengan Email/Password
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await verifyAdminRole(userCredential.user.uid);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("auth/invalid-credential")) {
          setErrorMsg("Email atau kata sandi Administrator salah.");
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setErrorMsg("Terjadi kesalahan sistem. Silakan coba lagi nanti.");
      }
      setIsLoading(false);
    } 
  };

  // Login dengan Google
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await verifyAdminRole(result.user.uid);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("auth/popup-closed-by-user")) {
          setIsLoading(false);
          return;
        }
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Gagal login dengan Google.");
      }
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow Premium */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#7A171D] rounded-full blur-[160px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#C5A059] rounded-full blur-[160px] opacity-10 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        {/* Top Strip */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#7A171D] to-[#C5A059]" />

        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-[#7A171D] to-[#5A0E13] rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 border border-red-500/20">
            <Package className="text-[#C5A059] w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Central Engine</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Flash Global Admin Portal</p>
        </div>

        {/* Error Alert Panel */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: "auto" }} 
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-4 bg-red-900/30 border border-red-500/30 text-red-200 text-xs font-semibold rounded-xl flex items-start gap-2.5 leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Login Email */}
        <form onSubmit={handleAdminLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@flashglobal.com" 
                className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border-2 border-slate-700 rounded-xl outline-none focus:border-[#7A171D] text-white text-sm font-semibold transition-all shadow-inner"
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secret Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full pl-11 pr-12 py-3 bg-slate-900/60 border-2 border-slate-700 rounded-xl outline-none focus:border-[#7A171D] text-white text-sm font-semibold transition-all shadow-inner"
                required 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#7A171D] to-[#5A0E13] hover:from-[#942128] hover:to-[#7A171D] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-red-950/50 disabled:opacity-50 mt-2 flex items-center justify-center"
          >
            {isLoading ? <span className="animate-pulse">Mengautentikasi...</span> : "Masuk Ke Core Engine"}
          </button>
        </form>

        {/* Divider & Google Login */}
        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-slate-800 text-slate-400">Atau masuk dengan Otorisasi Sistem</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="mt-6 w-full flex items-center justify-center gap-3 bg-slate-700/50 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all border border-slate-600 disabled:opacity-50"
        >
          <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={20} height={20} />
          <span>Login dengan Google Workspace</span>
        </button>

      </motion.div>
    </main>
  );
}