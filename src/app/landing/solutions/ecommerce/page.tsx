"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { 
  ShoppingBag, 
  Zap, 
  Wallet, 
  Link as LinkIcon, 
  ArrowRight, 
  Smartphone, 
  Printer,
  TrendingUp,
  CheckCircle2,
  PackageCheck
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

export default function EcommerceSolutionPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#fcfbfc] overflow-hidden selection:bg-purple-100 selection:text-purple-900 font-sans">
      
      {/* ==========================================
          VIBRANT & BRIGHT AMBIENT BACKGROUND
          100% Light Mode dengan warna E-Commerce ceria
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[-10%] left-[10%] w-[50vw] h-[50vh] bg-fuchsia-100/40 rounded-full blur-[140px] mix-blend-multiply" />
        <div className="absolute bottom-[10%] right-[5%] w-[45vw] h-[45vh] bg-amber-100/40 rounded-full blur-[140px] mix-blend-multiply" />
        <div className="absolute top-[40%] left-[40%] w-[40vw] h-[40vh] bg-blue-50/50 rounded-full blur-[120px] mix-blend-multiply" />
      </div>

      <div className="relative z-10 w-full pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* ==========================================
            1. THE SHOWROOM HERO
            Kaca besar dengan dekorasi "Box" melayang
            ========================================== */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative text-center mb-32"
        >
          {/* Decorative floating elements */}
          <motion.div 
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} 
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 left-10 md:left-20 w-16 h-16 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-xl flex items-center justify-center text-purple-400 hidden sm:flex"
          >
            <PackageCheck className="w-8 h-8" />
          </motion.div>
          <motion.div 
            animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }} 
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-10 right-10 md:right-20 w-20 h-20 bg-white/60 backdrop-blur-md rounded-full border border-white shadow-xl flex items-center justify-center text-amber-400 hidden sm:flex"
          >
            <ShoppingBag className="w-8 h-8" />
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/60 backdrop-blur-md border border-white/80 shadow-sm text-purple-600 text-xs font-bold uppercase tracking-widest">
              <ShoppingBag className="w-4 h-4" /> Solusi E-Commerce & UMKM
            </span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 text-balance leading-[1.1]">
            Skalakan Bisnis Online Anda, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-rose-500 to-amber-500">Otomatiskan Logistiknya.</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg sm:text-xl text-slate-500 mb-12 max-w-3xl mx-auto text-balance leading-relaxed">
            Berhenti membuang waktu mengurus resi manual. Sinkronkan pesanan, panggil kurir <em>pickup</em> massal, dan nikmati pencairan dana COD instan langsung ke dompet Anda.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* 🚀 CTA MENUJU ROOT CLIENT PORTAL (/login) */}
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-10 py-5 rounded-2xl font-bold text-white bg-slate-900 shadow-[0_10px_40px_rgba(15,23,42,0.15)] hover:bg-purple-600 hover:shadow-[0_10px_40px_rgba(147,51,234,0.3)] hover:-translate-y-1 transition-all duration-500 flex items-center justify-center gap-2"
            >
              Mulai Jualan Lebih Cepat <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>

        {/* ==========================================
            2. ISOMETRIC FEATURE LAYERS
            Bukan Grid, Tapi Baris-baris Raksasa (Rows)
            ========================================== */}
        <div className="space-y-8 mb-32">
          
          {/* Row 1: Mass Printing */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8 }}
            className="w-full bg-white/50 backdrop-blur-3xl border border-white rounded-[3rem] p-8 sm:p-16 shadow-[0_20px_80px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center gap-12 hover:bg-white/70 transition-colors duration-500"
          >
            <div className="flex-1">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-8 border border-purple-100 shadow-sm">
                <Printer className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-3xl font-bold text-slate-900 mb-4">Bulk Order & Mass Printing</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                Mendapat ratusan pesanan saat &quot;Flash Sale&quot;? Jangan panik. Upload data pesanan Anda sekaligus via Excel/CSV dan cetak label pengiriman (AWB) secara massal hanya dalam satu kali klik. Menghemat waktu hingga 80%.
              </p>
            </div>
            <div className="w-full md:w-5/12 h-64 bg-gradient-to-br from-purple-100 to-indigo-50 rounded-[2rem] border border-white shadow-inner flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:20px_20px] opacity-50" />
              <Printer className="w-24 h-24 text-purple-300 relative z-10" />
            </div>
          </motion.div>

          {/* Row 2: Split 50/50 untuk Integrasi & Wallet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.1 }}
              className="bg-white/50 backdrop-blur-3xl border border-white rounded-[3rem] p-10 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:bg-white/70 transition-colors duration-500"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 border border-rose-100 shadow-sm">
                  <LinkIcon className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-slate-900 mb-4">Integrasi Toko Mulus</h3>
                <p className="text-slate-600 leading-relaxed mb-8">
                  Tersedia plugin siap pakai untuk *WooCommerce* dan *Shopify*. Pesanan dari toko *online* Anda akan otomatis masuk ke dasbor Flash Global tanpa perlu input manual.
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-white/50 backdrop-blur-3xl border border-white rounded-[3rem] p-10 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:bg-white/70 transition-colors duration-500"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 border border-amber-100 shadow-sm">
                  <Wallet className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-slate-900 mb-4">Pencairan COD Instan</h3>
                <p className="text-slate-600 leading-relaxed mb-8">
                  Arus kas adalah raja. Dana pembayaran COD akan langsung masuk ke fitur <strong>Flash Wallet</strong> Anda detik itu juga saat kurir menyelesaikan pesanan. Tarik ke DANA kapan saja.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Row 3: Live Tracking */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.3 }}
            className="w-full bg-white/50 backdrop-blur-3xl border border-white rounded-[3rem] p-8 sm:p-16 shadow-[0_20px_80px_rgba(0,0,0,0.03)] flex flex-col md:flex-row-reverse items-center gap-12 hover:bg-white/70 transition-colors duration-500"
          >
            <div className="flex-1">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-8 border border-blue-100 shadow-sm">
                <Smartphone className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-3xl font-bold text-slate-900 mb-4">Live Tracking Pembeli</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                Kurangi beban *Customer Service* Anda. Sistem otomatis mengirimkan tautan pelacakan via WhatsApp kepada pembeli. Mereka bisa melihat posisi paket secara *real-time* lengkap dengan foto bukti e-POD.
              </p>
            </div>
            <div className="w-full md:w-5/12 h-64 bg-gradient-to-bl from-blue-100 to-cyan-50 rounded-[2rem] border border-white shadow-inner flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_20%,_#e0f2fe_100%)] opacity-70" />
              <Zap className="w-24 h-24 text-blue-300 relative z-10" />
            </div>
          </motion.div>

        </div>

        {/* ==========================================
            3. E-COMMERCE ACCELERATOR (LIGHT MODE RIBBON)
            Menggantikan kotak hitam legam sebelumnya
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
          className="relative w-full bg-white/70 backdrop-blur-3xl border border-white rounded-[3rem] sm:rounded-[4rem] p-10 sm:p-16 lg:p-20 shadow-[0_30px_100px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          {/* Vibrant internal glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-amber-100 via-rose-100 to-transparent rounded-full blur-[100px] pointer-events-none opacity-60" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-100 via-blue-100 to-transparent rounded-full blur-[100px] pointer-events-none opacity-60" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm text-slate-800 text-xs font-bold uppercase tracking-widest mb-6 border border-slate-100">
                <TrendingUp className="w-4 h-4 text-rose-500" /> Seller Success
              </div>
              <h2 className="font-heading text-4xl sm:text-5xl font-extrabold mb-6 text-slate-900 leading-tight">
                Fokus Jualan. <br/>Biar Kami Urus Kirimannya.
              </h2>
              <p className="text-slate-600 text-lg mb-10 leading-relaxed max-w-md">
                Tingkatkan volume transaksi tanpa harus pusing memikirkan logistik. Ekosistem Flash Global dirancang untuk mendukung pertumbuhan eksponensial bisnis Anda.
              </p>
              
              <Link href="/login" className="inline-flex px-8 py-4 rounded-xl bg-white border-2 border-slate-100 text-slate-900 font-bold hover:border-purple-500 hover:text-purple-600 transition-colors shadow-sm items-center justify-center gap-2">
                Daftar Sebagai Seller <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            
            <div className="flex flex-col gap-5">
              {[
                { title: "Kurir Pickup Harian", desc: "Jadwalkan penjemputan barang rutin di gudang Anda tanpa biaya tambahan." },
                { title: "Dashboard Analitik", desc: "Pantau rasio pengiriman sukses, retur, dan performa kurir dari satu layar." },
                { title: "Dukungan CS Prioritas", desc: "Bantuan resolusi kendala pengiriman jalur khusus untuk mitra E-Commerce." }
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-5 p-6 bg-white/80 backdrop-blur-md rounded-3xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:-translate-x-2 transition-transform duration-300">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1">{benefit.title}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}