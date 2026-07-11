"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, ShieldAlert, Package, ArrowRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";

// --- IMPORT FIREBASE CORE ---
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { UserRole } from "@/store/useAuthStore"; // Menggunakan tipe role dari store

// Daftar role yang diizinkan masuk portal admin (Sinkron dengan Fase 1.1)
const allowedRoles: UserRole[] = ["superadmin", "admin_finance", "admin_ops", "admin_cs"];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Logic verifikasi otorisasi dari Firestore
  const verifyAdminRole = async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = (userData?.role || "") as UserRole;
        
        if (allowedRoles.includes(userRole)) {
          router.push("/admin"); // Dilempar ke halaman Dashboard Utama Admin
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
    setSuccessMsg("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await verifyAdminRole(userCredential.user.uid);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("auth/invalid-credential")) {
          setErrorMsg("Email atau kata sandi Administrator salah.");
        } else {
          setErrorMsg(error.message.replace("Firebase: ", ""));
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
    setSuccessMsg("");
    
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
        setErrorMsg(error.message.replace("Firebase: ", ""));
      } else {
        setErrorMsg("Gagal login dengan Google.");
      }
      setIsLoading(false);
    }
  };

  // Fitur Lupa Kata Sandi (Dengan Bypass URL Dinamis)
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg("Silakan masukkan alamat email Anda terlebih dahulu di kolom email untuk mereset kata sandi.");
      return;
    }
    
    setIsResetting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // BIKIN URL DINAMIS: Otomatis deteksi Localhost atau Vercel
      const resetUrl = process.env.NODE_ENV === "development" 
        ? "http://localhost:3000/reset-password" 
        : "https://flash-global.vercel.app/reset-password";

      // PAKSA FIREBASE PAKE URL KITA (Bypass error Console)
      const actionCodeSettings = {
        url: resetUrl,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      
      setSuccessMsg("Tautan pemulihan kata sandi telah dikirim ke email Anda. Silakan cek kotak masuk atau folder spam.");
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("auth/user-not-found") || error.message.includes("auth/invalid-email")) {
          setErrorMsg("Alamat email tidak terdaftar atau tidak valid.");
        } else {
          setErrorMsg(error.message.replace("Firebase: ", ""));
        }
      } else {
        setErrorMsg("Gagal mengirim email pemulihan. Silakan coba lagi.");
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow Premium (Light Mode) */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[140px] opacity-15 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-[#C5A059] rounded-full blur-[120px] opacity-20 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-slate-200/50 relative z-10"
      >
        {/* Top Strip */}
        <div className="absolute top-0 left-10 right-10 h-1.5 bg-gradient-to-r from-[#7A171D] to-[#C5A059] rounded-b-xl" />

        {/* Header Logo */}
        <div className="text-center mb-8 mt-2">
          <div className="w-16 h-16 bg-gradient-to-br from-[#7A171D] to-[#5A0E13] rounded-2xl flex items-center justify-center shadow-lg shadow-[#7A171D]/20 mx-auto mb-5 border border-white/20">
            <Package className="text-[#C5A059] w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Central Engine</h1>
          <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-widest font-bold">Flash Global Admin Portal</p>
        </div>

        {/* Alert Panels (Error & Success) */}
        <div className="space-y-3 mb-6">
          <AnimatePresence>
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }} 
                animate={{ opacity: 1, height: "auto", y: 0 }} 
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-xl flex items-start gap-3 leading-relaxed">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }} 
                animate={{ opacity: 1, height: "auto", y: 0 }} 
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold rounded-xl flex items-start gap-3 leading-relaxed">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Form Login Email */}
        <form onSubmit={handleAdminLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Email</label>
            <div className="relative group">
              <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@flashglobal.com" 
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 text-slate-900 text-sm font-semibold transition-all"
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Secret Password</label>
            <div className="relative group">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 text-slate-900 text-sm font-semibold transition-all"
                required 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#7A171D] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Tombol Lupa Kata Sandi */}
            <div className="flex justify-end mt-2">
              <button 
                type="button" 
                onClick={handleForgotPassword}
                disabled={isResetting || isLoading}
                className="text-[11px] font-bold text-slate-500 hover:text-[#7A171D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetting ? "Mengirim Tautan..." : "Lupa Kata Sandi?"}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || isResetting}
            className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-4 rounded-xl text-sm transition-all shadow-lg shadow-[#7A171D]/20 active:scale-[0.98] disabled:opacity-70 mt-4 flex items-center justify-center gap-2"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Otorisasi Masuk <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Divider & Google Login */}
        <div className="mt-8 flex items-center justify-between">
          <span className="w-full border-b border-slate-200"></span>
          <span className="px-4 text-xs text-center text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Jalur Alternatif</span>
          <span className="w-full border-b border-slate-200"></span>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isResetting}
          className="mt-6 w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl text-sm transition-all border border-slate-200 shadow-sm disabled:opacity-50 active:scale-[0.98]"
        >
          <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={20} height={20} />
          <span>Login via Google Workspace</span>
        </button>

      </motion.div>
    </main>
  );
}