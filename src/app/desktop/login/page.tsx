"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
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
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

export default function DesktopLoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Ambil fungsi login dari Zustand Store
  const { login } = useAuthStore();

  // State Form
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Fungsi utilitas untuk simpan user ke Firestore setelah Register/Google
  const saveUserToFirestore = async (uid: string, email: string, name: string, photoURL: string = "") => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    // Jika belum ada di database, buat dokumen baru
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid,
        email,
        name,
        photoURL,
        role: "user",
        createdAt: new Date().toISOString()
      });
    }
  };

  // FUNGSI SUBMIT EMAIL & PASSWORD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      if (isLogin) {
        // --- PROSES LOGIN ---
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        
        // Simpan ke Zustand
        login({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || "Pengguna",
          photoURL: userCredential.user.photoURL
        });

      } else {
        // --- PROSES REGISTER ---
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        
        // Update Display Name di Firebase Auth
        await updateProfile(userCredential.user, {
          displayName: formData.name
        });

        // Simpan Data Tambahan ke Firestore
        await saveUserToFirestore(
          userCredential.user.uid, 
          userCredential.user.email || "", 
          formData.name
        );

        // Simpan ke Zustand
        login({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: formData.name,
          photoURL: null
        });
      }
      
      // REVISI: Jika Sukses, Arahkan ke Dasbor (Tanpa kata desktop)
      router.push("/dashboard");

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message.replace("Firebase: ", ""));
    } finally {
      setIsLoading(false);
    }
  };

  // FUNGSI LOGIN GOOGLE
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      
      // Pastikan data tersimpan di Firestore
      await saveUserToFirestore(
        result.user.uid, 
        result.user.email || "", 
        result.user.displayName || "Pengguna Google",
        result.user.photoURL || ""
      );

      // Simpan ke Zustand
      login({
        uid: result.user.uid,
        email: result.user.email,
        name: result.user.displayName || "Pengguna Google",
        photoURL: result.user.photoURL
      });

      // REVISI: Redirect ke dashboard publik (Tanpa kata desktop)
      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      setErrorMsg("Gagal login dengan Google. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#7A171D] rounded-full blur-[120px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[100px] opacity-15 pointer-events-none" />

      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl shadow-[#7A171D]/5 flex overflow-hidden z-10 relative min-h-[600px]">
        
        {/* Sisi Kiri - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#7A171D] to-[#5A0E13] p-12 flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#C5A059]/20 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold mb-4">Flash Global</h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Portal manajemen pengiriman dan logistik luar negeri yang terintegrasi penuh.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <ShieldCheck className="text-[#C5A059] w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-lg text-[#DFBE7B]">Sistem Akun Terpusat</h4>
                <p className="text-sm text-white/80">Satu kredensial login untuk akses Web & Aplikasi Mobile secara real-time.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sisi Kanan - Area Formulir */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="mb-8 flex justify-between items-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-[#7A171D] transition-colors font-semibold flex items-center gap-2">
              &larr; Kembali ke Beranda
            </Link>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? "Selamat Datang" : "Buat Akun Baru"}
            </h2>
            <p className="text-gray-500">
              {isLogin 
                ? "Silakan masuk untuk mengelola pengiriman Anda." 
                : "Daftar sekarang untuk mempermudah proses logistik."}
            </p>
          </div>

          {/* Pesan Error */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-xl">
                {errorMsg}
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
                  <label className="text-sm font-semibold text-gray-700">Nama Lengkap</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Masukkan nama lengkap" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none transition-all bg-gray-50" required={!isLogin} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="contoh@email.com" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none transition-all bg-gray-50" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none transition-all bg-gray-50" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#7A171D] transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <button type="button" className="text-sm font-semibold text-[#C5A059] hover:text-[#7A171D] transition-colors">
                    Lupa Password?
                  </button>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#7A171D]/30 disabled:opacity-70 disabled:cursor-not-allowed mt-2">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isLogin ? "Masuk ke Akun" : "Daftar Sekarang"} <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          {/* OPSI LOGIN GOOGLE */}
          <div className="mt-6 flex items-center justify-between">
            <span className="w-1/5 border-b border-gray-200 lg:w-1/4"></span>
            <span className="text-xs text-center text-gray-400 font-semibold uppercase">Atau login dengan</span>
            <span className="w-1/5 border-b border-gray-200 lg:w-1/4"></span>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleLogin} 
            disabled={isLoading}
            className="w-full mt-6 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-70"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          {/* Toggle Login/Register */}
          <div className="mt-8 text-center text-sm text-gray-600">
            {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-bold text-[#7A171D] hover:text-[#C5A059] transition-colors">
              {isLogin ? "Daftar di sini" : "Masuk di sini"}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}