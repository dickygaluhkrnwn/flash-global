"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Package, ArrowRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function TrackingSearchPage() {
  const [resi, setResi] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resi.trim()) return;

    setIsLoading(true);
    // Simulasi loading sebelum pindah ke halaman detail resi
    setTimeout(() => {
      router.push(`/tracking/${resi.trim()}`);
    }, 800);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center pt-24 px-6 relative overflow-hidden">
      {/* Background Ornamen */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#7A171D] rounded-full blur-[150px] opacity-5 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl w-full text-center z-10"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-[#7A171D] to-[#5A0E13] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#7A171D]/20">
          <Search className="w-8 h-8 text-[#C5A059]" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          Lacak Paket Anda
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          Masukkan nomor resi (AWB) Flash Global Anda untuk memantau status pengiriman internasional secara real-time.
        </p>

        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
            <input 
              type="text" 
              value={resi}
              onChange={(e) => setResi(e.target.value)}
              placeholder="Contoh: FG-9831A-SG" 
              className="w-full pl-16 pr-40 py-6 rounded-3xl border-2 border-white shadow-xl shadow-[#7A171D]/5 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none transition-all bg-white text-lg font-bold text-gray-800 placeholder-gray-400"
              required
            />
            <button 
              type="submit" 
              disabled={isLoading}
              className="absolute right-3 top-3 bottom-3 bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-8 rounded-2xl flex items-center gap-2 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Lacak <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </form>

        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm font-semibold text-gray-500">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
            <ShieldCheck className="w-4 h-4 text-green-500" /> Data Aman & Terenkripsi
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
            <MapPin className="w-4 h-4 text-[#C5A059]" /> Update Real-time
          </div>
        </div>
      </motion.div>
    </main>
  );
}