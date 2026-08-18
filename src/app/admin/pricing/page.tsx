"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Save, CheckCircle2, AlertCircle, Coins, 
  Building, Car, RefreshCw, Shield, Users, 
  Search, Filter, ArrowUpDown, ShieldAlert, Activity, PieChart
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// IMPORT GLOBAL TYPES DARI FINANCE
import { AdminDynamicVehicle, AdminPricingConfig } from "@/types/finance";

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getAdminUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
    return path.replace(/^\/admin/, '') || '/';
  }
  return path; 
};

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

export default function AdminPricingPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
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
          // KODE DIBERSIHKAN: Safe typing extraction
          const data = docSnap.data() as Record<string, unknown>;
          
          if (data.customVehicles && Array.isArray(data.customVehicles)) {
            const mappedVehicles: AdminDynamicVehicle[] = data.customVehicles.map((v: unknown) => {
              const vehicleData = v as Record<string, unknown>;
              return {
                ...(vehicleData as unknown as AdminDynamicVehicle),
                appCommission: vehicleData.appCommission !== undefined ? Number(vehicleData.appCommission) : 20
              };
            });

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
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // HANDLER: SIMPAN PENGATURAN GLOBAL (PORTER & B2B)
  const handleSaveGlobalSettings = async (newPorter: number, newB2b: number) => {
    try {
      await setDoc(doc(db, "settings", "pricing"), {
        tarifPorter: newPorter,
        b2bDiscount: newB2b,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      setPricingConfig(prev => ({ ...prev, tarifPorter: newPorter, b2bDiscount: newB2b }));
      showToast("success", "Pengaturan Global (Porter & B2B) berhasil diperbarui!");
      return true;
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal menyimpan pengaturan global.");
      return false;
    }
  };

  // HANDLER: SIMPAN TARIF PER KENDARAAN (INDIVIDUAL CARD)
  const handleSaveSingleVehicle = async (updatedVehicle: AdminDynamicVehicle) => {
    try {
      const newVehiclesArray = pricingConfig.customVehicles.map(v => 
        v.id === updatedVehicle.id ? updatedVehicle : v
      );

      await setDoc(doc(db, "settings", "pricing"), {
        customVehicles: newVehiclesArray,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setPricingConfig(prev => ({ ...prev, customVehicles: newVehiclesArray }));
      showToast("success", `Tarif untuk armada ${updatedVehicle.name} berhasil diperbarui!`);
      return true;
    } catch (error) {
      console.error(error);
      showToast("error", `Gagal menyimpan tarif armada ${updatedVehicle.name}.`);
      return false;
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

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Konfigurasi Tarif ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-[#C5A059] animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menghimpun Matriks Tarif...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 font-sans max-w-7xl mx-auto">
      
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toastMessage.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER TANPA TOMBOL SAVE GLOBAL */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] rounded-full blur-[100px] opacity-20 pointer-events-none" />
        <div className="relative z-10">
          <AdminBadge variant="gold" className="mb-4">Finance Engineering</AdminBadge>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Coins className="w-8 h-8 text-[#C5A059]" />
            Matriks Tarif & Komisi
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl font-medium leading-relaxed">
            Atur harga dasar, asuransi, dan bagi hasil secara dinamis. Setiap kartu memiliki tombol simpannya masing-masing untuk mencegah kesalahan perubahan massal.
          </p>
        </div>
      </div>

      {/* PENGATURAN GLOBAL: DIPISAHKAN DENGAN STATE & TOMBOL SIMPAN SENDIRI */}
      <GlobalSettingsCard 
        initialPorter={pricingConfig.tarifPorter} 
        initialB2b={pricingConfig.b2bDiscount} 
        onSave={handleSaveGlobalSettings} 
      />

      <div className="flex flex-col gap-6 pt-4">
        
        {/* TOOLBAR FILTER & SEARCH */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari armada..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-[#C5A059] focus:ring-[3px] focus:ring-[#C5A059]/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-[#C5A059] focus:ring-[3px] focus:ring-[#C5A059]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[180px]">
                <option value="all">Semua Kategori</option>
                <option value="motor">Roda Dua (Motor)</option>
                <option value="mobil">Mobil / Van / Truk</option>
              </select>
            </div>
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-[#C5A059] focus:ring-[3px] focus:ring-[#C5A059]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                <option value="fare_asc">Harga Terendah</option>
                <option value="fare_desc">Harga Tertinggi</option>
                <option value="name_asc">Nama Armada (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* LIST ARMADA */}
        {pricingConfig.customVehicles.length === 0 && !isLoading && (
          <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium border border-dashed border-slate-300`}>
            <Car className="w-16 h-16 mb-4 opacity-20 text-slate-500" />
            <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Belum Ada Armada</h4>
            <p className="font-medium text-slate-500">Silakan tambahkan armada di menu Master Kendaraan terlebih dahulu.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {processedData.map((vehicle) => (
              <motion.div key={vehicle.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                <VehiclePricingCard 
                  initialData={vehicle} 
                  onSave={handleSaveSingleVehicle}
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
// KOMPONEN: PENGATURAN GLOBAL CARD
// ======================================================================
function GlobalSettingsCard({ initialPorter, initialB2b, onSave }: { initialPorter: number, initialB2b: number, onSave: (p: number, b: number) => Promise<boolean> }) {
  const [porter, setPorter] = useState(initialPorter);
  const [b2b, setB2b] = useState(initialB2b);
  const [isSaving, setIsSaving] = useState(false);

  // Deteksi perubahan
  const isDirty = porter !== initialPorter || b2b !== initialB2b;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(porter, b2b);
    setIsSaving(false);
  };

  return (
    <div className={`${glassPanel} rounded-[2rem] p-6 lg:p-8`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Input Porter */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" /> Tarif Dasar Porter
            </label>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-slate-100 border-r border-slate-200 rounded-l-xl z-10 pointer-events-none">
                <span className="font-bold text-slate-500 text-sm">Rp</span>
              </div>
              <input 
                type="number" 
                value={porter} 
                onChange={(e) => setPorter(Number(e.target.value))}
                className="w-full h-12 pl-16 pr-4 bg-white border border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 rounded-xl outline-none font-mono font-black text-slate-900 transition-all shadow-sm hover:border-slate-300"
              />
            </div>
          </div>

          {/* Input B2B */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-500" /> Diskon B2B Korporat
            </label>
            <div className="relative">
              <input 
                type="number" 
                step="0.1" max="100" min="0"
                value={b2b} 
                onChange={(e) => setB2b(Number(e.target.value))}
                className="w-full h-12 pl-4 pr-12 bg-white border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 rounded-xl outline-none font-mono font-black text-slate-900 transition-all shadow-sm hover:border-slate-300"
              />
              <div className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center bg-slate-100 border-l border-slate-200 rounded-r-xl z-10 pointer-events-none">
                <span className="font-bold text-slate-500 text-sm">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex items-end">
          <AdminButton 
            onClick={handleSave} 
            disabled={!isDirty || isSaving}
            className={cn(
              "h-12 px-8 shadow-sm transition-all duration-300 w-full lg:w-auto",
              isDirty ? "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 shadow-lg" : "bg-slate-100 text-slate-400 border-transparent"
            )}
          >
            {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Global
          </AdminButton>
        </div>

      </div>
    </div>
  );
}

// ======================================================================
// KOMPONEN: INDIVIDUAL VEHICLE PRICING CARD
// ======================================================================
function VehiclePricingCard({ initialData, onSave }: { initialData: AdminDynamicVehicle, onSave: (data: AdminDynamicVehicle) => Promise<boolean> }) {
  const [formData, setFormData] = useState<AdminDynamicVehicle>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  // Resinkronisasi jika initialData berubah dari props
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // Cek apakah ada perubahan
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleChange = (field: keyof AdminDynamicVehicle, value: number | string) => {
    let safeValue = Number(value);
    
    // Validasi Limit
    if (field === 'appCommission' || field === 'insurancePercent') {
      if (safeValue < 0) safeValue = 0;
      if (safeValue > 100) safeValue = 100;
    }

    setFormData(prev => ({ ...prev, [field]: safeValue }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  const vCat = formData.category || (formData.isMotor ? "Motor" : "Mobil");
  const isMaroon = formData.isMotor; 
  const badgeClass = isMaroon ? "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/20" : "bg-slate-800 text-slate-100 border-slate-700";
  const icon = isMaroon ? <Car className="w-6 h-6" /> : <Building className="w-6 h-6" />;

  const appShare = formData.appCommission !== undefined ? Number(formData.appCommission) : 20; 
  const driverShare = Math.max(0, 100 - appShare);

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-[2rem] overflow-hidden flex flex-col h-full group">
      
      {/* CARD HEADER */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center gap-4">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner", badgeClass)}>
          {icon}
        </div>
        <div className="overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{vCat}</p>
          <h2 className="text-lg font-black text-slate-900 truncate tracking-tight">{formData.name}</h2>
        </div>
      </div>

      {/* CARD BODY (FORM) */}
      <div className="p-6 space-y-6 flex-1 flex flex-col">
        
        {/* Base Fare */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-[#C5A059]" /> Tarif Dasar (Base Fare)
          </label>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-slate-100 border-r border-slate-200 rounded-l-xl pointer-events-none">
              <span className="font-bold text-slate-500 text-sm">Rp</span>
            </div>
            <input 
              type="number" 
              value={Number(formData.baseFare)} 
              onChange={(e) => handleChange("baseFare", e.target.value)}
              className="w-full h-11 pl-15 pr-4 bg-white border border-slate-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 rounded-xl outline-none font-mono font-black text-slate-800 transition-all"
            />
          </div>
        </div>

        {/* Jarak & Per KM */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Min. Jarak</label>
            <div className="relative">
              <input 
                type="number" 
                value={Number(formData.minKm)} 
                onChange={(e) => handleChange("minKm", e.target.value)}
                className="w-full h-10 pl-3 pr-10 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 rounded-lg outline-none font-mono font-bold text-slate-700 transition-all text-center"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">KM</span>
            </div>
          </div>
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Next / KM</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
              <input 
                type="number" 
                value={Number(formData.perKm)} 
                onChange={(e) => handleChange("perKm", e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 rounded-lg outline-none font-mono font-bold text-slate-700 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Insurace & Commission */}
        <div className="grid grid-cols-2 gap-4 border-t border-dashed border-slate-200 pt-5">
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Shield className="w-3 h-3 text-blue-500"/> Asuransi</label>
            <div className="relative">
              <input 
                type="number" step="0.1"
                value={Number(formData.insurancePercent)} 
                onChange={(e) => handleChange("insurancePercent", e.target.value)}
                className="w-full h-10 pl-3 pr-8 bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-lg outline-none font-mono font-bold text-slate-700 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">%</span>
            </div>
          </div>
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-[#7A171D] uppercase tracking-widest flex items-center gap-1.5"><PieChart className="w-3 h-3"/> Komisi App</label>
            <div className="relative">
              <input 
                type="number" step="1"
                value={Number(formData.appCommission)} 
                onChange={(e) => handleChange("appCommission", e.target.value)}
                className="w-full h-10 pl-3 pr-8 bg-red-50 border border-red-200 focus:bg-white focus:border-red-400 focus:ring-2 focus:ring-red-400/20 rounded-lg outline-none font-mono font-black text-red-700 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 font-black text-[10px]">%</span>
            </div>
          </div>
        </div>

        {/* VISUAL SPLIT BAR PROFIT SHARING */}
        <div className="mt-2 pt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Porsi Driver</p>
              <p className="text-sm font-black text-emerald-600 leading-none">{driverShare}%</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-[#7A171D] uppercase tracking-widest mb-0.5">Porsi Aplikasi</p>
              <p className="text-sm font-black text-[#7A171D] leading-none">{appShare}%</p>
            </div>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200">
            <div className="h-full bg-emerald-500 transition-all duration-500 ease-out" style={{ width: `${driverShare}%` }}></div>
            <div className="h-full bg-[#7A171D] transition-all duration-500 ease-out" style={{ width: `${appShare}%` }}></div>
          </div>
        </div>

      </div>

      {/* CARD FOOTER (SAVE BUTTON) */}
      <div className="p-5 border-t border-slate-100 bg-white flex justify-end">
        <AdminButton 
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={cn(
            "w-full font-bold h-11 transition-all duration-300",
            isDirty ? "bg-[#7A171D] hover:bg-[#5A0E13] text-white shadow-lg shadow-[#7A171D]/20" : "bg-slate-100 text-slate-400 border-transparent"
          )}
        >
          {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {isDirty ? "Simpan Perubahan Tarif" : "Tarif Tersimpan"}
        </AdminButton>
      </div>

    </div>
  );
}