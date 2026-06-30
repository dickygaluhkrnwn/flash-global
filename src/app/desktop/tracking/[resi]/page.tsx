"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, MapPin, Plane, Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TrackingResultPage({ params }: { params: { resi: string } }) {
  // Decode nomor resi dari URL (contoh: FG-9831A-SG)
  const awbNumber = decodeURIComponent(params.resi);

  // --- CATATAN INTEGRASI API / DATABASE ---
  // [TODO: TLX API / Firebase] Di tahap integrasi, data timeline ini akan diganti
  // dengan hasil fetch API TLX (Skenario A) atau data dari Firestore (Skenario B/C)
  // berdasarkan awbNumber di atas.
  // ----------------------------------------
  
  // Data Dummy Prototype
  const dummyTimeline = [
    {
      id: 1,
      status: "Tiba di Negara Tujuan",
      description: "Paket telah tiba di fasilitas logistik Singapura (SIN) dan sedang menunggu proses bea cukai.",
      location: "Changi Airport, Singapore",
      date: "30 Jun 2026, 14:30 WITA",
      icon: MapPin,
      isCompleted: true,
      isCurrent: true,
    },
    {
      id: 2,
      status: "Berangkat menuju Negara Tujuan",
      description: "Paket diterbangkan menuju Singapura via pesawat kargo.",
      location: "Soekarno-Hatta Airport (CGK), Jakarta",
      date: "29 Jun 2026, 09:15 WITA",
      icon: Plane,
      isCompleted: true,
      isCurrent: false,
    },
    {
      id: 3,
      status: "Diproses di Gudang Utama",
      description: "Paket sedang dalam proses sortir dan konsolidasi ekspor.",
      location: "Gudang Flash Global, Jakarta",
      date: "28 Jun 2026, 16:45 WITA",
      icon: Package,
      isCompleted: true,
      isCurrent: false,
    },
    {
      id: 4,
      status: "Paket Dijemput",
      description: "Kurir telah menjemput paket dari lokasi pengirim.",
      location: "Lombok Tengah, NTB",
      date: "27 Jun 2026, 10:00 WITA",
      icon: CheckCircle2,
      isCompleted: true,
      isCurrent: false,
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-6 relative">
      <div className="max-w-4xl mx-auto z-10 relative">
        
        {/* Header (Back Button & Resi Info) */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link href="/tracking" className="text-sm text-gray-500 hover:text-[#7A171D] transition-colors font-semibold flex items-center gap-2 mb-4 w-fit">
              <ArrowLeft className="w-4 h-4" /> Cari Resi Lain
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900">Hasil Pelacakan</h1>
          </div>
          
          <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-[#7A171D]" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">No. AWB (Resi)</p>
              <p className="text-lg font-black text-[#7A171D]">{awbNumber}</p>
            </div>
          </div>
        </div>

        {/* Info Box Destinasi */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#7A171D]/5 border border-gray-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex-1 w-full flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center shrink-0 border border-gray-200">
              <MapPin className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">Asal</p>
              <p className="text-lg font-extrabold text-gray-900">Indonesia</p>
            </div>
          </div>

          <div className="hidden md:flex flex-1 w-full items-center justify-center text-[#C5A059]">
            <div className="w-full h-0.5 bg-gray-100 relative flex items-center justify-center">
              <Plane className="w-6 h-6 absolute bg-white px-1 text-[#C5A059]" />
            </div>
          </div>

          <div className="flex-1 w-full flex items-center md:justify-end gap-4 text-right">
            <div className="md:order-1 order-2">
              <p className="text-sm font-bold text-gray-500">Tujuan</p>
              <p className="text-lg font-extrabold text-gray-900">Singapura</p>
            </div>
            <div className="w-12 h-12 bg-[#7A171D]/10 rounded-full flex items-center justify-center shrink-0 border border-[#7A171D]/20 md:order-2 order-1">
              <MapPin className="w-5 h-5 text-[#7A171D]" />
            </div>
          </div>
        </motion.div>

        {/* Timeline Visualisasi */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#7A171D]/5 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-8 flex items-center gap-2 border-b pb-4 border-gray-100">
            <Clock className="w-5 h-5 text-[#C5A059]" /> Riwayat Perjalanan
          </h3>

          <div className="relative pl-4 md:pl-8">
            {/* Garis vertikal timeline */}
            <div className="absolute top-0 bottom-0 left-[35px] md:left-[51px] w-0.5 bg-gray-100"></div>

            <div className="space-y-8 relative">
              {dummyTimeline.map((item, index) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex gap-4 md:gap-6 relative"
                >
                  {/* Icon Node */}
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 relative z-10 border-4 border-white shadow-sm ${
                    item.isCurrent ? "bg-[#7A171D] text-white shadow-lg shadow-[#7A171D]/30" : 
                    item.isCompleted ? "bg-[#C5A059] text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>

                  {/* Konten Timeline */}
                  <div className="pt-1 flex-1 pb-2">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1 mb-1">
                      <h4 className={`text-base font-extrabold ${item.isCurrent ? "text-[#7A171D]" : "text-gray-900"}`}>
                        {item.status}
                      </h4>
                      <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg shrink-0">
                        {item.date}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-2">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                      <MapPin className="w-3.5 h-3.5" /> {item.location}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}