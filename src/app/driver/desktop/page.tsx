"use client";

import { motion } from "framer-motion";
import { Smartphone, MonitorX, QrCode, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DriverDesktopFallbackPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center relative overflow-hidden"
      >
        {/* Dekorasi Background Latar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#7A171D] to-[#C5A059]"></div>
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#C5A059]/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-[#7A171D]/10 rounded-full blur-3xl"></div>

        {/* Icon Tengah */}
        <div className="relative z-10 flex justify-center mb-6">
          <div className="relative">
            <MonitorX className="w-20 h-20 text-slate-300" />
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
              className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md"
            >
              <div className="bg-[#7A171D] text-white p-2 rounded-full">
                <Smartphone className="w-6 h-6" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Konten Teks */}
        <h1 className="text-2xl font-black text-slate-900 mb-3 relative z-10">
          Akses Desktop Dibatasi
        </h1>
        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 relative z-10">
          Portal Kemitraan Driver dirancang khusus untuk penggunaan *Mobile* agar memudahkan operasional di lapangan. Mode Desktop saat ini sedang dalam tahap <b>maintenance / pengembangan</b>.
        </p>

        {/* Box Instruksi */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 relative z-10 flex items-center gap-4 text-left">
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6 text-slate-700" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-0.5">Solusi Saat Ini</h4>
            <p className="text-[11px] text-slate-500 font-medium">Buka browser (Chrome/Safari) di *Smartphone* Anda, lalu akses kembali URL ini.</p>
          </div>
        </div>

        {/* Tombol Kembali */}
        <button 
          onClick={() => router.push("/")}
          className="relative z-10 w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </button>
      </motion.div>
    </div>
  );
}