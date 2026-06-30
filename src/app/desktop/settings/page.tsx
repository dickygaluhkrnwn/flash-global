"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, Shield, Save, Building, MapPin, Mail, Phone } from "lucide-react";
import Link from "next/link";

export default function DesktopSettingsPage() {
  const [activeTab, setActiveTab] = useState("profil");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulasi proses simpan ke database
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000); // Hilangkan notif setelah 3 detik
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-6 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-5 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto z-10 relative">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-[#7A171D] transition-colors font-semibold flex items-center gap-2 mb-4">
            &larr; Kembali ke Beranda
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900">Pengaturan Akun</h1>
          <p className="text-gray-500 mt-1">Kelola informasi profil dan preferensi sistem Anda.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Tabs */}
          <div className="w-full lg:w-1/4">
            <div className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 p-4 border border-gray-100 flex flex-col space-y-2">
              <button 
                onClick={() => setActiveTab("profil")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "profil" ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" : "text-gray-600 hover:bg-slate-50"
                }`}
              >
                <User className="w-5 h-5" /> Profil Pribadi
              </button>
              <button 
                onClick={() => setActiveTab("perusahaan")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "perusahaan" ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" : "text-gray-600 hover:bg-slate-50"
                }`}
              >
                <Building className="w-5 h-5" /> Data Perusahaan
              </button>
              <button 
                onClick={() => setActiveTab("notifikasi")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "notifikasi" ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" : "text-gray-600 hover:bg-slate-50"
                }`}
              >
                <Bell className="w-5 h-5" /> Notifikasi
              </button>
              <button 
                onClick={() => setActiveTab("keamanan")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "keamanan" ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" : "text-gray-600 hover:bg-slate-50"
                }`}
              >
                <Shield className="w-5 h-5" /> Keamanan
              </button>
            </div>
          </div>

          {/* Area Konten */}
          <div className="w-full lg:w-3/4">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 p-8 border border-gray-100"
            >
              
              <form onSubmit={handleSave} className="space-y-6">
                
                {/* KONTEN TAB: PROFIL */}
                {activeTab === "profil" && (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4 border-gray-100">Informasi Pribadi</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Nama Lengkap</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <input type="text" defaultValue="Bos Ekspedisi" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Email Utama (Read Only)</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="w-4 h-4 text-gray-400" />
                          </div>
                          {/* [TODO: Firebase] Email read-only ditarik dari Auth */}
                          <input type="email" defaultValue="bos@flashglobal.com" readOnly className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-100 bg-gray-100 text-gray-500 cursor-not-allowed outline-none" />
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-semibold text-gray-700">Nomor WhatsApp Aktif</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Phone className="w-4 h-4 text-gray-400" />
                          </div>
                          <input type="tel" defaultValue="+62 812-3456-7890" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* KONTEN TAB: PERUSAHAAN (B2B Context) */}
                {activeTab === "perusahaan" && (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4 border-gray-100">Profil Bisnis / B2B</h2>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Nama Perusahaan (Opsional)</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Building className="w-4 h-4 text-gray-400" />
                          </div>
                          <input type="text" placeholder="Contoh: PT. Ekspor Impor Maju" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Alamat Penjemputan / Gudang Default</label>
                        <div className="relative">
                          <div className="absolute top-4 left-0 pl-4 pointer-events-none">
                            <MapPin className="w-4 h-4 text-gray-400" />
                          </div>
                          <textarea rows={3} placeholder="Tuliskan alamat lengkap..." className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50 resize-none"></textarea>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* KONTEN TAB: NOTIFIKASI & KEAMANAN (Mockup) */}
                {(activeTab === "notifikasi" || activeTab === "keamanan") && (
                  <div className="py-10 text-center">
                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-700">Dalam Pengembangan</h3>
                    <p className="text-gray-500 mt-2">Fitur {activeTab} akan aktif pada tahap integrasi backend.</p>
                  </div>
                )}

                {/* Action Buttons */}
                {(activeTab === "profil" || activeTab === "perusahaan") && (
                  <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-4">
                    {isSuccess && (
                      <span className="text-sm font-bold text-green-600 bg-green-50 px-4 py-2 rounded-lg animate-pulse">
                        Perubahan berhasil disimpan!
                      </span>
                    )}
                    
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#7A171D]/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> Simpan Perubahan
                        </>
                      )}
                    </button>
                  </div>
                )}

              </form>
            </motion.div>
          </div>

        </div>
      </div>
    </main>
  );
}