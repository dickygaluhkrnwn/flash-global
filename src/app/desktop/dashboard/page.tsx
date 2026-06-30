"use client";

import { motion } from "framer-motion";
import { Package, Ship, Plane, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, FileText } from "lucide-react";
import Link from "next/link";

export default function DesktopDashboardPage() {
  // Data dummy manifesto pengiriman pengiriman internasional untuk presentasi
  const shipments = [
    { id: "FG-9831A-SG", destination: "Singapura (SIN)", weight: "12 Kg", type: "Udara", status: "Dalam Perjalanan", date: "30 Jun 2026", color: "text-blue-600 bg-blue-50 border-blue-100" },
    { id: "FG-7422B-MY", destination: "Malaysia (KUL)", weight: "85 Kg", type: "Laut", status: "Selesai", date: "28 Jun 2026", color: "text-green-600 bg-green-50 border-green-100" },
    { id: "FG-1092C-TW", destination: "Taiwan (TPE)", weight: "3 Kg", type: "Udara", status: "Tertahan Pabean", date: "25 Jun 2026", color: "text-amber-600 bg-amber-50 border-amber-100" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-[30%] h-[30%] bg-[#7A171D]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Dasbor Pengiriman</h1>
            <p className="text-gray-500 mt-1">Pantau performa distribusi logistik internasional Anda secara real-time.</p>
          </div>
          <Link href="/" className="bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#7A171D]/20">
            <Package className="w-5 h-5" /> Buat Booking Baru
          </Link>
        </div>

        {/* --- CATATAN INTEGRASI DATABASE (FIRESTORE) --- */}
        {/* [TODO: Firestore] Kartu statistik di bawah ini nantinya akan menghitung */}
        {/* total dokumen secara dinamis berdasarkan query status di Firestore */}
        {/* ------------------------------------------------ */}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total Pengiriman", value: "142", sub: "+12 bulan ini", icon: Package, color: "text-[#7A171D] bg-[#7A171D]/5" },
            { label: "Dalam Perjalanan", value: "9", sub: "3 Udara, 6 Laut", icon: Clock, color: "text-blue-600 bg-blue-50" },
            { label: "Tiba di Tujuan", value: "131", sub: "100% Aman sampai tujuan", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
            { label: "Isi Dokumen / Pabean", value: "2", sub: "Butuh tindakan segera", icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-gray-500">{stat.label}</p>
                <h3 className="text-3xl font-black text-gray-900 mt-2 tracking-tight">{stat.value}</h3>
                <span className="text-xs font-bold text-gray-400 mt-1 block">{stat.sub}</span>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Daftar Manifes Pengiriman Aktif */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Manifes Logistik Internasional</h3>
              <p className="text-xs font-medium text-gray-500 mt-0.5">Daftar 3 transaksi pengiriman terakhir akun Anda.</p>
            </div>
            <button className="text-sm font-bold text-[#7A171D] hover:text-[#C5A059] transition-colors flex items-center gap-1">
              Lihat Semua <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* --- CATATAN INTEGRASI DATABASE (FIRESTORE) --- */}
          {/* [TODO: Firestore] Bagian body tabel di bawah akan di-map dari state array */}
          {/* hasil fetching real-time snapshot database Firestore. */}
          {/* ------------------------------------------------ */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-gray-600 text-xs font-bold uppercase border-b border-gray-100">
                  <th className="px-6 py-4">ID Booking / AWB</th>
                  <th className="px-6 py-4">Destinasi</th>
                  <th className="px-6 py-4">Berat</th>
                  <th className="px-6 py-4">Via</th>
                  <th className="px-6 py-4">Tanggal Input</th>
                  <th className="px-6 py-4">Status Pengiriman</th>
                  <th className="px-6 py-4 text-center">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-700">
                {shipments.map((ship, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#7A171D]">{ship.id}</td>
                    <td className="px-6 py-4 text-gray-900">{ship.destination}</td>
                    <td className="px-6 py-4">{ship.weight}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                        {ship.type === "Udara" ? <Plane className="w-4 h-4 text-[#C5A059]" /> : <Ship className="w-4 h-4 text-blue-500" />}
                        {ship.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{ship.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${ship.color}`}>
                        {ship.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="p-2 text-gray-400 hover:text-[#7A171D] transition-colors bg-gray-50 hover:bg-red-50 rounded-lg inline-flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </main>
  );
}