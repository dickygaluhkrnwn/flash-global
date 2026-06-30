"use client";

import { motion } from "framer-motion";
import { Plane, Ship, ShieldAlert, Key, Globe2, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LayananKamiPage() {
  const coreServices = [
    {
      icon: Plane,
      title: "Kargo Udara Internasional",
      desc: "Solusi pengiriman ekspres untuk paket krusial Anda. Estimasi 3-5 hari kerja sampai ke alamat tujuan dengan prioritas utama.",
      badge: "Paling Cepat"
    },
    {
      icon: Ship,
      title: "Kargo Laut (LCL & FCL)",
      desc: "Pengiriman kontainer ekonomis untuk barang berkapasitas besar. Ideal untuk pelaku bisnis ekspor-impor ritel maupun korporat.",
      badge: "Hemat Biaya"
    },
    {
      icon: ShieldAlert,
      title: "Customs Clearance & Pabean",
      desc: "Tim ahli kami menangani seluruh kepengurusan dokumen kepabeanan, pajak impor, dan regulasi agar barang Anda lolos tanpa hambatan.",
      badge: "100% Legalitas"
    },
    {
      icon: Key,
      title: "Solusi Pergudangan & Drop Point",
      desc: "Fasilitas penyimpanan aman di jaringan gudang mitra global kami sebelum barang dikonsolidasikan dan dikirim ke alamat akhir.",
      badge: "Fasilitas Aman"
    }
  ];

  const destinations = [
    { country: "Singapura", time: "2-4 Hari", via: "Udara & Laut" },
    { country: "Malaysia", time: "3-5 Hari", via: "Udara & Laut" },
    { country: "Taiwan", time: "4-6 Hari", via: "Udara" },
    { country: "Australia", time: "5-7 Hari", via: "Udara & Laut" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-6 relative overflow-hidden">
      {/* Background Ornamen */}
      <div className="absolute top-0 left-[-10%] w-[50%] h-[50%] bg-[#7A171D] rounded-full blur-[150px] opacity-5 pointer-events-none" />
      <div className="absolute bottom-0 right-[-10%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Seksi */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-bold uppercase tracking-widest text-[#7A171D] bg-[#7A171D]/5 px-4 py-2 rounded-full border border-[#7A171D]/10 inline-block mb-4"
          >
            Layanan Utama Flash Global
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight"
          >
            Menghubungkan Bisnis Anda <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Ke Seluruh Penjuru Dunia.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-600 mt-4"
          >
            Kami menyediakan ekosistem logistik terintegrasi untuk memastikan rantai pasok perdagangan internasional Anda berjalan tanpa kendala.
          </motion.p>
        </div>

        {/* Core Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {coreServices.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5 flex flex-col md:flex-row gap-6 items-start group hover:border-[#C5A059]/40 hover:shadow-[#7A171D]/10 transition-all duration-300 relative overflow-hidden"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-[#7A171D] to-[#5A0E13] text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[#7A171D]/20 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-6 h-6 text-[#C5A059]" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#7A171D] transition-colors">{service.title}</h3>
                  <span className="text-[10px] font-extrabold text-[#7A171D] bg-[#7A171D]/5 border border-[#7A171D]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">{service.badge}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{service.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Destinasi Terpopuler & Call to Action */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-8 shadow-xl shadow-[#7A171D]/5">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-[#C5A059]" /> Estimasi Pengiriman Jalur Reguler
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {destinations.map((dest, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-gray-100 hover:bg-white hover:border-[#C5A059] transition-all group">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-bold text-gray-800">{dest.country}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#7A171D] flex items-center gap-1 justify-end"><Clock className="w-3 h-3" /> {dest.time}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{dest.via}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#7A171D] to-[#5A0E13] rounded-3xl p-8 text-white shadow-2xl shadow-[#7A171D]/30 flex flex-col justify-between h-full min-h-[280px]">
            <div>
              <h3 className="text-2xl font-black tracking-tight mb-2">Siap Melakukan Pengiriman?</h3>
              <p className="text-white/80 text-sm leading-relaxed"> Gunakan kalkulator instan kami untuk langsung mendapatkan penawaran tarif pengiriman terbaik hari ini.</p>
            </div>
            <Link href="/" className="bg-[#C5A059] hover:bg-[#DFBE7B] text-gray-900 font-bold px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all group mt-6 shadow-lg shadow-black/20">
              Buka Kalkulator Order <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}