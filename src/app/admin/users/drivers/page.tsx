"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Search, CheckCircle2, AlertCircle, Ban, Truck, 
  Plus, User, Camera, Upload, MapPin, X, MapPinned, 
  CheckCircle, Building2, UserSquare2, 
  ShieldAlert, Activity
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// IMPORT GLOBAL TYPES
import { DriverData, PricingConfig } from "@/types/admin";
import { DynamicVehicle } from "@/types/order";

const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-12 w-full bg-slate-50 rounded-xl border border-slate-200 animate-pulse flex items-center px-4 text-xs font-semibold text-slate-400">Sinkronisasi satelit...</div> 
});

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center rounded-xl"><div className="w-6 h-6 border-2 border-slate-300 border-t-[#7A171D] rounded-full animate-spin"></div></div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// Tipe lokal untuk form pendaftaran agar linter tidak protes (Strict Mode)
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
}

export default function FleetManagementPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [partners, setPartners] = useState<DriverData[]>([]);
  const [vehiclesConfig, setVehiclesConfig] = useState<DynamicVehicle[]>([]); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Tabs View
  const [activeTab, setActiveTab] = useState<LocalPartnerType | "All">("All");

  // State Form Registrasi
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Tipe Kemitraan yang sedang diregister
  const [formPartnerType, setFormPartnerType] = useState<LocalPartnerType>("Individual");

  const [mapViewState, setMapViewState] = useState({ longitude: 118.0149, latitude: -2.5489, zoom: 4 });
  const [activeDraggable, setActiveDraggable] = useState<"origin" | null>(null);

  const [formData, setFormData] = useState<FormState>({ 
    name: "", phone: "", vehicleType: "", 
    nik: "", simNumber: "", licensePlate: "",
    baseAddress: "",
    companyName: "", npwp: "", bankName: "", bankAccount: "", vendorId: "", vendorName: ""
  });

  // State untuk Real File Uploads
  const [files, setFiles] = useState<{
    profile: File | null; ktp: File | null; sim: File | null; npwp: File | null; stnk: File | null; kir: File | null;
  }>({ profile: null, ktp: null, sim: null, npwp: null, stnk: null, kir: null });

  const refs = {
    profile: useRef<HTMLInputElement>(null),
    ktp: useRef<HTMLInputElement>(null),
    sim: useRef<HTMLInputElement>(null),
    npwp: useRef<HTMLInputElement>(null),
    stnk: useRef<HTMLInputElement>(null),
    kir: useRef<HTMLInputElement>(null)
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "driver_wallets"));
      const list = snap.docs.map(d => ({ 
        id: d.id, 
        partnerType: "Individual", 
        ...d.data() 
      })) as unknown as DriverData[];
      setPartners(list);

      const vSnap = await getDoc(doc(db, "settings", "pricing"));
      if (vSnap.exists()) {
        const vData = vSnap.data() as PricingConfig;
        if (vData.customVehicles) setVehiclesConfig(vData.customVehicles);
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memuat ekosistem mitra.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      const payload: Partial<DriverData> = {
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
        const vendorObj = partners.find(p => p.id === formData.vendorId);
        Object.assign(payload, {
          vendorId: formData.vendorId, vendorName: vendorObj?.companyName || vendorObj?.name || "Vendor Unknown",
          nik: formData.nik, simNumber: formData.simNumber, fotoProfileUrl: profileUrl, fotoKtpUrl: ktpUrl, fotoSimUrl: simUrl
        });
      } else if (formPartnerType === "FleetVehicle") {
        const vendorObj = partners.find(p => p.id === formData.vendorId);
        Object.assign(payload, {
          vendorId: formData.vendorId, vendorName: vendorObj?.companyName || vendorObj?.name || "Vendor Unknown",
          vehicleType: formData.vehicleType, licensePlate: formData.licensePlate, stnkUrl: stnkUrl, kirUrl: kirUrl
        });
      }

      await setDoc(doc(db, "driver_wallets", docId), payload);
      showToast("success", "Registrasi entitas kemitraan berhasil!");
      
      setShowAddModal(false);
      setFiles({ profile: null, ktp: null, sim: null, npwp: null, stnk: null, kir: null });
      setFormData({ name: "", phone: "", vehicleType: "", nik: "", simNumber: "", licensePlate: "", companyName: "", npwp: "", bankName: "", bankAccount: "", vendorId: "", vendorName: "", baseAddress: "" });
      fetchData();

    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memproses pendaftaran. Periksa koneksi & file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSuspend = async (partnerId: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Yakin ingin mengaktifkan kembali entitas ini?" : "PERINGATAN! Entitas yang di-suspend tidak akan bisa menerima order/jalan. Yakin suspend?")) return;
    
    try {
      await updateDoc(doc(db, "driver_wallets", partnerId), { isSuspended: !currentStatus });
      showToast("success", "Status operasional diperbarui.");
      setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, isSuspended: !currentStatus } : p));
    } catch {
      showToast("error", "Gagal merubah status.");
    }
  };

  const processedData = useMemo(() => {
    let result = [...partners];
    
    if (activeTab !== "All") {
      result = result.filter(p => p.partnerType === activeTab);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        String(p.name || "").toLowerCase().includes(q) || 
        String(p.companyName || "").toLowerCase().includes(q) ||
        String(p.phone || "").includes(q) ||
        String(p.licensePlate || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [partners, activeTab, searchQuery]);

  const stats = {
    individu: partners.filter(p => p.partnerType === "Individual").length,
    vendor: partners.filter(p => p.partnerType === "Vendor").length,
    supirTruk: partners.filter(p => p.partnerType === "FleetDriver").length,
    armadaTruk: partners.filter(p => p.partnerType === "FleetVehicle").length,
    suspended: partners.filter(p => p.isSuspended).length
  };

  const getVendorsList = () => partners.filter(p => p.partnerType === "Vendor");

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-10">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-[#7A171D]" /> Fleet Management System
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Kelola kemitraan Individu (Kurir) dan Vendor/Perusahaan (Truk) dalam satu ekosistem terpadu.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white shadow-md shadow-[#7A171D]/20 font-bold h-12 px-6">
          <Plus className="w-4 h-4 mr-2" /> Pendaftaran Kemitraan Baru
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10"><User className="w-10 h-10 text-[#C5A059]"/></div>
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Mitra Individu</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.individu}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Building2 className="w-10 h-10 text-blue-600"/></div>
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Vendor / Perusahaan</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.vendor}</p>
        </div>
        <div className="bg-[#7A171D]/5 border border-[#7A171D]/20 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10"><UserSquare2 className="w-10 h-10 text-[#7A171D]"/></div>
          <span className="text-[#7A171D] text-[10px] font-bold uppercase tracking-wider">Sopir Truk (Fleet)</span>
          <p className="text-2xl font-black text-[#7A171D] mt-1">{stats.supirTruk}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Truck className="w-10 h-10 text-white"/></div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Armada Berat (Truk)</span>
          <p className="text-2xl font-black text-white mt-1">{stats.armadaTruk}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Ban className="w-10 h-10 text-red-600"/></div>
          <span className="text-red-700 text-[10px] font-bold uppercase tracking-wider">Entitas Di-Suspend</span>
          <p className="text-2xl font-black text-red-600 mt-1">{stats.suspended}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 bg-slate-50/50">
          {[
            { id: "All", label: "Semua Kemitraan" },
            { id: "Individual", label: "Individu (Motor/Mobil)" },
            { id: "Vendor", label: "Vendor (PT/CV)" },
            { id: "FleetDriver", label: "Sopir (Fleet)" },
            { id: "FleetVehicle", label: "Armada Kendaraan (Fleet)" }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as LocalPartnerType | "All")} 
              className={cn(
                "px-6 py-4 text-sm font-bold transition-all relative outline-none whitespace-nowrap",
                activeTab === tab.id ? "text-[#7A171D] bg-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              )}
            >
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="fleetTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7A171D]" />}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari nama, PT, plat nomor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-[#7A171D] transition-all shadow-sm" />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center gap-4 text-slate-500"><Activity className="w-8 h-8 text-[#7A171D] animate-pulse" /> Sinkronisasi Fleet Database...</div>
          ) : processedData.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Tidak ada data kemitraan.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="p-5 pl-6">Profil & Entitas</th>
                  <th className="p-5">Relasi & Kendaraan</th>
                  <th className="p-5">Kelengkapan Dokumen</th>
                  <th className="p-5">Status Operasional</th>
                  <th className="p-5 pr-6 text-right">Suspend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedData.map(p => (
                  <tr key={p.id} className={cn("transition-colors", p.isSuspended ? "bg-red-50/30" : "hover:bg-slate-50")}>
                    <td className="p-5 pl-6 align-top">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl border border-slate-200 shrink-0 overflow-hidden bg-slate-50 flex items-center justify-center">
                           {p.fotoProfileUrl ? <Image src={String(p.fotoProfileUrl)} alt="Foto" fill className="object-cover" sizes="40px" /> : 
                            p.partnerType === "Vendor" ? <Building2 className="w-5 h-5 text-slate-400" /> :
                            p.partnerType === "FleetVehicle" ? <Truck className="w-5 h-5 text-slate-400" /> :
                            <User className="w-5 h-5 text-slate-400" />
                           }
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{String(p.companyName || p.name || "Tanpa Nama")}</p>
                          <p className="text-[10px] font-black text-[#C5A059] uppercase tracking-widest mt-0.5">{String(p.partnerType)}</p>
                          {(p.phone || p.licensePlate) ? <p className="text-xs text-slate-500 font-mono mt-0.5">{String(p.phone || p.licensePlate)}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="p-5 align-top">
                      {p.partnerType === "Vendor" ? (
                         <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">Induk / Pusat</span>
                      ) : p.partnerType === "Individual" ? (
                         <div className="flex flex-col gap-1">
                           <span className="text-xs font-bold text-slate-700"><Truck className="w-3.5 h-3.5 inline mr-1 opacity-60"/> {String(p.vehicleType || "Armada")}</span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mandiri</span>
                         </div>
                      ) : (
                         <div className="flex flex-col gap-1">
                           {p.vehicleType ? <span className="text-xs font-bold text-slate-700"><Truck className="w-3.5 h-3.5 inline mr-1 opacity-60"/> {String(p.vehicleType)}</span> : null}
                           <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md font-bold truncate max-w-[150px]" title={String(p.vendorName || "Vendor")}>PT: {String(p.vendorName || "Unknown")}</span>
                         </div>
                      )}
                    </td>
                    <td className="p-5 align-top">
                       <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                         {p.nik ? <Badge variant="default" className="text-[9px] px-1.5 py-0">NIK</Badge> : null}
                         {p.simNumber ? <Badge variant="default" className="text-[9px] px-1.5 py-0">SIM</Badge> : null}
                         {p.npwp ? <Badge variant="warning" className="text-[9px] px-1.5 py-0">NPWP</Badge> : null}
                         {p.stnkUrl ? <Badge variant="default" className="text-[9px] px-1.5 py-0 border-blue-200 text-blue-700 bg-blue-50">STNK</Badge> : null}
                         {p.kirUrl ? <Badge variant="success" className="text-[9px] px-1.5 py-0">KIR</Badge> : null}
                         {!p.nik && !p.simNumber && !p.npwp && !p.stnkUrl && !p.kirUrl ? <span className="text-[10px] text-slate-400 italic">Data minim</span> : null}
                       </div>
                    </td>
                    <td className="p-5 align-top">
                      <span className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-widest text-[9px] border ${p.isSuspended ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        {p.isSuspended ? "SUSPENDED" : "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-5 pr-6 flex justify-end align-top">
                      <button onClick={() => handleToggleSuspend(p.id, p.isSuspended || false)} className={`p-2 rounded-xl border transition-all shadow-sm ${p.isSuspended ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-red-600 hover:text-white hover:border-red-600'}`} title={p.isSuspended ? "Aktifkan Kembali" : "Suspend Entitas"}>
                        <Ban className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowAddModal(false)} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">Pendaftaran Mitra & Fleet</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Pilih jenis kemitraan dan lengkapi dokumen legalitas.</p>
                </div>
                <button onClick={() => !isProcessing && setShowAddModal(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <form id="reg-form" onSubmit={handleSubmitRegistration} className="space-y-8">
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Tipe Pendaftaran</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div onClick={() => setFormPartnerType("Individual")} className={cn("cursor-pointer border-2 rounded-xl p-4 text-center transition-all", formPartnerType === "Individual" ? "border-[#C5A059] bg-[#C5A059]/10" : "border-slate-200 hover:border-slate-300")}>
                        <User className={cn("w-6 h-6 mx-auto mb-2", formPartnerType === "Individual" ? "text-[#C5A059]" : "text-slate-400")} />
                        <h4 className="font-bold text-xs">Individu</h4>
                        <p className="text-[9px] text-slate-500 mt-1">Motor/Mobil Pribadi</p>
                      </div>
                      <div onClick={() => setFormPartnerType("Vendor")} className={cn("cursor-pointer border-2 rounded-xl p-4 text-center transition-all", formPartnerType === "Vendor" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300")}>
                        <Building2 className={cn("w-6 h-6 mx-auto mb-2", formPartnerType === "Vendor" ? "text-blue-500" : "text-slate-400")} />
                        <h4 className="font-bold text-xs">Vendor (PT)</h4>
                        <p className="text-[9px] text-slate-500 mt-1">Akun Induk Manager</p>
                      </div>
                      <div onClick={() => setFormPartnerType("FleetDriver")} className={cn("cursor-pointer border-2 rounded-xl p-4 text-center transition-all", formPartnerType === "FleetDriver" ? "border-[#7A171D] bg-[#7A171D]/10" : "border-slate-200 hover:border-slate-300")}>
                        <UserSquare2 className={cn("w-6 h-6 mx-auto mb-2", formPartnerType === "FleetDriver" ? "text-[#7A171D]" : "text-slate-400")} />
                        <h4 className="font-bold text-xs">Supir Vendor</h4>
                        <p className="text-[9px] text-slate-500 mt-1">Sopir khusus PT</p>
                      </div>
                      <div onClick={() => setFormPartnerType("FleetVehicle")} className={cn("cursor-pointer border-2 rounded-xl p-4 text-center transition-all", formPartnerType === "FleetVehicle" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300")}>
                        <Truck className={cn("w-6 h-6 mx-auto mb-2", formPartnerType === "FleetVehicle" ? "text-emerald-500" : "text-slate-400")} />
                        <h4 className="font-bold text-xs">Armada Vendor</h4>
                        <p className="text-[9px] text-slate-500 mt-1">Truk fisik milik PT</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                    
                    {(formPartnerType === "FleetDriver" || formPartnerType === "FleetVehicle") && (
                      <div className="space-y-1.5 mb-6 pb-6 border-b border-slate-200">
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> Pilih Induk Vendor (PT)</label>
                        <select required value={formData.vendorId} onChange={(e) => setFormData({...formData, vendorId: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-sm font-bold outline-none focus:border-blue-500 shadow-sm appearance-none cursor-pointer">
                          <option value="" disabled>-- Pilih Vendor Terdaftar --</option>
                          {getVendorsList().map(v => <option key={v.id} value={v.id}>{String(v.companyName || v.name)}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {formPartnerType !== "FleetVehicle" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {formPartnerType === "Vendor" ? "Nama Manager / PIC" : "Nama Lengkap Sesuai KTP"}
                          </label>
                          <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold outline-none focus:border-[#7A171D] shadow-sm" />
                        </div>
                      )}

                      {formPartnerType !== "FleetVehicle" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Handphone (WA Aktif)</label>
                          <input type="tel" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold outline-none focus:border-[#7A171D] shadow-sm" />
                        </div>
                      )}

                      {formPartnerType === "Vendor" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Perusahaan (PT/CV)</label>
                          <input type="text" required value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold outline-none focus:border-[#7A171D] shadow-sm" />
                        </div>
                      )}

                      {formPartnerType === "Vendor" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor NPWP Perusahaan</label>
                          <input type="text" required value={formData.npwp} onChange={(e) => setFormData({...formData, npwp: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold font-mono outline-none focus:border-[#7A171D] shadow-sm" />
                        </div>
                      )}

                      {(formPartnerType === "Individual" || formPartnerType === "FleetDriver") && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Induk Kependudukan (NIK)</label>
                            <input type="number" required value={formData.nik} onChange={(e) => setFormData({...formData, nik: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold font-mono outline-none focus:border-[#7A171D] shadow-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor SIM (A/C/B1/B2)</label>
                            <input type="text" required value={formData.simNumber} onChange={(e) => setFormData({...formData, simNumber: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold font-mono outline-none focus:border-[#7A171D] shadow-sm" />
                          </div>
                        </>
                      )}

                      {(formPartnerType === "Individual" || formPartnerType === "FleetVehicle") && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Kendaraan</label>
                            <select required value={formData.vehicleType} onChange={(e) => setFormData({...formData, vehicleType: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold outline-none focus:border-[#7A171D] shadow-sm appearance-none">
                              <option value="" disabled>Pilih Tipe...</option>
                              {vehiclesConfig.filter(v => formPartnerType === "FleetVehicle" ? v.category === "Truk" : v.category !== "Truk").map(v => (
                                <option key={v.id} value={v.name}>{String(v.name)} (Maks {v.maxWeight}Kg)</option>
                              ))}
                            </select>
                          </div>
                          {formPartnerType === "FleetVehicle" && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plat Nomor (Nomor Polisi)</label>
                              <input type="text" required value={formData.licensePlate} onChange={(e) => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold font-mono outline-none focus:border-[#7A171D] shadow-sm" placeholder="B 1234 CD" />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2"><Upload className="w-4 h-4 text-[#C5A059]"/> Upload Berkas Pendukung</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        
                        {(formPartnerType === "Individual" || formPartnerType === "FleetDriver") && (
                          <UploadButton label="Foto Selfie" file={files.profile} onClick={() => refs.profile.current?.click()} />
                        )}
                        {(formPartnerType === "Individual" || formPartnerType === "FleetDriver") && (
                          <>
                            <UploadButton label="Foto KTP" file={files.ktp} onClick={() => refs.ktp.current?.click()} />
                            <UploadButton label="Foto SIM" file={files.sim} onClick={() => refs.sim.current?.click()} />
                          </>
                        )}
                        {formPartnerType === "Vendor" && (
                          <UploadButton label="Foto NPWP PT" file={files.npwp} onClick={() => refs.npwp.current?.click()} />
                        )}
                        {formPartnerType === "FleetVehicle" && (
                          <>
                            <UploadButton label="Foto STNK" file={files.stnk} onClick={() => refs.stnk.current?.click()} />
                            <UploadButton label="Buku KIR" file={files.kir} onClick={() => refs.kir.current?.click()} />
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
                    </div>

                    {(formPartnerType === "Individual" || formPartnerType === "Vendor") && (
                      <div className="pt-4 border-t border-slate-200 space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#7A171D]"/> Lokasi Base / Mangkal</label>
                          
                          <style dangerouslySetInnerHTML={{__html: `
                            mapbox-search-listbox { z-index: 999999 !important; border-radius: 12px !important; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2) !important; border: 1px solid #e2e8f0 !important; margin-top: 4px !important; }
                            mapbox-search-box { --focus-box-shadow: none; --border-radius: 12px; }
                          `}} />
                          
                          <div className="border border-slate-300 focus-within:border-[#7A171D] focus-within:ring-4 focus-within:ring-[#7A171D]/10 rounded-xl transition-all bg-white relative z-[9999] h-11 flex items-center">
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

                        <div className="w-full h-48 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                           <MapBase 
                             longitude={mapViewState.longitude}
                             latitude={mapViewState.latitude}
                             zoom={mapViewState.zoom}
                             interactive={true}
                             originCoords={formData.baseCoords}
                             activeDraggable={activeDraggable}
                             onMarkerDragEnd={(lng, lat) => setFormData(prev => ({...prev, baseCoords: {lng, lat}}))}
                           />
                           <div className="absolute top-2 right-2 flex gap-2">
                              {formData.baseCoords && (
                                <Button type="button" variant="outline" size="sm" onClick={() => setActiveDraggable(activeDraggable === "origin" ? null : "origin")} className={`h-8 text-[10px] px-3 shadow-sm ${activeDraggable === "origin" ? "bg-amber-100 text-amber-700 border-amber-300 animate-pulse" : "bg-white text-slate-600"}`}>
                                  <MapPinned className="w-3 h-3 mr-1.5"/> {activeDraggable === "origin" ? "Geser Pin" : "Edit Pin"}
                                </Button>
                              )}
                           </div>
                        </div>
                      </div>
                    )}

                  </div>

                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex gap-4">
                <Button onClick={() => setShowAddModal(false)} variant="outline" className="flex-1 border-slate-300">Batal</Button>
                <Button type="submit" form="reg-form" disabled={isProcessing} className="flex-1 bg-[#7A171D] hover:bg-[#5A0E13] text-white shadow-md">
                  {isProcessing ? "Mengunggah Berkas..." : "Daftarkan Entitas"}
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function UploadButton({ label, file, onClick }: { label: string, file: File | null, onClick: () => void }) {
  return (
    <div onClick={onClick} className={cn("cursor-pointer border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all h-24", file ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white hover:border-[#C5A059]")}>
      {file ? <CheckCircle className="w-6 h-6 text-emerald-500 mb-1" /> : <Camera className="w-6 h-6 text-slate-400 mb-1" />}
      <p className={cn("text-[9px] font-bold uppercase", file ? "text-emerald-700" : "text-slate-500")}>{label}</p>
      {file && <p className="text-[8px] text-emerald-600 mt-0.5 truncate w-full px-1">{file.name}</p>}
    </div>
  );
}