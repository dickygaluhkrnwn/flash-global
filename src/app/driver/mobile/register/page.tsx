"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, User, Eye, EyeOff, ShieldAlert, ArrowRight, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// --- IMPORT FIREBASE CORE ---
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore, StoreUser } from "@/store/useAuthStore";

export default function DriverRegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Login dengan Email/Password
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      // 1. Buat Akun di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // 2. Update Profil Auth
      await updateProfile(userCredential.user, {
        displayName: formData.name
      });

      // 3. Simpan ke Firestore dengan status 'Pending'
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email || formData.email,
        displayName: formData.name,
        role: "driver",
        status: "Pending", // Status awal wajib Pending
        createdAt: serverTimestamp()
      });

      // 4. Masukkan ke State Global (Zustand)
      login({
        uid: userCredential.user.uid,
        email: userCredential.user.email || formData.email,
        displayName: formData.name,
        role: "driver",
        status: "Pending",
        createdAt: new Date(),
      } as StoreUser);

      // 5. Arahkan ke Dashboard
      router.push("/driver/dashboard");

    } catch (error: unknown) {
      if (error instanceof Error) {
        let friendlyError = error.message;
        if (friendlyError.includes("email-already-in-use")) friendlyError = "Email sudah terdaftar. Silakan login.";
        if (friendlyError.includes("weak-password")) friendlyError = "Password minimal 6 karakter.";
        setErrorMsg(friendlyError.replace("Firebase: ", ""));
      } else {
        setErrorMsg("Terjadi kesalahan sistem. Silakan coba lagi.");
      }
      setIsLoading(false);
    }
  };

  // Register/Login dengan Google
  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      // Jika user belum ada di database, buat baru sebagai Driver Pending
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email || "",
          displayName: result.user.displayName || "Mitra Pengemudi",
          photoURL: result.user.photoURL || "",
          role: "driver",
          status: "Pending",
          createdAt: serverTimestamp()
        });

        login({
          uid: result.user.uid,
          email: result.user.email || "",
          displayName: result.user.displayName || "Mitra Pengemudi",
          photoURL: result.user.photoURL || undefined,
          role: "driver",
          status: "Pending",
          createdAt: new Date()
        } as StoreUser);

        router.push("/driver/dashboard");
      } else {
        // Jika akun sudah ada, periksa apakah rolenya benar-benar driver
        const data = userSnap.data();
        if (data.role === "driver") {
          login({
            uid: result.user.uid,
            email: result.user.email || "",
            displayName: data.displayName || result.user.displayName || "Mitra Pengemudi",
            photoURL: data.photoURL || result.user.photoURL || undefined,
            role: "driver",
            status: data.status || "Pending",
            createdAt: data.createdAt || new Date()
          } as StoreUser);
          
          router.push("/driver/dashboard");
        } else {
          await signOut(auth);
          setErrorMsg("Akun ini sudah terdaftar sebagai Pengguna/Admin. Gunakan email lain untuk mendaftar sebagai Mitra.");
          setIsLoading(false);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("auth/popup-closed-by-user")) {
          setIsLoading(false);
          return;
        }
        setErrorMsg("Gagal otorisasi Google: " + error.message.replace("Firebase: ", ""));
      } else {
        setErrorMsg("Gagal mendaftar dengan Google.");
      }
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans w-full">
      {/* Background Glow Premium (Light Mode) */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-[#C5A059] rounded-full blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[30%] bg-[#7A171D] rounded-full blur-[100px] opacity-15 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm glass-card rounded-[2rem] p-8 shadow-2xl shadow-slate-200/50 relative z-10"
      >
        {/* Header Title & Icon */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-[#C5A059]/10 rounded-full flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-[#C5A059]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daftar Mitra</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Buat akun untuk bergabung bersama kami</p>
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

        {/* Form Register Email */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
            <div className="relative group">
              <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#C5A059] transition-colors" />
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nama sesuai KTP" 
                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 text-slate-900 text-sm font-semibold transition-all"
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
            <div className="relative group">
              <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#C5A059] transition-colors" />
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@anda.com" 
                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 text-slate-900 text-sm font-semibold transition-all"
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative group">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#C5A059] transition-colors" />
              <input 
                type={showPassword ? "text" : "password"} 
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimal 6 karakter" 
                className="w-full pl-11 pr-11 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 text-slate-900 text-sm font-semibold transition-all"
                required 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#C5A059] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#C5A059] hover:bg-[#A68345] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-[#C5A059]/20 active:scale-[0.98] disabled:opacity-70 mt-2 flex items-center justify-center gap-2"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Daftar Sekarang <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Divider & Google Register */}
        <div className="mt-6 flex items-center justify-between">
          <span className="w-full border-b border-slate-200"></span>
          <span className="px-3 text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Atau</span>
          <span className="w-full border-b border-slate-200"></span>
        </div>

        <button 
          type="button"
          onClick={handleGoogleRegister}
          disabled={isLoading}
          className="mt-5 w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl text-sm transition-all border border-slate-200 shadow-sm disabled:opacity-50 active:scale-[0.98]"
        >
          <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} height={18} />
          <span>Daftar dengan Google</span>
        </button>

        {/* Link ke Login */}
        <div className="mt-6 text-center text-xs text-slate-600">
          Sudah bergabung menjadi mitra? <br className="mb-1" />
          <Link href="/driver/login" className="font-bold text-[#7A171D] hover:text-[#5A0E13] underline underline-offset-4 transition-colors">
            Masuk di sini
          </Link>
        </div>

      </motion.div>
    </main>
  );
}