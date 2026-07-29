"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  MapPin, Package, ArrowRight, ShieldCheck, 
  Globe2, Activity, Star 
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils"; // <-- BUG FIX: Import yang tertinggal ditambahkan di sini

export default function TrackingSearchPage() {
  const [resi, setResi] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resi.trim()) return;

    setIsLoading(true);
    
    // Murni mengarah ke URL public tracking (App Router akan mendeteksi folder [resi])
    // Tanpa toUpperCase() agar ID case-sensitive aman dilempar ke URL
    setTimeout(() => {
      router.push(`/tracking/${resi.trim()}`);
    }, 600);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex flex-col items-center pt-20 lg:pt-28 px-6 relative overflow-hidden font-sans pb-24 z-0">
      
      {/* === AMBIENT GLOWING BACKGROUND === */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vh] bg-[#7A171D]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[50vh] bg-[#C5A059]/15 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none mix-blend-multiply"></div>
      </div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-[1200px] w-full z-10 flex flex-col items-center"
      >
        {/* ==========================================
            HERO SECTION
            ========================================== */}
        <motion.div variants={itemVariants} className="max-w-3xl w-full text-center mt-4 md:mt-10">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tighter mb-6 leading-[1.1]">
            Lacak <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9A242B] via-[#7A171D] to-[#C5A059]">Pengiriman</span>
          </h1>
          
          <p className="text-base md:text-lg text-slate-500 mb-12 font-medium max-w-xl mx-auto leading-relaxed">
            Masukkan Nomor Resi (AWB) atau ID Transaksi untuk memantau pergerakan kargo Anda secara <span className="text-slate-800 font-bold">real-time</span> dari satelit.
          </p>

          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-20 group">
            {/* Ambient Glow di belakang Search Bar saat di-hover/focus */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#7A171D]/20 to-[#C5A059]/20 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>

            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-8 flex items-center pointer-events-none z-20">
                <Package className="w-7 h-7 text-slate-400 group-focus-within:text-[#7A171D] transition-colors duration-300" />
              </div>
              <input 
                type="text" 
                value={resi}
                onChange={(e) => setResi(e.target.value)}
                placeholder="Contoh: FGL-192837 atau fNZ7M5..." 
                className="w-full pl-20 pr-[8.5rem] md:pr-48 py-6 md:py-7 rounded-[2.5rem] border border-white shadow-[0_15px_40px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(255,255,255,0.8)] focus:border-[#7A171D]/50 focus:ring-[4px] focus:ring-[#7A171D]/15 outline-none transition-all duration-300 bg-white/80 backdrop-blur-xl text-lg md:text-xl font-black text-slate-900 placeholder-slate-400 relative z-10"
                required
              />
              <button 
                type="submit" 
                disabled={isLoading || !resi.trim()}
                className="absolute right-3 top-3 bottom-3 bg-gradient-to-b from-[#9A242B] to-[#7A171D] hover:from-[#7A171D] hover:to-[#5A0E13] border border-[#5A0E13] text-white font-black px-6 md:px-10 rounded-[2rem] flex items-center justify-center gap-2.5 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_20px_rgba(122,23,29,0.3)] disabled:opacity-60 disabled:cursor-not-allowed group/btn active:scale-95 z-20 text-sm md:text-base uppercase tracking-widest"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="hidden md:inline">Lacak</span>
                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform duration-300 drop-shadow-sm" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* ==========================================
            ENTERPRISE FEATURES GRID (BENTO BOX)
            ========================================== */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full max-w-5xl mb-16">
          <FeatureCard 
            icon={MapPin} 
            color="text-[#C5A059]" 
            bg="from-[#C5A059] to-[#DFBE7B]" 
            title="Radar Satelit Presisi" 
            desc="Terintegrasi langsung dengan API Mapbox untuk memantau pergerakan armada secara visual dan akurat."
          />
          <FeatureCard 
            icon={ShieldCheck} 
            color="text-[#7A171D]" 
            bg="from-[#9A242B] to-[#7A171D]" 
            title="Sistem Manifes Aman" 
            desc="Perpindahan logistik divalidasi dengan pencatatan waktu (timestamp) transparan dan anti-manipulasi."
          />
          <FeatureCard 
            icon={Globe2} 
            color="text-emerald-600" 
            bg="from-emerald-500 to-emerald-600" 
            title="Jangkauan Global" 
            desc="Mendukung pelacakan kargo internasional dan domestik dalam satu ekosistem portal terpadu."
          />
        </motion.div>

        {/* ==========================================
            SOCIAL PROOF BANNER (GLASS PILL)
            ========================================== */}
        <motion.div variants={itemVariants} className="w-full max-w-4xl glass-card rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 border border-white shadow-[0_10px_30px_rgba(0,0,0,0.03),inset_0_2px_4px_rgba(255,255,255,0.8)] relative overflow-hidden">
          
          <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-slate-200/50 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex items-center gap-5 relative z-10">
            <div className="flex -space-x-3 shrink-0">
              <div className="w-12 h-12 rounded-full border-[3px] border-white shadow-sm bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-xs">B2B</div>
              <div className="w-12 h-12 rounded-full border-[3px] border-white shadow-sm bg-gradient-to-br from-[#9A242B] to-[#7A171D] flex items-center justify-center text-white font-black text-xs">FGL</div>
              <div className="w-12 h-12 rounded-full border-[3px] border-white shadow-sm bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] flex items-center justify-center text-white font-black text-xs">ID</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-400 mb-1 drop-shadow-sm">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-xs md:text-sm font-bold text-slate-500 tracking-wide">Dipercaya oleh <span className="text-slate-900 font-black">1.200+</span> Perusahaan B2B</p>
            </div>
          </div>

          <div className="hidden md:block w-px h-12 bg-slate-200/60 relative z-10"></div>

          <div className="flex items-center gap-3 text-sm font-black text-slate-700 tracking-tight relative z-10 bg-white/60 px-5 py-3 rounded-2xl border border-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
            <Activity className="w-5 h-5 text-emerald-500 drop-shadow-sm" />
            Sistem Engine 99.9% Uptime
          </div>
        </motion.div>

      </motion.div>
    </main>
  );
}

// ==========================================
// Sub-Komponen Kartu Fitur Promosional
// ==========================================
function FeatureCard({ icon: Icon, color, bg, title, desc }: { icon: React.ElementType, color: string, bg: string, title: string, desc: string }) {
  return (
    <div className="glass-card p-8 rounded-[2.5rem] border border-white shadow-[0_10px_30px_rgba(0,0,0,0.03),inset_0_2px_4px_rgba(255,255,255,0.8)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 text-left group relative overflow-hidden">
      
      {/* Inner Ambient Glow on Hover */}
      <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none", color.replace('text-', 'bg-'))} />

      <div className={cn("w-14 h-14 rounded-[1.25rem] bg-gradient-to-br flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_10px_rgba(0,0,0,0.1)] relative z-10", bg)}>
        <Icon className="w-6 h-6 text-white drop-shadow-sm" />
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight relative z-10">{title}</h3>
      <p className="text-sm text-slate-500 font-medium leading-relaxed relative z-10">{desc}</p>
    </div>
  );
} 