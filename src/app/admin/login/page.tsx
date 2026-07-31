"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, ShieldAlert, ArrowRight, CheckCircle2, Zap, ShieldCheck } from "lucide-react";
import Image from "next/image";

// --- IMPORT FIREBASE CORE ---
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Role } from "@/types/user";
 
// Daftar role yang diizinkan masuk portal admin
const allowedRoles: Role[] = ["superadmin", "admin_finance", "admin_operational", "staff"];

export default function AdminLoginPage() {
  const router = useRouter();
  
  // UX States
  const [step, setStep] = useState<"welcome" | "login">("welcome");
  
  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // =========================================================================
  // LOGIC AREA: JANGAN DIUBAH!
  // =========================================================================
  const verifyAdminRole = async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = (userData?.role || "") as Role;
        
        if (allowedRoles.includes(userRole)) {
          router.push("/admin"); 
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

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg("Silakan masukkan alamat email Anda terlebih dahulu di kolom email untuk mereset kata sandi.");
      return;
    }
    
    setIsResetting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const resetUrl = process.env.NODE_ENV === "development" 
        ? "http://localhost:3000/reset-password" 
        : "https://flash-global.vercel.app/reset-password";

      const actionCodeSettings = {
        url: resetUrl,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      setSuccessMsg("Tautan pemulihan kata sandi telah dikirim ke email Anda.");
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

  // =========================================================================
  // UI AREA: ANIMASI & SPLIT SCREEN GEN-Z
  // =========================================================================
  return (
    <main className="h-screen w-full bg-[#0f172a] flex overflow-hidden font-sans relative">
      
      {/* 1. WELCOME SCREEN (Full Screen Overlay) */}
      <AnimatePresence>
        {step === "welcome" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-50"
          >
            {/* Faux 3D Orbs / Abstract Glow */}
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#7A171D] rounded-full blur-[120px] opacity-20 animate-pulse pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#C5A059] rounded-full blur-[150px] opacity-20 pointer-events-none" />

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              {/* Logo Flash Global */}
              <div className="w-[200px] h-[60px] relative mb-8">
                <Image src="/logo.png" alt="Flash Globals Logistik" fill priority className="object-contain" />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Central <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Engine</span>
              </h1>
              <p className="text-sm md:text-base text-slate-500 font-medium mb-12 max-w-md">
                Sistem administrasi pusat Flash Global. Akses logistik kelas dunia dalam satu kendali.
              </p>

              <button 
                onClick={() => setStep("login")}
                className="group relative px-8 py-4 bg-slate-900 hover:bg-[#7A171D] text-white rounded-2xl font-bold text-sm transition-all duration-300 shadow-xl hover:shadow-[#7A171D]/30 active:scale-95 overflow-hidden flex items-center gap-3"
              >
                {/* Efek kilap menyapu tombol */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                Initiate Access <Zap className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. SPLIT SCREEN LOGIN (Tampil setelah Welcome Screen) */}
      <AnimatePresence>
        {step === "login" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full h-full flex"
          >
            {/* BAGIAN KIRI: Visual / 3D Abstract (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
              {/* Mesh Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#5A0E13] via-slate-900 to-[#0f172a] opacity-90" />
              
              {/* Faux 3D Glowing Orbs */}
              <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#C5A059] rounded-full blur-[100px] mix-blend-screen opacity-40 animate-blob" />
              <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#7A171D] rounded-full blur-[120px] mix-blend-screen opacity-60 animate-blob animation-delay-2000" />

              {/* Glassmorphism Card */}
              <div className="relative z-10 w-3/4 max-w-lg p-10 rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <ShieldCheck className="w-12 h-12 text-[#DFBE7B] mb-6 drop-shadow-[0_0_15px_rgba(197,160,89,0.5)]" />
                <h2 className="text-3xl font-black text-white tracking-tight mb-4">Secure Node Authentication.</h2>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Area ini dilindungi enkripsi tingkat tinggi. Segala bentuk akses tanpa izin akan dicatat dan dilaporkan oleh sistem.
                </p>
              </div>
            </div>

            {/* BAGIAN KANAN: Form Minimalis Putih */}
            <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 xl:px-40 relative">
              
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="w-full max-w-md mx-auto"
              >
                {/* Back Button (Mobile Only) */}
                <button 
                  onClick={() => setStep("welcome")}
                  className="lg:hidden mb-10 text-sm font-bold text-slate-400 hover:text-[#7A171D] transition-colors"
                >
                  &larr; Kembali
                </button>

                <div className="mb-10">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Sign In</h3>
                  <p className="text-slate-500 font-medium mt-2">Masukkan kredensial administrator Anda.</p>
                </div>

                {/* Alert Panels */}
                <AnimatePresence>
                  {errorMsg && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
                      <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl flex items-start gap-3 border border-red-100">
                        <ShieldAlert className="w-5 h-5 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    </motion.div>
                  )}

                  {successMsg && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
                      <div className="p-4 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl flex items-start gap-3 border border-emerald-100">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{successMsg}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form Input */}
                <form onSubmit={handleAdminLogin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                    <div className="relative group">
                      <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@flashglobal.com" 
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 text-slate-900 text-sm font-semibold transition-all hover:bg-white focus:bg-white"
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Secret Key</label>
                    <div className="relative group">
                      <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 text-slate-900 text-sm font-semibold transition-all hover:bg-white focus:bg-white"
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
                  </div>
                  
                  <div className="flex justify-end mt-2">
                    <button 
                      type="button" 
                      onClick={handleForgotPassword}
                      disabled={isResetting || isLoading}
                      className="text-[12px] font-bold text-slate-500 hover:text-[#7A171D] transition-colors"
                    >
                      {isResetting ? "Mengirim Tautan..." : "Forgot Password?"}
                    </button>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isLoading || isResetting}
                    className="w-full bg-gradient-to-br from-[#9A242B] to-[#7A171D] hover:from-[#7A171D] hover:to-[#5A0E13] text-white font-bold py-4 rounded-xl text-sm transition-all shadow-[0_8px_20px_rgba(122,23,29,0.2)] active:scale-[0.98] disabled:opacity-70 mt-6 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>Authenticate <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <div className="mt-8 flex items-center justify-between">
                  <span className="w-full border-b border-slate-200"></span>
                  <span className="px-4 text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">Atau</span>
                  <span className="w-full border-b border-slate-200"></span>
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading || isResetting}
                  className="mt-6 w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl text-sm transition-all border border-slate-200 shadow-sm disabled:opacity-50 active:scale-[0.98]"
                >
                  <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} height={18} />
                  <span>Sign in with Google</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}} />
    </main>
  );
}