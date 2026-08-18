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

// --- IMPORT PREMIUM COMPONENTS KITA ---
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getDriverUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('driver.flashglobalslogistik.com')) {
    let cleanPath = path.replace(/^\/driver\/mobile/, '');
    cleanPath = cleanPath.replace(/^\/driver/, '');
    return cleanPath || '/';
  }
  if (path.startsWith('/driver') && !path.startsWith('/driver/mobile')) {
    return path.replace('/driver', '/driver/mobile');
  }
  return path;
};

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

  // Register dengan Email/Password
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

      // 5. Arahkan ke Dashboard (Dinamis)
      router.push(getDriverUrl("/driver/dashboard"));

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

        router.push(getDriverUrl("/driver/dashboard"));
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
          
          router.push(getDriverUrl("/driver/dashboard"));
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
    <main className="fixed inset-0 z-[999] bg-[var(--background)] flex flex-col items-center justify-center p-6 overflow-y-auto font-sans w-full tap-highlight-transparent">
      
      <div className="relative w-full max-w-sm flex flex-col items-center justify-center py-10 min-h-full">
        
        {/* Background Glow Premium (Dibalik dari Login, ini dominan Gold) */}
        <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[40%] bg-[var(--brand-gold)] rounded-full blur-[120px] opacity-20 pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[30%] bg-[var(--brand-maroon)] rounded-full blur-[100px] opacity-15 pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="w-full relative z-10"
        >
          <Card className="shadow-2xl shadow-slate-200/50 pt-8 pb-4">
            <CardContent>
              {/* Header Title & Icon */}
              <div className="text-center mb-8 flex flex-col items-center">
                <div className="w-16 h-16 bg-[var(--brand-gold)]/15 rounded-2xl flex items-center justify-center mb-4 border border-[var(--brand-gold)]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
                  <Truck className="w-8 h-8 text-[#A68345]" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daftar Mitra</h1>
                <p className="text-sm text-slate-500 mt-1 font-medium">Buat akun untuk bergabung bersama kami</p>
              </div>

              {/* Alert Panels (Error) */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }} 
                    animate={{ opacity: 1, height: "auto", y: 0 }} 
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="overflow-hidden mb-6"
                  >
                    <div className="p-3.5 bg-red-50/80 backdrop-blur-sm border border-red-200/60 text-red-700 text-xs font-bold rounded-[1.25rem] flex items-start gap-2.5 leading-relaxed shadow-sm">
                      <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Register */}
              <form onSubmit={handleRegister} className="space-y-5">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nama Lengkap</label>
                  <div className="relative group">
                    <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--brand-gold-dark)] transition-colors z-10" />
                    <Input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Nama sesuai KTP" 
                      className="pl-11 focus-visible:ring-[var(--brand-gold)]/20 focus-visible:border-[var(--brand-gold-dark)]/50"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Email</label>
                  <div className="relative group">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--brand-gold-dark)] transition-colors z-10" />
                    <Input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@anda.com" 
                      className="pl-11 focus-visible:ring-[var(--brand-gold)]/20 focus-visible:border-[var(--brand-gold-dark)]/50"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Password</label>
                  <div className="relative group">
                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--brand-gold-dark)] transition-colors z-10" />
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimal 6 karakter" 
                      className="pl-11 pr-11 focus-visible:ring-[var(--brand-gold)]/20 focus-visible:border-[var(--brand-gold-dark)]/50"
                      required 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--brand-gold-dark)] transition-colors z-10 active:scale-90 tap-highlight-transparent outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    variant="gold"
                    size="lg"
                    isLoading={isLoading}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {!isLoading && <>Daftar Sekarang <ArrowRight className="w-4 h-4" /></>}
                  </Button>
                </div>
              </form>

              {/* Divider */}
              <div className="mt-8 flex items-center justify-between">
                <span className="w-full border-b border-slate-200"></span>
                <span className="px-3 text-[10px] text-center text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">Atau Lanjutkan Dengan</span>
                <span className="w-full border-b border-slate-200"></span>
              </div>

              {/* Google Register */}
              <div className="mt-6">
                <Button 
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleGoogleRegister}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white"
                >
                  <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} height={18} />
                  <span className="font-bold">Daftar dengan Google</span>
                </Button>
              </div>

              {/* Link ke Login */}
              <div className="mt-8 text-center text-xs font-bold text-slate-500">
                Sudah bergabung menjadi mitra? <br className="mb-1" />
                <Link href={getDriverUrl("/driver/login")} className="text-[var(--brand-maroon)] hover:text-[#5A0E13] underline underline-offset-4 transition-colors">
                  Masuk di sini
                </Link>
              </div>

            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}