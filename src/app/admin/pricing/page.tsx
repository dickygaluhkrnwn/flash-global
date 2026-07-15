"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Save, CheckCircle2, AlertCircle, Coins, 
  Building, Car, MapPin, RefreshCw, Shield, Users, 
  Search, Filter, ArrowUpDown, ShieldAlert, Activity
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// --- IMPORT UI KIT PREMIUM ---
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { PricingConfig } from "@/types/admin";
import { DynamicVehicle } from "@/types/order";

export default function AdminPricingPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); 
  const [sortBy, setSortBy] = useState("fare_asc"); 

  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
    b2bDiscount: 15,
    tarifPorter: 50000,
    customVehicles: []
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.customVehicles && Array.isArray(data.customVehicles)) {
            setPricingConfig({
              b2bDiscount: data.b2bDiscount || 15,
              tarifPorter: data.tarifPorter || 50000,
              customVehicles: data.customVehicles
            });
          }
        }
      } catch (error) {
        console.error("Gagal menarik master data tarif:", error);
        showToast("error", "Gagal memuat konfigurasi tarif dari database.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      
      showToast("success", "Konfigurasi tarif berhasil diperbarui ke seluruh sistem!");
    } catch (error) {
      console.error("Gagal menyimpan konfigurasi tarif:", error);
      showToast("error", "Otoritas gagal. Periksa koneksi atau hak akses database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVehicleChange = (index: number, field: keyof DynamicVehicle, value: number | string | boolean) => {
    // Kita harus mencari index asli di dalam array global berdasarkan ID armada yang diedit di hasil filter
    const vehicleId = processedData[index].id;
    const globalIndex = pricingConfig.customVehicles.findIndex(v => v.id === vehicleId);
    
    if (globalIndex !== -1) {
      const updatedVehicles = [...pricingConfig.customVehicles];
      // Menyalin item dan mengupdate nilainya dengan Type Casting yang aman
      updatedVehicles[globalIndex] = { ...updatedVehicles[globalIndex], [field]: value } as DynamicVehicle;
      setPricingConfig({ ...pricingConfig, customVehicles: updatedVehicles });
    }
  };

  // Logic Advanced Filter & Sort
  const processedData = pricingConfig.customVehicles
    .filter(v => {
      const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === "all" ? true : filterType === "motor" ? v.isMotor : !v.isMotor;
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      if (sortBy === "fare_asc") return a.baseFare - b.baseFare;
      if (sortBy === "fare_desc") return b.baseFare - a.baseFare;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });

  // =========================================================================
  // GUARDS: DITEMPATKAN DI BAWAH SEMUA HOOKS AGAR TIDAK MELANGGAR ATURAN REACT
  // =========================================================================

  // RBAC GUARD (Hanya Superadmin & Finance)
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Konfigurasi Tarif ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-10 h-10 text-[#7A171D] animate-pulse mb-4" />
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Sinkronisasi Matriks Tarif...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 font-sans">
      
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER CONTROL PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Badge variant="brand" className="mb-3 px-3 py-1 shadow-sm inline-flex items-center gap-1.5">
            <Coins className="w-3 h-3 fill-current"/> Finance Control Panel
          </Badge>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Konfigurasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Tarif Harga</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-2xl">Atur harga dasar, margin jarak tempuh, asuransi, dan kebijakan diskon korporat secara real-time.</p>
        </div>
        
        <Button 
          onClick={handleSaveConfiguration}
          disabled={isSaving}
          className="w-full md:w-auto h-12 px-8 text-sm font-bold shrink-0"
        >
          {isSaving ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Publikasi Tarif Live</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD CONFIG PORTER */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="p-6 pb-0 flex flex-row items-center gap-4 space-y-0">
            <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 text-[#A68345] flex items-center justify-center shrink-0 border border-[#C5A059]/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Tarif Tenaga Porter / Helper</h3>
              <p className="text-xs text-slate-500 mt-1">Biaya bantuan bongkar muat per satu orang personel.</p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">Rp</span>
              <Input 
                type="number" 
                value={pricingConfig.tarifPorter} 
                onChange={(e) => setPricingConfig({...pricingConfig, tarifPorter: Number(e.target.value)})}
                className="pl-12 font-mono font-bold text-lg"
                required 
              />
            </div>
          </CardContent>
        </Card>

        {/* CARD CONFIG B2B DISCOUNT */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="p-6 pb-0 flex flex-row items-center gap-4 space-y-0">
            <div className="w-12 h-12 rounded-xl bg-[#7A171D]/10 text-[#7A171D] flex items-center justify-center shrink-0 border border-[#7A171D]/20">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Diskon Akun Korporat (B2B)</h3>
              <p className="text-xs text-slate-500 mt-1">Potongan harga otomatis untuk akun terverifikasi.</p>
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
                className="pr-12 font-bold text-lg" 
                required 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Car className="w-5 h-5 text-[#7A171D]" /> Multiplier Tarif Matriks Armada
            </h3>
            <p className="text-sm text-slate-500 mt-1">Sesuaikan tarif dasar dan per kilometer untuk masing-masing kelas armada yang ada.</p>
          </div>
          
          {/* TOOLBAR FILTER & SEARCH */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Cari nama armada..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-[200px] bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-900 outline-none text-sm focus:border-[#7A171D] transition-all" />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-[#7A171D] appearance-none font-semibold text-slate-700 min-w-[120px]">
                  <option value="all">Semua Jenis</option>
                  <option value="motor">Roda Dua</option>
                  <option value="mobil">Roda Empat+</option>
                </select>
              </div>
              <div className="relative">
                <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-[#7A171D] appearance-none font-semibold text-slate-700 min-w-[140px]">
                  <option value="fare_asc">Tarif Termurah</option>
                  <option value="fare_desc">Tarif Termahal</option>
                  <option value="name_asc">Nama (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {pricingConfig.customVehicles.length === 0 && !isLoading && (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Car className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="text-slate-700 font-bold">Belum Ada Armada Dikonfigurasi</h4>
            <p className="text-slate-500 text-sm mt-1">Harap tambahkan armada melalui menu Master Data Kendaraan terlebih dahulu.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {processedData.map((vehicle, index) => (
              <motion.div key={vehicle.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                <PricingCard 
                  index={index}
                  data={vehicle} 
                  onChange={handleVehicleChange}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

// ======================================================================
// KOMPONEN CARD TARIF ARMADA DINAMIS
// ======================================================================
interface PricingCardProps {
  index: number;
  data: DynamicVehicle;
  onChange: (index: number, field: keyof DynamicVehicle, val: number | string | boolean) => void;
}

function PricingCard({ index, data, onChange }: PricingCardProps) {
  const isMaroon = data.isMotor; // Motor kita beri aksen Gold, Mobil aksen Maroon (bebas)
  const badgeClass = isMaroon ? "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/20" : "bg-[#7A171D]/10 text-[#7A171D] border-[#7A171D]/20";

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden relative group hover:shadow-md transition-shadow">
      <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", badgeClass)}>
            <Car className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-base font-bold text-slate-900 truncate" title={data.name}>{data.name}</h2>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider flex items-center gap-1.5">
              <span>{data.isMotor ? "Roda Dua" : "Roda Empat+"}</span> • <span>Maks {data.maxWeight} Kg</span>
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        
        {/* Base Fare */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-slate-400" /> Tarif Dasar (Base Fare)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
            <Input 
              type="number" 
              value={data.baseFare} 
              onChange={(e) => onChange(index, "baseFare", Number(e.target.value))} 
              className="pl-12 font-mono font-bold" 
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Jarak Minimum */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Jarak Min.
            </label>
            <div className="relative">
              <Input 
                type="number" 
                value={data.minKm} 
                onChange={(e) => onChange(index, "minKm", Number(e.target.value))} 
                className="pr-10 font-bold text-center"
                required 
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">KM</span>
            </div>
          </div>

          {/* Tarif Next KM */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Next / KM
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
              <Input 
                type="number" 
                value={data.perKm} 
                onChange={(e) => onChange(index, "perKm", Number(e.target.value))} 
                className="pl-9 font-mono font-bold" 
                required
              />
            </div>
          </div>
        </div>

        {/* Opsional Asuransi */}
        <div className="space-y-2 pt-3 border-t border-dashed border-slate-200">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#C5A059]" /> Rate Asuransi Otomatis
          </label>
          <div className="relative">
            <Input 
              type="number" 
              step="0.1" 
              value={data.insurancePercent || 0} 
              onChange={(e) => onChange(index, "insurancePercent", Number(e.target.value))} 
              className="pr-10 font-bold border-slate-300 bg-slate-50 focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/10" 
              required 
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">%</span>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}