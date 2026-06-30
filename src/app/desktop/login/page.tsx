"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function DesktopLoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulasi loading UI untuk presentasi klien
    setTimeout(() => {
      setIsLoading(false);
      // Logika integrasi Firebase Auth akan diletakkan di sini pada fase berikutnya
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Accents (Sesuai palet Flash Global) */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#7A171D] rounded-full blur-[120px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[100px] opacity-15 pointer-events-none" />

      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl shadow-[#7A171D]/5 flex overflow-hidden z-10 relative min-h-[600px]">
        
        {/* Sisi Kiri - Branding (Hanya muncul di Desktop) */}
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
            {/* LINK REVISI: Mengarah langsung ke / */}
            <Link href="/" className="text-sm text-gray-500 hover:text-[#7A171D] transition-colors font-semibold flex items-center gap-2">
              &larr; Kembali ke Beranda
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? "Selamat Datang" : "Buat Akun Baru"}
            </h2>
            <p className="text-gray-500">
              {isLogin 
                ? "Silakan masuk untuk mengelola pengiriman Anda." 
                : "Daftar sekarang untuk mempermudah proses logistik."}
            </p>
          </div>

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
              {/* Field Nama Lengkap (Hanya untuk Register) */}
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Nama Lengkap</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Masukkan nama lengkap" 
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              {/* Field Email */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input 
                    type="email" 
                    placeholder="contoh@email.com" 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50"
                    required
                  />
                </div>
              </div>

              {/* Field Password */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#7A171D] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Lupa Password Link (Hanya untuk Login) */}
              {isLogin && (
                <div className="flex justify-end">
                  <button type="button" className="text-sm font-semibold text-[#C5A059] hover:text-[#7A171D] transition-colors">
                    Lupa Password?
                  </button>
                </div>
              )}

              {/* Tombol Submit */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#7A171D]/30 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
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

          {/* Toggle Login/Register */}
          <div className="mt-8 text-center text-sm text-gray-600">
            {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-bold text-[#7A171D] hover:text-[#C5A059] transition-colors"
            >
              {isLogin ? "Daftar di sini" : "Masuk di sini"}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}