"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import dynamic from "next/dynamic";
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Edit2, Save, X, 
  User, Building2, Truck, FileText, MapPin, MapPinned, 
  Camera, ExternalLink, ShieldAlert, Activity, CreditCard
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

// IMPORT GLOBAL TYPES
import { PricingConfig } from "@/types/admin";
import { DynamicVehicle } from "@/types/order";

// ======================================================================
// JURUS SHIELDING INTERFACE
// ======================================================================
export interface SafeDriverData {
  id: string;
  name?: string;
  phone?: string;
  partnerType?: string;
  companyName?: string;
  npwp?: string;
  nik?: string;
  simNumber?: string;
  licensePlate?: string;
  vehicleType?: string;
  bankName?: string;
  bankAccount?: string;
  vendorId?: string;
  vendorName?: string;
  driverId?: string;
  driverName?: string; 
  isSuspended?: boolean;
  balance?: number;
  baseAddress?: string;
  fotoProfileUrl?: string;
  fotoKtpUrl?: string;
  fotoSimUrl?: string;
  npwpUrl?: string;
  stnkUrl?: string;
  kirUrl?: string;
  baseCoords?: { lat: number; lng: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; 
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

export default function DriverDetailPage() {
  const router = useRouter();
  const params = useParams();
  const partnerId = params.id as string;
  const { user: currentUser } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [partner, setPartner] = useState<SafeDriverData | null>(null);
  const [formData, setFormData] = useState<Partial<SafeDriverData>>({});
  
  const [vendors, setVendors] = useState<SafeDriverData[]>([]);
  const [fleetDrivers, setFleetDrivers] = useState<{id: string, name: string, vendorId: string}[]>([]); 
  const [vehiclesConfig, setVehiclesConfig] = useState<DynamicVehicle[]>([]);

  const [mapViewState, setMapViewState] = useState({ longitude: 118.0149, latitude: -2.5489, zoom: 12 });
  const [activeDraggable, setActiveDraggable] = useState<"origin" | null>(null);
  const [files, setFiles] = useState<{ profile: File|null, ktp: File|null, sim: File|null, npwp: File|null, stnk: File|null, kir: File|null }>({
    profile: null, ktp: null, sim: null, npwp: null, stnk: null, kir: null
  });

  const refs = {
    profile: useRef<HTMLInputElement>(null), ktp: useRef<HTMLInputElement>(null), sim: useRef<HTMLInputElement>(null),
    npwp: useRef<HTMLInputElement>(null), stnk: useRef<HTMLInputElement>(null), kir: useRef<HTMLInputElement>(null)
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, "driver_wallets", partnerId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          showToast("error", "Data mitra tidak ditemukan.");
          setIsLoading(false);
          return;
        }
        const data = { id: docSnap.id, ...docSnap.data() } as SafeDriverData;
        setPartner(data);
        setFormData(data);

        if (data.baseCoords) {
          setMapViewState({ longitude: data.baseCoords.lng, latitude: data.baseCoords.lat, zoom: 14 });
        }

        const vQuery = query(collection(db, "driver_wallets"), where("partnerType", "==", "Vendor"));
        const vSnap = await getDocs(vQuery);
        setVendors(vSnap.docs.map(d => ({ id: d.id, ...d.data() }) as SafeDriverData));

        const dQuery = query(collection(db, "driver_wallets"), where("partnerType", "==", "FleetDriver"));
        const dSnap = await getDocs(dQuery);
        setFleetDrivers(dSnap.docs.map(d => {
          const dData = d.data();
          return { id: d.id, name: dData.name || "", vendorId: dData.vendorId || "" };
        }));

        const pSnap = await getDoc(doc(db, "settings", "pricing"));
        if (pSnap.exists()) {
          const pData = pSnap.data() as PricingConfig;
          if (pData.customVehicles) setVehiclesConfig(pData.customVehicles);
        }

      } catch (error) {
        console.error(error);
        showToast("error", "Gagal memuat detail mitra.");
      } finally {
        setIsLoading(false);
      }
    };
    if (partnerId) loadData();
  }, [partnerId]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const uploadToCloudinary = async (file: File | null): Promise<string> => {
    if (!file) return "";
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) return "";

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const [profileUrl, ktpUrl, simUrl, npwpUrl, stnkUrl, kirUrl] = await Promise.all([
        files.profile ? uploadToCloudinary(files.profile) : Promise.resolve(formData.fotoProfileUrl),
        files.ktp ? uploadToCloudinary(files.ktp) : Promise.resolve(formData.fotoKtpUrl),
        files.sim ? uploadToCloudinary(files.sim) : Promise.resolve(formData.fotoSimUrl),
        files.npwp ? uploadToCloudinary(files.npwp) : Promise.resolve(formData.npwpUrl),
        files.stnk ? uploadToCloudinary(files.stnk) : Promise.resolve(formData.stnkUrl),
        files.kir ? uploadToCloudinary(files.kir) : Promise.resolve(formData.kirUrl),
      ]);

      const payload: Partial<SafeDriverData> = {
        ...formData,
        fotoProfileUrl: profileUrl, fotoKtpUrl: ktpUrl, fotoSimUrl: simUrl,
        npwpUrl: npwpUrl, stnkUrl: stnkUrl, kirUrl: kirUrl
      };

      if (payload.vendorId && payload.vendorId !== partner?.vendorId) {
        const vendorObj = vendors.find(v => v.id === payload.vendorId);
        if (vendorObj) payload.vendorName = vendorObj.companyName || vendorObj.name || "Vendor";
      }

      if (partner?.partnerType === "FleetVehicle") {
        const driverObj = fleetDrivers.find(d => d.id === payload.driverId);
        if (driverObj) payload.driverName = driverObj.name;
        
        if (payload.licensePlate && payload.vehicleType) {
          payload.name = `${payload.licensePlate} (${payload.vehicleType})`; 
        }
      }

      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      await updateDoc(doc(db, "driver_wallets", partnerId), payload);
      setPartner(payload as SafeDriverData);
      setFormData(payload);
      setFiles({ profile: null, ktp: null, sim: null, npwp: null, stnk: null, kir: null });
      setIsEditing(false);
      showToast("success", "Detail mitra berhasil diperbarui!");
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
      console.error(error);
      showToast("error", "Gagal menyimpan pembaruan. Periksa koneksi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(partner || {});
    setFiles({ profile: null, ktp: null, sim: null, npwp: null, stnk: null, kir: null });
    setIsEditing(false);
    if (partner?.baseCoords) {
      setMapViewState({ longitude: partner.baseCoords.lng, latitude: partner.baseCoords.lat, zoom: 14 });
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

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-10 h-10 text-[#7A171D] animate-pulse mb-4" />
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Menarik Berkas Mitra...</p>
      </div>
    );
  }

  if (!partner) return null;

  const isIndividual = partner.partnerType === "Individual";
  const isVendor = partner.partnerType === "Vendor";
  const isFleetDriver = partner.partnerType === "FleetDriver";
  const isFleetVehicle = partner.partnerType === "FleetVehicle";

  return (
    <div className="space-y-6 font-sans pb-10 max-w-6xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER PAGE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button onClick={() => router.push("/admin/users/drivers")} className="flex items-center gap-2 text-slate-500 hover:text-[#7A171D] font-bold text-sm transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-fit">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Fleet List
        </button>
        
        <div className="flex gap-3 w-full md:w-auto">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} disabled={isSaving} variant="outline" className="flex-1 md:flex-none border-slate-300 font-bold h-11"><X className="w-4 h-4 mr-2"/> Batal</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 md:flex-none bg-[#7A171D] hover:bg-[#5A0E13] text-white shadow-md font-bold h-11">
                {isSaving ? "Menyimpan..." : <><Save className="w-4 h-4 mr-2"/> Simpan Perubahan</>}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="w-full md:w-auto bg-[#C5A059] hover:bg-[#A68345] text-white shadow-md font-bold h-11 px-6">
              <Edit2 className="w-4 h-4 mr-2" /> Edit Informasi Mitra
            </Button>
          )}
        </div>
      </div>

      {/* PROFILE HEADER CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm shrink-0 bg-slate-50 flex items-center justify-center">
            {formData.fotoProfileUrl || files.profile ? (
              <Image src={files.profile ? URL.createObjectURL(files.profile) : String(formData.fotoProfileUrl)} alt="Profile" fill className="object-cover" sizes="112px" />
            ) : isVendor ? <Building2 className="w-10 h-10 text-slate-300"/> : isFleetVehicle ? <Truck className="w-10 h-10 text-slate-300"/> : <User className="w-10 h-10 text-slate-300"/>}
            
            {isEditing && (isIndividual || isFleetDriver) && (
              <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity backdrop-blur-sm">
                <Camera className="w-6 h-6 mb-1"/>
                <span className="text-[10px] font-bold uppercase tracking-widest">Ubah Foto</span>
                <input type="file" ref={refs.profile} onChange={(e) => handleFileChange('profile', e)} accept="image/*" className="hidden" />
              </label>
            )}
          </div>
          
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {isVendor ? (formData.companyName || "PT/CV") : (formData.name || "Tanpa Nama")}
              </h1>
              <Badge variant={partner.isSuspended ? "danger" : "success"} className="uppercase text-[10px] px-3 shadow-sm mx-auto sm:mx-0">
                {partner.isSuspended ? "Suspended" : "Active"}
              </Badge>
            </div>
            
            <p className="text-xs font-bold text-[#C5A059] uppercase tracking-widest bg-[#C5A059]/10 px-3 py-1 rounded-md w-fit mx-auto sm:mx-0">
              {String(partner.partnerType)}
            </p>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm font-semibold text-slate-500 pt-2">
              <span className="flex items-center gap-1.5"><span className="text-[10px] border border-slate-200 text-slate-600 bg-white px-2 py-0.5 rounded-md font-bold">ID: {partner.id}</span></span>
              {formData.phone && <span className="flex items-center gap-1.5">📞 {formData.phone}</span>}
              {formData.vehicleType && <span className="flex items-center gap-1.5"><Truck className="w-4 h-4"/> {formData.vehicleType}</span>}
              {formData.licensePlate && <span className="flex items-center gap-1.5 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">{formData.licensePlate}</span>}
            </div>
          </div>

          <div className="sm:text-right shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo Dompet / Wallet</p>
            <p className="text-2xl font-black text-emerald-600">
              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(partner.balance || 0)}
            </p>
            <Button onClick={() => router.push(`/admin/users/drivers/${partner.id}/wallet`)} variant="outline" className="w-full mt-3 h-8 text-[10px] font-bold bg-white shadow-sm border-slate-200">
              Riwayat Mutasi
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* KOLOM KIRI: FORM DATA */}
        <div className="space-y-6">
          
          {/* DATA PERSONAL / PERUSAHAAN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
              {isVendor ? <Building2 className="w-4 h-4 text-[#7A171D]"/> : <User className="w-4 h-4 text-[#7A171D]"/>}
              Informasi Entitas
            </h3>
            
            <div className="space-y-4">
              {isVendor ? (
                <>
                  <FieldLabel label="Nama Perusahaan (PT/CV)" value={formData.companyName} isEditing={isEditing} 
                    input={<Input value={formData.companyName || ""} onChange={e => setFormData({...formData, companyName: e.target.value})} className="font-bold border-slate-300" />} />
                  <FieldLabel label="Nama Manager / PIC" value={formData.name} isEditing={isEditing} 
                    input={<Input value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} className="font-bold border-slate-300" />} />
                  <FieldLabel label="Nomor NPWP" value={formData.npwp} isEditing={isEditing} 
                    input={<Input value={formData.npwp || ""} onChange={e => setFormData({...formData, npwp: e.target.value})} className="font-mono font-bold border-slate-300" />} />
                </>
              ) : (
                <>
                  {(!isFleetVehicle) && (
                    <FieldLabel label="Nama Lengkap KTP" value={formData.name} isEditing={isEditing} 
                      input={<Input value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} className="font-bold border-slate-300" />} />
                  )}
                  {(!isFleetVehicle) && (
                    <FieldLabel label="Nomor NIK KTP" value={formData.nik} isEditing={isEditing} 
                      input={<Input value={formData.nik || ""} onChange={e => setFormData({...formData, nik: e.target.value})} className="font-mono font-bold border-slate-300" />} />
                  )}
                  {(!isFleetVehicle) && (
                    <FieldLabel label="Nomor SIM" value={formData.simNumber} isEditing={isEditing} 
                      input={<Input value={formData.simNumber || ""} onChange={e => setFormData({...formData, simNumber: e.target.value})} className="font-mono font-bold border-slate-300" />} />
                  )}
                </>
              )}
              
              {(!isFleetVehicle) && (
                <FieldLabel label="Nomor Handphone (WA)" value={formData.phone} isEditing={isEditing} 
                  input={<Input value={formData.phone || ""} onChange={e => setFormData({...formData, phone: e.target.value})} className="font-mono font-bold border-slate-300" />} />
              )}
            </div>
          </div>

          {/* DATA KENDARAAN & RELASI FLEET */}
          {(isIndividual || isFleetDriver || isFleetVehicle) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#7A171D]"/> Informasi Armada & Relasi
              </h3>
              
              <div className="space-y-4">
                {(isFleetDriver || isFleetVehicle) && (
                  <FieldLabel label="Induk Vendor (PT)" value={formData.vendorName || formData.vendorId} isEditing={isEditing} 
                    input={
                      <select value={formData.vendorId || ""} onChange={(e) => setFormData({...formData, vendorId: e.target.value, driverId: ""})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm font-bold outline-none focus:border-blue-500 shadow-sm">
                        <option value="" disabled>-- Pilih Vendor --</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName || v.name}</option>)}
                      </select>
                    } 
                  />
                )}

                {/* FITUR RELASI TRUK KE SOPIR */}
                {isFleetVehicle && (
                  <FieldLabel label="Sopir Penanggung Jawab" value={formData.driverName || "Belum Ditugaskan"} isEditing={isEditing} 
                    input={
                      <select required value={formData.driverId || ""} onChange={(e) => setFormData({...formData, driverId: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm font-bold outline-none focus:border-emerald-500 shadow-sm appearance-none cursor-pointer">
                        <option value="" disabled>-- Pilih Sopir Vendor Ini --</option>
                        {fleetDrivers.filter(d => d.vendorId === formData.vendorId).length === 0 && (
                          <option value="" disabled>Vendor belum mendaftarkan sopir.</option>
                        )}
                        {fleetDrivers.filter(d => d.vendorId === formData.vendorId).map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    } 
                  />
                )}

                {(isIndividual || isFleetVehicle) && (
                  <FieldLabel label="Tipe Kendaraan" value={formData.vehicleType} isEditing={isEditing} 
                    input={
                      <select value={formData.vehicleType || ""} onChange={(e) => setFormData({...formData, vehicleType: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-sm font-bold outline-none focus:border-blue-500 shadow-sm">
                        <option value="" disabled>-- Pilih Tipe --</option>
                        {vehiclesConfig.filter(v => isFleetVehicle ? v.category === "Truk" : v.category !== "Truk").map(v => (
                          <option key={v.id} value={v.name}>{v.name}</option>
                        ))}
                      </select>
                    } 
                  />
                )}
                
                {isFleetVehicle && (
                  <FieldLabel label="Plat Nomor" value={formData.licensePlate} isEditing={isEditing} 
                    input={<Input value={formData.licensePlate || ""} onChange={e => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})} className="font-mono font-bold border-slate-300" />} />
                )}
              </div>
            </div>
          )}

          {/* DATA PERBANKAN VENDOR */}
          {isVendor && (
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
                 <CreditCard className="w-4 h-4 text-[#7A171D]"/> Informasi Rekening Vendor
               </h3>
               <div className="space-y-4">
                 <FieldLabel label="Nama Bank" value={formData.bankName} isEditing={isEditing} 
                    input={<Input value={formData.bankName || ""} onChange={e => setFormData({...formData, bankName: e.target.value})} className="font-bold border-slate-300" />} />
                 <FieldLabel label="Nomor Rekening" value={formData.bankAccount} isEditing={isEditing} 
                    input={<Input value={formData.bankAccount || ""} onChange={e => setFormData({...formData, bankAccount: e.target.value})} className="font-mono font-bold border-slate-300" />} />
               </div>
             </div>
          )}

        </div>

        {/* KOLOM KANAN: DOKUMEN & PETA */}
        <div className="space-y-6">
          
          {/* GALERI DOKUMEN LEGALITAS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C5A059]"/> Dokumen Legalitas
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {(!isFleetVehicle) && <DocumentCard title="KTP" url={formData.fotoKtpUrl} file={files.ktp} isEditing={isEditing} onUploadClick={() => refs.ktp.current?.click()} />}
              {(!isFleetVehicle) && <DocumentCard title="SIM" url={formData.fotoSimUrl} file={files.sim} isEditing={isEditing} onUploadClick={() => refs.sim.current?.click()} />}
              
              {isVendor && <DocumentCard title="NPWP" url={formData.npwpUrl} file={files.npwp} isEditing={isEditing} onUploadClick={() => refs.npwp.current?.click()} />}
              
              {isFleetVehicle && <DocumentCard title="STNK" url={formData.stnkUrl} file={files.stnk} isEditing={isEditing} onUploadClick={() => refs.stnk.current?.click()} />}
              {isFleetVehicle && <DocumentCard title="Buku KIR" url={formData.kirUrl} file={files.kir} isEditing={isEditing} onUploadClick={() => refs.kir.current?.click()} />}
            </div>

            {/* Hidden Inputs for upload */}
            <input type="file" ref={refs.ktp} onChange={(e) => handleFileChange('ktp', e)} accept="image/*" className="hidden" />
            <input type="file" ref={refs.sim} onChange={(e) => handleFileChange('sim', e)} accept="image/*" className="hidden" />
            <input type="file" ref={refs.npwp} onChange={(e) => handleFileChange('npwp', e)} accept="image/*" className="hidden" />
            <input type="file" ref={refs.stnk} onChange={(e) => handleFileChange('stnk', e)} accept="image/*" className="hidden" />
            <input type="file" ref={refs.kir} onChange={(e) => handleFileChange('kir', e)} accept="image/*" className="hidden" />
          </div>

          {/* BASE LOCATION MAPS */}
          {(isIndividual || isVendor) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#7A171D]"/> Lokasi Base / Mangkal
              </h3>
              
              {isEditing ? (
                <div className="space-y-3">
                  <style dangerouslySetInnerHTML={{__html: `
                    mapbox-search-listbox { z-index: 999999 !important; border-radius: 12px !important; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2) !important; border: 1px solid #e2e8f0 !important; margin-top: 4px !important; }
                    mapbox-search-box { --focus-box-shadow: none; --border-radius: 12px; }
                  `}} />
                  <div className="border border-slate-300 focus-within:border-[#7A171D] focus-within:ring-4 focus-within:ring-[#7A171D]/10 rounded-xl transition-all bg-white relative z-[9999] h-11 flex items-center">
                    <SearchBox
                      accessToken={MAPBOX_TOKEN}
                      options={{ language: 'id', country: 'ID' }}
                      value={formData.baseAddress || ""}
                      placeholder="Cari alamat baru..."
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
              ) : (
                <p className="text-sm font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed mb-3">
                  {formData.baseAddress || "Alamat tidak tersedia"}
                </p>
              )}

              <div className="w-full h-48 sm:h-64 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative z-0 mt-3">
                {formData.baseCoords ? (
                  <MapBase 
                    longitude={mapViewState.longitude}
                    latitude={mapViewState.latitude}
                    zoom={mapViewState.zoom}
                    interactive={isEditing}
                    originCoords={formData.baseCoords}
                    activeDraggable={activeDraggable}
                    onMarkerDragEnd={(lng, lat) => setFormData(prev => ({...prev, baseCoords: {lng, lat}}))}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400 font-bold text-xs">Koordinat Kosong</div>
                )}
                
                {isEditing && formData.baseCoords && (
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveDraggable(activeDraggable === "origin" ? null : "origin")} className={`h-8 text-[10px] px-3 shadow-sm ${activeDraggable === "origin" ? "bg-amber-100 text-amber-700 border-amber-300 animate-pulse" : "bg-white text-slate-600"}`}>
                      <MapPinned className="w-3 h-3 mr-1.5"/> {activeDraggable === "origin" ? "Geser Pin" : "Edit Pin"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// =======================================================
// SUB COMPONENTS
// =======================================================
function FieldLabel({ label, value, isEditing, input }: { label: string, value?: string, isEditing: boolean, input: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      {isEditing ? input : <span className="text-sm font-bold text-slate-900 border border-transparent py-2.5 bg-transparent">{value || "-"}</span>}
    </div>
  );
}

function DocumentCard({ title, url, file, isEditing, onUploadClick }: { title: string, url?: string, file: File|null, isEditing: boolean, onUploadClick: () => void }) {
  const displayUrl = file ? URL.createObjectURL(file) : url;

  return (
    <div className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2 relative group bg-slate-50">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</span>
        {displayUrl && !isEditing && (
           <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded-md transition-colors"><ExternalLink className="w-3.5 h-3.5"/></a>
        )}
      </div>
      
      <div className="w-full aspect-[4/3] bg-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center border border-slate-300">
        {displayUrl ? (
          <Image src={displayUrl} alt={title} fill className="object-cover" sizes="200px" />
        ) : (
          <FileText className="w-6 h-6 text-slate-400 opacity-50" />
        )}

        {isEditing && (
          <div onClick={onUploadClick} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity backdrop-blur-sm">
            <Camera className="w-5 h-5 mb-1"/>
            <span className="text-[9px] font-bold uppercase tracking-widest">{displayUrl ? "Ganti" : "Upload"}</span>
          </div>
        )}
      </div>
    </div>
  );
}