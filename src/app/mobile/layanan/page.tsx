"use client";

import { motion, Variants } from "framer-motion";
import { Plane, Ship, ShieldAlert, Key, Globe2, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export default function MobileLayananPage() {
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
      desc: "Pengiriman kontainer ekonomis untuk barang berkapasitas besar. Ideal untuk pelaku ritel maupun korporat.",
      badge: "Hemat Biaya",
      color: "from-emerald-400 to-emerald-600",
      glow: "bg-emerald-500/10"
    },
    {
      icon: ShieldAlert,
      title: "Customs Clearance & Pabean",
      desc: "Tim ahli kami menangani seluruh kepengurusan dokumen, pajak, dan regulasi agar barang Anda lolos tanpa hambatan.",
      badge: "100% Legalitas",
      color: "from-[#9A242B] to-[#7A171D]",
      glow: "bg-[#7A171D]/10"
    },
    {
      icon: Key,
      title: "Pergudangan & Drop Point",
      desc: "Fasilitas penyimpanan aman di jaringan gudang mitra global kami sebelum dikonsolidasikan dan dikirim.",
      badge: "Fasilitas Aman",
      color: "from-amber-400 to-amber-600",
      glow: "bg-amber-500/10"
    }
  ];

  const destinations = [
    { country: "Singapura", time: "2-4 Hari", via: "Udara/Laut" },
    { country: "Malaysia", time: "3-5 Hari", via: "Udara/Laut" },
    { country: "Taiwan", time: "4-6 Hari", via: "Udara" },
    { country: "Australia", time: "5-7 Hari", via: "Udara/Laut" },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex flex-col space-y-8 px-4 w-full">
      
      {/* HEADER SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="text-left mt-4 relative z-10"
      >
        <Badge variant="brand" className="mb-4 px-3 py-1.5 text-[9px] shadow-sm bg-white border-[#7A171D]/20">
          Layanan Premium Flash Global
        </Badge>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
          Menghubungkan <br /> Bisnis Anda <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9A242B] via-[#7A171D] to-[#C5A059]">Ke Seluruh Dunia.</span>
        </h1>
        <p className="text-slate-500 text-sm font-medium leading-relaxed">
          Kami menyediakan ekosistem logistik terintegrasi untuk memastikan rantai pasok perdagangan internasional Anda berjalan tanpa kendala.
        </p>
      </motion.div>

      {/* CORE SERVICES LIST */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
        {coreServices.map((service, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="glass-card p-5 rounded-[2rem] flex items-start gap-4 relative overflow-hidden border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
          >
            <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-40 pointer-events-none", service.glow)}></div>

            <div className={cn("w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 border border-white shadow-sm relative z-10 bg-gradient-to-br", service.color)}>
              <service.icon className="w-5 h-5 text-white drop-shadow-md" />
            </div>
            
            <div className="space-y-1.5 relative z-10 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight">{service.title}</h3>
              </div>
              <Badge variant="glass" className="text-[8px] px-2 py-0.5 shadow-none border-slate-200 bg-white/80 text-slate-600 uppercase tracking-widest">{service.badge}</Badge>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">{service.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* DESTINATIONS (APPLE GROUPED LIST) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm mt-4"
      >
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <Globe2 className="w-4 h-4 text-[#C5A059]" /> Estimasi Jalur Reguler
          </h3>
        </div>
        
        <div className="divide-y divide-slate-100">
          {destinations.map((dest, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="font-bold text-sm text-slate-800">{dest.country}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-[#7A171D] flex items-center justify-end gap-1"><Clock className="w-3 h-3" /> {dest.time}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{dest.via}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA CARD (DARK) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
        className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-[2rem] p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden"
      >
        <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-[#C5A059] rounded-full blur-[60px] opacity-20 pointer-events-none z-0"></div>

        <div className="relative z-10 mb-6">
          <h3 className="text-xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-300">Mulai Pengiriman?</h3>
          <p className="text-slate-400 text-xs font-medium leading-relaxed">
            Dapatkan penawaran tarif pengiriman internasional terbaik hari ini secara real-time.
          </p>
        </div>
        
        <Link href="/forwarding/quote" className="relative z-10 w-full h-14 bg-gradient-to-b from-[#DFBE7B] to-[#C5A059] text-slate-900 font-black rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform text-sm uppercase tracking-wider shadow-md border border-[#A68345] tap-highlight-transparent">
          Buka Kalkulator <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>

    </div>
  );
}