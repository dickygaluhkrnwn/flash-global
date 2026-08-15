"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Map, 
  Navigation, 
  Camera, 
  Share2, 
  ArrowRight, 
  CheckCircle,
  MapPin
} from "lucide-react";

export default function LiveTrackingFeaturePage() {
  return (
    <div className="relative min-h-screen w-full bg-[#f8fafc] overflow-hidden selection:bg-brand-maroon/20 selection:text-brand-maroon">
      
      {/* ==========================================
          DYNAMIC AMBIENT BACKGROUND
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-blue-200/40 rounded-full blur-[150px] mix-blend-multiply" />
        <div className="absolute top-[40%] right-[-10%] w-[40vw] h-[50vh] bg-brand-maroon/10 rounded-full blur-[150px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vh] bg-brand-gold/15 rounded-full blur-[150px] mix-blend-multiply" />
      </div>

      {/* ==========================================
          1. HERO SECTION (SPLIT SCREEN LAYOUT)
          ========================================== */}
      <section className="relative z-10 pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* KIRI: TEKS & CTA */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-brand-maroon/20 text-brand-maroon text-xs font-bold uppercase tracking-widest mb-8 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-maroon opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-maroon"></span>
              </span>
              Teknologi Inti
            </div>
            
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
              Pantau Tiap Detik, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-maroon to-brand-gold">Tanpa Titik Buta.</span>
            </h1>
            
            <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg">
              Hilangkan kecemasan dalam pengiriman. Teknologi pelacakan satelit kami memproyeksikan pergerakan paket Anda secara <em>real-time</em>, diakhiri dengan bukti foto serah terima digital yang tak terbantahkan.
            </p>

            {/* 🚀 Mengarah ke /login */}
            <Link 
              href="/login" 
              className="inline-flex px-8 py-4 rounded-xl font-bold text-white bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-300 items-center gap-3"
            >
              Coba Sekarang <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>

          {/* KANAN: ABSTRACT UI MOCKUP (LIVE MAP) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="relative h-[400px] sm:h-[500px] w-full perspective-1000"
          >
            {/* Main Glass Panel */}
            <div className="absolute inset-0 glass-card rounded-[2rem] border border-white/60 shadow-2xl p-6 flex flex-col justify-between overflow-hidden">
              {/* Fake Map Background */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-400 via-slate-100 to-transparent bg-[length:20px_20px]" />
              
              <div className="relative z-10 flex justify-between items-center bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Kurir Menuju Lokasi</h4>
                    <p className="text-xs text-slate-500 font-medium">Estimasi: 12 Menit</p>
                  </div>
                </div>
                <div className="text-right">
                  <h4 className="text-lg font-mono font-bold text-brand-maroon">2.4 KM</h4>
                </div>
              </div>

              {/* Animated Route Line */}
              <div className="relative z-10 flex-1 flex items-center justify-center my-8">
                <div className="relative w-full max-w-[200px] h-32">
                  <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
                    <path d="M 10 90 Q 50 10 100 50 T 190 10" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeDasharray="8 8" />
                    {/* Animated Moving Dot */}
                    <motion.circle 
                      cx="10" cy="90" r="8" fill="#7A171D"
                      animate={{ 
                        cx: [10, 100, 190], 
                        cy: [90, 50, 10] 
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="drop-shadow-[0_0_8px_rgba(122,23,29,0.8)]"
                    />
                  </svg>
                  <MapPin className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 text-slate-400 w-6 h-6" />
                  <MapPin className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 text-brand-gold w-8 h-8 drop-shadow-md" />
                </div>
              </div>

              <div className="relative z-10 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white/60 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0" />
                <div className="flex-1">
                  <div className="h-3 w-2/3 bg-slate-300 rounded-full mb-2" />
                  <div className="h-2 w-1/2 bg-slate-200 rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==========================================
          2. ZIG-ZAG STORYTELLING SECTIONS
          ========================================== */}
      <section className="relative z-10 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
          
          {/* Baris 1: Presisi GPS (Gambar di Kiri, Teks Kanan) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }}
              className="relative h-[400px] glass-panel rounded-[2.5rem] border border-white/60 p-8 flex flex-col justify-center overflow-hidden"
            >
               <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
               <Map className="w-16 h-16 text-blue-600 mb-8 relative z-10" />
               <div className="relative z-10 space-y-4">
                 {[
                   { label: "Lat", val: "-6.2088" },
                   { label: "Long", val: "106.8456" },
                   { label: "Speed", val: "45 km/h" },
                 ].map((stat, i) => (
                   <div key={i} className="flex justify-between items-center p-4 bg-white/60 rounded-xl border border-white shadow-sm backdrop-blur-md">
                     <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">{stat.label}</span>
                     <span className="font-mono font-bold text-slate-800 text-lg">{stat.val}</span>
                   </div>
                 ))}
               </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }}>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Presisi Lokasi <br/>Tingkat Enterprise.</h2>
              <p className="text-slate-600 leading-relaxed text-lg mb-6">
                Tidak ada lagi status &quot;Paket sedang dalam perjalanan&quot; yang abu-abu. Sistem kami menarik koordinat GPS dari perangkat <em>driver</em> setiap 10 detik.
              </p>
              <ul className="space-y-3">
                {['Akurasi hingga radius 5 meter', 'Pembaruan lokasi nyaris real-time', 'Terintegrasi dengan Google Maps API'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle className="w-5 h-5 text-brand-gold" /> {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Baris 2: e-POD (Teks Kiri, Gambar Kanan) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }} className="order-2 md:order-1">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Bukti Pengiriman <br/>Anti-Bantah (e-POD).</h2>
              <p className="text-slate-600 leading-relaxed text-lg mb-6">
                Lupakan kertas resi lecek yang mudah hilang. Kurir kami wajib mengambil foto serah terima barang di titik tujuan, yang langsung terenkripsi dan masuk ke dasbor Anda.
              </p>
              <ul className="space-y-3">
                {['Tanda tangan digital penerima', 'Foto barang di lokasi tujuan', 'Watermark waktu & koordinat otomatis'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle className="w-5 h-5 text-brand-maroon" /> {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }}
              className="order-1 md:order-2 relative h-[400px] glass-panel rounded-[2.5rem] border border-white/60 p-8 flex items-center justify-center overflow-hidden"
            >
               <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-brand-maroon/10 rounded-full blur-3xl" />
               {/* Camera Mockup UI */}
               <div className="relative z-10 w-full max-w-[280px] bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-slate-900">
                  <div className="h-48 bg-slate-200 relative flex items-center justify-center">
                    <Camera className="w-12 h-12 text-slate-400" />
                    {/* Overlay Frame */}
                    <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-xl" />
                  </div>
                  <div className="p-4 bg-slate-900 text-center">
                    <div className="w-12 h-12 mx-auto bg-brand-maroon rounded-full flex items-center justify-center -mt-10 border-4 border-slate-900 shadow-lg text-white mb-3">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <p className="text-white font-bold text-sm">Foto Berhasil Disimpan</p>
                    <p className="text-slate-400 text-xs mt-1">15 Ags 2026 • 14:30 WIB</p>
                  </div>
               </div>
            </motion.div>
          </div>

          {/* Baris 3: Share Link (Gambar Kiri, Teks Kanan) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }}
              className="relative h-[400px] glass-panel rounded-[2.5rem] border border-white/60 p-8 flex flex-col justify-center items-center overflow-hidden"
            >
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 bg-green-400/10 rounded-full blur-3xl" />
               <div className="relative z-10 w-full max-w-[300px] space-y-4">
                  {/* Mockup Chat Bubble */}
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-md border border-slate-100 flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-maroon flex items-center justify-center text-white shrink-0"><Share2 className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 mb-1">Paket Anda Sedang Dikirim!</p>
                      <p className="text-xs text-slate-500 leading-relaxed mb-3">Klik link di bawah untuk memantau posisi kurir secara langsung.</p>
                      <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded truncate">flash.gl/trk/9A8B7C</div>
                    </div>
                  </div>
               </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }}>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Bagikan Ketenangan <br/>ke Pelanggan Anda.</h2>
              <p className="text-slate-600 leading-relaxed text-lg mb-6">
                Tidak ada lagi pertanyaan &quot;Paket saya sampai mana?&quot;. Sistem akan mengirimkan tautan pelacakan interaktif (Web URL) otomatis via WhatsApp atau Email kepada penerima.
              </p>
              <ul className="space-y-3">
                {['Tautan unik untuk setiap resi pengiriman', 'Penerima tidak perlu unduh aplikasi', 'Mengurangi komplain CS hingga 80%'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle className="w-5 h-5 text-green-600" /> {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

        </div>
      </section>

      {/* ==========================================
          3. FULL WIDTH EDGE-TO-EDGE CTA
          ========================================== */}
      <section className="relative z-20 mt-12 border-y border-white/40 bg-white/30 backdrop-blur-2xl">
        {/* Abstract gradient strip */}
        <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-brand-maroon via-brand-gold to-brand-maroon" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-left">
          <div>
            <h2 className="font-heading text-3xl font-bold text-slate-900 mb-2">Siap Melacak Pengiriman Anda?</h2>
            <p className="text-slate-600">Integrasikan teknologi Live Tracking kami ke dalam operasional Anda hari ini.</p>
          </div>
          <Link 
            href="/login" 
            className="px-8 py-4 rounded-xl font-bold text-white bg-brand-maroon hover:bg-brand-maroon-dark transition-colors shadow-lg flex items-center gap-2 flex-shrink-0"
          >
            Masuk Portal Client <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

    </div>
  );
}