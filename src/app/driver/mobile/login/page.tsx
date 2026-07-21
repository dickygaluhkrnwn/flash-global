"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, ShieldAlert, ArrowRight, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// --- IMPORT FIREBASE CORE ---
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore, StoreUser } from "@/store/useAuthStore";
import { Role } from "@/types/user";

export default function DriverLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Logic verifikasi otorisasi khusus Driver dari Firestore
  const verifyDriverRole = async (uid: string, fallbackEmail: string, fallbackName: string, photoURL?: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = (userData?.role || "") as Role;
        
        // Hanya izinkan user dengan role 'driver'
        if (userRole === "driver") {
          // Cek apakah akun disuspend
          if (userData.isSuspended) {
            await signOut(auth);
            setErrorMsg("Akun Anda ditangguhkan. Silakan hubungi pusat bantuan.");
            return false;
          }

          login({
            uid,
            email: userData.email || fallbackEmail,
            displayName: userData.displayName || userData.name || fallbackName,
            photoURL: userData.photoURL || photoURL || undefined,
            role: "driver",
            regional: userData.regional || undefined,
            createdAt: userData.createdAt || new Date(),
            updatedAt: userData.updatedAt || new Date(),
          } as StoreUser);

          // PUBLIC URL: Otomatis diarahkan ke folder mobile oleh middleware
          router.push("/driver/dashboard"); 
          return true;
        } else {
          await signOut(auth);
          setErrorMsg("Akses ditolak. Portal ini khusus Mitra Pengemudi.");
          return false;
        }
      } else {
        await signOut(auth);
        setErrorMsg("Akun tidak ditemukan. Silakan mendaftar terlebih dahulu.");
        return false;
      }
    } catch (error) {
      console.error("ERROR Fatal saat verifikasi Firestore:", error);
      setErrorMsg("Koneksi ke database gagal.");
      await signOut(auth);
      return false;
    }
  };

  // Login dengan Email/Password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await verifyDriverRole(
        userCredential.user.uid, 
        userCredential.user.email || email, 
        userCredential.user.displayName || "Mitra Pengemudi"
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("auth/invalid-credential")) {
          setErrorMsg("Email atau kata sandi salah.");
        } else {
          setErrorMsg(error.message.replace("Firebase: ", ""));
        }
      } else {
        setErrorMsg("Terjadi kesalahan sistem. Silakan coba lagi.");
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
      
      const isSuccess = await verifyDriverRole(
        result.user.uid,
        result.user.email || "",
        result.user.displayName || "Mitra Pengemudi",
        result.user.photoURL || undefined
      );

      if (!isSuccess) setIsLoading(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("auth/popup-closed-by-user")) {
          setIsLoading(false);
          return;
        }
        setErrorMsg("Gagal otorisasi Google: " + error.message.replace("Firebase: ", ""));
      } else {
        setErrorMsg("Gagal login dengan Google.");
      }
      setIsLoading(false);
    }
  };

  return (
    // Memenuhi layar HP, menggunakan background alt dari globals.css
    <main className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans w-full">
      {/* Background Glow Premium (Light Mode) */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[40%] bg-[#7A171D] rounded-full blur-[120px] opacity-15 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[30%] bg-[#C5A059] rounded-full blur-[100px] opacity-20 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm glass-card rounded-[2rem] p-8 shadow-2xl shadow-slate-200/50 relative z-10"
      >
        {/* Header Title & Icon */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-[#7A171D]/10 rounded-full flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-[#7A171D]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Portal Mitra</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Masuk untuk mulai menerima order</p>
        </div>

        {/* Alert Panels (Error) */}
        <div className="space-y-3 mb-6">
          <AnimatePresence>
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }} 
                animate={{ opacity: 1, height: "auto", y: 0 }} 
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl flex items-start gap-2 leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Form Login Email */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
            <div className="relative group">
              <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@anda.com" 
                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 text-slate-900 text-sm font-semibold transition-all"
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative group">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full pl-11 pr-11 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 text-slate-900 text-sm font-semibold transition-all"
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

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-[#7A171D]/20 active:scale-[0.98] disabled:opacity-70 mt-2 flex items-center justify-center gap-2"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Mulai Narik <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Divider & Google Login */}
        <div className="mt-6 flex items-center justify-between">
          <span className="w-full border-b border-slate-200"></span>
          <span className="px-3 text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Atau</span>
          <span className="w-full border-b border-slate-200"></span>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="mt-5 w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl text-sm transition-all border border-slate-200 shadow-sm disabled:opacity-50 active:scale-[0.98]"
        >
          <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} height={18} />
          <span>Masuk dengan Google</span>
        </button>

        {/* Link ke Registrasi yang SUDAH BENAR URL-nya */}
        <div className="mt-6 text-center text-xs text-slate-600">
          Belum bergabung menjadi mitra? <br className="mb-1" />
          <Link href="/driver/register" className="font-bold text-[#C5A059] hover:text-[#A68345] underline underline-offset-4 transition-colors">
            Daftar Sekarang
          </Link>
        </div>

      </motion.div>
    </main>
  );
}