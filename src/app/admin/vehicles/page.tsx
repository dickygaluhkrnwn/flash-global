"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, CheckCircle2, Truck, ShieldCheck, 
  Box, Scale, AlertCircle, Bike, Car 
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function AdminVehiclesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // State untuk Armada Motor
  const [motorConfig, setMotorConfig] = useState({
    weightSmall: 5,
    weightMedium: 20,
    dimS: { p: 20, l: 20, t: 20 },
    dimM: { p: 40, l: 40, t: 40 },
    dimL: { p: 50, l: 50, t: 50 },
    warrantyPercent: 1.5, // 1.5%
  });

  // State untuk Armada Mobil/Besar
  const [mobilConfig, setMobilConfig] = useState({
    insurancePercent: 0.2, // 0.2%
    customDimension: true,
  });

  // Tarik data saat halaman dimuat
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "vehicles");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.motor) setMotorConfig(data.motor);
          if (data.mobil) setMobilConfig(data.mobil);
        }
      } catch (error) {
        console.error("Gagal menarik master data armada:", error);
        showToast("error", "Gagal memuat konfigurasi dari database.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "vehicles"), {
        motor: motorConfig,
        mobil: mobilConfig,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      showToast("success", "Master data armada berhasil diperbarui!");
    } catch (error) {
      console.error("Gagal menyimpan konfigurasi:", error);
      showToast("error", "Gagal menyimpan konfigurasi ke database.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 font-bold animate-pulse">
        Memuat Modul Armada...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* Header Modul */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Truck className="w-6 h-6 text-[#7A171D]" /> Master Data Armada
          </h1>
          <p className="text-slate-400 text-sm mt-1">Konfigurasi dinamis batas berat, ukuran dimensi, dan asuransi.</p>
        </div>
        <button 
          onClick={handleSaveConfiguration}
          disabled={isSaving}
          className="bg-gradient-to-r from-[#7A171D] to-[#5A0E13] hover:from-[#942128] hover:to-[#7A171D] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/20 disabled:opacity-50 shrink-0"
        >
          {isSaving ? "Menyimpan Data..." : <><Save className="w-4 h-4" /> Simpan Konfigurasi</>}
        </button>
      </div>

      {/* Notifikasi Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl font-bold text-sm border flex items-center gap-3 ${toastMessage.type === 'success' ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400' : 'bg-red-950/30 border-red-900 text-red-400'}`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* 1. SEGMEN ARMADA MOTOR */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Armada Motor (Instan/Sameday)</h2>
              <p className="text-xs text-slate-400">Pengaturan spesifik untuk kurir roda dua.</p>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Limit Berat */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                <Scale className="w-4 h-4 text-blue-400" /> Kategori Berat (Kg)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500">Maks. Berat &quot;Kecil&quot;</label>
                  <input type="number" value={motorConfig.weightSmall} onChange={(e) => setMotorConfig({...motorConfig, weightSmall: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500">Maks. Berat &quot;Sedang&quot;</label>
                  <input type="number" value={motorConfig.weightMedium} onChange={(e) => setMotorConfig({...motorConfig, weightMedium: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 font-bold" />
                </div>
              </div>
            </div>

            {/* Standar Dimensi S/M/L */}
            <div className="space-y-4 border-t border-slate-800 pt-6">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                <Box className="w-4 h-4 text-emerald-400" /> Standar Dimensi (PxLxT cm)
              </h3>
              
              {/* Size S */}
              <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg font-black text-slate-300 shrink-0">S</span>
                <div className="flex flex-1 gap-2">
                  <input type="number" value={motorConfig.dimS.p} onChange={(e) => setMotorConfig({...motorConfig, dimS: {...motorConfig.dimS, p: Number(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-center text-white outline-none focus:border-emerald-500 text-sm" placeholder="P" />
                  <input type="number" value={motorConfig.dimS.l} onChange={(e) => setMotorConfig({...motorConfig, dimS: {...motorConfig.dimS, l: Number(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-center text-white outline-none focus:border-emerald-500 text-sm" placeholder="L" />
                  <input type="number" value={motorConfig.dimS.t} onChange={(e) => setMotorConfig({...motorConfig, dimS: {...motorConfig.dimS, t: Number(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-center text-white outline-none focus:border-emerald-500 text-sm" placeholder="T" />
                </div>
              </div>

              {/* Size M */}
              <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg font-black text-slate-300 shrink-0">M</span>
                <div className="flex flex-1 gap-2">
                  <input type="number" value={motorConfig.dimM.p} onChange={(e) => setMotorConfig({...motorConfig, dimM: {...motorConfig.dimM, p: Number(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-center text-white outline-none focus:border-emerald-500 text-sm" placeholder="P" />
                  <input type="number" value={motorConfig.dimM.l} onChange={(e) => setMotorConfig({...motorConfig, dimM: {...motorConfig.dimM, l: Number(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-center text-white outline-none focus:border-emerald-500 text-sm" placeholder="L" />
                  <input type="number" value={motorConfig.dimM.t} onChange={(e) => setMotorConfig({...motorConfig, dimM: {...motorConfig.dimM, t: Number(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-center text-white outline-none focus:border-emerald-500 text-sm" placeholder="T" />
                </div>
              </div>

              {/* Size L */}
              <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg font-black text-slate-300 shrink-0">L</span>
                <div className="flex flex-1 gap-2">
                  <input type="number" value={motorConfig.dimL.p} onChange={(e) => setMotorConfig({...motorConfig, dimL: {...motorConfig.dimL, p: Number(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-center text-white outline-none focus:border-emerald-500 text-sm" placeholder="P" />
                  <input type="number" value={motorConfig.dimL.l} onChange={(e) => setMotorConfig({...motorConfig, dimL: {...motorConfig.dimL, l: Number(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-center text-white outline-none focus:border-emerald-500 text-sm" placeholder="L" />
                  <input type="number" value={motorConfig.dimL.t} onChange={(e) => setMotorConfig({...motorConfig, dimL: {...motorConfig.dimL, t: Number(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-center text-white outline-none focus:border-emerald-500 text-sm" placeholder="T" />
                </div>
              </div>
            </div>

            {/* Asuransi Motor */}
            <div className="space-y-4 border-t border-slate-800 pt-6">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-purple-400" /> Nilai Garansi Barang (%)
              </h3>
              <div className="relative">
                <input type="number" step="0.1" value={motorConfig.warrantyPercent} onChange={(e) => setMotorConfig({...motorConfig, warrantyPercent: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-10 py-3 text-white outline-none focus:border-purple-500 font-bold" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-500">Persentase ini akan dikalikan dengan input &quot;Nilai Barang&quot; dari klien saat form booking.</p>
            </div>
          </div>
        </div>

        {/* 2. SEGMEN ARMADA MOBIL & BESAR */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl h-fit">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Armada Mobil & Truk</h2>
              <p className="text-xs text-slate-400">Pengaturan untuk armada roda empat atau lebih.</p>
            </div>
          </div>

          <div className="p-6 space-y-8">
            
            {/* Info Dimensi Custom */}
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex gap-4 items-start">
              <Box className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">Dimensi Custom Otomatis Aktif</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Untuk armada Mobil, Pickup, Van, dan Truk, form dimensi (P x L x T) di sisi Klien akan selalu menggunakan input manual (custom) tanpa template S/M/L.
                </p>
              </div>
            </div>

            {/* Asuransi Mobil */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-purple-400" /> Proteksi Asuransi Pengiriman (%)
              </h3>
              <div className="relative">
                <input type="number" step="0.1" value={mobilConfig.insurancePercent} onChange={(e) => setMobilConfig({...mobilConfig, insurancePercent: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-10 py-3 text-white outline-none focus:border-purple-500 font-bold" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-500">Nilai persentase potongan asuransi untuk armada besar.</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}