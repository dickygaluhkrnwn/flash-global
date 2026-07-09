"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, CheckCircle2, AlertCircle, Coins, 
  Building, Bike, Car, Truck, MapPin, RefreshCw, Shield, Users, Plus, Trash2, X
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// --- IMPORT UI KIT PREMIUM ---
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// --- TYPES ---
export interface VehiclePricing {
  id: string; // id unik, misal: "blind-van"
  name: string; // "Blind Van"
  isMotor: boolean;
  maxWeight: number;
  baseFare: number;
  minKm: number;
  perKm: number;
  insurancePercent?: number; 
}

interface PricingConfig {
  b2bDiscount: number;
  tarifPorter: number;
  customVehicles: VehiclePricing[];
}

export default function AdminPricingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // State Modal Tambah Armada Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Partial<VehiclePricing>>({
    name: "", id: "", isMotor: false, maxWeight: 100, baseFare: 0, minKm: 0, perKm: 0, insurancePercent: 0
  });

  // State Default Tarif (Sekarang menggunakan Array dinamis)
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
    b2bDiscount: 15,
    tarifPorter: 50000,
    customVehicles: [
      { id: "motor", name: "Armada Motor", isMotor: true, maxWeight: 20, baseFare: 12000, minKm: 3, perKm: 2500, insurancePercent: 1.5 },
      { id: "mobil", name: "Mobil MPV/Van", isMotor: false, maxWeight: 300, baseFare: 45000, minKm: 5, perKm: 4000, insurancePercent: 0.2 },
      { id: "pickup", name: "Pickup Bak/Box", isMotor: false, maxWeight: 1000, baseFare: 80000, minKm: 5, perKm: 5500, insurancePercent: 0.2 },
      { id: "truk", name: "Truk Engkel CDE", isMotor: false, maxWeight: 2500, baseFare: 250000, minKm: 10, perKm: 8500, insurancePercent: 0.2 },
    ]
  });

  // Tarik data saat halaman dimuat
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Jika data customVehicles ada, gunakan itu. Jika menggunakan struktur lama, abaikan dan pakai default Array.
          if (data.customVehicles && Array.isArray(data.customVehicles)) {
            setPricingConfig({
              b2bDiscount: data.b2bDiscount || 15,
              tarifPorter: data.tarifPorter || 50000,
              customVehicles: data.customVehicles
            });
          } else {
             // Migrasi halus dari struktur lama (motor, mobil, pickup) ke array baru
             setPricingConfig(prev => ({
                ...prev,
                b2bDiscount: data.b2bDiscount || prev.b2bDiscount,
                tarifPorter: data.tarifPorter || prev.tarifPorter
             }));
          }
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

  // Mencegah scroll body saat modal terbuka
  useEffect(() => {
    if (isAddModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isAddModalOpen]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "pricing"), {
        ...pricingConfig,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      showToast("success", "Konfigurasi tarif armada berhasil diperbarui secara live!");
    } catch (error) {
      console.error("Gagal menyimpan konfigurasi tarif:", error);
      showToast("error", "Otoritas gagal. Periksa hak akses database Firebase Anda.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper Update Data dalam Array Armada
  const handleVehicleChange = (index: number, field: keyof VehiclePricing, value: any) => {
    const updatedVehicles = [...pricingConfig.customVehicles];
    updatedVehicles[index] = { ...updatedVehicles[index], [field]: value };
    setPricingConfig({ ...pricingConfig, customVehicles: updatedVehicles });
  };

  // Helper Hapus Armada
  const handleDeleteVehicle = (index: number) => {
    if (confirm("Yakin ingin menghapus armada ini dari sistem?")) {
      const updatedVehicles = pricingConfig.customVehicles.filter((_, i) => i !== index);
      setPricingConfig({ ...pricingConfig, customVehicles: updatedVehicles });
    }
  };

  // Helper Tambah Armada Baru
  const handleAddNewVehicle = () => {
    if (!newVehicle.name || !newVehicle.id) {
      alert("Nama dan ID Armada wajib diisi!");
      return;
    }
    const newV: VehiclePricing = {
      id: newVehicle.id.toLowerCase().replace(/\s+/g, '-'), // Pastikan ID huruf kecil dan spasi jadi strip
      name: newVehicle.name,
      isMotor: newVehicle.isMotor || false,
      maxWeight: Number(newVehicle.maxWeight) || 100,
      baseFare: Number(newVehicle.baseFare) || 0,
      minKm: Number(newVehicle.minKm) || 0,
      perKm: Number(newVehicle.perKm) || 0,
      insurancePercent: Number(newVehicle.insurancePercent) || 0,
    };

    setPricingConfig({
      ...pricingConfig,
      customVehicles: [...pricingConfig.customVehicles, newV]
    });
    
    setIsAddModalOpen(false);
    setNewVehicle({ name: "", id: "", isMotor: false, maxWeight: 100, baseFare: 0, minKm: 0, perKm: 0, insurancePercent: 0 });
    showToast("success", `Armada ${newV.name} berhasil ditambahkan! Jangan lupa tekan Simpan.`);
  };


  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-brand-maroon animate-spin mb-3" />
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest animate-pulse">Menghubungkan ke Manifes Pricing...</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-8 selection:bg-brand-maroon selection:text-white relative">
        
        {/* HEADER CONTROL PANEL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-gray-200/60">
          <div>
            <Badge variant="default" className="bg-brand-maroon/10 text-brand-maroon border-brand-maroon/20 mb-2">
              Control Panel System
            </Badge>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Konfigurasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-maroon to-brand-gold">Tarif & Armada</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Kelola harga dasar, proteksi asuransi, biaya operasional, dan tambah armada baru secara dinamis.</p>
          </div>

          <Button 
            onClick={handleSaveConfiguration}
            disabled={isSaving}
            className="w-full md:w-auto shadow-[0_4px_14px_0_rgba(122,23,29,0.25)] hover:shadow-[0_6px_20px_rgba(122,23,29,0.2)]"
          >
            {isSaving ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</>
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

        <div className="space-y-8">
          
          {/* ROW 1: PARAMETER GLOBAL LOGISTIK & B2B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CARD CONFIG PORTER / HELPER */}
            <Card className="shadow-premium border-gray-100">
              <CardHeader className="p-6 pb-0 flex flex-row items-center gap-4 space-y-0">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Tarif Tenaga Porter</h3>
                  <p className="text-xs text-gray-400 mt-1">Biaya bantuan bongkar muat per satu orang.</p>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">Rp</span>
                  <Input 
                    type="number" 
                    value={pricingConfig.tarifPorter} 
                    onChange={(e) => setPricingConfig({...pricingConfig, tarifPorter: Number(e.target.value)})}
                    className="pl-12 font-mono font-bold focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10"
                    required 
                  />
                </div>
              </CardContent>
            </Card>

            {/* CARD CONFIG B2B DISCOUNT */}
            <Card className="shadow-premium border-gray-100">
              <CardHeader className="p-6 pb-0 flex flex-row items-center gap-4 space-y-0">
                <div className="w-10 h-10 rounded-xl bg-brand-maroon/10 text-brand-maroon flex items-center justify-center shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Diskon Akun Korporat B2B</h3>
                  <p className="text-xs text-gray-400 mt-1">Potongan harga otomatis untuk akun dengan hak akses khusus.</p>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="100"
                    value={pricingConfig.b2bDiscount} 
                    onChange={(e) => setPricingConfig({...pricingConfig, b2bDiscount: Number(e.target.value)})} 
                    className="pr-12 font-bold text-lg focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10" 
                    required 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ROW 2: TARIF MULTIPLIER ARMADA KENDARAAN (DYNAMIC ARRAY) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 flex items-center gap-2">
                <Car className="w-4 h-4" /> Multiplier Tarif Matriks Kendaraan
              </h4>
              <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)} className="border-brand-maroon text-brand-maroon hover:bg-brand-maroon hover:text-white shadow-sm">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Armada Baru
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {pricingConfig.customVehicles.map((vehicle, index) => (
                  <motion.div key={vehicle.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <PricingCard 
                      index={index}
                      data={vehicle} 
                      onChange={handleVehicleChange}
                      onDelete={() => handleDeleteVehicle(index)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL TAMBAH ARMADA BARU TERPISAH DI LUAR CONTAINER */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
              onClick={() => setIsAddModalOpen(false)} 
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-brand-maroon" /> Tambah Armada Baru
                </h2>
                <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500">Nama Armada</label>
                    <Input placeholder="Cth: Blind Van" value={newVehicle.name} onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value, id: e.target.value})} className="border-gray-200 focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500">Maks Kapasitas (Kg)</label>
                    <Input type="number" placeholder="Cth: 800" value={newVehicle.maxWeight || ""} onChange={(e) => setNewVehicle({...newVehicle, maxWeight: Number(e.target.value)})} className="border-gray-200 focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10" />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
                  <input type="checkbox" id="isMotorCheck" checked={newVehicle.isMotor} onChange={(e) => setNewVehicle({...newVehicle, isMotor: e.target.checked})} className="w-4 h-4 accent-brand-maroon" />
                  <label htmlFor="isMotorCheck" className="text-sm font-bold text-gray-700 cursor-pointer">Kendaraan Roda Dua (Motor)?</label>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed border-gray-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500">Tarif Dasar (Rp)</label>
                    <Input type="number" placeholder="Cth: 50000" value={newVehicle.baseFare || ""} onChange={(e) => setNewVehicle({...newVehicle, baseFare: Number(e.target.value)})} className="border-gray-200 font-mono focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500">Tarif Selanjutnya / KM</label>
                    <Input type="number" placeholder="Cth: 4000" value={newVehicle.perKm || ""} onChange={(e) => setNewVehicle({...newVehicle, perKm: Number(e.target.value)})} className="border-gray-200 font-mono focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500">Jarak Minimum (Km)</label>
                    <Input type="number" placeholder="Cth: 5" value={newVehicle.minKm || ""} onChange={(e) => setNewVehicle({...newVehicle, minKm: Number(e.target.value)})} className="border-gray-200 focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-maroon">Rate Asuransi (%)</label>
                    <Input type="number" step="0.1" placeholder="Cth: 0.2" value={newVehicle.insurancePercent || ""} onChange={(e) => setNewVehicle({...newVehicle, insurancePercent: Number(e.target.value)})} className="border-brand-maroon/20 focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10" />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
                <Button onClick={handleAddNewVehicle} className="w-full bg-brand-maroon hover:bg-brand-maroon-dark text-white shadow-[0_4px_14px_0_rgba(122,23,29,0.25)] hover:shadow-[0_6px_20px_rgba(122,23,29,0.2)]">
                  <Plus className="w-4 h-4 mr-2" /> Simpan Armada Baru
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ======================================================================
// KOMPONEN CARD ARMADA DINAMIS
// ======================================================================
interface PricingCardProps {
  index: number;
  data: VehiclePricing;
  onChange: (index: number, field: keyof VehiclePricing, val: any) => void;
  onDelete: () => void;
}

function PricingCard({ index, data, onChange, onDelete }: PricingCardProps) {
  // Tema warna dinamis berdasarkan urutan card (Biar nggak bosan)
  const isMaroon = index % 2 === 0;
  const focusBorderClass = isMaroon ? "focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10" : "focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10";
  const badgeClass = isMaroon ? "bg-brand-maroon/10 text-brand-maroon" : "bg-brand-gold/10 text-brand-gold";

  return (
    <Card className="shadow-premium border-gray-100 overflow-hidden relative group">
      <CardHeader className="p-5 border-b border-gray-50 bg-gray-50/50 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${badgeClass}`}>
            <Car className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold text-gray-900 truncate" title={data.name}>{data.name}</h2>
            <p className="text-[10px] font-semibold text-gray-400 mt-0.5 uppercase tracking-wider">Maks {data.maxWeight} Kg</p>
          </div>
        </div>
        
        {/* Tombol Hapus (Muncul saat hover) */}
        <button onClick={onDelete} className="w-7 h-7 rounded bg-white border border-gray-200 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors opacity-0 group-hover:opacity-100 shrink-0 shadow-sm" title="Hapus Armada">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        
        {/* Base Fare */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-gray-400" /> Tarif Dasar (Base Fare)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Rp</span>
            <Input 
              type="number" 
              value={data.baseFare} 
              onChange={(e) => onChange(index, "baseFare", Number(e.target.value))} 
              className={`pl-12 font-mono font-bold ${focusBorderClass}`} 
              required
            />
          </div>
        </div>

        {/* Jarak Minimum */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400" /> Jarak Minimum (KM)
          </label>
          <div className="relative">
            <Input 
              type="number" 
              value={data.minKm} 
              onChange={(e) => onChange(index, "minKm", Number(e.target.value))} 
              className={`pr-12 font-bold ${focusBorderClass}`}
              required 
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">KM</span>
          </div>
        </div>

        {/* Tarif Next KM */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400" /> Tarif per KM Selanjutnya
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Rp</span>
            <Input 
              type="number" 
              value={data.perKm} 
              onChange={(e) => onChange(index, "perKm", Number(e.target.value))} 
              className={`pl-12 pr-14 font-mono font-bold ${focusBorderClass}`} 
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">/ KM</span>
          </div>
        </div>

        {/* Opsional Asuransi */}
        <div className="space-y-2 pt-2 border-t border-dashed border-gray-100">
          <label className="text-xs font-semibold text-brand-maroon flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Rate Asuransi Otomatis (%)
          </label>
          <div className="relative">
            <Input 
              type="number" 
              step="0.1" 
              value={data.insurancePercent || 0} 
              onChange={(e) => onChange(index, "insurancePercent", Number(e.target.value))} 
              className={`pr-10 font-bold border-brand-maroon/20 ${focusBorderClass}`} 
              required 
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">%</span>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}