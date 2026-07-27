"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { 
  CheckCircle2, Truck, Box, Scale, AlertCircle, 
  Plus, Trash2, Search, Filter, ArrowUpDown, ShieldAlert, Activity, ArrowRight, Car, ImageIcon
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// --- IMPORT UI KIT PREMIUM ---
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { DynamicVehicle } from "@/types/order";
import { PricingConfig } from "@/types/admin";

// EXTEND TYPE UNTUK MENGAKOMODASI imageUrl TANPA ERROR 'any'
type ExtendedVehicle = DynamicVehicle & { imageUrl?: string };

export default function AdminVehiclesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); 
  const [sortBy, setSortBy] = useState("weight_asc"); 

  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({ customVehicles: [], b2bDiscount: 15, tarifPorter: 50000 });

  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setPricingConfig(docSnap.data() as PricingConfig);
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

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Perhatian! Menghapus armada dapat berdampak pada operasional. Yakin ingin menghapus armada ini dari sistem?")) return;
    
    try {
      const updatedVehicles = pricingConfig.customVehicles.filter((v: DynamicVehicle) => v.id !== vehicleId);
      const newConfig = { ...pricingConfig, customVehicles: updatedVehicles, updatedAt: serverTimestamp() };
      
      await setDoc(doc(db, "settings", "pricing"), newConfig, { merge: true });
      setPricingConfig(newConfig as PricingConfig);
      showToast("success", "Armada berhasil dihapus permanen.");
    } catch (error) {
      console.error("Gagal menghapus armada:", error);
      showToast("error", "Gagal menghapus armada dari database.");
    }
  };

  const vehiclesArray = pricingConfig.customVehicles || [];

  const processedData = vehiclesArray
    .filter((v: ExtendedVehicle) => {
      const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.id.toLowerCase().includes(searchQuery.toLowerCase());
      const vCat = v.category || (v.isMotor ? "Motor" : "Mobil");
      const matchType = filterType === "all" ? true : vCat.toLowerCase() === filterType.toLowerCase();
      return matchSearch && matchType;
    })
    .sort((a: ExtendedVehicle, b: ExtendedVehicle) => {
      if (sortBy === "weight_asc") return a.maxWeight - b.maxWeight;
      if (sortBy === "weight_desc") return b.maxWeight - a.maxWeight;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });

  const totalVehicles = vehiclesArray.length;
  const totalMotor = vehiclesArray.filter((v: DynamicVehicle) => (v.category || (v.isMotor ? "Motor" : "Mobil")) === "Motor").length;
  const totalMobil = vehiclesArray.filter((v: DynamicVehicle) => (v.category || (v.isMotor ? "Motor" : "Mobil")) === "Mobil").length;
  const totalTruk = vehiclesArray.filter((v: DynamicVehicle) => v.category === "Truk").length;

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Master Data Kendaraan ini hanya dapat dikelola oleh Superadmin atau Divisi Operasional.</p>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 font-sans">
      
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toastMessage.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER CONTROL PANEL */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-900 rounded-full blur-[100px] opacity-10 pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(15,23,42,0.3)] border border-slate-950">
              <Truck className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            Master Data Kendaraan
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl font-medium">
            Kelola spesifikasi, kapasitas beban, dimensi, dan foto untuk seluruh jenis armada di dalam ekosistem Flash Global.
          </p>
        </div>
        
        <AdminButton onClick={() => router.push("/admin/vehicles/add")} variant="primary" className="h-12 px-6 shrink-0 relative z-10 w-full md:w-auto shadow-lg">
          <Plus className="w-4 h-4 mr-2" /> Registrasi Armada Baru
        </AdminButton>
      </div>

      {/* 2. ADVANCED STATISTIK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-950 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_20px_rgba(15,23,42,0.4)] relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-[40px] opacity-50 group-hover:opacity-100 transition-opacity" />
          <span className="text-white/70 text-[11px] font-bold uppercase tracking-widest relative z-10">Total Tipe Armada</span>
          <div className="flex items-center justify-between mt-4 relative z-10">
            <p className="text-4xl font-black text-white tracking-tight">{totalVehicles}</p>
            <Box className="w-8 h-8 text-white/30" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#C5A059] rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Motor (Roda 2)</span>
            <div className="w-10 h-10 rounded-full bg-white/60 border border-white shadow-sm flex items-center justify-center"><Truck className="w-5 h-5 text-[#C5A059]" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-4 relative z-10 tracking-tight">{totalMotor}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-blue-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Mobil/Van (Roda 4)</span>
            <div className="w-10 h-10 rounded-full bg-white/60 border border-white shadow-sm flex items-center justify-center"><Car className="w-5 h-5 text-blue-600" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-4 relative z-10 tracking-tight">{totalMobil}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#7A171D] rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Truk/Heavy Duty</span>
            <div className="w-10 h-10 rounded-full bg-white/60 border border-white shadow-sm flex items-center justify-center"><Truck className="w-5 h-5 text-[#7A171D]" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-4 relative z-10 tracking-tight">{totalTruk}</p>
        </motion.div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* 3. TOOLBAR FILTER & SEARCH */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari nama armada atau ID..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] focus:ring-[3px] focus:ring-[#7A171D]/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-[#7A171D] focus:ring-[3px] focus:ring-[#7A171D]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[180px]">
                <option value="all">Semua Kategori</option>
                <option value="motor">Roda Dua (Motor)</option>
                <option value="mobil">Mobil / Van</option>
                <option value="truk">Truk / Kargo Berat</option>
              </select>
            </div>
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-[#7A171D] focus:ring-[3px] focus:ring-[#7A171D]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                <option value="weight_asc">Kapasitas (Kecil - Besar)</option>
                <option value="weight_desc">Kapasitas (Besar - Kecil)</option>
                <option value="name_asc">Nama Armada (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. LIST ARMADA (GRID CARDS) */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-[#7A171D] animate-pulse" />
              <p>Memuat Spesifikasi Armada...</p>
            </div>
          ) : processedData.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <Truck className="w-16 h-16 mb-4 opacity-20" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Tidak Ada Armada Ditemukan</h4>
              <p className="font-medium text-slate-500">Sesuaikan filter pencarian atau daftarkan armada baru.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {processedData.map((vehicle: ExtendedVehicle) => (
                  <motion.div key={vehicle.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                    <VehicleCard 
                      data={vehicle} 
                      router={router}
                      onDelete={() => handleDeleteVehicle(vehicle.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ======================================================================
// KOMPONEN CARD ARMADA DENGAN DUKUNGAN GAMBAR
// ======================================================================
function VehicleCard({ data, router, onDelete }: { data: ExtendedVehicle; router: AppRouterInstance; onDelete: () => void }) {
  const vCat = data.category || (data.isMotor ? "Motor" : "Mobil");
  
  // Custom 3D Icon styling berdasarkan kategori (Digunakan jika tidak ada gambar)
  let icon3DClass = "";
  let icon = <Car className="w-7 h-7 text-white drop-shadow-md" />;
  let badgeLabel = "";
  let tagColor = "";

  if (vCat === "Motor") {
    icon3DClass = "bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_10px_20px_rgba(197,160,89,0.4)] border border-[#C5A059]";
    icon = <Truck className="w-7 h-7 text-white drop-shadow-md" />;
    badgeLabel = "Roda Dua";
    tagColor = "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/20";
  } else if (vCat === "Mobil") {
    icon3DClass = "bg-gradient-to-br from-blue-400 to-blue-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_10px_20px_rgba(37,99,235,0.4)] border border-blue-500";
    icon = <Car className="w-7 h-7 text-white drop-shadow-md" />;
    badgeLabel = "Roda Empat";
    tagColor = "bg-blue-50 text-blue-600 border-blue-200";
  } else {
    icon3DClass = "bg-gradient-to-br from-slate-700 to-slate-900 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_10px_20px_rgba(15,23,42,0.4)] border border-slate-950";
    icon = <Truck className="w-7 h-7 text-white drop-shadow-md" />;
    badgeLabel = "Heavy Duty";
    tagColor = "bg-slate-100 text-slate-700 border-slate-200";
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_15px_35px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-[2rem] overflow-hidden group flex flex-col h-full relative">
      
      {/* CARD HEADER */}
      <div className="p-6 border-b border-white/60 bg-white/50 flex flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          
          {/* Tampilkan Foto jika ada, jika tidak pakai 3D Icon */}
          {data.imageUrl ? (
            <div className="w-14 h-14 rounded-2xl shrink-0 overflow-hidden border-2 border-white shadow-[0_4px_10px_rgba(0,0,0,0.1)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.imageUrl} alt={data.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", icon3DClass)}>
              {icon}
            </div>
          )}

          <div className="overflow-hidden">
            <h2 className="text-lg font-black text-slate-900 truncate tracking-tight" title={data.name}>{data.name}</h2>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest font-mono flex items-center gap-1">
              {data.imageUrl && <ImageIcon className="w-3 h-3 text-emerald-500" />} ID: {data.id}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onDelete()} className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm" title="Hapus Armada">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CARD BODY */}
      <div className="p-6 space-y-5 flex-1 flex flex-col relative z-10">
        
        <div className="flex justify-between items-center pb-4 border-b border-dashed border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kategori Armada</span>
          <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm", tagColor)}>
            {badgeLabel}
          </span>
        </div>

        <div className="flex justify-between items-center pb-4 border-b border-dashed border-slate-200">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Kapasitas Muatan</span>
          </div>
          <span className="font-black text-slate-900 text-xl tracking-tight">{data.maxWeight} <span className="text-xs text-slate-500 font-bold uppercase">Kg</span></span>
        </div>

        <div className="space-y-3 pt-2 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Box className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dimensi Ruang (P x L x T)</span>
          </div>
          
          {vCat === "Motor" ? (
            <div className="flex items-center justify-between text-[11px] font-bold gap-2">
              <div className="bg-slate-50/80 px-2 py-2 rounded-xl text-slate-600 border border-slate-100 shadow-sm flex-1 text-center truncate" title={`S: ${data.dimS?.p}x${data.dimS?.l}x${data.dimS?.t}`}>
                <span className="text-[#C5A059]">S:</span> {data.dimS?.p}x{data.dimS?.l}x{data.dimS?.t}
              </div>
              <div className="bg-slate-50/80 px-2 py-2 rounded-xl text-slate-600 border border-slate-100 shadow-sm flex-1 text-center truncate" title={`M: ${data.dimM?.p}x${data.dimM?.l}x${data.dimM?.t}`}>
                <span className="text-[#C5A059]">M:</span> {data.dimM?.p}x{data.dimM?.l}x{data.dimM?.t}
              </div>
              <div className="bg-slate-50/80 px-2 py-2 rounded-xl text-slate-600 border border-slate-100 shadow-sm flex-1 text-center truncate" title={`L: ${data.dimL?.p}x${data.dimL?.l}x${data.dimL?.t}`}>
                <span className="text-[#C5A059]">L:</span> {data.dimL?.p}x{data.dimL?.l}x{data.dimL?.t}
              </div>
            </div>
          ) : vCat === "Truk" ? (
             <div className="bg-red-50/50 border border-red-100 rounded-xl p-3 text-center shadow-sm">
              <span className="text-[11px] font-bold text-red-700 tracking-wide">Terintegrasi dengan Fleet Vendor</span>
            </div>
          ) : (
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-center shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 tracking-wide">Input Dimensi Manual via App</span>
            </div>
          )}
        </div>

        <AdminButton variant="outline" onClick={() => router.push(`/admin/vehicles/${data.id}`)} className="w-full mt-4 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900">
          Ubah Spesifikasi <ArrowRight className="w-4 h-4 ml-2" />
        </AdminButton>
      </div>
    </div>
  );
}