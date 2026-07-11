"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, MapPin, Package, ArrowRight, ShieldCheck, 
  Truck, Globe2, Activity, CheckCircle2, Star 
} from "lucide-react";
import { motion, Variants } from "framer-motion";

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
    <main className="min-h-screen bg-slate-50 flex flex-col items-center pt-20 lg:pt-28 px-6 relative overflow-hidden font-sans pb-20">
      
      {/* Background Ornamen Premium & Map Grid */}
      <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.04] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none mix-blend-multiply"></div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-[1200px] w-full z-10 flex flex-col items-center"
      >
        {/* HERO SECTION */}
        <motion.div variants={itemVariants} className="max-w-3xl w-full text-center mt-4 md:mt-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mb-5 leading-[1.15]">
            Lacak <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Pengiriman</span>
          </h1>
          
          <p className="text-base md:text-lg text-slate-500 mb-10 font-medium max-w-xl mx-auto leading-relaxed">
            Masukkan Nomor Resi (AWB) atau ID Transaksi untuk memantau status kargo Anda secara real-time.
          </p>

          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-16">
            <div className="relative flex items-center group">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Package className="w-6 h-6 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
              </div>
              <input 
                type="text" 
                value={resi}
                onChange={(e) => setResi(e.target.value)}
                placeholder="Contoh: FGL-192837 atau fNZ7M5..." 
                className="w-full pl-16 pr-32 md:pr-40 py-5 md:py-6 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none transition-all bg-white/90 backdrop-blur-md text-base md:text-lg font-bold text-slate-900 placeholder-slate-400"
                required
              />
              <button 
                type="submit" 
                disabled={isLoading || !resi.trim()}
                className="absolute right-3 top-3 bottom-3 bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-6 md:px-8 rounded-[1.5rem] flex items-center justify-center gap-2 transition-all shadow-md shadow-[#7A171D]/20 disabled:opacity-50 disabled:cursor-not-allowed group/btn active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="hidden md:inline">Lacak</span>
                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* ENTERPRISE FEATURES GRID */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-16">
          <FeatureCard 
            icon={MapPin} 
            color="text-[#C5A059]" 
            bg="bg-[#C5A059]/10" 
            title="Radar Satelit Presisi" 
            desc="Terintegrasi langsung dengan API Mapbox untuk memantau pergerakan armada darat secara visual dan akurat."
          />
          <FeatureCard 
            icon={ShieldCheck} 
            color="text-[#7A171D]" 
            bg="bg-[#7A171D]/10" 
            title="Sistem Manifes Aman" 
            desc="Seluruh perpindahan logistik divalidasi dengan pencatatan waktu (timestamp) yang transparan dan tidak dapat dimanipulasi."
          />
          <FeatureCard 
            icon={Globe2} 
            color="text-emerald-600" 
            bg="bg-emerald-50" 
            title="Jangkauan Global" 
            desc="Mendukung pelacakan kargo internasional dan domestik dalam satu ekosistem portal terpadu."
          />
        </motion.div>

        {/* SOCIAL PROOF BANNER */}
        <motion.div variants={itemVariants} className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">B2B</div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-[#7A171D] flex items-center justify-center text-white font-bold text-xs">FGL</div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-[#C5A059] flex items-center justify-center text-white font-bold text-xs">ID</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-400 mb-0.5">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-xs font-bold text-slate-600">Dipercaya oleh <span className="text-slate-900">1.200+</span> Perusahaan B2B</p>
            </div>
          </div>
          <div className="hidden md:block w-px h-10 bg-slate-200"></div>
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Activity className="w-5 h-5 text-emerald-500" />
            Sistem Engine 99.9% Uptime
          </div>
        </motion.div>

      </motion.div>
    </main>
  );
}

// Sub-Komponen Kartu Fitur Promosional
function FeatureCard({ icon: Icon, color, bg, title, desc }: { icon: any, color: string, bg: string, title: string, desc: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-left group">
      <div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 border border-slate-100`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}