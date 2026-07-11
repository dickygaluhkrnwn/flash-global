"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, ShieldAlert, CheckCircle2, KeyRound, ArrowRight } from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { auth } from "@/lib/firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Menangkap token rahasia dari URL Firebase (?mode=resetPassword&oobCode=XXXX)
  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Verifikasi token saat halaman pertama kali dimuat
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setErrorMsg("Tautan tidak valid atau kode pemulihan hilang.");
        setIsVerifying(false);
        return;
      }

      try {
        // Cek apakah kodenya valid dan ambil email user
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.message.includes("auth/invalid-action-code") || error.message.includes("auth/expired-action-code")) {
            setErrorMsg("Tautan kedaluwarsa atau sudah pernah digunakan. Silakan minta tautan reset baru.");
          } else {
            setErrorMsg("Gagal memverifikasi tautan keamanan.");
          }
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifyCode();
  }, [oobCode]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!oobCode) return;

    if (newPassword.length < 6) {
      setErrorMsg("Kata sandi baru harus terdiri dari minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setIsLoading(true);

    try {
      // Tembakkan password baru ke Firebase
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccessMsg("Kata sandi berhasil diubah! Mengalihkan ke halaman login...");
      
      // Tunggu sebentar agar user bisa membaca pesan sukses, lalu lempar ke login
      setTimeout(() => {
        router.push("/admin/login");
      }, 3000);
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMsg(error.message.replace("Firebase: ", ""));
      } else {
        setErrorMsg("Terjadi kesalahan saat mereset kata sandi.");
      }
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Memverifikasi Tautan Keamanan...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-slate-200/50 relative z-10">
      {/* Top Strip */}
      <div className="absolute top-0 left-10 right-10 h-1.5 bg-gradient-to-r from-[#7A171D] to-[#C5A059] rounded-b-xl" />

      {/* Header Logo */}
      <div className="text-center mb-8 mt-2">
        <div className="w-16 h-16 bg-gradient-to-br from-[#7A171D] to-[#5A0E13] rounded-2xl flex items-center justify-center shadow-lg shadow-[#7A171D]/20 mx-auto mb-5 border border-white/20">
          <KeyRound className="text-[#C5A059] w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ganti Kata Sandi</h1>
        {email && (
          <p className="text-xs text-slate-500 mt-2 font-medium">
            Mereset akses untuk akun:<br/>
            <strong className="text-slate-800">{email}</strong>
          </p>
        )}
      </div>

      {/* Alert Panels */}
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

      {/* Jika token valid, tampilkan form. Jika tidak, sembunyikan form */}
      {!errorMsg.includes("Tautan tidak valid") && !errorMsg.includes("Tautan kedaluwarsa") && !successMsg && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kata Sandi Baru</label>
            <div className="relative group">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter" 
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
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ulangi Kata Sandi</label>
            <div className="relative group">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang kata sandi" 
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 text-slate-900 text-sm font-semibold transition-all"
                required 
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#7A171D] transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-4 rounded-xl text-sm transition-all shadow-lg shadow-[#7A171D]/20 active:scale-[0.98] disabled:opacity-70 mt-6 flex items-center justify-center gap-2"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Simpan Kata Sandi <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      )}

      {/* Tombol kembali jika gagal atau berhasil */}
      {(errorMsg.includes("Tautan") || successMsg) && (
        <button 
          onClick={() => router.push("/admin/login")}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-xl text-sm transition-all mt-4"
        >
          Kembali ke Login
        </button>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow Premium */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[140px] opacity-15 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-[#C5A059] rounded-full blur-[120px] opacity-20 pointer-events-none" />

      {/* Suspense wajib digunakan untuk komponen client yang memakai useSearchParams di Next.js App Router */}
      <Suspense fallback={
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin relative z-10"></div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}