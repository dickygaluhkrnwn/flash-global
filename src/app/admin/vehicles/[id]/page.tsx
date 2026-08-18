"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Save, 
  Truck, Car, Box, Scale, Info, ShieldAlert, Activity, ImagePlus, UploadCloud, Loader2
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadToCloudinary } from "@/lib/cloudinary";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { cn } from "@/lib/utils";

// IMPORT GLOBAL TYPES
import { DynamicVehicle } from "@/types/order";
import { PricingConfig } from "@/types/admin";

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getAdminUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
    return path.replace(/^\/admin/, '') || '/';
  }
  return path; 
};

export default function VehicleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const isAddMode = vehicleId === "add";

  const { user: currentUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data Global Pricing Config
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);

  // KODE DIBERSIHKAN: Menggunakan Partial<DynamicVehicle> secara murni
  const [currentVehicle, setCurrentVehicle] = useState<Partial<DynamicVehicle>>({
    name: "", id: "", category: "Mobil", isMotor: false, maxWeight: 100, baseFare: 0, minKm: 0, perKm: 0, insurancePercent: 0, imageUrl: "",
    dimS: { p: 20, l: 20, t: 20 }, dimM: { p: 40, l: 40, t: 40 }, dimL: { p: 50, l: 50, t: 50 }
  });

  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const config = docSnap.data() as PricingConfig;
          setPricingConfig(config);

          if (!isAddMode) {
            const foundVehicle = config.customVehicles?.find(v => v.id === vehicleId) as DynamicVehicle;
            if (foundVehicle) {
              const fallbackCategory = foundVehicle.category || (foundVehicle.isMotor ? "Motor" : "Mobil");
              setCurrentVehicle({
                ...foundVehicle,
                category: fallbackCategory,
                imageUrl: foundVehicle.imageUrl || "",
                dimS: foundVehicle.dimS || { p: 20, l: 20, t: 20 },
                dimM: foundVehicle.dimM || { p: 40, l: 40, t: 40 },
                dimL: foundVehicle.dimL || { p: 50, l: 50, t: 50 }
              });
            } else {
              showToast("error", "Armada tidak ditemukan.");
              setTimeout(() => router.push(getAdminUrl("/admin/vehicles")), 2000);
            }
          }
        }
      } catch (error) {
        console.error("Gagal menarik master data armada:", error);
        showToast("error", "Gagal memuat konfigurasi dari database.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [vehicleId, isAddMode, router]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi ukuran max 2MB
    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "Ukuran gambar terlalu besar. Maksimal 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setCurrentVehicle(prev => ({ ...prev, imageUrl: url }));
      showToast("success", "Gambar armada berhasil diunggah!");
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal mengunggah gambar. Pastikan .env Cloudinary benar.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveToDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVehicle.name || !currentVehicle.id) {
      showToast("error", "Nama dan ID Armada wajib diisi!");
      return;
    }
    if (!pricingConfig) return;

    setIsSaving(true);

    // KODE DIBERSIHKAN: Menggunakan DynamicVehicle
    const vehicleData: DynamicVehicle = {
      id: currentVehicle.id.toLowerCase().replace(/\s+/g, '-'),
      name: currentVehicle.name,
      category: currentVehicle.category as "Motor" | "Mobil" | "Truk",
      isMotor: currentVehicle.category === "Motor",
      maxWeight: Number(currentVehicle.maxWeight) || 100,
      baseFare: Number(currentVehicle.baseFare) || 0,
      minKm: Number(currentVehicle.minKm) || 0,
      perKm: Number(currentVehicle.perKm) || 0,
      insurancePercent: Number(currentVehicle.insurancePercent) || 0,
      imageUrl: currentVehicle.imageUrl || "", // Simpan URL Gambar
    };

    if (vehicleData.isMotor) {
      vehicleData.dimS = currentVehicle.dimS;
      vehicleData.dimM = currentVehicle.dimM;
      vehicleData.dimL = currentVehicle.dimL;
    }

    const updatedVehicles = [...(pricingConfig.customVehicles || [])] as DynamicVehicle[];
    
    if (isAddMode) {
      if (updatedVehicles.find(v => v.id === vehicleData.id)) {
        showToast("error", "ID Armada sudah digunakan. Silakan gunakan nama/ID lain.");
        setIsSaving(false);
        return;
      }
      updatedVehicles.push(vehicleData);
    } else {
      const editIndex = updatedVehicles.findIndex(v => v.id === vehicleId);
      if (editIndex !== -1) {
        updatedVehicles[editIndex] = vehicleData;
      }
    }

    try {
      const newConfig = { ...pricingConfig, customVehicles: updatedVehicles, updatedAt: serverTimestamp() };
      await setDoc(doc(db, "settings", "pricing"), newConfig, { merge: true });
      showToast("success", "Spesifikasi armada berhasil disimpan!");
      setTimeout(() => router.push(getAdminUrl("/admin/vehicles")), 1500);
    } catch (error) {
      console.error("Gagal menyimpan konfigurasi:", error);
      showToast("error", "Gagal menyimpan konfigurasi ke database.");
      setIsSaving(false);
    }
  };

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-[#7A171D] animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Memuat Formulir Spesifikasi...</p>
      </div>
    );
  }

  const vCat = currentVehicle.category;
  
  let icon3DClass = "";
  let icon = <Car className="w-10 h-10 text-white drop-shadow-md" />;
  let glowColor = "bg-blue-500";
  let activeBorder = "focus-within:border-blue-500 focus-within:ring-blue-500/10";
  let badgeClass = "bg-blue-50 text-blue-600 border-blue-200";

  if (vCat === "Motor") {
    icon3DClass = "bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_10px_20px_rgba(197,160,89,0.4)] border border-[#C5A059]";
    icon = <Truck className="w-10 h-10 text-white drop-shadow-md" />;
    glowColor = "bg-[#C5A059]";
    activeBorder = "focus-within:border-[#C5A059] focus-within:ring-[#C5A059]/10";
    badgeClass = "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/20";
  } else if (vCat === "Mobil") {
    icon3DClass = "bg-gradient-to-br from-blue-400 to-blue-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_10px_20px_rgba(37,99,235,0.4)] border border-blue-500";
  } else {
    icon3DClass = "bg-gradient-to-br from-slate-700 to-slate-900 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_10px_20px_rgba(15,23,42,0.4)] border border-slate-950";
    icon = <Truck className="w-10 h-10 text-white drop-shadow-md" />;
    glowColor = "bg-slate-800";
    activeBorder = "focus-within:border-slate-800 focus-within:ring-slate-800/10";
    badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
  }

  return (
    <div className="space-y-6 font-sans pb-28 max-w-5xl mx-auto">
      
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toastMessage.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center gap-5">
        <button onClick={() => router.back()} className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {isAddMode ? "Tambah Spesifikasi Armada" : "Edit Spesifikasi Armada"}
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Tentukan kapasitas dan unggah foto asli untuk ditampilkan di kalkulator Client Portal.</p>
        </div>
      </div>

      <form onSubmit={handleSaveToDatabase} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KOLOM KIRI: INFO UTAMA & GAMBAR */}
        <div className={`lg:col-span-7 ${glassPanel} rounded-[2rem] p-8 space-y-6 relative overflow-hidden transition-all duration-500`}>
           <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none transition-colors duration-500", glowColor)} />
           
           {/* HEADER CARD: 3D ICON & INFO */}
           <div className="flex items-center gap-5 border-b border-white/60 pb-6 relative z-10">
             <div className={cn("w-24 h-24 rounded-[1.75rem] flex items-center justify-center shrink-0 transition-all duration-500", icon3DClass)}>
                {icon}
             </div>
             <div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 truncate max-w-[250px]" title={currentVehicle.name}>{currentVehicle.name || "Nama Belum Diisi"}</h3>
               <span className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-sm transition-colors duration-500", badgeClass)}>
                 Kategori: {vCat}
               </span>
             </div>
           </div>

           <div className="space-y-6 relative z-10">
              {/* UPLOAD GAMBAR ARMADA */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5"><ImagePlus className="w-3.5 h-3.5" /> Gambar Armada (Opsional)</label>
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={cn(
                    "w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative",
                    currentVehicle.imageUrl ? "border-slate-300" : "border-slate-300 bg-white/50 hover:bg-white hover:border-[#7A171D]/50",
                    isUploading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} disabled={isUploading} />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 text-[#7A171D] animate-spin mb-2" />
                      <span className="text-xs font-bold text-slate-500">Mengunggah ke Cloudinary...</span>
                    </div>
                  ) : currentVehicle.imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={currentVehicle.imageUrl} alt="Vehicle preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-slate-900/60 px-3 py-1.5 rounded-lg backdrop-blur-md">Ubah Gambar</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 group">
                      <UploadCloud className="w-8 h-8 mb-2 group-hover:text-[#7A171D] transition-colors" />
                      <span className="text-xs font-bold">Klik untuk unggah gambar (.jpg, .png)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OPSI KATEGORI INTERAKTIF */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Pilih Kategori Kendaraan</label>
                <div className="grid grid-cols-3 gap-3">
                  <div onClick={() => setCurrentVehicle({...currentVehicle, category: "Motor"})} className={cn("cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-all bg-white/60 backdrop-blur-md shadow-sm", currentVehicle.category === "Motor" ? "border-[#C5A059] bg-gradient-to-br from-[#DFBE7B]/20 to-[#C5A059]/20" : "border-white hover:border-[#C5A059]/50")}>
                    <Truck className={cn("w-6 h-6", currentVehicle.category === "Motor" ? "text-[#C5A059]" : "text-slate-400")} />
                    <span className={cn("text-[10px] font-bold uppercase", currentVehicle.category === "Motor" ? "text-[#A68345]" : "text-slate-500")}>Motor</span>
                  </div>
                  <div onClick={() => setCurrentVehicle({...currentVehicle, category: "Mobil"})} className={cn("cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-all bg-white/60 backdrop-blur-md shadow-sm", currentVehicle.category === "Mobil" ? "border-blue-500 bg-gradient-to-br from-blue-400/20 to-blue-600/20" : "border-white hover:border-blue-300")}>
                    <Car className={cn("w-6 h-6", currentVehicle.category === "Mobil" ? "text-blue-600" : "text-slate-400")} />
                    <span className={cn("text-[10px] font-bold uppercase", currentVehicle.category === "Mobil" ? "text-blue-700" : "text-slate-500")}>Mobil / Van</span>
                  </div>
                  <div onClick={() => setCurrentVehicle({...currentVehicle, category: "Truk"})} className={cn("cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-all bg-white/60 backdrop-blur-md shadow-sm", currentVehicle.category === "Truk" ? "border-slate-800 bg-gradient-to-br from-slate-600/20 to-slate-800/20" : "border-white hover:border-slate-800/50")}>
                    <Truck className={cn("w-6 h-6", currentVehicle.category === "Truk" ? "text-slate-800" : "text-slate-400")} />
                    <span className={cn("text-[10px] font-bold uppercase", currentVehicle.category === "Truk" ? "text-slate-800" : "text-slate-500")}>Truk Kargo</span>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {currentVehicle.category === "Truk" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 p-5 rounded-2xl flex gap-3 shadow-sm mt-2">
                      <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-red-800 text-[11px] leading-relaxed font-medium">
                        <b className="text-red-900 block mb-1">Fleet / Vendor Management Aktif</b>
                        Kategori <span className="font-bold">Truk</span> akan mengaktifkan sistem registrasi Perusahaan, Sopir, dan Armada (STNK & KIR) secara terpisah di portal Kemitraan B2B/Vendor.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-4">
                <div className={cn("space-y-2 col-span-2 sm:col-span-1 p-1 rounded-xl transition-all", activeBorder)}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nama / Tipe Armada</label>
                  <AdminInput required placeholder="Cth: Truk Engkel Box" value={currentVehicle.name} onChange={(e) => setCurrentVehicle({...currentVehicle, name: e.target.value, id: isAddMode ? e.target.value.toLowerCase().replace(/\s+/g, '-') : currentVehicle.id})} className="font-bold" />
                </div>
                <div className={cn("space-y-2 col-span-2 sm:col-span-1 p-1 rounded-xl transition-all", activeBorder)}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kode Unik (ID)</label>
                  <AdminInput required placeholder="cth: truk-engkel" value={currentVehicle.id} disabled={!isAddMode} onChange={(e) => setCurrentVehicle({...currentVehicle, id: e.target.value})} className="font-mono bg-slate-100/80 text-slate-500 cursor-not-allowed" />
                </div>
              </div>

              <div className={cn("space-y-2 p-1 rounded-xl transition-all", activeBorder)}>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Kapasitas Muatan Maksimal</label>
                <div className="relative">
                  <AdminInput required type="number" placeholder="Cth: 800" value={currentVehicle.maxWeight || ""} onChange={(e) => setCurrentVehicle({...currentVehicle, maxWeight: Number(e.target.value)})} className="pr-12 font-black text-2xl text-slate-900 h-14" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">KG</span>
                </div>
              </div>
           </div>
        </div>

        {/* KOLOM KANAN: DIMENSI KHUSUS MOTOR */}
        <div className="lg:col-span-5 space-y-6">
           <AnimatePresence mode="wait">
              {currentVehicle.category === "Motor" ? (
                <motion.div key="motor-dim" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`${glassPanel} rounded-[2rem] p-8 space-y-6`}>
                  <h3 className="text-sm font-black text-[#C5A059] uppercase tracking-widest flex items-center gap-2 border-b border-white/60 pb-4">
                    <Box className="w-4 h-4"/> Detail Dimensi Box / Tas
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Size S */}
                    <div className="bg-white/60 p-4 rounded-xl border border-white shadow-sm flex items-center gap-4 group hover:bg-white transition-colors">
                      <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center font-black text-[#C5A059] shadow-sm shrink-0 group-hover:border-[#C5A059] transition-colors">S</div>
                      <div className="flex gap-2 flex-1">
                        <AdminInput type="number" value={currentVehicle.dimS?.p} onChange={(e) => setCurrentVehicle({...currentVehicle, dimS: {...currentVehicle.dimS!, p: Number(e.target.value)}})} className="text-center px-1 font-bold focus:border-[#C5A059]" placeholder="P" />
                        <AdminInput type="number" value={currentVehicle.dimS?.l} onChange={(e) => setCurrentVehicle({...currentVehicle, dimS: {...currentVehicle.dimS!, l: Number(e.target.value)}})} className="text-center px-1 font-bold focus:border-[#C5A059]" placeholder="L" />
                        <AdminInput type="number" value={currentVehicle.dimS?.t} onChange={(e) => setCurrentVehicle({...currentVehicle, dimS: {...currentVehicle.dimS!, t: Number(e.target.value)}})} className="text-center px-1 font-bold focus:border-[#C5A059]" placeholder="T" />
                      </div>
                    </div>

                    {/* Size M */}
                    <div className="bg-white/60 p-4 rounded-xl border border-white shadow-sm flex items-center gap-4 group hover:bg-white transition-colors">
                      <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center font-black text-[#C5A059] shadow-sm shrink-0 group-hover:border-[#C5A059] transition-colors">M</div>
                      <div className="flex gap-2 flex-1">
                        <AdminInput type="number" value={currentVehicle.dimM?.p} onChange={(e) => setCurrentVehicle({...currentVehicle, dimM: {...currentVehicle.dimM!, p: Number(e.target.value)}})} className="text-center px-1 font-bold focus:border-[#C5A059]" placeholder="P" />
                        <AdminInput type="number" value={currentVehicle.dimM?.l} onChange={(e) => setCurrentVehicle({...currentVehicle, dimM: {...currentVehicle.dimM!, l: Number(e.target.value)}})} className="text-center px-1 font-bold focus:border-[#C5A059]" placeholder="L" />
                        <AdminInput type="number" value={currentVehicle.dimM?.t} onChange={(e) => setCurrentVehicle({...currentVehicle, dimM: {...currentVehicle.dimM!, t: Number(e.target.value)}})} className="text-center px-1 font-bold focus:border-[#C5A059]" placeholder="T" />
                      </div>
                    </div>

                    {/* Size L */}
                    <div className="bg-white/60 p-4 rounded-xl border border-white shadow-sm flex items-center gap-4 group hover:bg-white transition-colors">
                      <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center font-black text-[#C5A059] shadow-sm shrink-0 group-hover:border-[#C5A059] transition-colors">L</div>
                      <div className="flex gap-2 flex-1">
                        <AdminInput type="number" value={currentVehicle.dimL?.p} onChange={(e) => setCurrentVehicle({...currentVehicle, dimL: {...currentVehicle.dimL!, p: Number(e.target.value)}})} className="text-center px-1 font-bold focus:border-[#C5A059]" placeholder="P" />
                        <AdminInput type="number" value={currentVehicle.dimL?.l} onChange={(e) => setCurrentVehicle({...currentVehicle, dimL: {...currentVehicle.dimL!, l: Number(e.target.value)}})} className="text-center px-1 font-bold focus:border-[#C5A059]" placeholder="L" />
                        <AdminInput type="number" value={currentVehicle.dimL?.t} onChange={(e) => setCurrentVehicle({...currentVehicle, dimL: {...currentVehicle.dimL!, t: Number(e.target.value)}})} className="text-center px-1 font-bold focus:border-[#C5A059]" placeholder="T" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="non-motor-dim" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`${glassPanel} rounded-[2rem] p-8 flex flex-col items-center justify-center min-h-[300px] border border-dashed border-slate-300 text-center`}>
                  <Box className="w-16 h-16 text-slate-300 mb-4" />
                  <h4 className="font-bold text-slate-700 text-lg mb-1">Dimensi Otomatis</h4>
                  <p className="text-slate-500 text-xs font-medium max-w-xs leading-relaxed">
                    Untuk tipe Mobil dan Truk, dimensi ruang akan disesuaikan secara manual oleh Driver atau Perusahaan saat melakukan registrasi armada.
                  </p>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white p-5 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="max-w-6xl mx-auto flex justify-end gap-3">
            <AdminButton type="button" onClick={() => router.push(getAdminUrl("/admin/vehicles"))} variant="outline" className="font-bold h-12 w-auto px-6 bg-white border-slate-200 hover:bg-slate-50 shadow-sm">
              Batal
            </AdminButton>
            <AdminButton type="submit" disabled={isSaving || isUploading} className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-950 font-bold h-12 w-auto px-8 shadow-[0_8px_20px_rgba(15,23,42,0.25)] hover:brightness-110">
              <Save className="w-4 h-4 mr-2" /> {isSaving ? "Menyimpan..." : "Simpan Spesifikasi"}
            </AdminButton>
          </div>
        </div>

      </form>
    </div>
  );
}