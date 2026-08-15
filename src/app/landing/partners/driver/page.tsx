"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Truck, 
  Radar, 
  Wallet, 
  Clock, 
  ArrowRight, 
  ShieldCheck,
  Banknote,
  Navigation
} from "lucide-react";

export default function DriverPartnerPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#f4f7fb] overflow-hidden selection:bg-brand-maroon/20 selection:text-brand-maroon font-sans">
      
      {/* ==========================================
          AIRY & BRIGHT AMBIENT BACKGROUND
          100% Light Mode, No Dark Elements
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[5%] left-[10%] w-[50vw] h-[50vh] bg-blue-100/50 rounded-full blur-[140px] mix-blend-multiply" />
        <div className="absolute bottom-[10%] right-[5%] w-[45vw] h-[45vh] bg-brand-gold/20 rounded-full blur-[140px] mix-blend-multiply" />
        <div className="absolute top-[40%] right-[30%] w-[35vw] h-[35vh] bg-rose-100/40 rounded-full blur-[120px] mix-blend-multiply" />
      </div>

      <div className="relative z-10 w-full pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* ==========================================
            1. THE FROSTED BILLBOARD (Hero Section)
            Panel raksasa membulat di tengah
            ========================================== */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-full bg-white/40 backdrop-blur-3xl border border-white rounded-[3rem] sm:rounded-[4rem] p-10 sm:p-20 shadow-[0_20px_80px_rgba(0,0,0,0.04)] text-center overflow-hidden mb-16"
        >
          {/* Subtle decorative ring inside hero */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/40 rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white shadow-sm text-brand-maroon text-xs font-bold uppercase tracking-widest mb-8">
              <Truck className="w-4 h-4" /> Mitra Pengemudi Independen
            </div>
            
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 text-balance leading-[1.05]">
              Kendalikan Waktu, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-maroon via-rose-600 to-brand-gold">Lipatgandakan Profit.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto text-balance leading-relaxed">
              Jadilah bos untuk diri Anda sendiri. Teknologi <em>Smart Radar</em> kami menjamin distribusi orderan yang adil tanpa rebutan, dengan pencairan dana instan di hari yang sama.
            </p>

            {/* 🚀 Mengarah ke portal login driver */}
            <Link 
              href="/driver/login" 
              className="inline-flex px-10 py-5 rounded-2xl font-bold text-white bg-slate-900 shadow-[0_10px_40px_rgba(15,23,42,0.2)] hover:bg-brand-maroon hover:shadow-[0_10px_40px_rgba(122,23,29,0.3)] hover:-translate-y-1 transition-all duration-500 items-center gap-3"
            >
              Mulai Menyetir <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.section>

        {/* ==========================================
            2. FULL-WIDTH GLASS STRIP (Core Tech)
            Bukan grid, tapi pita memanjang
            ========================================== */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full bg-white/50 backdrop-blur-2xl border border-white rounded-[3rem] p-8 sm:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.02)] mb-8 flex flex-col md:flex-row items-center gap-12"
        >
          {/* Radar Animation Concept */}
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full border border-slate-200 bg-white/30 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_50%,_rgba(122,23,29,0.05)_100%)]" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute w-1/2 h-full origin-right"
              style={{ background: 'conic-gradient(from 90deg at right, rgba(122,23,29,0) 0%, rgba(122,23,29,0.2) 100%)' }}
            />
            <div className="relative z-10 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md text-brand-maroon">
              <Radar className="w-8 h-8" />
            </div>
            {/* Fake Ping Dots */}
            <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-brand-gold rounded-full animate-ping" />
            <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-brand-maroon rounded-full animate-pulse" />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Sistem Radar Geofencing yang Adil.</h2>
            <p className="text-slate-600 text-lg leading-relaxed mb-6">
              Tinggalkan era saling berebut orderan (*bid war*). Algoritma pintar kami memancarkan orderan hanya kepada armada terdekat yang memiliki kapasitas muatan relevan, memastikan setiap mitra mendapat bagian secara adil.
            </p>
            <div className="inline-flex items-center gap-2 text-sm font-bold text-brand-maroon bg-red-50 px-4 py-2 rounded-xl">
              <Navigation className="w-4 h-4" /> Radius Optimal 5 KM
            </div>
          </div>
        </motion.section>

        {/* ==========================================
            3. THE TALL PANELS (Kolom Vertikal)
            ========================================== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-gradient-to-b from-white/70 to-white/40 backdrop-blur-xl border border-white rounded-[3rem] p-10 shadow-[0_10px_50px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:-translate-y-2 transition-transform duration-500"
          >
            <div>
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-8 shadow-sm">
                <Wallet className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-slate-900 mb-4">Pencairan Dana Instan</h3>
              <p className="text-slate-600 leading-relaxed mb-8">
                Kenapa harus menunggu mingguan? Melalui integrasi Flash Wallet dan DANA API, penghasilan Anda masuk detik itu juga setelah order selesai. Tarik ke rekening kapan pun Anda mau, 24 jam sehari.
              </p>
            </div>
            <div className="bg-white/60 rounded-2xl p-4 flex items-center justify-between border border-white">
              <span className="text-sm font-bold text-slate-500">Saldo Tersedia</span>
              <span className="text-xl font-mono font-black text-slate-900">Rp 850.000</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gradient-to-b from-white/70 to-white/40 backdrop-blur-xl border border-white rounded-[3rem] p-10 shadow-[0_10px_50px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:-translate-y-2 transition-transform duration-500"
          >
            <div>
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-8 shadow-sm">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-slate-900 mb-4">Waktu Bekerja Bebas</h3>
              <p className="text-slate-600 leading-relaxed mb-8">
                Tidak ada target mengikat atau sistem absen wajib. Hidupkan aplikasi saat Anda siap menyetir, dan matikan saat Anda butuh waktu untuk keluarga. Kebebasan penuh di tangan Anda.
              </p>
            </div>
            <div className="bg-white/60 rounded-2xl p-4 flex items-center justify-between border border-white">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                <span className="text-sm font-bold text-slate-700">Status Aplikasi</span>
              </div>
              <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">Aktif Menerima Order</span>
            </div>
          </motion.div>

        </section>

        {/* ==========================================
            4. THE MAC OS DOCK (Persyaratan Pendaftaran)
            Desain pill horizontal melayang ala macOS
            ========================================== */}
        <section className="text-center pb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-heading text-3xl font-bold text-slate-900 mb-4"
          >
            Dokumen Persyaratan
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-slate-500 mb-10"
          >
            Siapkan 4 dokumen ini dan lakukan pendaftaran 100% digital.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="inline-flex flex-wrap items-center justify-center gap-4 sm:gap-6 bg-white/60 backdrop-blur-3xl border border-white p-4 sm:p-6 rounded-[2rem] sm:rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
          >
            {[
              { icon: Wallet, label: "KTP Asli" },
              { icon: ShieldCheck, label: "SIM Aktif (A/B)" },
              { icon: Truck, label: "STNK Kendaraan" },
              { icon: Banknote, label: "Rekening / DANA" },
            ].map((item, idx) => (
              <div key={idx} className="group relative flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-white/50 border border-white rounded-2xl sm:rounded-full shadow-sm hover:bg-white hover:shadow-md hover:-translate-y-2 transition-all duration-300 cursor-default">
                <item.icon className="w-8 h-8 text-slate-400 group-hover:text-brand-maroon transition-colors duration-300 mb-2" />
                <span className="text-[10px] font-bold text-slate-600 text-center leading-tight px-1">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </section>

      </div>
    </div>
  );
}