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
    
    // REVISI: Routing murni ke URL Publik (tanpa /desktop)
    setTimeout(() => {
      router.push(`/tracking/${resi.trim().toUpperCase()}`);
    }, 800);
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex flex-col items-center pt-24 px-6 relative overflow-hidden selection:bg-brand-maroon selection:text-white">
      {/* Background Ornamen Premium */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-brand-maroon rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-brand-gold rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-overlay"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl w-full text-center z-10"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-brand-maroon to-brand-maroon-dark rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-maroon/20">
          <Search className="w-8 h-8 text-brand-gold" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          Lacak Paket <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-maroon to-brand-gold">Anda</span>
        </h1>
        <p className="text-lg text-gray-500 mb-10 font-medium">
          Masukkan Nomor Resi / AWB atau ID Order Flash Global Anda untuk memantau status pengiriman logistik secara real-time.
        </p>

        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Package className="w-6 h-6 text-brand-gold" />
            </div>
            <input 
              type="text" 
              value={resi}
              onChange={(e) => setResi(e.target.value)}
              placeholder="Contoh: FGL-019283 / FFW-81923" 
              className="w-full pl-16 pr-40 py-6 rounded-3xl border-2 border-white shadow-premium focus:border-brand-maroon focus:ring-4 focus:ring-brand-maroon/10 outline-none transition-all bg-white/80 backdrop-blur-md text-lg font-bold text-gray-800 placeholder-gray-400 uppercase"
              required
            />
            <button 
              type="submit" 
              disabled={isLoading}
              className="absolute right-3 top-3 bottom-3 bg-brand-maroon hover:bg-brand-maroon-dark text-white font-bold px-8 rounded-2xl flex items-center gap-2 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Lacak <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </div>
        </form>

        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm font-bold text-gray-500">
          <div className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full shadow-sm border border-gray-100">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Manifes Transparan
          </div>
          <div className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-full shadow-sm border border-gray-100">
            <MapPin className="w-4 h-4 text-brand-gold" /> Update Real-time Satelit
          </div>
        </div>
      </motion.div>
    </main>
  );
}