"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, CheckCircle2, Truck, ShieldCheck, 
  Box, Scale, AlertCircle, Bike, Car, RefreshCw 
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// --- IMPORT UI KIT PREMIUM ---
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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
    setTimeout(() => setToastMessage(null), 4000);
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-brand-maroon animate-spin mb-3" />
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest animate-pulse">Memuat Modul Armada...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-8 selection:bg-brand-maroon selection:text-white">
      
      {/* HEADER CONTROL PANEL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-gray-200/60">
        <div>
          <Badge variant="default" className="bg-brand-maroon/10 text-brand-maroon border-brand-maroon/20 mb-2">
            Control Panel System
          </Badge>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Master Data <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-maroon to-brand-gold">Armada</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Konfigurasi dinamis batas berat, ukuran dimensi, dan asuransi proteksi.</p>
        </div>
        
        <Button 
          onClick={handleSaveConfiguration}
          disabled={isSaving}
          className="w-full md:w-auto shadow-[0_4px_14px_0_rgba(122,23,29,0.25)] hover:shadow-[0_6px_20px_rgba(122,23,29,0.2)]"
        >
          {isSaving ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Simpan Konfigurasi</>
          )}
        </Button>
      </div>

      {/* BANNER NOTIFIKASI */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl font-bold text-sm border flex items-center gap-3 shadow-sm ${toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
            <p>{toastMessage.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        
        {/* 1. SEGMEN ARMADA MOTOR */}
        <Card className="shadow-premium border-gray-100 overflow-hidden">
          <CardHeader className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-row items-center gap-3 space-y-0">
            <div className="w-10 h-10 bg-brand-maroon/10 text-brand-maroon rounded-lg flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Armada Motor (Instan/Sameday)</h2>
              <p className="text-xs text-gray-400 mt-0.5">Pengaturan spesifik untuk kurir roda dua.</p>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8">
            {/* Limit Berat */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2 uppercase tracking-wider">
                <Scale className="w-4 h-4 text-brand-maroon" /> Kategori Berat (Kg)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500">Maks. Berat "Kecil"</label>
                  <Input 
                    type="number" 
                    value={motorConfig.weightSmall} 
                    onChange={(e) => setMotorConfig({...motorConfig, weightSmall: Number(e.target.value)})} 
                    className="font-bold focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500">Maks. Berat "Sedang"</label>
                  <Input 
                    type="number" 
                    value={motorConfig.weightMedium} 
                    onChange={(e) => setMotorConfig({...motorConfig, weightMedium: Number(e.target.value)})} 
                    className="font-bold focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10" 
                  />
                </div>
              </div>
            </div>

            {/* Standar Dimensi S/M/L */}
            <div className="space-y-4 border-t border-dashed border-gray-100 pt-6">
              <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2 uppercase tracking-wider">
                <Box className="w-4 h-4 text-brand-gold" /> Standar Dimensi (PxLxT cm)
              </h3>
              
              {/* Size S */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <span className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg font-black text-gray-400 shrink-0">S</span>
                <div className="flex flex-1 gap-2">
                  <Input type="number" value={motorConfig.dimS.p} onChange={(e) => setMotorConfig({...motorConfig, dimS: {...motorConfig.dimS, p: Number(e.target.value)}})} className="text-center font-bold focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10 h-10 px-2" placeholder="P" />
                  <Input type="number" value={motorConfig.dimS.l} onChange={(e) => setMotorConfig({...motorConfig, dimS: {...motorConfig.dimS, l: Number(e.target.value)}})} className="text-center font-bold focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10 h-10 px-2" placeholder="L" />
                  <Input type="number" value={motorConfig.dimS.t} onChange={(e) => setMotorConfig({...motorConfig, dimS: {...motorConfig.dimS, t: Number(e.target.value)}})} className="text-center font-bold focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10 h-10 px-2" placeholder="T" />
                </div>
              </div>

              {/* Size M */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <span className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg font-black text-gray-400 shrink-0">M</span>
                <div className="flex flex-1 gap-2">
                  <Input type="number" value={motorConfig.dimM.p} onChange={(e) => setMotorConfig({...motorConfig, dimM: {...motorConfig.dimM, p: Number(e.target.value)}})} className="text-center font-bold focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10 h-10 px-2" placeholder="P" />
                  <Input type="number" value={motorConfig.dimM.l} onChange={(e) => setMotorConfig({...motorConfig, dimM: {...motorConfig.dimM, l: Number(e.target.value)}})} className="text-center font-bold focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10 h-10 px-2" placeholder="L" />
                  <Input type="number" value={motorConfig.dimM.t} onChange={(e) => setMotorConfig({...motorConfig, dimM: {...motorConfig.dimM, t: Number(e.target.value)}})} className="text-center font-bold focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10 h-10 px-2" placeholder="T" />
                </div>
              </div>

              {/* Size L */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <span className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg font-black text-gray-400 shrink-0">L</span>
                <div className="flex flex-1 gap-2">
                  <Input type="number" value={motorConfig.dimL.p} onChange={(e) => setMotorConfig({...motorConfig, dimL: {...motorConfig.dimL, p: Number(e.target.value)}})} className="text-center font-bold focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10 h-10 px-2" placeholder="P" />
                  <Input type="number" value={motorConfig.dimL.l} onChange={(e) => setMotorConfig({...motorConfig, dimL: {...motorConfig.dimL, l: Number(e.target.value)}})} className="text-center font-bold focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10 h-10 px-2" placeholder="L" />
                  <Input type="number" value={motorConfig.dimL.t} onChange={(e) => setMotorConfig({...motorConfig, dimL: {...motorConfig.dimL, t: Number(e.target.value)}})} className="text-center font-bold focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10 h-10 px-2" placeholder="T" />
                </div>
              </div>
            </div>

            {/* Asuransi Motor */}
            <div className="space-y-4 border-t border-dashed border-gray-100 pt-6">
              <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-brand-maroon" /> Nilai Garansi Barang (%)
              </h3>
              <div className="relative">
                <Input 
                  type="number" 
                  step="0.1" 
                  value={motorConfig.warrantyPercent} 
                  onChange={(e) => setMotorConfig({...motorConfig, warrantyPercent: Number(e.target.value)})} 
                  className="pr-12 font-bold focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10" 
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-gray-400">Persentase ini akan dikalikan dengan input "Nilai Barang" dari klien saat form booking.</p>
            </div>
          </CardContent>
        </Card>

        {/* 2. SEGMEN ARMADA MOBIL & BESAR */}
        <Card className="shadow-premium border-gray-100 overflow-hidden h-fit">
          <CardHeader className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-row items-center gap-3 space-y-0">
            <div className="w-10 h-10 bg-brand-gold/10 text-brand-gold rounded-lg flex items-center justify-center shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Armada Mobil & Truk</h2>
              <p className="text-xs text-gray-400 mt-0.5">Pengaturan untuk armada roda empat atau lebih.</p>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8">
            
            {/* Info Dimensi Custom */}
            <div className="bg-brand-gold/5 border border-brand-gold/20 p-4 rounded-xl flex gap-4 items-start">
              <Box className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-brand-gold text-sm">Dimensi Custom Otomatis Aktif</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Untuk armada Mobil, Pickup, Van, dan Truk, form dimensi (P x L x T) di sisi Klien akan selalu menggunakan input manual (custom) tanpa template S/M/L.
                </p>
              </div>
            </div>

            {/* Asuransi Mobil */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-brand-gold" /> Proteksi Asuransi Pengiriman (%)
              </h3>
              <div className="relative">
                <Input 
                  type="number" 
                  step="0.1" 
                  value={mobilConfig.insurancePercent} 
                  onChange={(e) => setMobilConfig({...mobilConfig, insurancePercent: Number(e.target.value)})} 
                  className="pr-12 font-bold focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10" 
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-gray-400">Nilai persentase potongan asuransi untuk armada besar.</p>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}