"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import Header from "@/components/driver/Header";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, CreditCard, Car, MapPin, UploadCloud, 
  CheckCircle, ChevronRight, LogOut, ShieldCheck, 
  FileText, ArrowLeft, ArrowRight, Clock,
  AlertTriangle, Camera, X, Building2, Truck, Loader2, MapPinned
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

// ==========================================
// DYNAMIC IMPORTS MAPBOX (AGAR TIDAK ERROR SSR)
// ==========================================
const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-12 w-full bg-slate-100 rounded-xl animate-pulse flex items-center px-4 text-xs font-semibold text-slate-400">Menyelaraskan koordinat...</div> 
});

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center rounded-xl"><div className="w-6 h-6 border-2 border-slate-300 border-t-[#7A171D] rounded-full animate-spin"></div></div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// ==========================================
// FUNGSI UPLOAD CLOUDINARY GLOBAL
// ==========================================
export const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Konfigurasi Cloudinary belum disetting di .env");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (data.secure_url) {
    return data.secure_url;
  } else {
    throw new Error(data.error?.message || "Gagal mengunggah gambar.");
  }
};


export default function DriverProfilePage() {
  const router = useRouter();
  const { user, login, logout } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [dbUser, setDbUser] = useState<Record<string, unknown> | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  
  const [vehicleConfigs, setVehicleConfigs] = useState<Record<string, unknown>[]>([]);

  // MAPBOX STATES
  const [mapViewState, setMapViewState] = useState({ longitude: 118.0149, latitude: -2.5489, zoom: 4 });
  const [activeDraggable, setActiveDraggable] = useState<"origin" | null>(null);

  // ==========================================
  // STATE SMART ONBOARDING
  // ==========================================
  const [onboardingType, setOnboardingType] = useState<"Individual" | "Vendor" | null>(null);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    phone: "",
    baseAddress: "",
    baseCoords: { lat: 0, lng: 0 },
    
    // Khusus Individu
    nik: "",
    simNumber: "", 
    vehicleType: "",
    licensePlate: "", 
    fotoKtpUrl: "",
    fotoSimUrl: "",
    stnkUrl: "",
    fotoKendaraanUrl: "",
    
    // Khusus Vendor
    companyName: "",
    npwp: "",
    npwpUrl: "",
    nibUrl: "",
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDbUser(data);
          
          setFormData(prev => ({
            ...prev,
            phone: data.phone || "",
            nik: data.nik || "",
            simNumber: data.simNumber || "",
            vehicleType: data.vehicleType || "",
            licensePlate: data.licensePlate || "",
            companyName: data.companyName || "",
            npwp: data.npwp || "",
            fotoKtpUrl: data.fotoKtpUrl || "",
            fotoSimUrl: data.fotoSimUrl || "",
            stnkUrl: data.stnkUrl || "",
            fotoKendaraanUrl: data.fotoKendaraanUrl || "",
            npwpUrl: data.npwpUrl || "",
            nibUrl: data.nibUrl || "",
            baseAddress: data.baseAddress || "",
            baseCoords: data.baseCoords || { lat: 0, lng: 0 }
          }));

          if (data.baseCoords?.lat) {
            setMapViewState({ longitude: data.baseCoords.lng, latitude: data.baseCoords.lat, zoom: 14 });
          }

          if (data.partnerType) setOnboardingType(data.partnerType as "Individual" | "Vendor");
        }

        const pricingSnap = await getDoc(doc(db, "settings", "pricing"));
        if (pricingSnap.exists()) {
          const pData = pricingSnap.data();
          if (pData.customVehicles) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setVehicleConfigs(pData.customVehicles.filter((v: any) => v.category !== "Truk"));
            if (!formData.vehicleType && pData.customVehicles.length > 0) {
              setFormData(prev => ({ ...prev, vehicleType: pData.customVehicles[0].name }));
            }
          }
        }
      } catch (error) {
        console.error("Gagal load initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    router.replace("/driver/login");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          setFormData({ ...formData, baseCoords: { lat: newLat, lng: newLng }, baseAddress: "Lokasi GPS Saat Ini" });
          setMapViewState({ longitude: newLng, latitude: newLat, zoom: 15 });
        },
        () => alert("Gagal mengambil lokasi. Pastikan GPS aktif/diizinkan di browser Anda.")
      );
    }
  };

  const submitOnboarding = async () => {
    if (!user || !onboardingType) return;
    
    if (!formData.baseCoords || formData.baseCoords.lat === 0) {
        alert("Harap tentukan lokasi / titik kordinat base Anda terlebih dahulu.");
        return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: user.displayName || "Tanpa Nama",
        email: user.email,
        phone: formData.phone,
        partnerType: onboardingType,
        status: "Pending", 
        isSuspended: false,
        balance: 0,
        profileCompleted: true,
        baseCoords: formData.baseCoords,
        baseAddress: formData.baseAddress,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (onboardingType === "Individual") {
        Object.assign(payload, {
          nik: formData.nik,
          simNumber: formData.simNumber,
          vehicleType: formData.vehicleType,
          licensePlate: formData.licensePlate.toUpperCase(),
          fotoKtpUrl: formData.fotoKtpUrl,
          fotoSimUrl: formData.fotoSimUrl,
          stnkUrl: formData.stnkUrl,
          fotoKendaraanUrl: formData.fotoKendaraanUrl,
        });
      } else {
        Object.assign(payload, {
          companyName: formData.companyName,
          npwp: formData.npwp,
          npwpUrl: formData.npwpUrl,
          nibUrl: formData.nibUrl,
          fotoKtpUrl: formData.fotoKtpUrl, 
        });
      }

      await updateDoc(doc(db, "users", user.uid), payload);
      await setDoc(doc(db, "driver_wallets", user.uid), payload, { merge: true });

      setDbUser((prev) => ({ ...prev, profileCompleted: true, ...payload }));
      setShowWizard(false);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Gagal menyimpan data:", error);
      alert("Terjadi kesalahan saat menyimpan data ke server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setIsUploadingFoto(true);
    try {
      const uploadedUrl = await uploadToCloudinary(file);
      await updateDoc(doc(db, "users", user.uid), { photoURL: uploadedUrl });
      await updateDoc(doc(db, "driver_wallets", user.uid), { fotoProfileUrl: uploadedUrl }).catch(()=> {});
      
      setDbUser((prev) => ({ ...prev, photoURL: uploadedUrl }));
      login({ ...user, photoURL: uploadedUrl }); 
      alert("Foto profil berhasil diperbarui!");
    } catch (error) {
      console.error(error);
      alert("Gagal mengunggah foto profil. Coba lagi.");
    } finally {
      setIsUploadingFoto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin"></div>
      </div>
    );
  }

  const maxSteps = onboardingType === "Vendor" ? 3 : 4;

  if (showWizard) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col fixed inset-0 z-[60]">
        <div className="bg-white px-5 pt-12 pb-4 shadow-sm z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowWizard(false)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100">
              <X size={20} />
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-800">Verifikasi Kemitraan</h1>
              {onboardingType && <span className="text-xs font-bold text-[#7A171D]">Langkah {step} dari {maxSteps}</span>}
            </div>
          </div>
        </div>
        
        <div className="w-full h-1.5 bg-slate-100 relative z-20">
          {onboardingType && (
            <motion.div 
              className="h-full bg-[#7A171D]"
              initial={{ width: 0 }}
              animate={{ width: `${(step / maxSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          )}
        </div>

        <div className="flex-1 p-5 overflow-y-auto pb-32">
          <AnimatePresence mode="wait">
            
            {!onboardingType && (
              <motion.div key="selection" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-black text-slate-900 mb-2">Pilih Tipe Kemitraan</h2>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">Sesuaikan dengan jenis entitas Anda agar sistem dapat menyesuaikan formulir pendaftaran.</p>
                
                <div className="space-y-4">
                  <div onClick={() => { setOnboardingType("Individual"); setStep(1); }} className="bg-white border-2 border-slate-200 hover:border-[#C5A059] p-5 rounded-2xl cursor-pointer transition-all hover:shadow-lg group">
                    <div className="w-12 h-12 bg-[#C5A059]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <User className="text-[#C5A059]" size={24} />
                    </div>
                    <h3 className="text-base font-black text-slate-800 mb-1">Mitra Individu (Pribadi)</h3>
                    <p className="text-xs text-slate-500">Saya mendaftar sebagai pengemudi mandiri dengan motor atau mobil pribadi.</p>
                  </div>

                  <div onClick={() => { setOnboardingType("Vendor"); setStep(1); }} className="bg-white border-2 border-slate-200 hover:border-blue-500 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-lg group">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Building2 className="text-blue-600" size={24} />
                    </div>
                    <h3 className="text-base font-black text-slate-800 mb-1">Mitra Vendor (Perusahaan)</h3>
                    <p className="text-xs text-slate-500">Saya mendaftar sebagai PT/CV yang mengelola armada truk dan beberapa sopir.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {onboardingType && step === 1 && (
              <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  {onboardingType === "Individual" ? <User size={20} className="text-[#C5A059]"/> : <Building2 size={20} className="text-blue-600"/>} 
                  {onboardingType === "Individual" ? "Data Diri" : "Data Perusahaan"}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">{onboardingType === "Vendor" ? "No. HP Manager (WA Aktif)" : "No. HP Aktif (WhatsApp)"}</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="0812xxxxxx" className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] font-mono" />
                  </div>

                  {onboardingType === "Individual" ? (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Nomor Induk Kependudukan (NIK)</label>
                        <input type="number" name="nik" value={formData.nik} onChange={handleChange} placeholder="16 digit NIK KTP" className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Nomor SIM Aktif</label>
                        <input type="text" name="simNumber" value={formData.simNumber} onChange={handleChange} placeholder="Format SIM Anda" className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] font-mono uppercase" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Nama Perusahaan (PT/CV)</label>
                        <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="PT. Logistik Maju Bersama" className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Nomor NPWP Perusahaan</label>
                        <input type="text" name="npwp" value={formData.npwp} onChange={handleChange} placeholder="12.345.678.9-012.000" className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] font-mono" />
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {onboardingType === "Individual" && step === 2 && (
              <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Car size={20} className="text-[#C5A059]" /> Data Kendaraan</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Tipe Kendaraan</label>
                    <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] font-bold appearance-none">
                      <option value="" disabled>-- Pilih Klasifikasi --</option>
                      {vehicleConfigs.map((v: any, i) => (
                        <option key={i} value={v.name as string}>{v.name as string} (Maks {v.maxWeight as string}Kg)</option>
                      ))}
                      {vehicleConfigs.length === 0 && <option value="Motor">Motor Pribadi</option>}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Plat Nomor Kendaraan</label>
                    <input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleChange} placeholder="B 1234 ABC" className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#7A171D] uppercase font-mono font-bold" />
                  </div>
                </div>
              </motion.div>
            )}

            {((onboardingType === "Individual" && step === 3) || (onboardingType === "Vendor" && step === 2)) && (
              <motion.div key="stepDocs" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText size={20} className="text-[#C5A059]" /> Upload Dokumen Legalitas</h2>
                <p className="text-xs text-slate-500 mb-4 bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-700">Pastikan foto terlihat jelas, tidak blur, dan format JPG/PNG.</p>
                
                <div className="space-y-3">
                  {onboardingType === "Individual" ? (
                    <>
                      <DocBox label="Foto KTP Asli" currentUrl={formData.fotoKtpUrl} onUpload={(url) => setFormData({...formData, fotoKtpUrl: url})} />
                      <DocBox label="Foto SIM Aktif" currentUrl={formData.fotoSimUrl} onUpload={(url) => setFormData({...formData, fotoSimUrl: url})} />
                      <DocBox label="Foto STNK Kendaraan" currentUrl={formData.stnkUrl} onUpload={(url) => setFormData({...formData, stnkUrl: url})} />
                      <DocBox label="Foto Diri dengan Kendaraan" currentUrl={formData.fotoKendaraanUrl} onUpload={(url) => setFormData({...formData, fotoKendaraanUrl: url})} />
                    </>
                  ) : (
                    <>
                      <DocBox label="Scan/Foto NPWP Perusahaan" currentUrl={formData.npwpUrl} onUpload={(url) => setFormData({...formData, npwpUrl: url})} />
                      <DocBox label="NIB / Izin Usaha Logistik" currentUrl={formData.nibUrl} onUpload={(url) => setFormData({...formData, nibUrl: url})} />
                      <DocBox label="KTP Penanggung Jawab" currentUrl={formData.fotoKtpUrl} onUpload={(url) => setFormData({...formData, fotoKtpUrl: url})} />
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* ========================================== */}
            {/* FIX MAPBOX INTEGRATION FOR MOBILE (STEP AKHIR) */}
            {/* ========================================== */}
            {((onboardingType === "Individual" && step === 4) || (onboardingType === "Vendor" && step === 3)) && (
              <motion.div key="stepMap" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="h-full flex flex-col">
                <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><MapPin size={20} className="text-[#C5A059]" /> Titik Kordinat Base</h2>
                <p className="text-xs text-slate-500 mb-4">
                  {onboardingType === "Vendor" ? "Tentukan lokasi Garasi / Pool / Kantor Pusat Anda." : "Titik ini digunakan sistem untuk radar jika Anda sedang mematikan aplikasi."}
                </p>
                
                {/* Search Box Mapbox */}
                <div className="mb-4">
                  <style dangerouslySetInnerHTML={{__html: `
                    mapbox-search-listbox { z-index: 999999 !important; border-radius: 12px !important; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2) !important; border: 1px solid #e2e8f0 !important; margin-top: 4px !important; }
                    mapbox-search-box { --focus-box-shadow: none; --border-radius: 12px; }
                  `}} />
                  <div className="border border-slate-300 focus-within:border-[#7A171D] focus-within:ring-4 focus-within:ring-[#7A171D]/10 rounded-xl transition-all bg-white relative z-[100] h-12 flex items-center shadow-sm">
                    <SearchBox
                      accessToken={MAPBOX_TOKEN}
                      options={{ language: 'id', country: 'ID' }}
                      value={formData.baseAddress || ""}
                      placeholder="Cari alamat base mangkal..."
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

                {/* Map View */}
                <div className="w-full h-[300px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative z-0 mb-4 shadow-inner">
                  <MapBase 
                    longitude={mapViewState.longitude}
                    latitude={mapViewState.latitude}
                    zoom={mapViewState.zoom}
                    interactive={true}
                    originCoords={formData.baseCoords?.lat !== 0 ? formData.baseCoords : undefined}
                    activeDraggable={activeDraggable}
                    onMarkerDragEnd={(lng, lat) => setFormData(prev => ({...prev, baseCoords: {lng, lat}}))}
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    {formData.baseCoords?.lat !== 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setActiveDraggable(activeDraggable === "origin" ? null : "origin")} className={`h-9 text-[10px] px-4 shadow-md rounded-xl font-bold ${activeDraggable === "origin" ? "bg-amber-100 text-amber-700 border-amber-300 animate-pulse" : "bg-white text-slate-700"}`}>
                        <MapPinned className="w-4 h-4 mr-2"/> {activeDraggable === "origin" ? "Selesai Geser" : "Geser Pin"}
                      </Button>
                    )}
                  </div>
                </div>

                <button onClick={handleGetLocation} className="w-full bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg mb-8">
                  <MapPin size={16} /> Gunakan GPS Saat Ini
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigasi Wizard */}
        {onboardingType && (
          <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-100 p-4 flex gap-3 z-50 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
            <button 
              onClick={() => {
                if (step === 1) setOnboardingType(null);
                else setStep(step - 1);
              }} 
              className="px-5 py-3.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            
            {step < maxSteps ? (
              <button onClick={() => setStep(step + 1)} className="flex-1 bg-[#7A171D] text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-[#7A171D]/20">
                Selanjutnya <ArrowRight size={18} />
              </button>
            ) : (
              <button onClick={submitOnboarding} disabled={isSaving} className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-70">
                {isSaving ? "Mengirim..." : <><CheckCircle size={18} /> Ajukan Verifikasi</>}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: PROFIL NORMAL / HALAMAN UTAMA PROFIL
  // ==========================================
  
  const isProfileComplete = dbUser?.profileCompleted === true;
  const isPendingApproval = isProfileComplete && dbUser?.status === "Pending";
  const isVerified = isProfileComplete && dbUser?.status === "Active";
  const isVendor = dbUser?.partnerType === "Vendor";

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header title="Profil Kemitraan" rightNode={
        <button onClick={handleLogout} className="text-[#7A171D] p-2 bg-red-50 hover:bg-red-100 rounded-full transition-colors">
          <LogOut size={18} />
        </button>
      } />

      {/* Profil Header */}
      <div className="bg-[#7A171D] pt-6 pb-14 px-6 rounded-b-[2.5rem] text-center relative shadow-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="w-24 h-24 mx-auto mb-3 relative">
            <div className={`w-full h-full rounded-full relative overflow-hidden border-4 border-white shadow-lg ${isVendor ? 'bg-blue-100' : 'bg-slate-200'}`}>
              {isUploadingFoto ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-200/80">
                  <div className="w-6 h-6 border-2 border-[#7A171D] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <Image src={(dbUser?.photoURL as string) || `https://ui-avatars.com/api/?name=${dbUser?.companyName || dbUser?.displayName || "Mitra"}&background=${isVendor ? '2563eb' : 'C5A059'}&color=fff&size=150`} alt="Avatar" fill className="object-cover" />
              )}
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleProfilePhotoUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingFoto} className="absolute bottom-0 right-0 p-2 bg-[#C5A059] text-white rounded-full border-2 border-white shadow-sm hover:bg-[#A68345] transition-colors disabled:opacity-50">
              <Camera size={14} />
            </button>
          </div>

          <h2 className="text-xl font-black text-white">{isVendor ? dbUser?.companyName as string : dbUser?.displayName as string}</h2>
          <p className="text-white/70 text-sm font-medium mb-3">{dbUser?.email as string}</p>
          
          {/* Status Badge */}
          {isVerified ? (
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} /> Terverifikasi {isVendor ? 'Vendor' : 'Mandiri'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {isVendor ? <Building2 size={14}/> : <User size={14} />} Akun Dasar
            </span>
          )}
        </div>
      </div>

      <main className="p-5 -mt-8 relative z-20 space-y-5">
        
        {!isProfileComplete && (
          <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-lg shadow-amber-500/5 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-50 rounded-full"></div>
            <div className="flex gap-3 relative z-10">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Lengkapi Pendaftaran</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Sistem Flash Global membedakan akun Pribadi dan Perusahaan. Tentukan entitas Anda sekarang.
                </p>
                <button 
                  onClick={() => setShowWizard(true)}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-3 rounded-xl transition-colors shadow-sm flex justify-center items-center gap-2"
                >
                  Mulai Verifikasi Akun <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {isPendingApproval && (
          <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-lg shadow-blue-500/5 flex gap-3">
            <Clock className="text-blue-500 shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Menunggu Persetujuan Admin</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dokumen entitas {isVendor ? "Perusahaan" : "Pribadi"} Anda sedang diperiksa oleh Tim Fleet Management.
              </p>
            </div>
          </div>
        )}

        {/* Info Kendaraan (Individu) ATAU Info Fleet (Vendor) */}
        {isProfileComplete && (
          <div className="glass-card rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isVendor ? 'bg-blue-50 text-blue-600' : 'bg-[#C5A059]/10 text-[#C5A059]'}`}>
                {isVendor ? <Truck size={24} /> : <Car size={24} />}
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                  {isVendor ? 'Manajemen Armada' : dbUser?.vehicleType as string}
                </p>
                <p className="text-base font-black text-slate-800">
                  {isVendor ? 'Akses Portal Vendor' : dbUser?.licensePlate as string}
                </p>
              </div>
            </div>
            <button className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isVendor ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-[#7A171D]/10 text-[#7A171D] hover:bg-[#7A171D]/20'}`}>
              {isVendor ? 'Masuk' : 'Ubah'}
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <MenuRow icon={isVendor ? <Building2/> : <User />} title={isVendor ? "Informasi PT/CV" : "Informasi Pribadi"} />
          <MenuRow icon={<CreditCard />} title={isVendor ? "Rekening Perusahaan" : "Rekening & Pencairan"} />
          <MenuRow icon={<FileText />} title="Dokumen Legalitas" />
          <MenuRow icon={<ShieldCheck />} title="Pusat Bantuan & Tiket" border={false} />
        </div>

      </main>
    </div>
  );
}

function MenuRow({ icon, title, border = true }: { icon: React.ReactNode, title: string, border?: boolean }) {
  return (
    <button className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors ${border ? 'border-b border-slate-100' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="text-slate-400">{icon}</div>
        <span className="text-sm font-bold text-slate-700">{title}</span>
      </div>
      <ChevronRight className="text-slate-300" size={18} />
    </button>
  );
}

function DocBox({ label, currentUrl, onUpload }: { label: string, currentUrl?: string, onUpload: (url: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onUpload(url);
    } catch (error) {
      console.error(error);
      alert("Gagal mengunggah dokumen. Silakan coba lagi.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <label className={`border border-dashed rounded-xl p-4 flex items-center justify-between transition-colors group cursor-pointer ${currentUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-[#7A171D] hover:bg-slate-50'}`}>
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFile} disabled={isUploading} />
      
      <div>
        <p className={`text-sm font-bold ${currentUrl ? 'text-emerald-700' : 'text-slate-700 group-hover:text-[#7A171D]'}`}>{label}</p>
        <p className={`text-[10px] ${currentUrl ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
          {isUploading ? "Mengunggah..." : currentUrl ? "File terunggah (Ketuk untuk ubah)" : "JPG, PNG (Max 5MB)"}
        </p>
      </div>
      
      <div className={`p-2 rounded-lg transition-colors ${currentUrl ? 'text-emerald-600 bg-emerald-100' : 'bg-slate-50 text-slate-400 group-hover:text-[#7A171D] group-hover:bg-[#7A171D]/10'}`}>
        {isUploading ? <Loader2 size={20} className="animate-spin text-[#C5A059]" /> : currentUrl ? <CheckCircle size={20} /> : <UploadCloud size={20} />}
      </div>
    </label>
  );
}