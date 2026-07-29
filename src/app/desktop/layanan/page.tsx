"use client";

import { motion, Variants } from "framer-motion";
import { Plane, Ship, ShieldAlert, Key, Globe2, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export default function LayananKamiPage() {
  const coreServices = [
    {
      icon: Plane,
      title: "Kargo Udara Internasional",
      desc: "Solusi pengiriman ekspres untuk paket krusial Anda. Estimasi 3-5 hari kerja sampai ke alamat tujuan dengan prioritas utama.",
      badge: "Paling Cepat",
      color: "from-blue-400 to-blue-600",
      glow: "bg-blue-500/10"
    },
    {
      icon: Ship,
      title: "Kargo Laut (LCL & FCL)",
      desc: "Pengiriman kontainer ekonomis untuk barang berkapasitas besar. Ideal untuk pelaku bisnis ekspor-impor ritel maupun korporat.",
      badge: "Hemat Biaya",
      color: "from-emerald-400 to-emerald-600",
      glow: "bg-emerald-500/10"
    },
    {
      icon: ShieldAlert,
      title: "Customs Clearance & Pabean",
      desc: "Tim ahli kami menangani seluruh kepengurusan dokumen kepabeanan, pajak impor, dan regulasi agar barang Anda lolos tanpa hambatan.",
      badge: "100% Legalitas",
      color: "from-[#9A242B] to-[#7A171D]",
      glow: "bg-[#7A171D]/10"
    },
    {
      icon: Key,
      title: "Pergudangan & Drop Point",
      desc: "Fasilitas penyimpanan aman di jaringan gudang mitra global kami sebelum barang dikonsolidasikan dan dikirim ke alamat akhir.",
      badge: "Fasilitas Aman",
      color: "from-amber-400 to-amber-600",
      glow: "bg-amber-500/10"
    }
  ];

  const destinations = [
    { country: "Singapura", time: "2-4 Hari", via: "Udara & Laut" },
    { country: "Malaysia", time: "3-5 Hari", via: "Udara & Laut" },
    { country: "Taiwan", time: "4-6 Hari", via: "Udara" },
    { country: "Australia", time: "5-7 Hari", via: "Udara & Laut" },
  ];

  // BUG FIX: Menambahkan tipe 'Variants' agar TypeScript mengenali property transisinya
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] py-20 px-6 relative overflow-hidden font-sans pb-32 z-0">
      
      {/* === AMBIENT GLOWING BACKGROUND === */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-rose-200/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[50vh] bg-amber-100/40 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] left-[40%] w-[30vw] h-[30vh] bg-blue-100/30 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        
        {/* ==========================================
            HEADER SECTIONS
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-20 flex flex-col items-center"
        >
          <Badge variant="brand" className="mb-6 px-5 py-2 text-xs shadow-sm bg-white/80 backdrop-blur-md border-[#7A171D]/20">
            Layanan Premium Flash Global
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter mb-6 leading-[1.1]">
            Menghubungkan Bisnis Anda <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9A242B] via-[#7A171D] to-[#C5A059]">Ke Seluruh Penjuru Dunia.</span>
          </h1>
          <p className="text-slate-500 text-base md:text-lg font-medium leading-relaxed max-w-2xl text-balance">
            Kami menyediakan ekosistem logistik terintegrasi untuk memastikan rantai pasok perdagangan internasional Anda berjalan tanpa batas dan tanpa kendala.
          </p>
        </motion.div>

        {/* ==========================================
            CORE SERVICES GRID (BENTO BOX STYLE)
            ========================================== */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-8"
        >
          {coreServices.map((service, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="glass-card p-8 md:p-10 rounded-[2.5rem] flex flex-col sm:flex-row gap-6 items-start group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
            >
              {/* Ambient Glow per Kartu */}
              <div className={cn("absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none", service.glow)}></div>

              {/* 3D Icon Container */}
              <div className={cn("w-16 h-16 rounded-[1.25rem] flex items-center justify-center shrink-0 border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_16px_rgba(0,0,0,0.1)] group-hover:scale-110 transition-transform duration-500 relative z-10 bg-gradient-to-br", service.color)}>
                <service.icon className="w-7 h-7 text-white drop-shadow-md" />
              </div>
              
              <div className="space-y-3 relative z-10">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-[#7A171D] transition-colors">{service.title}</h3>
                </div>
                <Badge variant="glass" className="text-[9px] px-2.5 shadow-none border-slate-200/60 bg-white/60 text-slate-600">{service.badge}</Badge>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{service.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ==========================================
            BOTTOM SECTION: DESTINATIONS & CTA
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* Destinasi Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-8 glass-card rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-center"
          >
            <div className="border-b border-white pb-5 mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                <Globe2 className="w-6 h-6 text-[#C5A059]" /> Estimasi Pengiriman Jalur Reguler
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {destinations.map((dest, i) => (
                <div key={i} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/60 backdrop-blur-md border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] hover:shadow-md hover:bg-white transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="font-black text-slate-800">{dest.country}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#7A171D] flex items-center gap-1.5 justify-end tracking-tight"><Clock className="w-3.5 h-3.5" /> {dest.time}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{dest.via}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA Card (Dark 3D Premium) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="lg:col-span-4 bg-gradient-to-b from-slate-900 to-slate-950 rounded-[2.5rem] p-8 md:p-10 text-white shadow-[0_20px_40px_rgba(15,23,42,0.4)] border border-slate-800 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Ambient Glow Inner */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059] rounded-full blur-[100px] opacity-20 pointer-events-none z-0"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-[#7A171D] rounded-full blur-[80px] opacity-30 pointer-events-none z-0"></div>

            <div className="relative z-10 mb-8">
              <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-4 leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-300">Siap Melakukan Pengiriman?</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                Gunakan kalkulator instan kami untuk langsung mendapatkan penawaran tarif pengiriman terbaik hari ini.
              </p>
            </div>
            
            <Link 
              href="/forwarding/quote" 
              className="relative z-10 w-full h-14 px-6 bg-gradient-to-b from-[#DFBE7B] to-[#C5A059] hover:from-[#EAD098] hover:to-[#D2B270] text-slate-900 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_8px_20px_rgba(197,160,89,0.3)] border border-[#A68345] active:scale-95 text-sm uppercase tracking-wide group"
            >
              Buka Kalkulator <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

        </div>
      </div>
    </main>
  );
} 