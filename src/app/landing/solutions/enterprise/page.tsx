"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { 
  Building2, 
  CreditCard, 
  Globe2, 
  FileText, 
  ArrowRight, 
  Headphones, 
  Briefcase,
  TrendingUp,
  LineChart,
  ShieldCheck
} from "lucide-react";

// ==========================================
// KONFIGURASI ANIMASI FRAMER MOTION
// ==========================================
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } 
  },
};

export default function EnterpriseSolutionPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#f4f6f8] overflow-hidden selection:bg-brand-gold/30 selection:text-slate-900 font-sans">
      
      {/* ==========================================
          TITANIUM & GOLD AMBIENT BACKGROUND
          100% Light Mode, Elegan & Premium
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-slate-200/50 rounded-full blur-[140px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-amber-100/40 rounded-full blur-[140px] mix-blend-multiply" />
        <div className="absolute top-[40%] right-[30%] w-[40vw] h-[40vh] bg-blue-50/50 rounded-full blur-[120px] mix-blend-multiply" />
      </div>

      <div className="relative z-10 w-full pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* ==========================================
            1. THE EXECUTIVE HERO
            Desain ultra-clean dengan tipografi raksasa
            ========================================== */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto text-center mb-32 relative"
        >
          {/* Subtle Grid behind hero text */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          
          <div className="relative z-10">
            <motion.div variants={itemVariants} className="mb-8 flex justify-center">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm text-slate-700 text-xs font-bold uppercase tracking-widest">
                <Building2 className="w-4 h-4 text-brand-gold-dark" />
                Solusi Korporat & B2B
              </span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="font-heading text-5xl sm:text-6xl lg:text-[5.5rem] font-extrabold tracking-tighter text-slate-900 mb-8 leading-[1.05] text-balance">
              Infrastruktur Logistik <br/>
              Skala <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-600 via-brand-gold-dark to-yellow-600">Enterprise.</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xl text-slate-500 mb-12 max-w-3xl mx-auto text-balance leading-relaxed font-medium">
              Desain ulang rantai pasok perusahaan Anda. Nikmati fasilitas Limit Tempo B2B, <em>auto-invoicing</em>, dan dukungan kargo berat skala nasional dalam satu dasbor kendali terpusat.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-5">
              {/* 🚀 MENUJU /login */}
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-10 py-5 rounded-2xl font-bold text-white bg-slate-900 shadow-[0_10px_40px_rgba(15,23,42,0.15)] hover:bg-brand-gold-dark hover:shadow-[0_10px_40px_rgba(197,160,89,0.3)] hover:-translate-y-1 transition-all duration-500 flex items-center justify-center gap-3"
              >
                Ajukan Akun B2B <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/contact" 
                className="w-full sm:w-auto px-10 py-5 rounded-2xl font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:-translate-y-1 transition-all duration-500 flex items-center justify-center gap-3 shadow-sm"
              >
                <Headphones className="w-5 h-5 text-slate-400" /> Konsultasi Sales
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* ==========================================
            2. THE CORPORATE LEDGERS (Fitur B2B)
            Plakat Horizontal dengan sekat pembatas
            ========================================== */}
        <div className="relative max-w-6xl mx-auto mb-32">
          
          {/* Garis Supply Chain Vertikal di Kiri (Desktop) */}
          <div className="hidden lg:block absolute top-0 bottom-0 left-[3rem] w-0.5 bg-gradient-to-b from-transparent via-slate-200 to-transparent z-0" />

          <div className="space-y-12 relative z-10">
            
            {/* Ledger 1: Limit Tempo */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8 }}
              className="group flex flex-col lg:flex-row bg-white/60 backdrop-blur-3xl rounded-[3rem] border border-white shadow-[0_20px_80px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-500 hover:bg-white"
            >
              <div className="lg:w-2/5 p-10 lg:p-12 lg:border-r border-slate-100 flex flex-col justify-center bg-gradient-to-br from-white/50 to-transparent">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 shadow-sm border border-amber-100">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h3 className="font-heading text-3xl font-bold text-slate-900 mb-2">Kasbon & Limit Tempo</h3>
                <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest w-max mb-6">Financial Feature</span>
              </div>
              <div className="lg:w-3/5 p-10 lg:p-12 flex flex-col justify-center">
                <p className="text-slate-600 text-lg leading-relaxed mb-8">
                  Kirim barang hari ini, bayar bulan depan. Kami mengerti pentingnya rotasi <em>cash flow</em> bagi perusahaan berskala besar. Akumulasikan ribuan resi pengiriman Anda menjadi satu <em>invoice</em> tagihan bulanan yang rapi dan dapat disesuaikan dengan siklus keuangan internal Anda.
                </p>
                <div className="flex items-center gap-4 text-sm font-bold text-slate-900">
                  <ShieldCheck className="w-5 h-5 text-brand-gold-dark" /> Plafon kredit disesuaikan dengan volume pengiriman.
                </div>
              </div>
            </motion.div>

            {/* Ledger 2: Global Forwarding */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.1 }}
              className="group flex flex-col lg:flex-row bg-white/60 backdrop-blur-3xl rounded-[3rem] border border-white shadow-[0_20px_80px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-500 hover:bg-white"
            >
              <div className="lg:w-2/5 p-10 lg:p-12 lg:border-r border-slate-100 flex flex-col justify-center bg-gradient-to-br from-white/50 to-transparent">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 text-white flex items-center justify-center mb-6 shadow-lg">
                  <Globe2 className="w-8 h-8" />
                </div>
                <h3 className="font-heading text-3xl font-bold text-slate-900 mb-2">Global Forwarding</h3>
                <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest w-max mb-6">Heavy Cargo</span>
              </div>
              <div className="lg:w-3/5 p-10 lg:p-12 flex flex-col justify-center">
                <p className="text-slate-600 text-lg leading-relaxed mb-8">
                  Lebih dari sekadar parsel kecil. Solusi kargo kelas berat kami meliputi layanan FTL (Full Truckload) dan LTL (Less than Truckload) untuk distribusi antar kota maupun antar pulau menggunakan armada vendor terverifikasi.
                </p>
                <div className="flex items-center gap-4 text-sm font-bold text-slate-900">
                  <TrendingUp className="w-5 h-5 text-blue-600" /> Skalabilitas volume tanpa batas.
                </div>
              </div>
            </motion.div>

            {/* Ledger 3: Auto-Invoicing & Analytics */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.2 }}
              className="group flex flex-col lg:flex-row bg-white/60 backdrop-blur-3xl rounded-[3rem] border border-white shadow-[0_20px_80px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-500 hover:bg-white"
            >
              <div className="lg:w-2/5 p-10 lg:p-12 lg:border-r border-slate-100 flex flex-col justify-center bg-gradient-to-br from-white/50 to-transparent">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 shadow-sm border border-blue-100">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="font-heading text-3xl font-bold text-slate-900 mb-2">Auto-Invoicing</h3>
                <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest w-max mb-6">Data & Analytics</span>
              </div>
              <div className="lg:w-3/5 p-10 lg:p-12 flex flex-col justify-center">
                <p className="text-slate-600 text-lg leading-relaxed mb-8">
                  Ucapkan selamat tinggal pada rekapan manual di akhir bulan. Sistem otomatis mengkonsolidasi biaya pengiriman menjadi laporan digital, lengkap dengan grafik analitik (*dashboard*) untuk memantau efisiensi biaya logistik perusahaan Anda.
                </p>
                <div className="flex items-center gap-4 text-sm font-bold text-slate-900">
                  <LineChart className="w-5 h-5 text-emerald-500" /> Export ke format CSV/Excel dalam 1 klik.
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* ==========================================
            3. EXECUTIVE ONBOARDING (Light Mode Vault)
            Menggantikan kotak hitam dari desain lama
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
          className="relative max-w-6xl mx-auto bg-white/70 backdrop-blur-3xl border border-white rounded-[3rem] sm:rounded-[4rem] p-10 sm:p-16 lg:p-20 shadow-[0_30px_100px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          {/* Premium Ambient Internal Glow */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-amber-100/50 via-slate-100 to-transparent rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            {/* Kiri: Teks Onboarding */}
            <div className="lg:col-span-5">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-8 border border-slate-200">
                <Briefcase className="w-8 h-8" />
              </div>
              <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-6 text-slate-900 leading-tight">
                Mulai Skalakan <br/>Operasional Anda.
              </h2>
              <p className="text-slate-600 text-lg mb-10 leading-relaxed">
                Proses <em>onboarding</em> khusus B2B dirancang cepat, aman, dan tanpa mengganggu rutinitas logistik Anda yang sedang berjalan. Setiap akun B2B akan didampingi oleh satu <em>Dedicated Account Manager</em>.
              </p>
              
              <Link href="/login" className="inline-flex px-8 py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-brand-gold-dark transition-colors shadow-lg items-center justify-center gap-2">
                Registrasi Enterprise <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            
            {/* Kanan: Step-by-step UI */}
            <div className="lg:col-span-7">
              <div className="flex flex-col gap-6">
                {[
                  { title: "Registrasi & KYC", desc: "Verifikasi legalitas perusahaan (SIUP/NIB) secara digital tanpa kertas." },
                  { title: "Approval Limit Tempo", desc: "Penilaian finansial cepat untuk menentukan plafon kredit pengiriman bulanan." },
                  { title: "Integrasi API (Opsional)", desc: "Tim IT kami membantu menyambungkan sistem ke ERP/WMS perusahaan Anda." },
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-6 p-6 sm:p-8 bg-white/80 backdrop-blur-md border border-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:-translate-x-2 transition-transform duration-300">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 font-mono font-black text-xl border border-slate-200">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xl mb-2">{step.title}</h4>
                      <p className="text-slate-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </div>
  );
}