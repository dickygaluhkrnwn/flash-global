"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, MapPin, UploadCloud, CheckCircle, 
  ArrowLeft, ArrowRight, X, Building2, Loader2, 
  MapPinned, ChevronDown 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DynamicVehicle } from "@/types/order";
import { uploadToCloudinary } from "@/lib/cloudinary";

const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { ssr: false });
const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { ssr: false });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// ======================================================================
// 🚀 SOLUSI PERMANEN: TYPE-SAFE MAPBOX INTERFACES
// ======================================================================
interface MapboxContextItem {
  id: string;
  text: string;
  [key: string]: unknown;
}

interface MapboxCustomProperties {
  name?: string;
  full_address?: string;
  place_name?: string;
  place?: string;
  city?: string;
  context?: MapboxContextItem[];
  [key: string]: unknown;
}

interface OnboardingWizardProps {
  dbUser: Record<string, unknown> | null;
  onClose: () => void;
  onSuccess: (payload: Record<string, unknown>) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function OnboardingWizard({ dbUser, onClose, onSuccess, showToast }: OnboardingWizardProps) {
  const { user } = useAuthStore();
  const [vehicleConfigs, setVehicleConfigs] = useState<DynamicVehicle[]>([]);
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const [mapViewState, setMapViewState] = useState({ longitude: 118.0149, latitude: -2.5489, zoom: 4 });
  const [activeDraggable, setActiveDraggable] = useState<"origin" | null>(null);

  const [onboardingType, setOnboardingType] = useState<"Individual" | "Vendor" | null>(null);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    phone: "", baseAddress: "", domisili: "", baseCoords: { lat: 0, lng: 0 },
    nik: "", simNumber: "", vehicleType: "", licensePlate: "", 
    fotoKtpUrl: "", fotoSimUrl: "", stnkUrl: "", fotoKendaraanUrl: "",
    companyName: "", npwp: "", npwpUrl: "", nibUrl: "",
  });

  useEffect(() => {
    if (dbUser) {
      setFormData(prev => ({ ...prev, ...dbUser } as typeof prev));
      const baseC = dbUser.baseCoords as { lat: number, lng: number } | undefined;
      if (baseC?.lat) setMapViewState({ longitude: baseC.lng, latitude: baseC.lat, zoom: 14 });
      if (dbUser.partnerType) setOnboardingType(dbUser.partnerType as "Individual" | "Vendor");
    }

    const fetchPricing = async () => {
      try {
        const pricingSnap = await getDoc(doc(db, "settings", "pricing"));
        if (pricingSnap.exists()) {
          const pData = pricingSnap.data();
          if (pData.customVehicles) {
            setVehicleConfigs(pData.customVehicles.filter((v: DynamicVehicle) => v.category !== "Truk"));
            if (!formData.vehicleType && pData.customVehicles.length > 0) {
              setFormData(prev => ({ ...prev, vehicleType: pData.customVehicles[0].name }));
            }
          }
        }
      } catch {
        // Abaikan error sunyi
      }
    };
    fetchPricing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          let detectedCity = "Pusat";
          try {
            const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${pos.coords.longitude},${pos.coords.latitude}.json?access_token=${MAPBOX_TOKEN}`);
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const placeContext = data.features[0].context?.find((c: MapboxContextItem) => c.id.startsWith('place') || c.id.startsWith('district'));
              if (placeContext) detectedCity = placeContext.text;
            }
          } catch {
             // Abaikan error sunyi
          }

          setFormData({ 
            ...formData, 
            baseCoords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, 
            baseAddress: "Lokasi GPS Saat Ini",
            domisili: detectedCity 
          });
          setMapViewState({ longitude: pos.coords.longitude, latitude: pos.coords.latitude, zoom: 15 });
          showToast(`Lokasi dikunci di area: ${detectedCity}`, "success");
        },
        () => showToast("Gagal mengambil lokasi.", "error")
      );
    }
  };

  const submitOnboarding = async () => {
    if (!user || !onboardingType) return;
    if (!formData.baseCoords || formData.baseCoords.lat === 0) return showToast("Harap tentukan lokasi base Anda.", "error");

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: user.displayName || "Tanpa Nama", email: user.email, phone: formData.phone,
        partnerType: onboardingType, 
        status: "Pending", 
        isSuspended: false, 
        balance: 0,
        profileCompleted: true, 
        baseCoords: formData.baseCoords, 
        baseAddress: formData.baseAddress,
        domisili: formData.domisili || "Pusat",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      };

      if (onboardingType === "Individual") {
        Object.assign(payload, { nik: formData.nik, simNumber: formData.simNumber, vehicleType: formData.vehicleType, licensePlate: formData.licensePlate.toUpperCase(), fotoKtpUrl: formData.fotoKtpUrl, fotoSimUrl: formData.fotoSimUrl, stnkUrl: formData.stnkUrl, fotoKendaraanUrl: formData.fotoKendaraanUrl });
      } else {
        Object.assign(payload, { companyName: formData.companyName, npwp: formData.npwp, npwpUrl: formData.npwpUrl, nibUrl: formData.nibUrl, fotoKtpUrl: formData.fotoKtpUrl });
      }

      await updateDoc(doc(db, "users", user.uid), payload);
      await setDoc(doc(db, "driver_wallets", user.uid), payload, { merge: true });
      onSuccess(payload);
    } catch {
      showToast("Gagal menyimpan data ke server.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const maxSteps = onboardingType === "Vendor" ? 3 : 4;

  return (
    <div className="fixed inset-0 z-[999] bg-[#F8F9FA] flex flex-col">
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100">
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
          <motion.div className="h-full bg-[#7A171D]" initial={{ width: 0 }} animate={{ width: `${(step / maxSteps) * 100}%` }} transition={{ duration: 0.3 }} />
        )}
      </div>

      <div className="flex-1 p-5 overflow-y-auto pb-32">
        <AnimatePresence mode="wait">
          {!onboardingType && (
            <motion.div key="selection" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-black text-slate-900 mb-2">Pilih Tipe Kemitraan</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Sesuaikan dengan jenis entitas Anda.</p>
              
              <div className="space-y-4">
                <div onClick={() => { setOnboardingType("Individual"); setStep(1); }} className="bg-white border-2 border-slate-200 hover:border-[#C5A059] p-5 rounded-2xl cursor-pointer group">
                  <div className="w-12 h-12 bg-[#C5A059]/10 rounded-xl flex items-center justify-center mb-4"><User className="text-[#C5A059]" size={24} /></div>
                  <h3 className="text-base font-black text-slate-800 mb-1">Mitra Individu (Pribadi)</h3>
                  <p className="text-xs text-slate-500">Mendaftar sebagai pengemudi mandiri.</p>
                </div>
                <div onClick={() => { setOnboardingType("Vendor"); setStep(1); }} className="bg-white border-2 border-slate-200 hover:border-blue-500 p-5 rounded-2xl cursor-pointer group">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4"><Building2 className="text-blue-600" size={24} /></div>
                  <h3 className="text-base font-black text-slate-800 mb-1">Mitra Vendor (Perusahaan)</h3>
                  <p className="text-xs text-slate-500">Mendaftar sebagai PT/CV pengelola armada.</p>
                </div>
              </div>
            </motion.div>
          )}

          {onboardingType && step === 1 && (
            <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
              <h2 className="text-lg font-bold text-slate-800 mb-4">{onboardingType === "Individual" ? "Data Diri" : "Data Perusahaan"}</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">{onboardingType === "Vendor" ? "No. HP Manager" : "No. HP Aktif"}</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl" />
                </div>
                {onboardingType === "Individual" ? (
                  <>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">NIK KTP</label><input type="number" name="nik" value={formData.nik} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl" /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Nomor SIM</label><input type="text" name="simNumber" value={formData.simNumber} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl uppercase" /></div>
                  </>
                ) : (
                  <>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Nama PT/CV</label><input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl" /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">NPWP Perusahaan</label><input type="text" name="npwp" value={formData.npwp} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-white border border-slate-200 rounded-xl" /></div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {onboardingType === "Individual" && step === 2 && (
            <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
              <h2 className="text-lg font-bold text-slate-800 mb-4">Data Kendaraan</h2>
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipe Kendaraan</label>
                  <button type="button" onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)} className="w-full mt-1 px-4 py-3 bg-white border rounded-xl flex items-center justify-between">
                    <span className="font-bold">{formData.vehicleType || "-- Pilih Klasifikasi --"}</span>
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  </button>
                  <AnimatePresence>
                    {isVehicleDropdownOpen && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-0 right-0 z-50 mt-2 bg-white border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                        {vehicleConfigs.map((v, i) => (
                          <button key={i} type="button" onClick={() => { setFormData({ ...formData, vehicleType: v.name }); setIsVehicleDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b flex flex-col">
                            <span className="font-bold text-slate-700">{v.name}</span><span className="text-xs text-slate-400">Maksimal: {v.maxWeight} Kg</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Plat Nomor</label><input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleChange} className="w-full mt-1 px-4 py-3 bg-white border rounded-xl uppercase" /></div>
              </div>
            </motion.div>
          )}

          {((onboardingType === "Individual" && step === 3) || (onboardingType === "Vendor" && step === 2)) && (
            <motion.div key="stepDocs" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-3">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Upload Dokumen</h2>
              {onboardingType === "Individual" ? (
                <>
                  <DocBox label="Foto KTP Asli" currentUrl={formData.fotoKtpUrl} onUpload={(url) => setFormData({...formData, fotoKtpUrl: url})} onError={(msg) => showToast(msg, "error")} />
                  <DocBox label="Foto SIM Aktif" currentUrl={formData.fotoSimUrl} onUpload={(url) => setFormData({...formData, fotoSimUrl: url})} onError={(msg) => showToast(msg, "error")} />
                  <DocBox label="Foto STNK Kendaraan" currentUrl={formData.stnkUrl} onUpload={(url) => setFormData({...formData, stnkUrl: url})} onError={(msg) => showToast(msg, "error")} />
                  <DocBox label="Foto Diri & Kendaraan" currentUrl={formData.fotoKendaraanUrl} onUpload={(url) => setFormData({...formData, fotoKendaraanUrl: url})} onError={(msg) => showToast(msg, "error")} />
                </>
              ) : (
                <>
                  <DocBox label="Scan NPWP Perusahaan" currentUrl={formData.npwpUrl} onUpload={(url) => setFormData({...formData, npwpUrl: url})} onError={(msg) => showToast(msg, "error")} />
                  <DocBox label="NIB / Izin Usaha" currentUrl={formData.nibUrl} onUpload={(url) => setFormData({...formData, nibUrl: url})} onError={(msg) => showToast(msg, "error")} />
                  <DocBox label="KTP Penanggung Jawab" currentUrl={formData.fotoKtpUrl} onUpload={(url) => setFormData({...formData, fotoKtpUrl: url})} onError={(msg) => showToast(msg, "error")} />
                </>
              )}
            </motion.div>
          )}

          {((onboardingType === "Individual" && step === 4) || (onboardingType === "Vendor" && step === 3)) && (
            <motion.div key="stepMap" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="h-full flex flex-col">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Titik Kordinat Base</h2>
              <div className="mb-4">
                <style dangerouslySetInnerHTML={{__html: `mapbox-search-listbox { z-index: 999999 !important; border-radius: 12px; } mapbox-search-box { --focus-box-shadow: none; --border-radius: 12px; }`}} />
                <div className="border bg-white rounded-xl h-12 flex items-center relative z-[100]">
                  <SearchBox 
                    accessToken={MAPBOX_TOKEN} 
                    options={{ language: 'id', country: 'ID' }} 
                    value={formData.baseAddress || ""} 
                    onRetrieve={(res) => { 
                      const f = res.features[0]; 
                      
                      // 🚀 TYPE CASTING AMAN MENGGUNAKAN INTERFACE
                      const props = f.properties as unknown as MapboxCustomProperties;
                      
                      const address = props.full_address || props.name || props.place_name || "";
                      
                      let city = "";
                      if (Array.isArray(props.context)) {
                         const place = props.context.find((c: MapboxContextItem) => c.id && (c.id.includes('place') || c.id.includes('district')));
                         if (place) city = place.text;
                      }
                      if (!city && props.place) city = props.place;
                      if (!city && props.city) city = props.city;
                      
                      if (!city && typeof address === 'string') {
                         const parts = address.split(',');
                         city = parts.length > 1 ? parts[1].trim() : parts[0]; 
                      }

                      setFormData(p => ({ 
                        ...p, 
                        baseAddress: address, 
                        domisili: city, 
                        baseCoords: { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] } 
                      })); 
                      
                      setMapViewState({ longitude: f.geometry.coordinates[0], latitude: f.geometry.coordinates[1], zoom: 14 }); 
                    }} 
                    theme={{ variables: { boxShadow: 'none', border: 'none', padding: '0px 16px', unit: '14px', fontWeight: 'bold' } }} 
                  />
                </div>
              </div>
              <div className="w-full h-[300px] bg-slate-100 rounded-2xl overflow-hidden border relative z-0 mb-4">
                <MapBase longitude={mapViewState.longitude} latitude={mapViewState.latitude} zoom={mapViewState.zoom} interactive={true} originCoords={formData.baseCoords?.lat !== 0 ? formData.baseCoords : undefined} activeDraggable={activeDraggable} onMarkerDragEnd={(lng, lat) => setFormData(p => ({...p, baseCoords: {lng, lat}}))} />
                <div className="absolute top-3 right-3">{formData.baseCoords?.lat !== 0 && (<Button variant="outline" size="sm" onClick={() => setActiveDraggable(activeDraggable === "origin" ? null : "origin")} className="h-9 px-4 rounded-xl"><MapPinned className="w-4 h-4 mr-2"/> Geser Pin</Button>)}</div>
              </div>
              <button onClick={handleGetLocation} className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl flex justify-center gap-2 mb-8"><MapPin size={16} /> Gunakan GPS Saat Ini</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {onboardingType && (
        <div className="fixed bottom-0 w-full max-w-md bg-white border-t p-4 flex gap-3 z-[1000] pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
          <button onClick={() => step === 1 ? setOnboardingType(null) : setStep(step - 1)} className="px-5 py-3.5 rounded-xl bg-slate-100"><ArrowLeft size={20} /></button>
          {step < maxSteps ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 bg-[#7A171D] text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2">Selanjutnya <ArrowRight size={18} /></button>
          ) : (
            <button onClick={submitOnboarding} disabled={isSaving} className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex justify-center gap-2">{isSaving ? "Mengirim..." : <><CheckCircle size={18} /> Ajukan Verifikasi</>}</button>
          )}
        </div>
      )}
    </div>
  );
}

function DocBox({ label, currentUrl, onUpload, onError }: { label: string, currentUrl?: string, onUpload: (url: string) => void, onError: (msg: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try { onUpload(await uploadToCloudinary(file)); } catch { onError("Gagal upload dokumen."); } finally { setIsUploading(false); }
  };
  return (
    <label className={`border border-dashed rounded-xl p-4 flex items-center justify-between cursor-pointer ${currentUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFile} disabled={isUploading} />
      <div><p className="text-sm font-bold text-slate-700">{label}</p><p className="text-[10px] text-slate-400">{isUploading ? "Mengunggah..." : currentUrl ? "File terunggah (Ketuk ubah)" : "JPG, PNG (Max 5MB)"}</p></div>
      <div className={`p-2 rounded-lg ${currentUrl ? 'text-emerald-600 bg-emerald-100' : 'bg-slate-50 text-slate-400'}`}>{isUploading ? <Loader2 size={20} className="animate-spin text-[#C5A059]" /> : currentUrl ? <CheckCircle size={20} /> : <UploadCloud size={20} />}</div>
    </label>
  );
}