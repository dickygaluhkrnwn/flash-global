"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Save, CheckCircle2, AlertCircle, Coins, 
  Building, Car, MapPin, RefreshCw, Shield, Users, 
  Search, Filter, ArrowUpDown, ShieldAlert, Activity, PieChart
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// --- IMPORT UI KIT KITA ---
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// ======================================================================
// 🚀 TYPE DEFINITIONS EKSPLISIT (MENGHINDARI ERROR 'UNKNOWN' TYPESCRIPT)
// ======================================================================
interface AdminDynamicVehicle {
  id: string;
  name: string;
  category?: string;
  maxWeight?: number;
  isMotor?: boolean;
  baseFare?: number;
  minKm?: number;
  perKm?: number;
  insurancePercent?: number;
  appCommission?: number;
  [key: string]: unknown; // 🚀 Ganti any menjadi unknown
}

interface AdminPricingConfig {
  b2bDiscount: number;
  tarifPorter: number;
  customVehicles: AdminDynamicVehicle[];
  [key: string]: unknown; // 🚀 Ganti any menjadi unknown
}

export default function AdminPricingPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); 
  const [sortBy, setSortBy] = useState("fare_asc"); 

  const [pricingConfig, setPricingConfig] = useState<AdminPricingConfig>({
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
            // INJEKSI DEFAULT KOMISI: Jika sebelumnya belum ada, otomatis set ke 20%
            const mappedVehicles: AdminDynamicVehicle[] = data.customVehicles.map((v: Record<string, unknown>) => ({
              ...(v as AdminDynamicVehicle),
              appCommission: v.appCommission !== undefined ? Number(v.appCommission) : 20
            }));

            setPricingConfig({
              b2bDiscount: Number(data.b2bDiscount) || 15,
              tarifPorter: Number(data.tarifPorter) || 50000,
              customVehicles: mappedVehicles
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
      
      showToast("success", "Konfigurasi tarif & komisi berhasil diperbarui ke seluruh sistem!");
    } catch (error) {
      console.error("Gagal menyimpan konfigurasi tarif:", error);
      showToast("error", "Otoritas gagal. Periksa koneksi atau hak akses database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVehicleChange = (index: number, field: keyof AdminDynamicVehicle, value: number | string | boolean) => {
    const vehicleId = processedData[index].id;
    const globalIndex = pricingConfig.customVehicles.findIndex(v => v.id === vehicleId);
    
    if (globalIndex !== -1) {
      const updatedVehicles = [...pricingConfig.customVehicles];
      
      // Validasi Khusus Komisi (Tidak boleh lebih dari 100% atau minus)
      if (field === "appCommission") {
        let safeValue = Number(value);
        if (safeValue < 0) safeValue = 0;
        if (safeValue > 100) safeValue = 100;
        updatedVehicles[globalIndex] = { ...updatedVehicles[globalIndex], [field]: safeValue };
      } else {
        updatedVehicles[globalIndex] = { ...updatedVehicles[globalIndex], [field]: value };
      }

      setPricingConfig({ ...pricingConfig, customVehicles: updatedVehicles });
    }
  };

  const processedData = pricingConfig.customVehicles
    .filter(v => {
      const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === "all" ? true : filterType === "motor" ? v.isMotor : !v.isMotor;
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      const fareA = a.baseFare || 0;
      const fareB = b.baseFare || 0;
      if (sortBy === "fare_asc") return fareA - fareB;
      if (sortBy === "fare_desc") return fareB - fareA;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });

  // =========================================================================
  // GUARDS: RBAC
  // =========================================================================
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
    <div className="space-y-8 pb-10 font-sans max-w-[1600px] mx-auto">
      
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER STICKY CONTROL PANEL */}
      <div className="sticky top-4 z-40 bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Badge variant="brand" className="mb-3 px-3 py-1 shadow-sm inline-flex items-center gap-1.5">
            <Coins className="w-3 h-3 fill-current"/> Finance Control Panel
          </Badge>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Konfigurasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Tarif & Komisi</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-2xl">Atur harga dasar, margin jarak tempuh, asuransi, dan pembagian hasil (Profit Sharing) secara live.</p>
        </div>
        
        <Button 
          onClick={handleSaveConfiguration}
          disabled={isSaving}
          className="w-full md:w-auto h-14 px-10 text-sm font-black shrink-0 bg-[#7A171D] hover:bg-[#5A0E13] shadow-lg shadow-[#7A171D]/20 text-white transition-transform active:scale-95 rounded-2xl"
        >
          {isSaving ? (
            <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Menyimpan...</>
          ) : (
            <><Save className="w-5 h-5 mr-2" /> Terapkan ke Sistem</>
          )}
        </Button>
      </div>

      {/* PENGATURAN GLOBAL (PORTER & B2B) */}
      <div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" /> Pengaturan Global
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm border-slate-200 bg-white hover:border-amber-200 transition-colors">
            <CardHeader className="p-6 pb-0 flex flex-row items-center gap-4 space-y-0">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
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
                {/* 🚀 KUNCI PERBAIKAN: Cast eksplisit ke number */}
                <Input 
                  type="number" 
                  value={pricingConfig.tarifPorter as number} 
                  onChange={(e) => setPricingConfig({...pricingConfig, tarifPorter: Number(e.target.value)})}
                  className="pl-12 font-mono font-black text-lg h-14 bg-slate-50 border-slate-200 focus-visible:border-amber-400 focus-visible:ring-amber-400/20 rounded-xl"
                  required 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 bg-white hover:border-blue-200 transition-colors">
            <CardHeader className="p-6 pb-0 flex flex-row items-center gap-4 space-y-0">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Diskon Akun Korporat (B2B)</h3>
                <p className="text-xs text-slate-500 mt-1">Potongan harga otomatis untuk akun terverifikasi.</p>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                {/* 🚀 KUNCI PERBAIKAN: Cast eksplisit ke number */}
                <Input 
                  type="number" step="0.1" min="0" max="100"
                  value={pricingConfig.b2bDiscount as number} 
                  onChange={(e) => setPricingConfig({...pricingConfig, b2bDiscount: Number(e.target.value)})} 
                  className="pr-12 font-black text-lg h-14 bg-slate-50 border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-400/20 rounded-xl" 
                  required 
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MATRIKS TARIF ARMADA DINAMIS */}
      <div className="bg-slate-100/50 p-6 md:p-8 rounded-[2rem] border border-slate-200 space-y-8">
        
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-slate-200/60 pb-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Car className="w-6 h-6 text-[#7A171D]" /> Matriks Tarif & Profit Sharing
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xl leading-relaxed">
              Atur komponen harga jarak dan pembagian komisi secara spesifik untuk setiap klasifikasi armada. Nilai komisi aplikasi (Aplikasi %) akan otomatis memotong pendapatan kotor Driver.
            </p>
          </div>
          
          {/* TOOLBAR FILTER & SEARCH */}
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
            <div className="relative flex-1 sm:w-[220px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Cari armada..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent rounded-xl pl-10 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:bg-white focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/10 transition-all font-semibold" />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent rounded-xl pl-10 pr-8 py-2.5 text-sm outline-none focus:bg-white focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/10 appearance-none font-bold text-slate-700 cursor-pointer transition-all">
                  <option value="all">Semua Armada</option>
                  <option value="motor">Hanya Motor</option>
                  <option value="mobil">Mobil & Truk</option>
                </select>
              </div>
              <div className="relative flex-1 sm:flex-none">
                <ArrowUpDown className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent rounded-xl pl-10 pr-8 py-2.5 text-sm outline-none focus:bg-white focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/10 appearance-none font-bold text-slate-700 cursor-pointer transition-all">
                  <option value="fare_asc">Harga Terendah</option>
                  <option value="fare_desc">Harga Tertinggi</option>
                  <option value="name_asc">A - Z</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {pricingConfig.customVehicles.length === 0 && !isLoading && (
          <div className="py-16 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Car className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-slate-800 text-lg font-black tracking-tight">Belum Ada Armada Dikonfigurasi</h4>
            <p className="text-slate-500 text-sm mt-2 max-w-sm">Anda harus menambahkan klasifikasi armada melalui menu <b className="text-slate-700">Master Data Kendaraan</b> terlebih dahulu sebelum mengatur tarifnya di sini.</p>
            <Button onClick={() => router.push("/admin/vehicles")} variant="outline" className="mt-6 font-bold rounded-xl">Ke Master Kendaraan</Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {processedData.map((vehicle, index) => (
              <motion.div key={vehicle.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
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
// KOMPONEN KARTU TARIF (DENGAN VISUALISASI PROFIT SHARING)
// ======================================================================
interface PricingCardProps {
  index: number;
  data: AdminDynamicVehicle;
  onChange: (index: number, field: keyof AdminDynamicVehicle, val: number | string | boolean) => void;
}

function PricingCard({ index, data, onChange }: PricingCardProps) {
  const isMaroon = data.isMotor; 
  const badgeClass = isMaroon ? "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/20" : "bg-[#7A171D]/10 text-[#7A171D] border-[#7A171D]/20";

  // Kalkulasi Bagi Hasil (Default 20% jika kosong)
  const appShare = data.appCommission !== undefined ? Number(data.appCommission) : 20; 
  const driverShare = Math.max(0, 100 - appShare);

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden relative flex flex-col bg-white hover:border-slate-300 hover:shadow-md transition-all h-full">
      <CardHeader className="p-5 border-b border-slate-100 bg-slate-50 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border", badgeClass)}>
            <Car className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-lg font-black text-slate-900 truncate" title={data.name}>{data.name}</h2>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1.5">
              <span>{data.isMotor ? "Roda Dua" : "Roda Empat+"}</span> • <span>Maks {data.maxWeight || 0} Kg</span>
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 flex-1 flex flex-col gap-6">
        
        {/* ROW 1: TARIF DASAR */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#C5A059]" /> Tarif Dasar (Base Fare)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
            {/* 🚀 KUNCI PERBAIKAN: Cast eksplisit ke number */}
            <Input 
              type="number" 
              value={data.baseFare as number} 
              onChange={(e) => onChange(index, "baseFare", Number(e.target.value))} 
              className="pl-12 font-mono font-black text-lg h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:border-[#7A171D] focus-visible:ring-[#7A171D]/10" 
              required
            />
          </div>
        </div>

        {/* ROW 2: JARAK & NEXT KM */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Jarak Minimum
            </label>
            <div className="relative">
              {/* 🚀 KUNCI PERBAIKAN: Cast eksplisit ke number */}
              <Input 
                type="number" 
                value={data.minKm as number} 
                onChange={(e) => onChange(index, "minKm", Number(e.target.value))} 
                className="pr-12 font-bold text-center h-10 border-slate-200 bg-white rounded-lg focus-visible:border-[#7A171D]"
                required 
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">KM</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Next Tarif / KM
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
              {/* 🚀 KUNCI PERBAIKAN: Cast eksplisit ke number */}
              <Input 
                type="number" 
                value={data.perKm as number} 
                onChange={(e) => onChange(index, "perKm", Number(e.target.value))} 
                className="pl-9 font-mono font-bold h-10 border-slate-200 bg-white rounded-lg focus-visible:border-[#7A171D]" 
                required
              />
            </div>
          </div>
        </div>

        {/* ROW 3: ASURANSI & PROFIT SHARING */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-500" /> Rate Asuransi
            </label>
            <div className="relative">
              {/* 🚀 KUNCI PERBAIKAN: Cast eksplisit ke number */}
              <Input 
                type="number" step="0.1" min="0" max="100"
                value={data.insurancePercent as number} 
                onChange={(e) => onChange(index, "insurancePercent", Number(e.target.value))} 
                className="pr-8 font-bold h-11 border-slate-200 rounded-xl focus-visible:border-blue-500 focus-visible:ring-blue-500/10" 
                required 
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Beban ke Client</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#7A171D] uppercase tracking-widest flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5" /> Komisi Aplikasi
            </label>
            <div className="relative">
              {/* 🚀 KUNCI PERBAIKAN: Cast eksplisit ke number */}
              <Input 
                type="number" step="1" min="0" max="100"
                value={appShare as number} 
                onChange={(e) => onChange(index, "appCommission", Number(e.target.value))} 
                className="pr-8 font-black text-[#7A171D] h-11 border-[#7A171D]/30 bg-[#7A171D]/5 rounded-xl focus-visible:border-[#7A171D] focus-visible:ring-[#7A171D]/10" 
                required 
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A171D]/50 font-bold text-sm">%</span>
            </div>
            <p className="text-[9px] text-[#7A171D]/60 font-bold">Potongan ke Driver</p>
          </div>

        </div>

        {/* VISUAL SPLIT BAR PROFIT SHARING */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Porsi Driver</p>
              <p className="text-base font-black text-emerald-600 leading-none">{driverShare}%</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-[#7A171D] uppercase tracking-widest mb-0.5">Porsi Aplikasi</p>
              <p className="text-base font-black text-[#7A171D] leading-none">{appShare}%</p>
            </div>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100">
            <div className="h-full bg-emerald-500 transition-all duration-500 ease-out" style={{ width: `${driverShare}%` }}></div>
            <div className="h-full bg-[#7A171D] transition-all duration-500 ease-out" style={{ width: `${appShare}%` }}></div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}