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
// PERBAIKAN: Import 'cn' dihapus karena tidak lagi digunakan

// --- IMPORT GLOBAL TYPES ---
import { Role } from "@/types/user";

export default function DesktopLoginPage() {
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
        if (friendlyError.includes("invalid-credential")) friendlyError = "Email atau password salah.";
        if (friendlyError.includes("email-already-in-use")) friendlyError = "Email sudah terdaftar.";
        if (friendlyError.includes("weak-password")) friendlyError = "Password minimal 6 karakter.";
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
        setErrorMsg("Gagal login dengan Google: " + error.message.replace("Firebase: ", ""));
      } else {
        setErrorMsg("Gagal login dengan Google. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden font-sans z-0">
      
      {/* --- AMBIENT GLOWING BACKGROUND --- */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vh] rounded-full bg-rose-200/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[50vh] rounded-full bg-amber-100/50 blur-[120px]" />
        <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vh] rounded-full bg-blue-100/30 blur-[100px]" />
      </div>

      {/* --- MAIN GLASS CONTAINER --- */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-5xl w-full glass-card rounded-[3rem] p-3 flex flex-col lg:flex-row overflow-hidden z-10 relative min-h-[650px]"
      >
        
        {/* --- LEFT PANEL: BRANDING (Inner Bento Card) --- */}
        <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-[#9A242B] to-[#5A0E13] rounded-[2.5rem] p-12 flex-col justify-between relative overflow-hidden text-white shadow-[inset_0_2px_10px_rgba(255,255,255,0.2)]">
          {/* Abstract Glow inside the red panel */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#C5A059]/30 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-10 hover:bg-white/20 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold tracking-wide">Kembali ke Beranda</span>
            </Link>

            <div className="relative w-[220px] h-[50px] mb-10">
              <Image 
                src="/logo-white.png" 
                alt="Flash Globals Logistik" 
                fill
                priority
                className="object-contain object-left drop-shadow-md"
              />
            </div>

            <motion.h3 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-black mb-6 leading-[1.1] tracking-tight text-balance"
            >
              Logistik Global <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFBE7B] to-[#C5A059]">Kini di Tangan Anda.</span>
            </motion.h3>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/80 text-sm font-medium leading-relaxed max-w-sm"
            >
              Kelola pengiriman domestik maupun internasional dengan ekosistem AI yang presisi, aman, dan transparan.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative z-10"
          >
            <div className="flex items-start gap-4 bg-black/20 p-5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
              <div className="w-10 h-10 rounded-full bg-[#C5A059]/20 flex items-center justify-center shrink-0 mt-0.5 border border-[#C5A059]/30">
                <ShieldCheck className="text-[#C5A059] w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white mb-1">Enkripsi Tingkat Tinggi</h4>
                <p className="text-xs font-medium text-white/60 leading-relaxed">Seluruh data transaksi dan informasi kargo Anda diproteksi dengan keamanan siber standar industri.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* --- RIGHT PANEL: FORM --- */}
        <div className="w-full lg:w-7/12 p-8 sm:p-12 flex flex-col justify-center relative">
          
          {/* Mobile Back Button */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#7A171D] transition-colors bg-white/60 px-4 py-2 rounded-full border border-white shadow-sm">
              <ArrowLeft className="w-4 h-4" /> Beranda
            </Link>
          </div>

          <div className="mb-10">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#7A171D]/5 text-[#7A171D] mb-4 border border-[#7A171D]/10">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Portal Klien</span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 tracking-tight">
              {isLogin ? "Selamat Datang Kembali" : "Buat Akun Baru"}
            </h2>
            <p className="text-slate-500 font-medium text-sm">
              {isLogin 
                ? "Silakan masuk untuk melanjutkan manajemen kargo Anda." 
                : "Daftar sekarang dan nikmati ekosistem logistik modern."}
            </p>
          </div>

          <AnimatePresence>
            {errorMsg && (
              <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="mb-6 overflow-hidden">
                <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 text-sm font-bold rounded-2xl flex items-center gap-3 shadow-sm">
                  <ShieldCheck className="w-5 h-5 shrink-0" /> {errorMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.form 
              key={isLogin ? "login" : "register"}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Nama Lengkap</label>
                  {/* Class string biasa menggantikan cn() */}
                  <div className="relative group flex items-center bg-white/60 backdrop-blur-md border border-white rounded-2xl h-[56px] focus-within:bg-white focus-within:ring-[3px] focus-within:ring-[#7A171D]/20 focus-within:border-[#7A171D]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300">
                    <div className="pl-5 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
                    </div>
                    <input 
                      type="text" name="name" value={formData.name} onChange={handleChange} 
                      placeholder="Masukkan nama lengkap" 
                      className="w-full bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium" 
                      required={!isLogin} 
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Alamat Email</label>
                <div className="relative group flex items-center bg-white/60 backdrop-blur-md border border-white rounded-2xl h-[56px] focus-within:bg-white focus-within:ring-[3px] focus-within:ring-[#7A171D]/20 focus-within:border-[#7A171D]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300">
                  <div className="pl-5 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
                  </div>
                  <input 
                    type="email" name="email" value={formData.email} onChange={handleChange} 
                    placeholder="contoh@perusahaan.com" 
                    className="w-full bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Kata Sandi</label>
                <div className="relative group flex items-center bg-white/60 backdrop-blur-md border border-white rounded-2xl h-[56px] focus-within:bg-white focus-within:ring-[3px] focus-within:ring-[#7A171D]/20 focus-within:border-[#7A171D]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300">
                  <div className="pl-5 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} 
                    placeholder="••••••••" 
                    className="w-full bg-transparent border-none outline-none pl-4 pr-12 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium" 
                    required 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-[#7A171D] transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="flex justify-end pt-1">
                  <button type="button" className="text-xs font-bold text-[#C5A059] hover:text-[#A68345] transition-colors">
                    Lupa Password?
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-gradient-to-b from-[#9A242B] to-[#7A171D] hover:from-[#A82B33] hover:to-[#8B1A21] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_10px_rgba(122,23,29,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_6px_15px_rgba(122,23,29,0.3)] border border-[#5A0E13] active:scale-[0.96] disabled:opacity-70 disabled:cursor-not-allowed mt-8"
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

          <div className="mt-8 flex items-center justify-between">
            <span className="w-full border-b border-slate-200"></span>
            <span className="px-4 text-[10px] text-center text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">Atau lanjutkan dengan</span>
            <span className="w-full border-b border-slate-200"></span>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleLogin} 
            disabled={isLoading}
            className="w-full mt-6 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.96] disabled:opacity-70 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Lanjutkan dengan Google
          </button>

          <div className="mt-8 text-center text-sm font-medium text-slate-500">
            {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-bold text-[#7A171D] hover:text-[#5A0E13] transition-colors ml-1">
              {isLogin ? "Daftar sekarang" : "Masuk di sini"}
            </button>
          </div>

        </div>
      </motion.div>
    </main>
  );
}