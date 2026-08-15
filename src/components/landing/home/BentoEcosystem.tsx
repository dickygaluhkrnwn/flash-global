"use client";

import { motion, Variants } from "framer-motion";
import { 
  MapPin, 
  CreditCard, 
  Radar, 
  Truck, 
  CheckCircle2, 
  Activity 
} from "lucide-react";

// Konfigurasi Animasi saat di-scroll (Fade up)
const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.7, 
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number] 
    } 
  }
};

export default function BentoEcosystem() {
  return (
    <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* ==========================================
          SECTION HEADER
          ========================================== */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpVariants}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-6">
          Satu Ekosistem. <span className="text-gradient-brand">Tanpa Batas.</span>
        </h2>
        <p className="text-lg text-foreground-muted text-balance">
          Bukan sekadar aplikasi pengiriman biasa. Kami merancang arsitektur logistik yang mengotomatisasi setiap lapisan bisnis Anda dari hulu ke hilir.
        </p>
      </motion.div>

      {/* ==========================================
          BENTO GRID LAYOUT
          Menggunakan CSS Grid asimetris (3 kolom di Desktop)
          ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* 1. BENTO MULTI-DROP (Besar - 2 Kolom) */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUpVariants}
          className="glass-bento rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group col-span-1 md:col-span-2"
        >
          {/* Abstract UI Mockup */}
          <div className="relative h-48 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-maroon/5 to-transparent rounded-2xl border border-white/40" />
            
            {/* Visualisasi Rute Multi-drop */}
            <div className="relative z-10 w-full max-w-sm flex flex-col gap-3">
              {[
                { label: "Gudang Utama", status: "origin" },
                { label: "Drop 1: SCBD", status: "done" },
                { label: "Drop 2: Kemang", status: "active" },
              ].map((step, idx) => (
                <div key={idx} className="glass-panel p-3 rounded-xl flex items-center gap-4 transform transition-transform group-hover:translate-x-2" style={{ transitionDelay: `${idx * 100}ms` }}>
                  <div className="relative">
                    {step.status === 'active' ? (
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-maroon opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-maroon"></span>
                      </span>
                    ) : (
                      <div className={`w-3 h-3 rounded-full ${step.status === 'done' ? 'bg-brand-gold' : 'bg-slate-300'}`} />
                    )}
                    {idx !== 2 && <div className="absolute top-3 left-1.5 w-px h-6 bg-slate-200" />}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{step.label}</span>
                  {step.status === 'done' && <CheckCircle2 className="w-4 h-4 text-brand-gold ml-auto" />}
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3 text-brand-maroon">
              <MapPin className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Retail & E-Commerce</span>
            </div>
            <h3 className="font-heading text-2xl font-bold text-foreground mb-2">Multi-Drop & Live e-POD</h3>
            <p className="text-foreground-muted text-sm leading-relaxed max-w-md">
              Kirim hingga puluhan paket dalam satu resi perjalanan. Lacak pergerakan kurir secara real-time lengkap dengan bukti foto serah terima barang (e-POD).
            </p>
          </div>
        </motion.div>

        {/* 2. BENTO KASBON B2B (1 Kolom) */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUpVariants}
          className="glass-bento rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group col-span-1"
        >
          <div className="relative h-48 mb-8 flex items-center justify-center">
            {/* Visualisasi Credit Limit */}
            <div className="glass-panel w-full p-5 rounded-2xl border border-white/60 shadow-sm relative overflow-hidden group-hover:-translate-y-2 transition-transform duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 rounded-full filter blur-2xl -mr-10 -mt-10" />
              <div className="flex justify-between items-center mb-6">
                <CreditCard className="w-6 h-6 text-brand-gold" />
                <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md">APPROVED</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-1">Limit Tempo B2B</p>
              <h4 className="font-mono text-2xl font-bold text-slate-800">Rp 50.000.000</h4>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                <div className="bg-gradient-to-r from-brand-maroon to-brand-gold h-full w-[35%]" />
              </div>
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">Kirim Dulu, Bayar Nanti</h3>
            <p className="text-foreground-muted text-sm leading-relaxed">
              Fasilitas kasbon otomatis untuk korporasi. Kumpulkan ratusan resi pengiriman Anda, lalu bayar sekaligus dengan satu invoice bulanan.
            </p>
          </div>
        </motion.div>

        {/* 3. BENTO SMART RADAR (1 Kolom) */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUpVariants}
          className="glass-bento rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group col-span-1"
        >
          <div className="relative h-48 mb-8 flex items-center justify-center">
            {/* Visualisasi Radar */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 border border-brand-maroon/20 rounded-full animate-[ping_3s_ease-out_infinite]" />
              <div className="absolute inset-4 border border-brand-maroon/40 rounded-full animate-[ping_3s_ease-out_infinite_1s]" />
              <div className="w-12 h-12 bg-brand-maroon text-white rounded-full flex items-center justify-center shadow-lg z-10">
                <Radar className="w-6 h-6" />
              </div>
              {/* Fake Order dots */}
              <div className="absolute top-2 right-4 w-3 h-3 bg-brand-gold rounded-full shadow-[0_0_10px_#C5A059]" />
              <div className="absolute bottom-4 left-2 w-2 h-2 bg-brand-gold rounded-full shadow-[0_0_10px_#C5A059]" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">Smart Radar Driver</h3>
            <p className="text-foreground-muted text-sm leading-relaxed">
              Algoritma geofencing memastikan mitra driver hanya menerima penawaran order yang relevan dengan lokasi dan kapasitas muatan.
            </p>
          </div>
        </motion.div>

        {/* 4. BENTO FLEET MANAGER (Besar - 2 Kolom) */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUpVariants}
          className="glass-bento rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group col-span-1 md:col-span-2"
        >
          <div className="relative h-48 mb-8 flex items-center justify-center">
             <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-transparent rounded-2xl border border-white/40" />
             
             {/* Visualisasi Dashboard Fleet */}
             <div className="relative z-10 w-full max-w-md grid grid-cols-2 gap-4">
                <div className="glass-panel p-4 rounded-xl flex flex-col gap-2 group-hover:-translate-y-1 transition-transform">
                  <div className="flex justify-between items-center text-slate-500">
                    <Truck className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Armada Aktif</span>
                  </div>
                  <span className="text-3xl font-heading font-bold text-slate-800">24<span className="text-sm text-slate-400 font-sans ml-1">/30</span></span>
                </div>
                <div className="glass-panel p-4 rounded-xl flex flex-col gap-2 group-hover:-translate-y-1 transition-transform delay-75">
                  <div className="flex justify-between items-center text-brand-maroon">
                    <Activity className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Total Revenue</span>
                  </div>
                  <span className="text-xl font-mono font-bold text-brand-maroon">Rp 128.4M</span>
                </div>
             </div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3 text-slate-600">
              <Truck className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Fleet Vendor System</span>
            </div>
            <h3 className="font-heading text-2xl font-bold text-foreground mb-2">Control Tower untuk Armada Anda</h3>
            <p className="text-foreground-muted text-sm leading-relaxed max-w-md">
              Portal khusus bagi pengusaha angkutan. Kelola data puluhan truk, delegasikan order ke supir anak buah, dan pantau pembagian hasil komisi secara terpusat dan transparan.
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}