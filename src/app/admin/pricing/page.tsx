"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, CheckCircle2, AlertCircle, Coins, 
  Building, Bike, Car, Truck, MapPin
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Tipe data agar TypeScript Vercel bahagia
interface VehiclePricing {
  baseFare: number;
  minKm: number;
  perKm: number;
}

interface PricingConfig {
  b2bDiscount: number;
  motor: VehiclePricing;
  mobil: VehiclePricing;
  pickup: VehiclePricing;
  truk: VehiclePricing;
}

export default function AdminPricingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // State Default Tarif
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
    b2bDiscount: 15, // Default 15% diskon B2B
    motor: { baseFare: 12000, minKm: 3, perKm: 2500 },
    mobil: { baseFare: 45000, minKm: 5, perKm: 4000 },
    pickup: { baseFare: 80000, minKm: 5, perKm: 5500 },
    truk: { baseFare: 250000, minKm: 10, perKm: 8500 },
  });

  // Tarik data saat halaman dimuat
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as PricingConfig;
          // Merge data dari database dengan struktur state kita
          setPricingConfig(prev => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error("Gagal menarik master data tarif:", error);
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
      await setDoc(doc(db, "settings", "pricing"), {
        ...pricingConfig,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      showToast("success", "Master data tarif berhasil diperbarui!");
    } catch (error) {
      console.error("Gagal menyimpan konfigurasi tarif:", error);
      showToast("error", "Gagal menyimpan konfigurasi ke database.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper untuk update state spesifik kendaraan
  const handleVehicleChange = (vehicle: keyof PricingConfig, field: keyof VehiclePricing, value: number) => {
    setPricingConfig(prev => ({
      ...prev,
      [vehicle]: {
        ...(prev[vehicle] as VehiclePricing),
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 font-bold animate-pulse">
        Memuat Modul Tarif...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* Header Modul */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Coins className="w-6 h-6 text-[#C5A059]" /> Konfigurasi Tarif
          </h1>
          <p className="text-slate-400 text-sm mt-1">Atur tarif dasar, harga per-KM, dan diskon grosir B2B.</p>
        </div>
        <button 
          onClick={handleSaveConfiguration}
          disabled={isSaving}
          className="bg-gradient-to-r from-[#C5A059] to-[#9c7d42] hover:from-[#b08d4a] hover:to-[#C5A059] text-slate-900 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/20 disabled:opacity-50 shrink-0"
        >
          {isSaving ? "Menyimpan Data..." : <><Save className="w-4 h-4" /> Simpan Tarif</>}
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

      {/* 1. SEGMEN B2B DISCOUNT */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50">
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Tarif B2B (Corporate Discount)</h2>
            <p className="text-xs text-slate-400">Potongan harga otomatis untuk akun dengan status B2B Aktif.</p>
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-md space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Persentase Diskon Final (%)</label>
            <div className="relative">
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="100"
                value={pricingConfig.b2bDiscount} 
                onChange={(e) => setPricingConfig({...pricingConfig, b2bDiscount: Number(e.target.value)})} 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-10 py-3 text-emerald-400 outline-none focus:border-emerald-500 font-bold text-lg" 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem akan menghitung total ongkos kirim reguler terlebih dahulu, kemudian menguranginya sebesar persentase ini khusus untuk Klien B2B.
            </p>
          </div>
        </div>
      </div>

      {/* 2. SEGMEN TARIF PER ARMADA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card Motor */}
        <PricingCard 
          icon={Bike} 
          title="Armada Motor" 
          colorClass="text-blue-400 bg-blue-500/10 focus:border-blue-500" 
          data={pricingConfig.motor} 
          onChange={(field, val) => handleVehicleChange("motor", field, val)} 
        />

        {/* Card Mobil */}
        <PricingCard 
          icon={Car} 
          title="Armada Mobil (Hatchback/MPV)" 
          colorClass="text-amber-400 bg-amber-500/10 focus:border-amber-500" 
          data={pricingConfig.mobil} 
          onChange={(field, val) => handleVehicleChange("mobil", field, val)} 
        />

        {/* Card Pickup */}
        <PricingCard 
          icon={Truck} 
          title="Armada Pickup (Bak/Box)" 
          colorClass="text-orange-400 bg-orange-500/10 focus:border-orange-500" 
          data={pricingConfig.pickup} 
          onChange={(field, val) => handleVehicleChange("pickup", field, val)} 
        />

        {/* Card Truk */}
        <PricingCard 
          icon={Truck} 
          title="Armada Truk (Engkel/CDD)" 
          colorClass="text-red-400 bg-red-500/10 focus:border-red-500" 
          data={pricingConfig.truk} 
          onChange={(field, val) => handleVehicleChange("truk", field, val)} 
        />

      </div>

    </div>
  );
}

// Komponen Helper untuk Card Tarif Armada agar kode bersih
interface PricingCardProps {
  icon: React.ElementType;
  title: string;
  colorClass: string;
  data: VehiclePricing;
  onChange: (field: keyof VehiclePricing, val: number) => void;
}

function PricingCard({ icon: Icon, title, colorClass, data, onChange }: PricingCardProps) {
  // Ambil hanya class fokus untuk input
  const focusBorder = colorClass.split(" ").find(c => c.startsWith("focus:"));

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="p-5 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass.split("focus:")[0]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>

      <div className="p-6 space-y-5">
        
        {/* Base Fare */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
            <Coins className="w-3.5 h-3.5" /> Tarif Dasar (Base Fare)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">Rp</span>
            <input 
              type="number" 
              value={data.baseFare} 
              onChange={(e) => onChange("baseFare", Number(e.target.value))} 
              className={`w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-white outline-none ${focusBorder} font-bold`} 
            />
          </div>
        </div>

        {/* Jarak Minimum */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" /> Jarak Minimum (KM)
          </label>
          <div className="relative">
            <input 
              type="number" 
              value={data.minKm} 
              onChange={(e) => onChange("minKm", Number(e.target.value))} 
              className={`w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-2.5 text-white outline-none ${focusBorder} font-bold`} 
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">KM</span>
          </div>
          <p className="text-[10px] text-slate-500">Tarif dasar berlaku mutlak hingga jarak ini.</p>
        </div>

        {/* Tarif Next KM */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" /> Tarif per Kilometer Selanjutnya
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">Rp</span>
            <input 
              type="number" 
              value={data.perKm} 
              onChange={(e) => onChange("perKm", Number(e.target.value))} 
              className={`w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-12 py-2.5 text-white outline-none ${focusBorder} font-bold`} 
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">/ KM</span>
          </div>
        </div>

      </div>
    </div>
  );
}