"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Building2, 
  Truck, 
  Map, 
  Users, 
  BarChart3, 
  ArrowRight, 
  Activity,
  Headphones,
  Network
} from "lucide-react";

export default function FleetVendorPartnerPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#f3f6f9] overflow-hidden selection:bg-blue-100 selection:text-blue-900 font-sans text-slate-900">
      
      {/* ==========================================
          THE COMMAND CENTER AMBIENT BACKGROUND
          100% Light Mode dengan pendaran Blue & Gold
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-blue-200/40 rounded-full blur-[150px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-amber-100/40 rounded-full blur-[150px] mix-blend-multiply" />
        <div className="absolute top-[30%] left-[40%] w-[30vw] h-[30vh] bg-indigo-100/40 rounded-full blur-[120px] mix-blend-multiply" />
      </div>

      <div className="relative z-10 w-full pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* ==========================================
            1. THE PANORAMIC WINDOW HERO
            Bukan kotak, tapi kanvas kaca super lebar
            ========================================== */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-full bg-white/40 backdrop-blur-3xl border border-white rounded-[3rem] sm:rounded-[4rem] px-6 py-16 sm:p-24 shadow-[0_20px_80px_rgba(0,0,0,0.04)] overflow-hidden mb-24 flex flex-col items-center text-center"
        >
          {/* Subtle Radar/Map Rings inside Hero */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-blue-100/50 rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-blue-50/50 rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-md border border-white shadow-sm text-blue-700 text-xs font-bold uppercase tracking-widest mb-8">
              <Network className="w-4 h-4" /> Vendor & Manajemen Armada
            </div>
            
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 text-balance leading-[1.05]">
              Pusat Kendali Cerdas <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-brand-gold-dark">Untuk Seluruh Armada.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-500 mb-12 max-w-3xl mx-auto text-balance leading-relaxed font-medium">
              Maksimalkan utilitas truk Anda. Pantau lokasi GPS seluruh armada, delegasikan order ke supir, dan kelola bagi hasil komisi secara transparan dalam satu dasbor B2B.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              {/* 🚀 MENUJU /login */}
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-10 py-5 rounded-2xl font-bold text-white bg-blue-700 shadow-[0_10px_40px_rgba(29,78,216,0.2)] hover:bg-blue-800 hover:shadow-[0_10px_40px_rgba(29,78,216,0.3)] hover:-translate-y-1 transition-all duration-500 flex items-center justify-center gap-3"
              >
                Daftar Sebagai Vendor <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/contact" 
                className="w-full sm:w-auto px-10 py-5 rounded-2xl font-bold text-slate-700 bg-white/60 backdrop-blur-md border border-white hover:bg-white hover:-translate-y-1 transition-all duration-500 flex items-center justify-center gap-3 shadow-sm"
              >
                <Headphones className="w-5 h-5 text-slate-400" /> Hubungi Kemitraan
              </Link>
            </div>
          </div>
        </motion.section>

        {/* ==========================================
            2. THE STICKY HUB (Features)
            Kiri diam (Sticky), Kanan scroll vertikal
            ========================================== */}
        <section className="relative w-full mb-32 flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
          
          {/* LEFT: Sticky Header */}
          <div className="lg:w-1/3 lg:sticky lg:top-32 lg:pb-32">
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Infrastruktur untuk Bisnis Logistik Anda.
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              Kami merancang sistem ini khusus untuk menyederhanakan komunikasi antara pemilik armada (*vendor*), supir, dan klien B2B.
            </p>
            <div className="hidden lg:flex w-16 h-16 rounded-full bg-white/60 border border-white shadow-sm items-center justify-center text-blue-600">
              <ArrowRight className="w-8 h-8 rotate-90" />
            </div>
          </div>

          {/* RIGHT: Scrolling Feature Cards */}
          <div className="lg:w-2/3 flex flex-col gap-8">
            
            {/* Feature 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}
              className="bg-white/50 backdrop-blur-2xl border border-white rounded-[2.5rem] p-10 sm:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:bg-white/80 transition-colors duration-500"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-8 border border-blue-100 shadow-sm">
                <Map className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-3xl font-bold text-slate-900 mb-4">Control Tower (Pemantauan Aset)</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                Lihat pergerakan puluhan hingga ratusan truk Anda di atas satu peta interaktif. Pantau status kendaraan (berjalan, berhenti, muat barang) dengan presisi satelit tingkat tinggi.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}
              className="bg-white/50 backdrop-blur-2xl border border-white rounded-[2.5rem] p-10 sm:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:bg-white/80 transition-colors duration-500"
            >
              <div className="w-16 h-16 rounded-2xl bg-brand-maroon/5 text-brand-maroon flex items-center justify-center mb-8 border border-brand-maroon/10 shadow-sm">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-3xl font-bold text-slate-900 mb-4">Manajemen Supir & Dispatch</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                Daftarkan akun supir anak buah Anda. Delegasikan tugas pengiriman (*dispatch*) langsung ke aplikasi *smartphone* driver mereka tanpa miskomunikasi atau instruksi manual via chat.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}
              className="bg-white/50 backdrop-blur-2xl border border-white rounded-[2.5rem] p-10 sm:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:bg-white/80 transition-colors duration-500"
            >
              <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center mb-8 border border-brand-gold/20 shadow-sm">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-3xl font-bold text-slate-900 mb-4">Sistem Komisi Pintar</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                Atur persentase bagi hasil antara vendor dan supir. Sistem akan menghitung dan memisahkan pendapatan secara otomatis setiap order selesai. Tidak ada lagi sengketa pembayaran.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}
              className="bg-white/50 backdrop-blur-2xl border border-white rounded-[2.5rem] p-10 sm:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:bg-white/80 transition-colors duration-500"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-8 border border-indigo-100 shadow-sm">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-3xl font-bold text-slate-900 mb-4">Analitik Kinerja Operasional</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                Ambil keputusan berbasis data. Dapatkan laporan komprehensif mengenai tingkat penyelesaian order, utilisasi truk, hingga histori pengiriman untuk meminimalisir kekosongan muatan balikan (*empty backhaul*).
              </p>
            </motion.div>

          </div>
        </section>

        {/* ==========================================
            3. CONNECTED NODES (Cara Bergabung)
            Bukan kotak gelap, tapi alur jaringan terang
            ========================================== */}
        <section className="relative w-full bg-white/70 backdrop-blur-3xl border border-white rounded-[3rem] sm:rounded-[4rem] p-10 sm:p-20 shadow-[0_30px_100px_rgba(0,0,0,0.05)] overflow-hidden">
          {/* Subtle Grid / Network background */}
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]" />
          
          <div className="relative z-10 text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Digitalisasi Bisnis Transportasi Anda.
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Tingkatkan volume angkutan harian Anda dengan bergabung ke dalam jaringan rantai pasok nasional Flash Global. Pendaftaran 100% digital.
            </p>
          </div>

          {/* Node Flowchart Horizontal */}
          <div className="relative z-10 max-w-5xl mx-auto">
            {/* The Connecting Line (Desktop) */}
            <div className="hidden lg:block absolute top-[3rem] left-[10%] right-[10%] h-1 bg-gradient-to-r from-blue-200 via-brand-gold/40 to-brand-maroon/20 -translate-y-1/2 z-0" />
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-6 relative z-10">
              {[
                { title: "Verifikasi Entitas", desc: "Daftarkan PT/CV", icon: Building2 },
                { title: "Daftar Kendaraan", desc: "Input data armada", icon: Truck },
                { title: "Invite Supir", desc: "Buatkan akun supir", icon: Users },
                { title: "Terima Order", desc: "Hasilkan profit B2B", icon: ArrowRight },
              ].map((step, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.15 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg border border-slate-100 text-brand-gold-dark mb-6 relative group hover:scale-110 transition-transform duration-300">
                    <step.icon className="w-10 h-10 group-hover:text-blue-600 transition-colors" />
                    {/* Node indicator */}
                    <div className="absolute top-0 right-0 w-6 h-6 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center border-2 border-white shadow-sm">
                      {idx + 1}
                    </div>
                  </div>
                  <h4 className="font-heading text-lg font-bold text-slate-900 mb-2">{step.title}</h4>
                  <p className="text-slate-500 text-sm">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-16 text-center">
            {/* 🚀 MENUJU /login */}
            <Link href="/login" className="inline-flex px-10 py-5 rounded-full font-bold text-white bg-slate-900 shadow-xl hover:bg-blue-700 hover:-translate-y-1 transition-all duration-300 items-center justify-center gap-2">
              Daftar Akun Vendor <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

        </section>

      </div>
    </div>
  );
}