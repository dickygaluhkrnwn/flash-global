"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { 
  Package, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Smartphone, 
  CheckCircle2,
  Route,
  Navigation
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
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } 
  },
};

export default function PersonalSolutionPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#f8f9fc] overflow-hidden selection:bg-brand-maroon/20 selection:text-brand-maroon font-sans">
      
      {/* ==========================================
          DYNAMIC APP AMBIENT BACKGROUND
          100% Light Mode dengan warna-warna pastel ceria
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-rose-100/50 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40vw] h-[40vh] bg-blue-100/50 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[40%] left-[30%] w-[35vw] h-[35vh] bg-amber-50/50 rounded-full blur-[100px] mix-blend-multiply" />
      </div>

      <div className="relative z-10 w-full pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* ==========================================
            1. THE APP-WIDGET HERO
            Desain terpusat dengan tipografi besar & bersih
            ========================================== */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center mb-32 relative"
        >
          {/* Floating UI Elements untuk memperkuat kesan App/Mobile */}
          <motion.div 
            animate={{ y: [0, -15, 0], rotate: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="hidden md:flex absolute top-10 left-0 bg-white/70 backdrop-blur-xl border border-white p-4 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.05)] items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-brand-maroon/10 flex items-center justify-center text-brand-maroon"><Navigation className="w-5 h-5" /></div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Status Pengiriman</p>
              <p className="text-sm font-bold text-slate-800">Kurir Menuju Lokasi</p>
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [0, 20, 0], rotate: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="hidden md:flex absolute bottom-10 right-0 bg-white/70 backdrop-blur-xl border border-white p-4 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.05)] items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-5 h-5" /></div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pembayaran</p>
              <p className="text-sm font-bold text-slate-800">Selesai & Aman</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm text-brand-maroon text-xs font-bold uppercase tracking-widest">
              <Package className="w-4 h-4" /> Solusi Personal & Retail
            </span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 text-balance leading-[1.1]">
            Pengiriman Instan. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-maroon via-rose-500 to-amber-500">Fleksibilitas Tanpa Batas.</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto text-balance leading-relaxed font-medium">
            Kirim barang, dokumen, hingga produk jualan Anda lebih cepat dan efisien. Nikmati fitur Multi-drop untuk puluhan alamat sekaligus hanya dari satu genggaman layar.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* 🚀 MENUJU /login */}
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-10 py-5 rounded-full font-bold text-white bg-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.15)] hover:bg-brand-maroon hover:shadow-[0_10px_40px_rgba(122,23,29,0.3)] hover:-translate-y-1 transition-all duration-500 flex items-center justify-center gap-2"
            >
              Mulai Kirim Sekarang <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>

        {/* ==========================================
            2. THE STAGGERED WAVE (Fitur Utama)
            BUKAN BENTO GRID! Kolom vertikal yang naik-turun
            ========================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-32 items-start">
          
          {/* Card 1: Posisi Normal */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="group bg-white/60 backdrop-blur-2xl border border-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.05)] hover:bg-white transition-all duration-500 lg:translate-y-0"
          >
            <div className="w-14 h-14 rounded-2xl bg-brand-maroon/10 text-brand-maroon flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Route className="w-7 h-7" />
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Multi-Drop Routing</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Tidak perlu repot membuat banyak pesanan. Masukkan hingga 20 titik alamat dalam satu kali klik. Sistem akan mencarikan rute paling efisien.
            </p>
          </motion.div>

          {/* Card 2: Turun ke bawah (Staggered) */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            className="group bg-white/60 backdrop-blur-2xl border border-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.05)] hover:bg-white transition-all duration-500 lg:translate-y-12"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Live e-POD</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Lacak posisi kurir secara <em>real-time</em> via GPS dan terima bukti foto serah terima barang secara instan langsung di aplikasi klien Anda.
            </p>
          </motion.div>

          {/* Card 3: Turun lebih dalam lagi (Staggered Max) */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
            className="group bg-gradient-to-b from-brand-gold/10 to-white/60 backdrop-blur-2xl border border-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.05)] hover:bg-white transition-all duration-500 lg:translate-y-24"
          >
            <div className="w-14 h-14 rounded-2xl bg-brand-gold/20 text-brand-gold-dark flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Pickup Instan</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Dukungan ratusan armada mitra driver kami yang siap menjemput paket di lokasi Anda dalam hitungan menit setelah pesanan dikonfirmasi.
            </p>
          </motion.div>

          {/* Card 4: Naik kembali (Membentuk gelombang) */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}
            className="group bg-white/60 backdrop-blur-2xl border border-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.05)] hover:bg-white transition-all duration-500 lg:translate-y-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Proteksi Asuransi</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Kirim barang berharga tanpa rasa cemas. Setiap pengiriman dilengkapi opsi proteksi dengan proses klaim digital yang sangat transparan.
            </p>
          </motion.div>

        </div>

        {/* Space kompensasi untuk fitur gelombang di atas agar tidak nabrak */}
        <div className="hidden lg:block h-24"></div>

        {/* ==========================================
            3. THE UNIFIED GLASS PILL (Cara Kerja)
            Bukan 3 kotak terpisah, melainkan 1 kapsul panjang
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold text-slate-900 mb-4">Semudah Membalik Telapak Tangan</h2>
            <p className="text-slate-500">Tiga langkah cepat. Sisanya, biarkan kami yang bekerja.</p>
          </div>
          
          <div className="w-full bg-white/50 backdrop-blur-3xl border border-white p-6 sm:p-10 rounded-[3rem] sm:rounded-[4rem] shadow-[0_20px_80px_rgba(0,0,0,0.04)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            {/* Latar Belakang dekoratif di dalam kapsul */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-maroon/5 via-transparent to-brand-gold/5 pointer-events-none" />

            {/* Step 1 */}
            <div className="flex-1 flex flex-col items-center text-center p-6 relative z-10">
              <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-slate-900 mb-6 border border-slate-100">
                <Smartphone className="w-7 h-7" />
              </div>
              <h4 className="font-heading text-lg font-bold text-slate-900 mb-2">Pesan via Portal</h4>
              <p className="text-slate-500 text-sm leading-relaxed">Masukkan detail barang dan titik lokasi pengiriman.</p>
            </div>

            {/* Arrow Divider 1 (Desktop Only) */}
            <div className="hidden md:flex text-slate-300">
              <ArrowRight className="w-8 h-8" />
            </div>

            {/* Step 2 */}
            <div className="flex-1 flex flex-col items-center text-center p-6 relative z-10">
              <div className="w-16 h-16 rounded-full bg-brand-maroon text-white shadow-md shadow-brand-maroon/20 flex items-center justify-center mb-6">
                <MapPin className="w-7 h-7" />
              </div>
              <h4 className="font-heading text-lg font-bold text-slate-900 mb-2">Kurir Menjemput</h4>
              <p className="text-slate-500 text-sm leading-relaxed">Driver terdekat mengambil paket dan mengikuti rute cerdas.</p>
            </div>

            {/* Arrow Divider 2 (Desktop Only) */}
            <div className="hidden md:flex text-slate-300">
              <ArrowRight className="w-8 h-8" />
            </div>

            {/* Step 3 */}
            <div className="flex-1 flex flex-col items-center text-center p-6 relative z-10">
              <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-brand-gold-dark mb-6 border border-brand-gold/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-heading text-lg font-bold text-slate-900 mb-2">Paket Tiba</h4>
              <p className="text-slate-500 text-sm leading-relaxed">Terima notifikasi otomatis dan bukti foto e-POD.</p>
            </div>

          </div>
        </motion.div>

      </div>
    </div>
  );
}