"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
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
        displayName: name, // Global type standard
        name, // Backward compatibility
        photoURL,
        role: "b2c", // Default role baru
        createdAt: serverTimestamp()
      });
      return "b2c" as Role;
    }
    
    // Mapping legacy roles jika akun lama
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

        // Penyesuaian ke role baru
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
      
      // PERBAIKAN: Arahkan ke rute publik /dashboard, bukan /desktop/dashboard
      router.push("/dashboard"); // Menyesuaikan dengan path aslimu

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
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[140px] opacity-15 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-[#C5A059] rounded-full blur-[120px] opacity-20 pointer-events-none" />

      <div className="max-w-5xl w-full bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 flex overflow-hidden z-10 relative min-h-[650px] border border-slate-100">
        
        <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-[#7A171D] via-[#6A1218] to-[#4A0A10] p-12 flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#C5A059]/20 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            {/* Implementasi Logo Putih Flash Globals */}
            <div className="flex items-center gap-3 mb-8">
              <div className="relative w-[200px] h-[45px]">
                <Image 
                  src="/logo-white.png" 
                  alt="Flash Globals Logistik" 
                  fill
                  priority
                  className="object-contain object-left"
                />
              </div>
            </div>

            <h3 className="text-4xl font-bold mb-4 leading-tight">Solusi Logistik Tanpa Batas</h3>
            <p className="text-white/70 text-base leading-relaxed">
              Kelola pengiriman domestik maupun luar negeri Anda dengan mudah, aman, dan terpantau secara real-time dalam satu portal.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-start gap-4 bg-black/20 p-5 rounded-2xl backdrop-blur-sm border border-white/5">
              <div className="w-10 h-10 rounded-full bg-[#C5A059]/20 flex items-center justify-center shrink-0 mt-1">
                <ShieldCheck className="text-[#C5A059] w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-base text-white mb-1">Keamanan Data Terjamin</h4>
                <p className="text-sm text-white/60 leading-relaxed">Sistem terenkripsi penuh memastikan data pengiriman dan profil Anda tetap aman.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-7/12 p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-white">
          <div className="mb-10 flex justify-between items-center">
            <Link href="/" className="text-sm text-slate-500 hover:text-[#7A171D] transition-colors font-medium flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
              &larr; Kembali ke Beranda
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
              {isLogin ? "Selamat Datang Kembali" : "Buat Akun Baru"}
            </h2>
            <p className="text-slate-500 text-sm">
              {isLogin 
                ? "Silakan masuk untuk mengelola dan melacak pengiriman Anda." 
                : "Daftar sekarang dan nikmati kemudahan manajemen logistik."}
            </p>
          </div>

          <AnimatePresence>
            {errorMsg && (
              <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="mb-6 overflow-hidden">
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl flex items-center gap-3">
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
                  <label className="text-sm font-semibold text-slate-700">Nama Lengkap</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
                    </div>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Masukkan nama lengkap" className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none transition-all bg-slate-50/50 text-slate-900 font-medium" required={!isLogin} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
                  </div>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="contoh@email.com" className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none transition-all bg-slate-50/50 text-slate-900 font-medium" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
                  </div>
                  <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none transition-all bg-slate-50/50 text-slate-900 font-medium" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#7A171D] transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="flex justify-end pt-1">
                  <button type="button" className="text-sm font-semibold text-[#C5A059] hover:text-[#7A171D] transition-colors">
                    Lupa Password?
                  </button>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#7A171D]/20 hover:shadow-[#7A171D]/40 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4">
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
            <span className="px-4 text-xs text-center text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Atau lanjutkan dengan</span>
            <span className="w-full border-b border-slate-200"></span>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleLogin} 
            disabled={isLoading}
            className="w-full mt-6 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          <div className="mt-8 text-center text-sm text-slate-600">
            {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-bold text-[#7A171D] hover:text-[#5A0E13] underline underline-offset-4 transition-colors">
              {isLogin ? "Daftar di sini" : "Masuk di sini"}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}