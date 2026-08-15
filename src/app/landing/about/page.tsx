"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Users, 
  Heart, 
  Rocket, 
  Globe2, 
  ArrowRight, 
  Sparkles,
  MapPin,
  Coffee
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#fdfdfc] overflow-hidden selection:bg-brand-maroon/20 selection:text-brand-maroon font-sans">
      
      {/* ==========================================
          ORGANIC AMBIENT BACKGROUND
          Cahaya pendaran yang bergerak secara visual
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[60vw] h-[60vh] bg-rose-50/80 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-amber-50/70 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[60vh] bg-blue-50/60 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full pt-32 pb-24">
        
        {/* ==========================================
            1. THE FROSTED LENS HERO
            Elemen membulat ekstrem dengan efek blur berat
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center justify-center text-center mb-32">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-5xl bg-white/30 backdrop-blur-3xl border border-white rounded-[4rem] sm:rounded-[6rem] p-12 sm:p-24 shadow-[0_30px_100px_rgba(0,0,0,0.04)] overflow-hidden"
          >
            {/* The "Lens" highlight */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-3/4 bg-white/40 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/60 border border-white/80 shadow-sm text-brand-maroon text-sm font-bold tracking-widest uppercase mb-8">
                <Sparkles className="w-4 h-4" /> Kisah Kami
              </div>
              
              <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 text-balance leading-[1.05]">
                Menghubungkan Titik, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-maroon via-rose-600 to-brand-gold">Mendekatkan Jarak.</span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-slate-500 max-w-3xl mx-auto text-balance leading-relaxed font-medium">
                Kami bukan sekadar perusahaan pengiriman. Flash Global adalah kumpulan inovator yang mendefinisikan ulang cara roda ekonomi dunia bergerak setiap harinya.
              </p>
            </div>
          </motion.div>
        </section>

        {/* ==========================================
            2. THE ORGANIC COLLAGE (Culture & People)
            Layout asimetris seperti galeri seni modern
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-32">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-bold text-slate-900">Di Balik Layar Flash Global</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[280px]">
            
            {/* Collage 1: Large Wide Kiri */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="md:col-span-8 bg-gradient-to-br from-brand-maroon/5 to-transparent backdrop-blur-2xl border border-white p-10 rounded-[3rem] shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-center relative overflow-hidden"
            >
              <div className="absolute right-[-10%] top-[-10%] text-brand-maroon/5">
                <Globe2 className="w-96 h-96" />
              </div>
              <div className="relative z-10 max-w-lg">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-brand-maroon shadow-sm mb-6">
                  <Globe2 className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-3xl font-bold text-slate-900 mb-4">Lahir dari Sebuah Keresahan.</h3>
                <p className="text-slate-600 text-lg leading-relaxed">
                  Semuanya bermula dari rasa frustrasi terhadap sistem logistik yang rumit dan tidak transparan. Kami membangun Flash Global dengan satu tujuan: Menyederhanakan rantai pasok untuk semua orang.
                </p>
              </div>
            </motion.div>

            {/* Collage 2: Small Square Kanan */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
              className="md:col-span-4 bg-white/60 backdrop-blur-2xl border border-white p-10 rounded-[3rem] shadow-sm hover:shadow-xl transition-shadow flex flex-col items-center justify-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-4xl font-black font-mono text-slate-900 mb-2">500+</h3>
              <p className="font-bold text-slate-500 uppercase tracking-widest text-sm">Tim Inti</p>
            </motion.div>

            {/* Collage 3: Small Square Kiri */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
              className="md:col-span-4 bg-white/60 backdrop-blur-2xl border border-white p-10 rounded-[3rem] shadow-sm hover:shadow-xl transition-shadow flex flex-col items-center justify-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-6">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-4xl font-black font-mono text-slate-900 mb-2">100%</h3>
              <p className="font-bold text-slate-500 uppercase tracking-widest text-sm">Dedikasi</p>
            </motion.div>

            {/* Collage 4: Large Wide Kanan */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}
              className="md:col-span-8 bg-gradient-to-tl from-brand-gold/10 to-transparent backdrop-blur-2xl border border-white p-10 rounded-[3rem] shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-center items-end text-right relative overflow-hidden"
            >
              <div className="absolute left-[-10%] bottom-[-10%] text-brand-gold/10">
                <Rocket className="w-96 h-96" />
              </div>
              <div className="relative z-10 max-w-lg flex flex-col items-end">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-brand-gold-dark shadow-sm mb-6">
                  <Rocket className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-3xl font-bold text-slate-900 mb-4">Budaya Kerja Kami.</h3>
                <p className="text-slate-600 text-lg leading-relaxed">
                  Kami membebaskan tim kami untuk bereksperimen. Inovasi tidak datang dari bilik kerja yang sempit, melainkan dari kolaborasi terbuka, kopi pagi, dan kemauan untuk mendobrak batas.
                </p>
              </div>
            </motion.div>

          </div>
        </section>

        {/* ==========================================
            3. HORIZONTAL PILL PANELS (Lokasi & Jejak)
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full bg-white/50 backdrop-blur-xl border border-white rounded-[4rem] p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.02)] gap-6"
          >
            <div className="flex items-center gap-6 px-6">
              <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-lg">
                <MapPin className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-heading text-xl font-bold text-slate-900">Markas Besar Kami</h4>
                <p className="text-slate-500 font-medium">Jakarta Selatan, Indonesia</p>
              </div>
            </div>
            
            <div className="hidden sm:block w-px h-16 bg-slate-200" />
            
            <div className="flex items-center gap-6 px-6">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-sm border border-amber-200">
                <Coffee className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-heading text-xl font-bold text-slate-900">Mampir & Berdiskusi</h4>
                <p className="text-slate-500 font-medium">Kopi kami selalu hangat.</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ==========================================
            4. THE LENS CTA (Tombol Bulat Melayang)
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 text-center pb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl font-bold text-slate-900 mb-10"
          >
            Siap menjadi bagian dari revolusi kami?
          </motion.h2>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            {/* 🚀 MENUJU /login */}
            <Link 
              href="/login" 
              className="relative flex flex-col items-center justify-center w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-white/60 backdrop-blur-2xl border-2 border-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] group overflow-hidden"
            >
              {/* Hover effect gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-maroon via-brand-maroon to-brand-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 flex flex-col items-center justify-center text-slate-900 group-hover:text-white transition-colors duration-500">
                <span className="font-bold text-lg mb-2">Gabung</span>
                <span className="font-bold text-lg mb-4">Sekarang</span>
                <div className="w-12 h-12 rounded-full bg-slate-900 group-hover:bg-white text-white group-hover:text-brand-maroon flex items-center justify-center transition-colors duration-500">
                  <ArrowRight className="w-6 h-6 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                </div>
              </div>
            </Link>
          </motion.div>
        </section>

      </div>
    </div>
  );
}