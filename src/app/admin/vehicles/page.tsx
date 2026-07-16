"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Save, CheckCircle2, Truck, 
  Box, Scale, AlertCircle, Plus, 
  Trash2, X, Search, Filter, ArrowUpDown, ShieldAlert, Activity, Edit2, Car, Info
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
import { DynamicVehicle } from "@/types/order";
import { PricingConfig } from "@/types/admin";

export default function AdminVehiclesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); 
  const [sortBy, setSortBy] = useState("weight_asc"); 

  // State Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [currentVehicle, setCurrentVehicle] = useState<Partial<DynamicVehicle>>({
    name: "", id: "", category: "Mobil", isMotor: false, maxWeight: 100, baseFare: 0, minKm: 0, perKm: 0, insurancePercent: 0,
    dimS: { p: 20, l: 20, t: 20 }, dimM: { p: 40, l: 40, t: 40 }, dimL: { p: 50, l: 50, t: 50 }
  });

  // Data Global Pricing Config 
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({ customVehicles: [], b2bDiscount: 15, tarifPorter: 50000 });

  // Tarik data saat halaman dimuat
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as PricingConfig;
          setPricingConfig(data);
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

  // Mencegah scroll body saat modal terbuka
  useEffect(() => {
    if (isModalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isModalOpen]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveToDatabase = async (updatedVehicles: DynamicVehicle[]) => {
    setIsSaving(true);
    try {
      const newConfig = { ...pricingConfig, customVehicles: updatedVehicles, updatedAt: serverTimestamp() };
      await setDoc(doc(db, "settings", "pricing"), newConfig, { merge: true });
      setPricingConfig(newConfig as PricingConfig);
      showToast("success", "Spesifikasi armada berhasil diperbarui!");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Gagal menyimpan konfigurasi:", error);
      showToast("error", "Gagal menyimpan konfigurasi ke database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAddModal = () => {
    setModalMode("add");
    setCurrentVehicle({
      name: "", id: "", category: "Mobil", isMotor: false, maxWeight: 100, baseFare: 0, minKm: 0, perKm: 0, insurancePercent: 0,
      dimS: { p: 20, l: 20, t: 20 }, dimM: { p: 40, l: 40, t: 40 }, dimL: { p: 50, l: 50, t: 50 }
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vehicle: DynamicVehicle) => {
    setModalMode("edit");
    const globalIndex = pricingConfig.customVehicles.findIndex((v: DynamicVehicle) => v.id === vehicle.id);
    setEditingIndex(globalIndex);
    
    // Set fallback category jika data lama belum memilikinya
    const fallbackCategory = vehicle.category || (vehicle.isMotor ? "Motor" : "Mobil");

    setCurrentVehicle({
      ...vehicle,
      category: fallbackCategory,
      dimS: vehicle.dimS || { p: 20, l: 20, t: 20 },
      dimM: vehicle.dimM || { p: 40, l: 40, t: 40 },
      dimL: vehicle.dimL || { p: 50, l: 50, t: 50 }
    });
    setIsModalOpen(true);
  };

  const handleSubmitModal = () => {
    if (!currentVehicle.name || !currentVehicle.id) {
      alert("Nama dan ID Armada wajib diisi!");
      return;
    }

    const vehicleData: DynamicVehicle = {
      id: currentVehicle.id.toLowerCase().replace(/\s+/g, '-'),
      name: currentVehicle.name,
      category: currentVehicle.category as "Motor" | "Mobil" | "Truk",
      isMotor: currentVehicle.category === "Motor", // Backward compatibility
      maxWeight: Number(currentVehicle.maxWeight) || 100,
      baseFare: Number(currentVehicle.baseFare) || 0,
      minKm: Number(currentVehicle.minKm) || 0,
      perKm: Number(currentVehicle.perKm) || 0,
      insurancePercent: Number(currentVehicle.insurancePercent) || 0,
    };

    if (vehicleData.isMotor) {
      vehicleData.dimS = currentVehicle.dimS;
      vehicleData.dimM = currentVehicle.dimM;
      vehicleData.dimL = currentVehicle.dimL;
    }

    const updatedVehicles = [...(pricingConfig.customVehicles || [])];
    
    if (modalMode === "add") {
      if (updatedVehicles.find(v => v.id === vehicleData.id)) {
        alert("ID Armada sudah digunakan. Silakan gunakan nama/ID lain.");
        return;
      }
      updatedVehicles.push(vehicleData);
    } else if (modalMode === "edit" && editingIndex !== null) {
      updatedVehicles[editingIndex] = vehicleData;
    }

    handleSaveToDatabase(updatedVehicles);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (confirm("Perhatian! Menghapus armada dapat berdampak pada operasional. Yakin ingin menghapus armada ini dari sistem?")) {
      const updatedVehicles = pricingConfig.customVehicles.filter((v: DynamicVehicle) => v.id !== vehicleId);
      handleSaveToDatabase(updatedVehicles);
    }
  };

  const vehiclesArray = pricingConfig.customVehicles || [];

  const processedData = vehiclesArray
    .filter((v: DynamicVehicle) => {
      const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
      const vCat = v.category || (v.isMotor ? "Motor" : "Mobil");
      const matchType = filterType === "all" ? true : vCat.toLowerCase() === filterType.toLowerCase();
      return matchSearch && matchType;
    })
    .sort((a: DynamicVehicle, b: DynamicVehicle) => {
      if (sortBy === "weight_asc") return a.maxWeight - b.maxWeight;
      if (sortBy === "weight_desc") return b.maxWeight - a.maxWeight;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });

  // Statistik Dinamis
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
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-10 h-10 text-[#7A171D] animate-pulse mb-4" />
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Memuat Modul Armada...</p>
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
            <Truck className="w-3 h-3 fill-current"/> Operational Control Panel
          </Badge>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Master Data <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Kendaraan & Klasifikasi</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-2xl">Atur jenis armada dan klasifikasi tingkat kendaraan (Personal / Fleet) untuk sistem pendaftaran Driver.</p>
        </div>
        
        <Button onClick={handleOpenAddModal} className="w-full md:w-auto h-12 px-6 text-sm font-bold shrink-0">
          <Plus className="w-5 h-5 mr-2" /> Daftarkan Armada Baru
        </Button>
      </div>

      {/* ADVANCED STATISTIK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Box className="w-16 h-16 text-white"/></div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Tipe Armada</span>
          <p className="text-3xl font-black text-white mt-2">{totalVehicles}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Motor (Roda 2)</span>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalMotor}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Mobil/Van (Roda 4)</span>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalMobil}</p>
        </div>
        <div className="bg-[#7A171D]/5 border border-[#7A171D]/10 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-[#7A171D] text-[10px] font-bold uppercase tracking-wider">Truk/Heavy Duty (Roda 6+)</span>
          <p className="text-3xl font-black text-[#7A171D] mt-2">{totalTruk}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        
        {/* TOOLBAR FILTER & SEARCH */}
        <div className="flex flex-col md:flex-row gap-4 bg-slate-50 p-3 border border-slate-200 rounded-xl">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari nama armada..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg pl-12 pr-4 py-2.5 text-slate-900 outline-none text-sm font-medium focus:border-[#7A171D] transition-all shadow-sm" />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[140px]">
                <option value="all">Semua Kategori</option>
                <option value="motor">Roda Dua (Motor)</option>
                <option value="mobil">Mobil / Van</option>
                <option value="truk">Truk / Kargo Berat</option>
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[180px]">
                <option value="weight_asc">Kapasitas (Kecil - Besar)</option>
                <option value="weight_desc">Kapasitas (Besar - Kecil)</option>
                <option value="name_asc">Nama (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {processedData.length === 0 && !isLoading && (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Truck className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="text-slate-700 font-bold text-lg">Tidak Ada Armada Ditemukan</h4>
            <p className="text-slate-500 text-sm mt-1">Silakan sesuaikan filter pencarian atau tambah armada baru.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {processedData.map((vehicle: DynamicVehicle) => (
              <motion.div key={vehicle.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                <VehicleCard 
                  data={vehicle} 
                  onEdit={() => handleOpenEditModal(vehicle)}
                  onDelete={() => handleDeleteVehicle(vehicle.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>

      {/* MODAL TAMBAH/EDIT ARMADA (POPUP) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setIsModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  {modalMode === "add" ? <><Plus className="w-5 h-5 text-[#7A171D]" /> Tambah Armada</> : <><Edit2 className="w-5 h-5 text-[#7A171D]" /> Edit Spesifikasi</>}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nama Armada</label>
                    <Input placeholder="Cth: Truk Engkel Box" value={currentVehicle.name} onChange={(e) => setCurrentVehicle({...currentVehicle, name: e.target.value, id: modalMode === "add" ? e.target.value : currentVehicle.id})} className="border-slate-200 font-bold" />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kode ID (Unik)</label>
                    <Input placeholder="cth: truk-engkel" value={currentVehicle.id} disabled={modalMode === "edit"} onChange={(e) => setCurrentVehicle({...currentVehicle, id: e.target.value})} className="border-slate-200 bg-slate-100 font-mono" />
                  </div>
                </div>

                {/* PILIHAN KATEGORI ARMADA (ENTERPRISE) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Kategori Klasifikasi Kendaraan</label>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Opsi Motor */}
                    <div 
                      onClick={() => setCurrentVehicle({...currentVehicle, category: "Motor"})}
                      className={cn("cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center transition-all", currentVehicle.category === "Motor" ? "border-[#C5A059] bg-[#C5A059]/10 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-[#C5A059]/50")}
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", currentVehicle.category === "Motor" ? "bg-[#C5A059] text-white" : "bg-slate-200 text-slate-500")}><Truck className="w-4 h-4"/></div>
                      <span className={cn("text-[10px] font-bold uppercase", currentVehicle.category === "Motor" ? "text-[#A68345]" : "text-slate-600")}>Motor</span>
                    </div>

                    {/* Opsi Mobil */}
                    <div 
                      onClick={() => setCurrentVehicle({...currentVehicle, category: "Mobil"})}
                      className={cn("cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center transition-all", currentVehicle.category === "Mobil" ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-blue-300")}
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", currentVehicle.category === "Mobil" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500")}><Car className="w-4 h-4"/></div>
                      <span className={cn("text-[10px] font-bold uppercase", currentVehicle.category === "Mobil" ? "text-blue-700" : "text-slate-600")}>Mobil / Van</span>
                    </div>

                    {/* Opsi Truk */}
                    <div 
                      onClick={() => setCurrentVehicle({...currentVehicle, category: "Truk"})}
                      className={cn("cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center transition-all", currentVehicle.category === "Truk" ? "border-[#7A171D] bg-[#7A171D]/10 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-[#7A171D]/50")}
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", currentVehicle.category === "Truk" ? "bg-[#7A171D] text-white" : "bg-slate-200 text-slate-500")}><Truck className="w-4 h-4"/></div>
                      <span className={cn("text-[10px] font-bold uppercase", currentVehicle.category === "Truk" ? "text-[#7A171D]" : "text-slate-600")}>Truk Kargo</span>
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {currentVehicle.category === "Truk" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3 shadow-inner">
                        <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-red-800 text-[11px] leading-relaxed font-medium">
                          <b className="text-red-900 block mb-1">Fleet / Vendor Management Aktif</b>
                          Kategori Truk akan mengaktifkan sistem registrasi Perusahaan (Company), Driver, dan Vehicle (Armada) secara terpisah di Portal Driver. Pendaftaran mewajibkan unggah dokumen STNK, KIR, dan NPWP Perusahaan.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Maks Kapasitas (Kg)</label>
                  <div className="relative">
                    <Input type="number" placeholder="Cth: 800" value={currentVehicle.maxWeight || ""} onChange={(e) => setCurrentVehicle({...currentVehicle, maxWeight: Number(e.target.value)})} className="border-slate-200 pr-10 font-bold" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">KG</span>
                  </div>
                </div>

                {/* DIMENSI KHUSUS MOTOR */}
                <AnimatePresence>
                  {currentVehicle.category === "Motor" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="space-y-4 pt-4 border-t border-dashed border-slate-200">
                        <h3 className="text-[10px] font-bold text-[#C5A059] flex items-center gap-2 uppercase tracking-widest">
                          <Box className="w-3.5 h-3.5" /> Template Dimensi Kotak (P x L x T cm)
                        </h3>
                        
                        <div className="flex items-center gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                          <span className="w-8 h-8 flex items-center justify-center bg-white border border-amber-200 rounded-lg font-black text-amber-600 shrink-0 shadow-sm">S</span>
                          <div className="flex flex-1 gap-2">
                            <Input type="number" value={currentVehicle.dimS?.p} onChange={(e) => setCurrentVehicle({...currentVehicle, dimS: {...currentVehicle.dimS!, p: Number(e.target.value)}})} className="text-center font-bold h-10 px-2 bg-white" placeholder="P" />
                            <Input type="number" value={currentVehicle.dimS?.l} onChange={(e) => setCurrentVehicle({...currentVehicle, dimS: {...currentVehicle.dimS!, l: Number(e.target.value)}})} className="text-center font-bold h-10 px-2 bg-white" placeholder="L" />
                            <Input type="number" value={currentVehicle.dimS?.t} onChange={(e) => setCurrentVehicle({...currentVehicle, dimS: {...currentVehicle.dimS!, t: Number(e.target.value)}})} className="text-center font-bold h-10 px-2 bg-white" placeholder="T" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                          <span className="w-8 h-8 flex items-center justify-center bg-white border border-amber-200 rounded-lg font-black text-amber-600 shrink-0 shadow-sm">M</span>
                          <div className="flex flex-1 gap-2">
                            <Input type="number" value={currentVehicle.dimM?.p} onChange={(e) => setCurrentVehicle({...currentVehicle, dimM: {...currentVehicle.dimM!, p: Number(e.target.value)}})} className="text-center font-bold h-10 px-2 bg-white" placeholder="P" />
                            <Input type="number" value={currentVehicle.dimM?.l} onChange={(e) => setCurrentVehicle({...currentVehicle, dimM: {...currentVehicle.dimM!, l: Number(e.target.value)}})} className="text-center font-bold h-10 px-2 bg-white" placeholder="L" />
                            <Input type="number" value={currentVehicle.dimM?.t} onChange={(e) => setCurrentVehicle({...currentVehicle, dimM: {...currentVehicle.dimM!, t: Number(e.target.value)}})} className="text-center font-bold h-10 px-2 bg-white" placeholder="T" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                          <span className="w-8 h-8 flex items-center justify-center bg-white border border-amber-200 rounded-lg font-black text-amber-600 shrink-0 shadow-sm">L</span>
                          <div className="flex flex-1 gap-2">
                            <Input type="number" value={currentVehicle.dimL?.p} onChange={(e) => setCurrentVehicle({...currentVehicle, dimL: {...currentVehicle.dimL!, p: Number(e.target.value)}})} className="text-center font-bold h-10 px-2 bg-white" placeholder="P" />
                            <Input type="number" value={currentVehicle.dimL?.l} onChange={(e) => setCurrentVehicle({...currentVehicle, dimL: {...currentVehicle.dimL!, l: Number(e.target.value)}})} className="text-center font-bold h-10 px-2 bg-white" placeholder="L" />
                            <Input type="number" value={currentVehicle.dimL?.t} onChange={(e) => setCurrentVehicle({...currentVehicle, dimL: {...currentVehicle.dimL!, t: Number(e.target.value)}})} className="text-center font-bold h-10 px-2 bg-white" placeholder="T" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex gap-4">
                <Button onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 border-slate-300 font-bold">Batal</Button>
                <Button onClick={handleSubmitModal} className="flex-1 bg-[#7A171D] hover:bg-[#5A0E13] text-white shadow-md font-bold">
                  {isSaving ? "Memproses..." : <><Save className="w-4 h-4 mr-2" /> Simpan Data</>}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ======================================================================
// KOMPONEN CARD ARMADA DINAMIS
// ======================================================================
interface VehicleCardProps {
  data: DynamicVehicle;
  onEdit: () => void;
  onDelete: () => void;
}

function VehicleCard({ data, onEdit, onDelete }: VehicleCardProps) {
  const vCat = data.category || (data.isMotor ? "Motor" : "Mobil");
  
  // Custom styling berdasarkan kategori
  let badgeClass = "";
  let icon = <Car className="w-6 h-6" />;
  let label = "";

  if (vCat === "Motor") {
    badgeClass = "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/20";
    icon = <Truck className="w-6 h-6" />;
    label = "Motor (Roda 2)";
  } else if (vCat === "Mobil") {
    badgeClass = "bg-blue-50 text-blue-600 border-blue-200";
    icon = <Car className="w-6 h-6" />;
    label = "Mobil / Van";
  } else {
    badgeClass = "bg-[#7A171D]/10 text-[#7A171D] border-[#7A171D]/20";
    icon = <Truck className="w-6 h-6" />;
    label = "Truk Kargo";
  }

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden relative group hover:shadow-md transition-all">
      <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border", badgeClass)}>
            {icon}
          </div>
          <div className="overflow-hidden">
            <h2 className="text-lg font-black text-slate-900 truncate" title={data.name}>{data.name}</h2>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider font-mono">ID: {data.id}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm" title="Edit Spesifikasi">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm" title="Hapus Armada">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        
        <div className="flex justify-between items-center pb-4 border-b border-dashed border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kategori Armada</span>
          <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border", badgeClass)}>
            {label}
          </span>
        </div>

        <div className="flex justify-between items-center pb-4 border-b border-dashed border-slate-200">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Kapasitas Muatan</span>
          </div>
          <span className="font-black text-slate-900 text-lg">{data.maxWeight} <span className="text-xs text-slate-500 font-bold uppercase">Kg</span></span>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 mb-2">
            <Box className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dimensi Ruang</span>
          </div>
          
          {vCat === "Motor" ? (
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="bg-slate-100 px-3 py-1.5 rounded text-slate-600 border border-slate-200">S: {data.dimS?.p}x{data.dimS?.l}x{data.dimS?.t}</div>
              <div className="bg-slate-100 px-3 py-1.5 rounded text-slate-600 border border-slate-200">M: {data.dimM?.p}x{data.dimM?.l}x{data.dimM?.t}</div>
              <div className="bg-slate-100 px-3 py-1.5 rounded text-slate-600 border border-slate-200">L: {data.dimL?.p}x{data.dimL?.l}x{data.dimL?.t}</div>
            </div>
          ) : vCat === "Truk" ? (
             <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <span className="text-xs font-bold text-red-700">Vendor Fleet Management</span>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <span className="text-xs font-bold text-slate-600">Custom Input Manual</span>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}