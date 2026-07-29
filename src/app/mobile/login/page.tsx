"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

// --- IMPORT FIREBASE & ZUSTAND ---
import { auth, db } from "@/lib/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { Role } from "@/types/user";

export default function MobileLoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { login } = useAuthStore();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const saveUserToFirestore = async (uid: string, email: string, name: string, photoURL: string = "") => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid,
        email,
        displayName: name, 
        name, 
        photoURL,
        role: "b2c", 
        createdAt: serverTimestamp()
      });
      return "b2c" as Role;
    }
    
    let fetchedRole = userSnap.data().role || "b2c";
    if (fetchedRole === "user") fetchedRole = "b2c";
    if (fetchedRole === "business") fetchedRole = "b2b";
    
    return fetchedRole as Role;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const userRef = doc(db, "users", userCredential.user.uid);
        const userSnap = await getDoc(userRef);
        
        let userRole = "b2c";
        let dbName = "";
        let dbCreatedAt = new Date();

        if (userSnap.exists()) {
          const data = userSnap.data();
          userRole = data.role || "b2c";
          dbName = data.displayName || data.name || "";
          dbCreatedAt = data.createdAt || new Date();
        }

        if (userRole === "user") userRole = "b2c";
        if (userRole === "business") userRole = "b2b";
        
        login({
          uid: userCredential.user.uid,
          email: userCredential.user.email || "",
          displayName: userCredential.user.displayName || dbName || "Pengguna",
          photoURL: userCredential.user.photoURL || undefined,
          role: userRole as Role,
          createdAt: dbCreatedAt
        });

      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        
        await updateProfile(userCredential.user, {
          displayName: formData.name
        });

        const assignedRole = await saveUserToFirestore(
          userCredential.user.uid, 
          userCredential.user.email || "", 
          formData.name
        );

        login({
          uid: userCredential.user.uid,
          email: userCredential.user.email || "",
          displayName: formData.name,
          photoURL: undefined,
          role: assignedRole,
          createdAt: new Date()
        });
      }
      
      router.push("/dashboard");

    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        let friendlyError = error.message;
        if (friendlyError.includes("invalid-credential")) friendlyError = "Email atau sandi salah.";
        if (friendlyError.includes("email-already-in-use")) friendlyError = "Email sudah terdaftar.";
        if (friendlyError.includes("weak-password")) friendlyError = "Sandi minimal 6 karakter.";
        setErrorMsg(friendlyError.replace("Firebase: ", ""));
      } else {
        setErrorMsg("Terjadi kesalahan yang tidak terduga.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const userRole = await saveUserToFirestore(
        result.user.uid, 
        result.user.email || "", 
        result.user.displayName || "Pengguna Google",
        result.user.photoURL || ""
      );

      login({
        uid: result.user.uid,
        email: result.user.email || "",
        displayName: result.user.displayName || "Pengguna Google",
        photoURL: result.user.photoURL || undefined,
        role: userRole,
        createdAt: new Date()
      });

      router.push("/dashboard"); 
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        if (error.message.includes("popup-closed-by-user")) return;
        setErrorMsg("Gagal login: " + error.message.replace("Firebase: ", ""));
      } else {
        setErrorMsg("Gagal login dengan Google. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // REVISI: Kembali pakai div biasa yang flex-grow, tidak pakai fixed atau z-[999] lagi.
    // Background ambient glow juga dihapus karena sudah di-handle oleh layout.tsx
    <div className="flex-grow flex flex-col relative font-sans w-full">
      
      {/* --- TOP BAR (Back Button & Logo) --- */}
      <div className="flex items-center justify-between p-4 pt-6 relative z-20">
        <Link 
          href="/" 
          className="w-10 h-10 flex items-center justify-center glass-panel rounded-full text-slate-600 active:scale-90 transition-transform tap-highlight-transparent shadow-sm border border-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="relative w-[120px] h-[30px]">
          <Image 
            src="/logo.png" 
            alt="Flash Globals" 
            fill
            priority
            className="object-contain object-right drop-shadow-sm"
          />
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-grow flex flex-col justify-center px-6 pb-12 pt-4 relative z-10 w-full">
        
        {/* Header Text */}
        <div className="mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7A171D]/10 text-[#7A171D] mb-4 border border-[#7A171D]/20 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-widest">Portal Klien</span>
          </motion.div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight leading-tight">
            {isLogin ? "Selamat Datang" : "Buat Akun"}
          </h2>
          <p className="text-slate-500 font-medium text-sm">
            {isLogin 
              ? "Masuk untuk kelola pengiriman Anda." 
              : "Daftar & nikmati kemudahan logistik."}
          </p>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="mb-6 overflow-hidden">
              <div className="p-3 bg-red-50/90 backdrop-blur-md border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-sm">
                <ShieldCheck className="w-4 h-4 shrink-0" /> {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- FORM AREA --- */}
        <AnimatePresence mode="wait">
          <motion.form 
            key={isLogin ? "login" : "register"}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nama Lengkap</label>
                <div className="relative group flex items-center bg-white/60 backdrop-blur-md border border-white rounded-[1.25rem] h-14 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7A171D]/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300">
                  <div className="pl-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
                  </div>
                  <input 
                    type="text" name="name" value={formData.name} onChange={handleChange} 
                    placeholder="Nama Anda" 
                    className="w-full bg-transparent border-none outline-none px-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium" 
                    required={!isLogin} 
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Email</label>
              <div className="relative group flex items-center bg-white/60 backdrop-blur-md border border-white rounded-[1.25rem] h-14 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7A171D]/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300">
                <div className="pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
                </div>
                <input 
                  type="email" name="email" value={formData.email} onChange={handleChange} 
                  placeholder="contoh@email.com" 
                  className="w-full bg-transparent border-none outline-none px-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium" 
                  required 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Kata Sandi</label>
              <div className="relative group flex items-center bg-white/60 backdrop-blur-md border border-white rounded-[1.25rem] h-14 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7A171D]/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300">
                <div className="pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} 
                  placeholder="••••••••" 
                  className="w-full bg-transparent border-none outline-none pl-3 pr-12 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium" 
                  required 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#7A171D] transition-colors tap-highlight-transparent">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end pt-1">
                <button type="button" className="text-[11px] font-bold text-[#C5A059] active:text-[#A68345] transition-colors tap-highlight-transparent">
                  Lupa Kata Sandi?
                </button>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading} 
              className={cn(
                "w-full bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white font-bold h-14 rounded-[1.25rem] flex items-center justify-center gap-2 transition-all mt-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_20px_rgba(122,23,29,0.25)] border border-[#5A0E13] tap-highlight-transparent select-none",
                isLoading ? "opacity-80" : "active:scale-[0.96]"
              )}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? "Masuk ke Akun" : "Daftar Sekarang"} <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        {/* --- DIVIDER --- */}
        <div className="mt-8 mb-6 flex items-center justify-between">
          <span className="w-full border-b border-slate-200"></span>
          <span className="px-3 text-[9px] text-center text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">Atau Lanjutkan Dengan</span>
          <span className="w-full border-b border-slate-200"></span>
        </div>

        {/* --- GOOGLE BUTTON --- */}
        <button 
          type="button" 
          onClick={handleGoogleLogin} 
          disabled={isLoading}
          className={cn(
            "w-full bg-white border border-slate-200 text-slate-700 font-bold h-14 rounded-[1.25rem] flex items-center justify-center gap-3 transition-all shadow-sm tap-highlight-transparent select-none",
            isLoading ? "opacity-70" : "active:scale-[0.96] active:bg-slate-50"
          )}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </button>

        {/* --- TOGGLE LOGIN / REGISTER --- */}
        <div className="mt-8 text-center text-xs font-medium text-slate-500">
          {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)} 
            className="font-bold text-[#7A171D] active:text-[#5A0E13] transition-colors ml-1 tap-highlight-transparent p-2 -m-2"
          >
            {isLogin ? "Daftar sekarang" : "Masuk di sini"}
          </button>
        </div>

      </div>
    </div>
  );
}