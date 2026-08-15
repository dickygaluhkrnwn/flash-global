"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion"; 
import { 
  ArrowRight, 
  Monitor, 
  Smartphone, 
  Navigation, 
  Building2 
} from "lucide-react";

// ==========================================
// DATA 4 PILAR APLIKASI
// ==========================================
const PILLARS = [
  { 
    id: "client-web", 
    title: "Client Portal", 
    icon: Monitor, 
    badge: "B2B Web", 
    desc: "Manajemen kasbon B2B, quote kargo forwarding, dan invoice otomatis." 
  },
  { 
    id: "client-app", 
    title: "Retail App", 
    icon: Smartphone, 
    badge: "iOS & Android", 
    desc: "Booking kurir instan, multi-drop routing, dan pantau Live POD." 
  },
  { 
    id: "driver-app", 
    title: "Driver App", 
    icon: Navigation, 
    badge: "Mitra Driver", 
    desc: "Smart radar bidding, tracking GPS, dan pencairan DANA instan." 
  },
  { 
    id: "fleet-web", 
    title: "Fleet Manager", 
    icon: Building2, 
    badge: "Vendor Web", 
    desc: "Pantau koordinat truk, kelola supir, dan bagi hasil komisi otomatis." 
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.7, 
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number] 
    } 
  },
};

export default function HeroSection() {
  return (
    <section className="relative pt-32 lg:pt-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center max-w-4xl"
      >
        <motion.div variants={itemVariants} className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-brand-maroon/20 text-brand-maroon text-sm font-semibold shadow-premium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-maroon opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-maroon"></span>
            </span>
            Platform Logistik Ekosistem Tertutup Generasi Baru
          </span>
        </motion.div>

        <motion.h1 variants={itemVariants} className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 text-balance leading-[1.1]">
          Kendalikan Distribusi dengan <span className="text-gradient-brand">Kepastian Presisi.</span>
        </motion.h1>

        <motion.p variants={itemVariants} className="text-lg sm:text-xl text-foreground-muted mb-10 max-w-2xl text-balance leading-relaxed">
          Dari pengiriman retail multi-drop hingga manajemen armada korporat skala besar. Satu ekosistem logistik cerdas, dipecah dalam 4 portal khusus untuk Anda.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 mb-20 w-full sm:w-auto">
          {/* 🚀 REVISI: Mengubah /client/register menjadi /register */}
          <Link 
            href="/register" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-medium text-white bg-brand-maroon shadow-premium hover:shadow-[0_0_30px_rgba(122,23,29,0.4)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Mulai Kirim Sekarang <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="/solutions" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-medium text-foreground glass-panel hover:bg-slate-50 transition-all duration-300 flex items-center justify-center"
          >
            Pelajari Ekosistem Kami
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 relative">
          <div className="hidden lg:block absolute top-1/2 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent -z-10" />

          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.id} className="glass-bento p-6 rounded-2xl flex flex-col text-left group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-brand-maroon/10 to-brand-gold/10 text-brand-maroon group-hover:scale-110 group-hover:bg-brand-maroon group-hover:text-white transition-all duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100/80 border border-slate-200 text-xs font-semibold text-slate-600">
                    {pillar.badge}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-lg text-foreground mb-2">
                  {pillar.title}
                </h3>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </motion.div>

      </motion.div>
    </section>
  );
}