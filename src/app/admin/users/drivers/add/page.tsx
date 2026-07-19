"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Truck, 
  User, Camera, Upload, MapPin, MapPinned, 
  CheckCircle, Building2, UserSquare2, 
  ShieldAlert, Activity
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, serverTimestamp, getDoc, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

// IMPORT GLOBAL TYPES
import { PricingConfig } from "@/types/admin";
import { DynamicVehicle } from "@/types/order";

// ======================================================================
// TYPE DEFINITIONS & DYNAMIC IMPORTS
// ======================================================================
type LocalPartnerType = "Individual" | "Vendor" | "FleetDriver" | "FleetVehicle";

interface FormState {
  name: string;
  phone: string;
  vehicleType: string;
  nik: string;
  simNumber: string;
  licensePlate: string;
  baseAddress: string;
  baseCoords?: { lat: number; lng: number };
  companyName: string;
  npwp: string;
  bankName: string;
  bankAccount: string;
  vendorId: string;
  vendorName: string;
  driverId: string; // <-- BARU: ID Sopir yang bawa truk ini
  driverName: string; // <-- BARU: Nama Sopir
}

const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-11 w-full bg-slate-50 rounded-xl border border-slate-200 animate-pulse flex items-center px-4 text-xs font-semibold text-slate-400">Menyelaraskan koordinat...</div> 
});

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center rounded-xl"><div className="w-6 h-6 border-2 border-slate-300 border-t-[#7A171D] rounded-full animate-spin"></div></div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

export default function AddDriverPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Data Master
  const [vendors, setVendors] = useState<{id: string, name: string, companyName: string}[]>([]);
  const [fleetDrivers, setFleetDrivers] = useState<{id: string, name: string, vendorId: string}[]>([]); // <-- BARU: Daftar Sopir PT
  const [vehiclesConfig, setVehiclesConfig] = useState<DynamicVehicle[]>([]); 
  
  const [formPartnerType, setFormPartnerType] = useState<LocalPartnerType>("Individual");
  const [mapViewState, setMapViewState] = useState({ longitude: 118.0149, latitude: -2.5489, zoom: 4 });
  const [activeDraggable, setActiveDraggable] = useState<"origin" | null>(null);

  const [formData, setFormData] = useState<FormState>({ 
    name: "", phone: "", vehicleType: "", 
    nik: "", simNumber: "", licensePlate: "",
    baseAddress: "",
    companyName: "", npwp: "", bankName: "", bankAccount: "", vendorId: "", vendorName: "", driverId: "", driverName: ""
  });

  const [files, setFiles] = useState<{ profile: File|null, ktp: File|null, sim: File|null, npwp: File|null, stnk: File|null, kir: File|null }>({ 
    profile: null, ktp: null, sim: null, npwp: null, stnk: null, kir: null 
  });

  const refs = {
    profile: useRef<HTMLInputElement>(null), ktp: useRef<HTMLInputElement>(null), sim: useRef<HTMLInputElement>(null),
    npwp: useRef<HTMLInputElement>(null), stnk: useRef<HTMLInputElement>(null), kir: useRef<HTMLInputElement>(null)
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoadingData(true);
      try {
        // Tarik Vendor
        const vQuery = query(collection(db, "driver_wallets"), where("partnerType", "==", "Vendor"));
        const vSnap = await getDocs(vQuery);
        setVendors(vSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, name: data.name || "", companyName: data.companyName || "" };
        }));

        // Tarik Supir Fleet (Truk)
        const dQuery = query(collection(db, "driver_wallets"), where("partnerType", "==", "FleetDriver"));
        const dSnap = await getDocs(dQuery);
        setFleetDrivers(dSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, name: data.name || "", vendorId: data.vendorId || "" };
        }));

        const pSnap = await getDoc(doc(db, "settings", "pricing"));
        if (pSnap.exists()) {
          const pData = pSnap.data() as PricingConfig;
          if (pData.customVehicles) setVehiclesConfig(pData.customVehicles);
        }
      } catch (error) {
        console.error(error);
        showToast("error", "Gagal memuat master data.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchMasterData();
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const uploadToCloudinary = async (file: File | null): Promise<string> => {
    if (!file) return "";
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error("Cloudinary belum dikonfigurasi.");

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: data });
    const json = await res.json();
    return json.secure_url || "";
  };

  const handleFileChange = (type: keyof typeof files, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const [profileUrl, ktpUrl, simUrl, npwpUrl, stnkUrl, kirUrl] = await Promise.all([
        uploadToCloudinary(files.profile), uploadToCloudinary(files.ktp),
        uploadToCloudinary(files.sim), uploadToCloudinary(files.npwp),
        uploadToCloudinary(files.stnk), uploadToCloudinary(files.kir)
      ]);

      const docId = `PRT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        id: docId,
        name: formData.name || "Tanpa Nama",
        phone: formData.phone || "",
        partnerType: formPartnerType,
        status: "Active",
        isSuspended: false,
        balance: 0,
        createdAt: serverTimestamp()
      };

      if (formPartnerType === "Individual") {
        Object.assign(payload, {
          vehicleType: formData.vehicleType, nik: formData.nik, simNumber: formData.simNumber,
          fotoProfileUrl: profileUrl, fotoKtpUrl: ktpUrl, fotoSimUrl: simUrl,
          baseAddress: formData.baseAddress, baseCoords: formData.baseCoords
        });
      } else if (formPartnerType === "Vendor") {
        Object.assign(payload, {
          companyName: formData.companyName, npwp: formData.npwp, npwpUrl: npwpUrl,
          bankName: formData.bankName, bankAccount: formData.bankAccount,
          baseAddress: formData.baseAddress, baseCoords: formData.baseCoords
        });
      } else if (formPartnerType === "FleetDriver") {
        const vendorObj = vendors.find(p => p.id === formData.vendorId);
        Object.assign(payload, {
          vendorId: formData.vendorId, vendorName: vendorObj?.companyName || vendorObj?.name || "Vendor Unknown",
          nik: formData.nik, simNumber: formData.simNumber, fotoProfileUrl: profileUrl, fotoKtpUrl: ktpUrl, fotoSimUrl: simUrl
        });
      } else if (formPartnerType === "FleetVehicle") {
        const vendorObj = vendors.find(p => p.id === formData.vendorId);
        const driverObj = fleetDrivers.find(d => d.id === formData.driverId);
        
        // BUG FIX: Set name truk dengan gabungan Plat + Jenis agar rapi di tabel
        payload.name = `${formData.licensePlate} (${formData.vehicleType})`; 

        Object.assign(payload, {
          vendorId: formData.vendorId, vendorName: vendorObj?.companyName || vendorObj?.name || "Vendor Unknown",
          driverId: formData.driverId, driverName: driverObj?.name || "Belum Ditugaskan",
          vehicleType: formData.vehicleType, licensePlate: formData.licensePlate, stnkUrl: stnkUrl, kirUrl: kirUrl
        });
      }

      await setDoc(doc(db, "driver_wallets", docId), payload);
      showToast("success", "Registrasi entitas kemitraan berhasil!");
      
      setTimeout(() => {
        router.push("/admin/users/drivers");
      }, 1500);

    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memproses pendaftaran. Periksa koneksi & file.");
      setIsProcessing(false);
    }
  };

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-10 h-10 text-[#7A171D] animate-pulse mb-4" />
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Menyiapkan Formulir...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-28 max-w-5xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/admin/users/drivers")} className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#7A171D] hover:bg-slate-50 transition-colors shadow-sm shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Pendaftaran Kemitraan Baru</h1>
          <p className="text-slate-500 text-sm mt-0.5">Pilih jenis kemitraan dan lengkapi data legalitas ke dalam ekosistem Fleet Management.</p>
        </div>
      </div>

      <form id="reg-form" onSubmit={handleSubmitRegistration} className="space-y-8">
        
        {/* TIPE PENDAFTARAN */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Pilih Tipe Pendaftaran</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div onClick={() => setFormPartnerType("Individual")} className={cn("cursor-pointer border-2 rounded-2xl p-5 text-center transition-all", formPartnerType === "Individual" ? "border-[#C5A059] bg-[#C5A059]/10 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-slate-50")}>
              <User className={cn("w-7 h-7 mx-auto mb-3", formPartnerType === "Individual" ? "text-[#C5A059]" : "text-slate-400")} />
              <h4 className="font-bold text-sm text-slate-900">Individu</h4>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Motor/Mobil Pribadi</p>
            </div>
            <div onClick={() => setFormPartnerType("Vendor")} className={cn("cursor-pointer border-2 rounded-2xl p-5 text-center transition-all", formPartnerType === "Vendor" ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-slate-50")}>
              <Building2 className={cn("w-7 h-7 mx-auto mb-3", formPartnerType === "Vendor" ? "text-blue-500" : "text-slate-400")} />
              <h4 className="font-bold text-sm text-slate-900">Vendor (PT)</h4>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Akun Induk Manager</p>
            </div>
            <div onClick={() => setFormPartnerType("FleetDriver")} className={cn("cursor-pointer border-2 rounded-2xl p-5 text-center transition-all", formPartnerType === "FleetDriver" ? "border-[#7A171D] bg-[#7A171D]/10 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-slate-50")}>
              <UserSquare2 className={cn("w-7 h-7 mx-auto mb-3", formPartnerType === "FleetDriver" ? "text-[#7A171D]" : "text-slate-400")} />
              <h4 className="font-bold text-sm text-slate-900">Supir Vendor</h4>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Sopir khusus PT</p>
            </div>
            <div onClick={() => setFormPartnerType("FleetVehicle")} className={cn("cursor-pointer border-2 rounded-2xl p-5 text-center transition-all", formPartnerType === "FleetVehicle" ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-slate-50")}>
              <Truck className={cn("w-7 h-7 mx-auto mb-3", formPartnerType === "FleetVehicle" ? "text-emerald-500" : "text-slate-400")} />
              <h4 className="font-bold text-sm text-slate-900">Armada Vendor</h4>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Truk fisik milik PT</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* INFORMASI ENTITAS & KENDARAAN */}
          <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4">
                {formPartnerType === "Vendor" ? <Building2 className="w-4 h-4 text-[#7A171D]"/> : <User className="w-4 h-4 text-[#7A171D]"/>}
                Formulir Informasi
              </h3>

              {(formPartnerType === "FleetDriver" || formPartnerType === "FleetVehicle") && (
                <div className="space-y-2 bg-blue-50 border border-blue-200 p-4 rounded-xl mb-2">
                  <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> Pilih Induk Vendor (PT)</label>
                  <select required value={formData.vendorId} onChange={(e) => setFormData({...formData, vendorId: e.target.value, driverId: ""})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-sm font-bold outline-none focus:border-blue-500 shadow-sm appearance-none cursor-pointer">
                    <option value="" disabled>-- Pilih Vendor Terdaftar --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName || v.name}</option>)}
                  </select>
                </div>
              )}

              {/* TAHAP 1: FITUR RELASI TRUK KE SOPIR */}
              {formPartnerType === "FleetVehicle" && formData.vendorId && (
                <div className="space-y-2 bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-2">
                  <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5"><UserSquare2 className="w-3.5 h-3.5"/> Sopir Penanggung Jawab Truk</label>
                  <select required value={formData.driverId} onChange={(e) => setFormData({...formData, driverId: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-sm font-bold outline-none focus:border-emerald-500 shadow-sm appearance-none cursor-pointer">
                    <option value="" disabled>-- Pilih Sopir Vendor Ini --</option>
                    {fleetDrivers.filter(d => d.vendorId === formData.vendorId).length === 0 && (
                      <option value="" disabled>Vendor ini belum mendaftarkan sopir satupun.</option>
                    )}
                    {fleetDrivers.filter(d => d.vendorId === formData.vendorId).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formPartnerType !== "FleetVehicle" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {formPartnerType === "Vendor" ? "Nama Manager / PIC" : "Nama Lengkap Sesuai KTP"}
                  </label>
                  <Input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Masukkan nama..." className="h-12 font-bold" />
                </div>
              )}

              {formPartnerType !== "FleetVehicle" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Handphone (WA Aktif)</label>
                  <Input type="tel" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Cth: 08123456789" className="h-12 font-mono font-bold" />
                </div>
              )}

              {formPartnerType === "Vendor" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Perusahaan (PT/CV)</label>
                  <Input type="text" required value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} placeholder="PT. Mitra Logistik" className="h-12 font-bold" />
                </div>
              )}

              {formPartnerType === "Vendor" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor NPWP Perusahaan</label>
                  <Input type="text" required value={formData.npwp} onChange={(e) => setFormData({...formData, npwp: e.target.value})} placeholder="Format: 12.345.678.9-012.000" className="h-12 font-mono font-bold" />
                </div>
              )}

              {(formPartnerType === "Individual" || formPartnerType === "FleetDriver") && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Induk (NIK)</label>
                    <Input type="number" required value={formData.nik} onChange={(e) => setFormData({...formData, nik: e.target.value})} placeholder="16 Digit NIK" className="h-12 font-mono font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor SIM (A/C/B)</label>
                    <Input type="text" required value={formData.simNumber} onChange={(e) => setFormData({...formData, simNumber: e.target.value})} placeholder="Nomor SIM Valid" className="h-12 font-mono font-bold" />
                  </div>
                </div>
              )}

              {(formPartnerType === "Individual" || formPartnerType === "FleetVehicle") && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Kendaraan</label>
                  <select required value={formData.vehicleType} onChange={(e) => setFormData({...formData, vehicleType: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-sm font-bold outline-none focus:border-[#7A171D] shadow-sm appearance-none cursor-pointer">
                    <option value="" disabled>-- Pilih Klasifikasi Kendaraan --</option>
                    {vehiclesConfig.filter(v => formPartnerType === "FleetVehicle" ? v.category === "Truk" : v.category !== "Truk").map(v => (
                      <option key={v.id} value={v.name}>{String(v.name)} (Maks {v.maxWeight}Kg)</option>
                    ))}
                  </select>
                </div>
              )}

              {formPartnerType === "FleetVehicle" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plat Nomor Kendaraan</label>
                  <Input type="text" required value={formData.licensePlate} onChange={(e) => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})} placeholder="Cth: B 1234 CD" className="h-12 font-mono font-bold" />
                </div>
              )}
            </div>

            {/* BASE LOCATION MAPS */}
            {(formPartnerType === "Individual" || formPartnerType === "Vendor") && (
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <MapPin className="w-4 h-4 text-[#7A171D]"/> Lokasi Base / Mangkal
                </h3>
                
                <div className="space-y-3">
                  <style dangerouslySetInnerHTML={{__html: `
                    mapbox-search-listbox { z-index: 999999 !important; border-radius: 12px !important; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2) !important; border: 1px solid #e2e8f0 !important; margin-top: 4px !important; }
                    mapbox-search-box { --focus-box-shadow: none; --border-radius: 12px; }
                  `}} />
                  <div className="border border-slate-300 focus-within:border-[#7A171D] focus-within:ring-4 focus-within:ring-[#7A171D]/10 rounded-xl transition-all bg-white relative z-[9999] h-12 flex items-center shadow-sm">
                    <SearchBox
                      accessToken={MAPBOX_TOKEN}
                      options={{ language: 'id', country: 'ID' }}
                      value={formData.baseAddress || ""}
                      placeholder="Ketik alamat base mangkal..."
                      onRetrieve={(res) => {
                        const feature = res.features[0];
                        setFormData(prev => ({
                          ...prev,
                          baseAddress: feature.properties.full_address || feature.properties.name,
                          baseCoords: { lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] }
                        }));
                        setMapViewState({ longitude: feature.geometry.coordinates[0], latitude: feature.geometry.coordinates[1], zoom: 14 });
                      }}
                      theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '0px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: 'bold' } }}
                    />
                  </div>
                </div>

                <div className="w-full h-48 sm:h-64 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative z-0 mt-4 shadow-inner">
                  <MapBase 
                    longitude={mapViewState.longitude}
                    latitude={mapViewState.latitude}
                    zoom={mapViewState.zoom}
                    interactive={true}
                    originCoords={formData.baseCoords}
                    activeDraggable={activeDraggable}
                    onMarkerDragEnd={(lng, lat) => setFormData(prev => ({...prev, baseCoords: {lng, lat}}))}
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    {formData.baseCoords && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setActiveDraggable(activeDraggable === "origin" ? null : "origin")} className={`h-9 text-[10px] px-4 shadow-md rounded-xl font-bold ${activeDraggable === "origin" ? "bg-amber-100 text-amber-700 border-amber-300 animate-pulse" : "bg-white text-slate-700"}`}>
                        <MapPinned className="w-4 h-4 mr-2"/> {activeDraggable === "origin" ? "Geser Pin" : "Edit Koordinat"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* KOLOM KANAN: DOKUMEN UPLOAD */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm lg:sticky lg:top-24">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
              <Upload className="w-4 h-4 text-[#C5A059]"/> Dokumen Berkas Legalitas
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {(formPartnerType === "Individual" || formPartnerType === "FleetDriver") && (
                <UploadButton label="Foto Selfie Wajah" file={files.profile} onClick={() => refs.profile.current?.click()} />
              )}
              {(formPartnerType === "Individual" || formPartnerType === "FleetDriver") && (
                <>
                  <UploadButton label="Foto KTP Asli" file={files.ktp} onClick={() => refs.ktp.current?.click()} />
                  <UploadButton label="Foto SIM Asli" file={files.sim} onClick={() => refs.sim.current?.click()} />
                </>
              )}
              {formPartnerType === "Vendor" && (
                <UploadButton label="Foto NPWP PT" file={files.npwp} onClick={() => refs.npwp.current?.click()} />
              )}
              {formPartnerType === "FleetVehicle" && (
                <>
                  <UploadButton label="Foto STNK Asli" file={files.stnk} onClick={() => refs.stnk.current?.click()} />
                  <UploadButton label="Sertifikat Buku KIR" file={files.kir} onClick={() => refs.kir.current?.click()} />
                </>
              )}

              {/* Hidden Inputs */}
              <input type="file" ref={refs.profile} onChange={(e) => handleFileChange('profile', e)} accept="image/*" className="hidden" />
              <input type="file" ref={refs.ktp} onChange={(e) => handleFileChange('ktp', e)} accept="image/*" className="hidden" />
              <input type="file" ref={refs.sim} onChange={(e) => handleFileChange('sim', e)} accept="image/*" className="hidden" />
              <input type="file" ref={refs.npwp} onChange={(e) => handleFileChange('npwp', e)} accept="image/*" className="hidden" />
              <input type="file" ref={refs.stnk} onChange={(e) => handleFileChange('stnk', e)} accept="image/*" className="hidden" />
              <input type="file" ref={refs.kir} onChange={(e) => handleFileChange('kir', e)} accept="image/*" className="hidden" />
            </div>

            <div className="mt-8 bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium leading-relaxed">
                <b className="block mb-1">Panduan Unggah Dokumen:</b>
                Pastikan foto diambil di tempat terang, tulisan dapat terbaca dengan jelas (tidak blur), dan format file berupa JPG/PNG. Dokumen yang tidak valid dapat menyebabkan akun di-suspend oleh sistem.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR - REVISI: RATA KANAN & AUTO-WIDTH */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <div className="max-w-5xl mx-auto flex justify-end gap-3">
            <Button type="button" onClick={() => router.push("/admin/users/drivers")} variant="outline" className="border-slate-300 font-bold h-12 w-auto px-6 bg-slate-50">
              Batal
            </Button>
            <Button type="submit" disabled={isProcessing} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white shadow-md shadow-[#7A171D]/20 font-bold h-12 w-auto px-8">
              {isProcessing ? "Membangun Entitas..." : "Konfirmasi & Daftarkan Kemitraan"}
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}

// =======================================================
// SUB COMPONENT: UPLOAD BUTTON
// =======================================================
function UploadButton({ label, file, onClick }: { label: string, file: File | null, onClick: () => void }) {
  return (
    <div onClick={onClick} className={cn("cursor-pointer border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all h-32 group", file ? "border-emerald-500 bg-emerald-50 hover:bg-emerald-100" : "border-slate-300 bg-slate-50 hover:border-[#C5A059] hover:bg-white")}>
      {file ? <CheckCircle className="w-8 h-8 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" /> : <Camera className="w-8 h-8 text-slate-400 mb-2 group-hover:text-[#C5A059] group-hover:scale-110 transition-transform" />}
      <p className={cn("text-[10px] font-black uppercase tracking-widest", file ? "text-emerald-700" : "text-slate-600 group-hover:text-[#C5A059]")}>{label}</p>
      {file && <p className="text-[9px] text-emerald-600 mt-1 truncate w-full px-2 font-medium">{file.name}</p>}
    </div>
  );
}