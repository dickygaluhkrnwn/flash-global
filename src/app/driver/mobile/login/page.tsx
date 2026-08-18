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
        
        if (userRole === "driver") {
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
            partnerType: userData.partnerType || "Individual"
          } as StoreUser);

          // Redirect dinamis setelah sukses login
          router.push(getDriverUrl("/driver/dashboard")); 
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
    // Background eksklusif terang agar efek kaca pop-up
    <main className="fixed inset-0 z-[999] bg-[var(--background)] flex flex-col items-center justify-center p-6 overflow-y-auto font-sans w-full tap-highlight-transparent">
      
      <div className="relative w-full max-w-sm flex flex-col items-center justify-center py-10 min-h-full">
        
        {/* Background Glow Premium (Light Mode) */}
        <div className="fixed top-[-10%] right-[-10%] w-[60%] h-[40%] bg-[var(--brand-maroon)] rounded-full blur-[120px] opacity-20 pointer-events-none" />
        <div className="fixed bottom-[-10%] left-[-10%] w-[50%] h-[30%] bg-[#C5A059] rounded-full blur-[100px] opacity-20 pointer-events-none" />

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
                <div className="w-16 h-16 bg-[var(--brand-maroon)]/10 rounded-2xl flex items-center justify-center mb-4 border border-[var(--brand-maroon)]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
                  <Truck className="w-8 h-8 text-[var(--brand-maroon)]" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Portal Mitra</h1>
                <p className="text-sm text-slate-500 mt-1 font-medium">Masuk untuk mulai menerima order</p>
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

              {/* Form Login Email */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Email</label>
                  <div className="relative group">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--brand-maroon)] transition-colors z-10" />
                    <Input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@anda.com" 
                      className="pl-11"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Password</label>
                  <div className="relative group">
                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--brand-maroon)] transition-colors z-10" />
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="pl-11 pr-11"
                      required 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--brand-maroon)] transition-colors z-10 active:scale-90 tap-highlight-transparent outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {!isLoading && <>Mulai Narik <ArrowRight className="w-4 h-4" /></>}
                  </Button>
                </div>
              </form>

              {/* Divider */}
              <div className="mt-8 flex items-center justify-between">
                <span className="w-full border-b border-slate-200"></span>
                <span className="px-3 text-[10px] text-center text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">Atau Lanjutkan Dengan</span>
                <span className="w-full border-b border-slate-200"></span>
              </div>

              {/* Google Login (Using Premium Button) */}
              <div className="mt-6">
                <Button 
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white"
                >
                  <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} height={18} />
                  <span className="font-bold">Masuk dengan Google</span>
                </Button>
              </div>

              {/* Link ke Registrasi */}
              <div className="mt-8 text-center text-xs font-bold text-slate-500">
                Belum bergabung menjadi mitra? <br className="mb-1" />
                <Link href={getDriverUrl("/driver/register")} className="text-[#C5A059] hover:text-[#A68345] underline underline-offset-4 transition-colors">
                  Daftar Sekarang
                </Link>
              </div>

            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}