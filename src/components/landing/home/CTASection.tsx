"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Headphones } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[2.5rem] bg-[#0a0a0a] border border-white/10 shadow-2xl px-6 py-16 md:py-24 text-center flex flex-col items-center justify-center isolate"
      >
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute -top-[30%] -left-[10%] w-[60%] h-[150%] bg-brand-maroon/40 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute -bottom-[30%] -right-[10%] w-[60%] h-[150%] bg-brand-gold/20 rounded-full blur-[120px] mix-blend-screen" />
        </div>
        
        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-brand-gold text-sm font-semibold mb-8 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          Mulai Langkah Pertama Anda
        </span>

        <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 text-balance max-w-4xl tracking-tight leading-[1.1]">
          Transformasi Ekosistem Logistik Anda <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-gold-dark">Dimulai Hari Ini.</span>
        </h2>

        <p className="text-lg text-slate-300 mb-12 max-w-2xl text-balance leading-relaxed">
          Bergabunglah dengan platform yang menghubungkan ritel, klien B2B, dan vendor armada dalam satu pusat kendali pintar berteknologi <em>Live Tracking</em>.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
          {/* 🚀 REVISI: Mengubah /client/register menjadi /register */}
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white bg-brand-maroon shadow-[0_0_30px_rgba(122,23,29,0.5)] hover:shadow-[0_0_50px_rgba(122,23,29,0.8)] hover:bg-brand-maroon-light hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Buat Akun Gratis <ArrowRight className="w-5 h-5" />
          </Link>
          
          <Link
            href="/contact"
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/40 backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Headphones className="w-5 h-5" /> Hubungi Sales
          </Link>
        </div>

      </motion.div>
    </section>
  );
}