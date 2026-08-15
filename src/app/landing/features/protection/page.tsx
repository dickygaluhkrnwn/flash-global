"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  ArrowRight, 
  FileCheck2, 
  Zap, 
  Clock, 
  CheckCircle,
  FileSearch,
  Banknote
} from "lucide-react";

export default function ProtectionFeaturePage() {
  return (
    <div className="relative min-h-screen w-full bg-[#f8fbfa] overflow-hidden selection:bg-teal-100 selection:text-teal-900 font-sans">
      
      {/* ==========================================
          SAFE & CALM AMBIENT BACKGROUND (Pastel Green/Blue)
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-teal-100/50 rounded-full blur-[140px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-blue-100/40 rounded-full blur-[140px] mix-blend-multiply" />
        <div className="absolute top-[40%] right-[30%] w-[30vw] h-[30vh] bg-emerald-50/60 rounded-full blur-[100px] mix-blend-multiply" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        
        {/* ==========================================
            1. PILL-SHAPED HERO SECTION
            Desain terpusat di dalam "Kapsul Kaca" raksasa
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full bg-white/40 backdrop-blur-3xl rounded-[3rem] sm:rounded-[4rem] border border-white p-10 sm:p-20 shadow-[0_20px_80px_rgba(0,0,0,0.03)] text-center relative overflow-hidden mb-24"
        >
          {/* Abstract Shield Background inside the pill */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <ShieldCheck className="w-[800px] h-[800px] text-teal-600" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-bold uppercase tracking-widest mb-8">
              <ShieldCheck className="w-4 h-4" />
              Flash Protection
            </div>
            
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 text-balance leading-[1.1]">
              Kirim Tanpa Cemas. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">Perlindungan Penuh.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto text-balance leading-relaxed">
              Setiap pengiriman berharga Anda dilindungi oleh Asuransi Digital terintegrasi. Nikmati proses klaim 100% digital tanpa dokumen kertas yang merepotkan.
            </p>

            {/* 🚀 MENUJU /login */}
            <Link 
              href="/login" 
              className="inline-flex px-8 py-4 rounded-xl font-bold text-white bg-teal-600 shadow-xl shadow-teal-600/20 hover:bg-teal-700 hover:-translate-y-1 transition-all duration-300 items-center gap-2"
            >
              Aktifkan Proteksi <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>

        {/* ==========================================
            2. OVERLAPPING CARDS (Fitur Detail)
            Konsep tumpukan kartu kaca yang elegan
            ========================================== */}
        <div className="max-w-5xl mx-auto relative mb-32 pt-10">
          <div className="flex flex-col md:flex-row gap-6 md:gap-0 justify-center items-center">
            
            {/* Card Kiri (Di Bawah) */}
            <motion.div 
              initial={{ opacity: 0, x: -30, rotate: -5 }}
              whileInView={{ opacity: 1, x: 0, rotate: -2 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="w-full md:w-2/5 bg-white/70 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-lg md:relative md:z-10 md:-mr-10 hover:z-30 hover:rotate-0 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Klaim 100% Digital</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Ucapkan selamat tinggal pada fotokopi dan formulir fisik. Unggah bukti foto langsung melalui aplikasi, dan tim kami akan segera memprosesnya.
              </p>
            </motion.div>

            {/* Card Tengah (Hero / Di Atas) */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full md:w-2/5 bg-gradient-to-br from-teal-500 to-emerald-600 p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(20,184,166,0.3)] md:relative md:z-20 md:-mt-10 text-white transform hover:scale-105 transition-transform duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center mb-6 border border-white/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-2xl font-bold mb-3">Cover Hingga Rp 50 Juta</h3>
              <p className="text-teal-50 text-sm leading-relaxed mb-6">
                Pilih nilai proteksi yang sesuai dengan nilai barang Anda saat membuat pesanan (AWB). Premi sangat terjangkau, ketenangan tak ternilai.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4" /> Hilang dalam transit</li>
                <li className="flex items-center gap-2 text-sm font-medium"><CheckCircle className="w-4 h-4" /> Rusak saat pengiriman</li>
              </ul>
            </motion.div>

            {/* Card Kanan (Di Bawah) */}
            <motion.div 
              initial={{ opacity: 0, x: 30, rotate: 5 }}
              whileInView={{ opacity: 1, x: 0, rotate: 2 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="w-full md:w-2/5 bg-white/70 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-lg md:relative md:z-10 md:-ml-10 hover:z-30 hover:rotate-0 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Approval Kilat</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Sistem SLA (Service Level Agreement) kami menjamin proses verifikasi maksimal 2x24 jam sejak dokumen digital dinyatakan lengkap.
              </p>
            </motion.div>

          </div>
        </div>

        {/* ==========================================
            3. HORIZONTAL TIMELINE (Proses Klaim)
            Bukan grid biasa, tapi alur proses yang nyambung
            ========================================== */}
        <div className="max-w-6xl mx-auto relative mb-24">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-bold text-slate-900 mb-4">Proses Klaim Semudah Mengetuk Layar.</h2>
            <p className="text-slate-500">Transparansi penuh di setiap langkah tanpa proses berbelit.</p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop Only) */}
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-1 bg-gradient-to-r from-teal-200 via-emerald-200 to-blue-200 -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {[
                { icon: FileSearch, title: "1. Lapor Insiden", desc: "Klik tombol 'Bantuan' pada detail resi bermasalah di aplikasi." },
                { icon: Clock, title: "2. Verifikasi Tim", desc: "Tim investigasi akan memvalidasi foto e-POD dan laporan Anda." },
                { icon: Banknote, title: "3. Dana Cair", desc: "Pencairan asuransi langsung masuk ke Flash Wallet / Rekening." }
              ].map((step, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2 }}
                  className="bg-white/60 backdrop-blur-md border border-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center relative hover:bg-white transition-colors"
                >
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-sm flex items-center justify-center text-teal-600 mb-6 border border-teal-50">
                    <step.icon className="w-8 h-8" />
                  </div>
                  <h4 className="font-heading text-xl font-bold text-slate-800 mb-3">{step.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}