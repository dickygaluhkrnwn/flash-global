"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function MobileTrackingSearchPage() {
  const [resi, setResi] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resi.trim()) return;

    setIsLoading(true);
    
    // Murni mengarah ke URL public tracking
    setTimeout(() => {
      router.push(`/tracking/${resi.trim()}`);
    }, 600);
  };

  return (
    <div className="flex flex-col items-center w-full px-4 pt-8">
      
      {/* ==========================================
          HERO SECTION (SIMPLIFIED FOR MOBILE)
          ========================================== */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }} 
        className="w-full text-center mt-6 mb-8 relative z-10"
      >
        <div className="w-14 h-14 bg-gradient-to-br from-[#9A242B] to-[#7A171D] rounded-[1.25rem] flex items-center justify-center mx-auto mb-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_20px_rgba(122,23,29,0.3)] border border-[#5A0E13]">
          <MapPin className="w-6 h-6 text-white drop-shadow-md" />
        </div>
        
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
          Lacak <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFBE7B] to-[#C5A059]">Kargo.</span>
        </h1>
        
        <p className="text-xs text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed">
          Masukkan Nomor Resi (AWB) atau ID Pesanan untuk memantau pergerakan logistik Anda.
        </p>
      </motion.div>

      {/* ==========================================
          SEARCH BAR (MOBILE OPTIMIZED)
          ========================================== */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full relative z-20"
      >
        <form onSubmit={handleSearch} className="relative w-full group">
          
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-20">
            <Package className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors duration-300" />
          </div>
          
          <input 
            type="text" 
            value={resi}
            onChange={(e) => setResi(e.target.value)}
            placeholder="Ketik FGL-192837..." 
            className="w-full pl-12 pr-[100px] py-4 rounded-[1.25rem] border border-white shadow-[0_8px_30px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(255,255,255,0.8)] focus:border-[#7A171D]/50 focus:ring-2 focus:ring-[#7A171D]/15 outline-none transition-all duration-300 bg-white/80 backdrop-blur-md text-sm font-black text-slate-900 placeholder-slate-400 relative z-10"
            required
          />
          
          <button 
            type="submit" 
            disabled={isLoading || !resi.trim()}
            className="absolute right-2 top-2 bottom-2 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white font-black px-5 rounded-xl flex items-center justify-center transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_10px_rgba(122,23,29,0.3)] border border-[#5A0E13] disabled:opacity-60 disabled:scale-100 active:scale-90 z-20 tap-highlight-transparent"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-[2px] border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <ArrowRight className="w-5 h-5 drop-shadow-sm" />
            )}
          </button>
        </form>
      </motion.div>

      {/* ==========================================
          INFO PANEL
          ========================================== */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full mt-12 bg-white/60 backdrop-blur-md p-5 rounded-[2rem] border border-white shadow-sm flex items-start gap-4 relative z-10"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight mb-1">Aman & Terenkripsi</h3>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            Data pelacakan hanya bisa diakses menggunakan ID Transaksi unik yang diterbitkan secara resmi oleh sistem kami.
          </p>
        </div>
      </motion.div>

    </div>
  );
}