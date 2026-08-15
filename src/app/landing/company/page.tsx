"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Target, 
  Lightbulb, 
  Globe2, 
  ShieldCheck,
  TrendingUp
} from "lucide-react";

export default function CompanyPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#fdfdfd] overflow-hidden selection:bg-brand-gold/30 selection:text-slate-900 font-sans text-slate-900">
      
      {/* ==========================================
          ULTRA-CLEAN AMBIENT BACKGROUND
          Hanya pendaran warna yang sangat tipis
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-rose-50/50 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vh] bg-amber-50/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vh] bg-slate-100/60 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full">
        
        {/* ==========================================
            1. EDITORIAL HERO SECTION
            Tipografi raksasa, bersih, tanpa kotak
            ========================================== */}
        <section className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center md:text-left flex flex-col md:flex-row items-end justify-between gap-12 border-b border-slate-200/50">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl"
          >
            <h1 className="font-heading text-6xl sm:text-7xl lg:text-[5.5rem] font-extrabold tracking-tighter leading-[1.05] text-slate-900 mb-6 text-balance">
              Membangun Ulang <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-maroon via-brand-maroon to-brand-gold">
                Nadi Logistik.
              </span>
            </h1>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="max-w-sm pb-4"
          >
            <p className="text-lg text-slate-500 leading-relaxed font-medium">
              Flash Global hadir bukan sekadar memindahkan barang. Kami mengorkestrasi ekosistem rantai pasok cerdas yang menghubungkan individu, korporasi, dan para penggerak roda ekonomi.
            </p>
          </motion.div>
        </section>

        {/* ==========================================
            2. FLOATING STATS (Kaca Mengambang)
            ========================================== */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[
              { num: "2M+", label: "Pengiriman Sukses" },
              { num: "50K+", label: "Mitra Pengemudi" },
              { num: "99.9%", label: "Uptime Sistem" },
              { num: "120+", label: "Kota Terjangkau" },
            ].map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="bg-white/40 backdrop-blur-2xl border border-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-center hover:bg-white/60 transition-colors"
              >
                <h3 className="text-4xl md:text-5xl font-black font-mono text-slate-900 tracking-tight mb-2">{stat.num}</h3>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ==========================================
            3. THE MANIFESTO (Visi & Misi)
            Teks Editorial murni dipadu Glass Panel lembut
            ========================================== */}
        <section className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="bg-white/30 backdrop-blur-3xl border border-white/80 rounded-[3rem] p-10 md:p-20 shadow-[0_20px_80px_rgb(0,0,0,0.03)] relative overflow-hidden">
            {/* Soft inner glow */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-gold/10 rounded-full blur-[100px]" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-maroon/5 rounded-full blur-[100px]" />
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-16">
              <div className="md:col-span-5">
                <div className="sticky top-32">
                  <span className="inline-block px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-widest mb-6">Manifesto Kami</span>
                  <h2 className="font-heading text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                    Teknologi Adalah Kunci, Manusia Adalah Hati.
                  </h2>
                </div>
              </div>
              <div className="md:col-span-7 space-y-12">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <Target className="w-6 h-6 text-brand-maroon" /> Misi Kami
                  </h3>
                  <p className="text-xl text-slate-600 leading-relaxed text-balance">
                    Menciptakan ekosistem logistik yang paling transparan dan efisien di Asia Tenggara. Kami percaya bahwa setiap pergerakan barang harus dapat dilacak, diprediksi, dan dipertanggungjawabkan.
                  </p>
                </div>
                <div className="h-px w-full bg-slate-200/50" />
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <Globe2 className="w-6 h-6 text-brand-gold" /> Visi Jangka Panjang
                  </h3>
                  <p className="text-xl text-slate-600 leading-relaxed text-balance">
                    Menjadi tulang punggung (*backbone*) infrastruktur logistik digital nasional. Menyatukan penjual individu, UMKM, hingga korporasi multinasional dalam satu jaringan pintar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            4. CORE VALUES (Nilai Perusahaan)
            List Minimalist, Bukan Kotak-Kotak
            ========================================== */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-heading text-4xl font-bold text-slate-900 mb-4">Nilai Inti Flash Global</h2>
            <p className="text-slate-500">Prinsip yang memandu setiap baris kode yang kami tulis dan setiap rute yang kami lalui.</p>
          </div>

          <div className="space-y-6">
            {[
              { icon: ShieldCheck, title: "Integritas & Keamanan", desc: "Data klien dan barang kiriman adalah privasi tingkat tinggi yang tidak bisa ditawar." },
              { icon: Lightbulb, title: "Inovasi Berkelanjutan", desc: "Kami tidak pernah puas dengan status quo. Selalu ada ruang untuk optimasi rute dan kode." },
              { icon: TrendingUp, title: "Tumbuh Bersama", desc: "Kesuksesan kami diukur dari seberapa besar kami membantu bisnis mitra untuk terus berkembang." }
            ].map((value, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 sm:p-8 rounded-[2rem] hover:bg-white/60 hover:backdrop-blur-xl border border-transparent hover:border-white transition-all duration-300 shadow-[0_0_0_transparent] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
              >
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 shrink-0 group-hover:bg-brand-maroon group-hover:text-white transition-colors duration-300">
                  <value.icon className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-2">{value.title}</h4>
                  <p className="text-slate-500 text-lg">{value.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ==========================================
            5. CLEAN CTA STRIP
            ========================================== */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto bg-white/50 backdrop-blur-2xl border border-white rounded-[3rem] p-12 sm:p-20 text-center shadow-[0_20px_60px_rgb(0,0,0,0.03)]"
          >
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Jadilah Bagian dari Sejarah Kami.
            </h2>
            <p className="text-lg text-slate-500 mb-10 max-w-xl mx-auto">
              Percayakan operasional logistik Anda pada ekosistem yang dirancang untuk masa depan.
            </p>
            {/* 🚀 MENUJU /login */}
            <Link 
              href="/login" 
              className="inline-flex px-8 py-4 rounded-xl font-bold text-white bg-slate-900 hover:bg-brand-maroon transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 duration-300 items-center gap-2"
            >
              Mulai Eksplorasi <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </section>

      </div>
    </div>
  );
}