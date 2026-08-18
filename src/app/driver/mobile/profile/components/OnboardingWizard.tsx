"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom"; // 🚀 KUNCI SOLUSI: React Portal
import dynamic from "next/dynamic";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, MapPin, UploadCloud, 
  ArrowLeft, ArrowRight, X, Building2, Loader2, 
  MapPinned, ChevronDown, CheckCircle2 
} from "lucide-react"; 

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { DynamicVehicle } from "@/types/order";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { ssr: false });
const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { ssr: false });
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

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
  const [mounted, setMounted] = useState(false); // 🚀 State Portal
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

  // Mencegah Hydration Mismatch sebelum render Portal
  useEffect(() => {
    setMounted(true);
  }, []);

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
      } catch {}
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
          } catch {}

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
    if (!formData.baseCoords || formData.baseCoords.lat === 0) return showToast("Harap tentukan lokasi base Anda di peta.", "error");

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
  const progressPercent = onboardingType ? (step / maxSteps) * 100 : 0;
  
  const brandColor = onboardingType === "Vendor" ? "blue" : "maroon";
  const bgBrandColor = brandColor === "blue" ? "bg-blue-600" : "bg-[#7A171D]";

  // 🚀 JANGAN RENDER JIKA BELUM MOUNTED (Mencegah SSR Error)
  if (!mounted) return null;

  // 🚀 PORTAL KE document.body
  return createPortal(
    <div className="fixed inset-0 z-[999999] flex justify-center bg-[var(--background)] sm:bg-slate-900/50 sm:backdrop-blur-sm transition-all duration-300">
      {/* Container utama dengan max-w-md untuk menjaga proporsi HP */}
      <main className="w-full max-w-md h-full bg-[var(--background)] relative flex flex-col overflow-hidden font-sans tap-highlight-transparent shadow-2xl sm:rounded-3xl sm:h-[90vh] sm:my-auto">
        
        {/* BACKGROUND GLOW (Sekarang Absolute agar tidak bocor dari container) */}
        <div className="absolute top-0 right-0 w-[60%] h-[30%] bg-[#C5A059] rounded-full blur-[120px] opacity-15 pointer-events-none z-0" />

        {/* HEADER (GLASSMORPHISM) - Menggunakan Absolute */}
        <div className="absolute top-0 left-0 right-0 glass-panel px-5 pt-6 pb-4 shadow-sm z-30 flex flex-col border-b border-white/50">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-[1rem] bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm active:scale-90">
              <X size={20} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">Verifikasi Profil</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {onboardingType ? `Langkah ${step} dari ${maxSteps}` : "Pilih Kemitraan"}
              </p>
            </div>
          </div>
          {/* PROGRESS BAR */}
          <div className="w-full h-1.5 bg-slate-100 relative mt-4 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className={cn("h-full rounded-full", bgBrandColor)} 
              initial={{ width: 0 }} 
              animate={{ width: `${progressPercent}%` }} 
              transition={{ duration: 0.4, ease: "easeOut" }} 
            />
          </div>
        </div>
        
        {/* AREA KONTEN UTAMA (Dengan padding top & bottom agar tidak tertutup header/footer absolute) */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 w-full pt-28 pb-32 px-5">
          <AnimatePresence mode="wait">
            
            {/* STEP 0: PILIH TIPE KEMITRAAN */}
            {!onboardingType && (
              <motion.div key="selection" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, filter: "blur(4px)" }} className="space-y-6 pt-4">
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tentukan Tipe Anda</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Pilih entitas operasional Anda untuk melanjutkan.</p>
                </div>
                
                <div className="space-y-4">
                  <Card 
                    onClick={() => { setOnboardingType("Individual"); setStep(1); }} 
                    className="p-6 cursor-pointer border-2 border-transparent hover:border-[#C5A059] active:scale-[0.98] transition-all bg-white"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] rounded-[1.25rem] flex items-center justify-center mb-4 shadow-sm border border-[#A68345]">
                      <User className="text-white" size={28} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-1 tracking-tight">Mitra Individu (Pribadi)</h3>
                    <p className="text-xs font-medium text-slate-500">Mendaftar sebagai pengemudi mandiri dengan 1 unit kendaraan pribadi.</p>
                  </Card>

                  <Card 
                    onClick={() => { setOnboardingType("Vendor"); setStep(1); }} 
                    className="p-6 cursor-pointer border-2 border-transparent hover:border-blue-500 active:scale-[0.98] transition-all bg-white"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-[1.25rem] flex items-center justify-center mb-4 shadow-sm border border-blue-700">
                      <Building2 className="text-white" size={28} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-1 tracking-tight">Mitra Vendor (PT/CV)</h3>
                    <p className="text-xs font-medium text-slate-500">Mendaftar sebagai perusahaan berbadan hukum yang mengelola banyak armada truk.</p>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* STEP 1: DATA DIRI / PERUSAHAAN */}
            {onboardingType && step === 1 && (
              <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0, filter: "blur(4px)" }} className="space-y-6">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">{onboardingType === "Individual" ? "Data Pribadi" : "Data Perusahaan"}</h2>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">{onboardingType === "Vendor" ? "No. HP Manager" : "No. HP / WhatsApp"}</label>
                    <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="08123xxxx" className="bg-white/80" />
                  </div>
                  
                  {onboardingType === "Individual" ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nomor Induk Kependudukan (NIK)</label>
                        <Input type="number" name="nik" value={formData.nik} onChange={handleChange} placeholder="16 digit NIK" className="bg-white/80" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nomor SIM Aktif</label>
                        <Input type="text" name="simNumber" value={formData.simNumber} onChange={handleChange} placeholder="Nomor SIM" className="bg-white/80 uppercase" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nama Entitas (PT/CV)</label>
                        <Input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="PT Sukses Makmur" className="bg-white/80" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">NPWP Perusahaan</label>
                        <Input type="text" name="npwp" value={formData.npwp} onChange={handleChange} placeholder="Nomor NPWP" className="bg-white/80" />
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 2 INDIVIDUAL: DATA KENDARAAN */}
            {onboardingType === "Individual" && step === 2 && (
              <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0, filter: "blur(4px)" }} className="space-y-6">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Detail Kendaraan</h2>
                
                <div className="space-y-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Klasifikasi Kendaraan</label>
                    <button 
                      type="button" 
                      onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)} 
                      className="w-full px-5 py-3.5 bg-white/80 backdrop-blur-md border border-slate-200 rounded-[1.25rem] flex items-center justify-between font-bold text-sm text-slate-800 shadow-sm active:scale-[0.98] transition-all"
                    >
                      <span>{formData.vehicleType || "-- Pilih Jenis --"}</span>
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    </button>
                    
                    <AnimatePresence>
                      {isVehicleDropdownOpen && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-[70px] left-0 right-0 z-50 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar">
                          {vehicleConfigs.map((v, i) => (
                            <button key={i} type="button" onClick={() => { setFormData({ ...formData, vehicleType: v.name }); setIsVehicleDropdownOpen(false); }} className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b border-slate-100 flex flex-col active:bg-slate-100">
                              <span className="font-black text-slate-800 tracking-tight">{v.name}</span>
                              <span className="text-xs text-slate-500 font-medium">Maks muatan: {v.maxWeight} Kg</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nomor Polisi (Plat)</label>
                    <Input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleChange} placeholder="B 1234 ABC" className="bg-white/80 uppercase" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP DOCS: UPLOAD BERKAS */}
            {((onboardingType === "Individual" && step === 3) || (onboardingType === "Vendor" && step === 2)) && (
              <motion.div key="stepDocs" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0, filter: "blur(4px)" }} className="space-y-6">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Upload Berkas Fisik</h2>
                <div className="space-y-3">
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
                      <DocBox label="NIB / Izin Usaha Dasar" currentUrl={formData.nibUrl} onUpload={(url) => setFormData({...formData, nibUrl: url})} onError={(msg) => showToast(msg, "error")} />
                      <DocBox label="KTP Penanggung Jawab" currentUrl={formData.fotoKtpUrl} onUpload={(url) => setFormData({...formData, fotoKtpUrl: url})} onError={(msg) => showToast(msg, "error")} />
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP TERAKHIR: PEMETAAN LOKASI */}
            {((onboardingType === "Individual" && step === 4) || (onboardingType === "Vendor" && step === 3)) && (
              <motion.div key="stepMap" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0, filter: "blur(4px)" }} className="h-full flex flex-col">
                <h2 className="text-xl font-black text-slate-800 tracking-tight mb-4">Penentuan Titik Pangkal (Base)</h2>
                
                <div className="mb-4">
                  <style dangerouslySetInnerHTML={{__html: `mapbox-search-listbox { z-index: 999999 !important; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); } mapbox-search-box { --focus-box-shadow: none; --border-radius: 20px; }`}} />
                  <div className="bg-white/80 backdrop-blur-md rounded-[1.25rem] border border-slate-200 shadow-sm relative z-[100] h-14 flex items-center">
                    <SearchBox 
                      accessToken={MAPBOX_TOKEN} 
                      options={{ language: 'id', country: 'ID' }} 
                      value={formData.baseAddress || ""} 
                      onRetrieve={(res) => { 
                        const f = res.features[0]; 
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
                          ...p, baseAddress: address, domisili: city, 
                          baseCoords: { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] } 
                        })); 
                        setMapViewState({ longitude: f.geometry.coordinates[0], latitude: f.geometry.coordinates[1], zoom: 14 }); 
                      }} 
                      theme={{ variables: { boxShadow: 'none', border: 'none', padding: '0px 16px', unit: '14px', fontWeight: '800' } }} 
                    />
                  </div>
                </div>
                
                <div className="w-full h-[320px] bg-slate-100 rounded-[2rem] overflow-hidden border-2 border-white shadow-md relative z-0 mb-5">
                  <MapBase 
                    longitude={mapViewState.longitude} 
                    latitude={mapViewState.latitude} 
                    zoom={mapViewState.zoom} 
                    interactive={true} 
                    originCoords={formData.baseCoords?.lat !== 0 ? formData.baseCoords : undefined} 
                    activeDraggable={activeDraggable} 
                    onMarkerDragEnd={(lng, lat) => setFormData(p => ({...p, baseCoords: {lng, lat}}))} 
                  />
                  <div className="absolute top-4 right-4">
                    {formData.baseCoords?.lat !== 0 && (
                      <Button variant="glass" size="sm" onClick={() => setActiveDraggable(activeDraggable === "origin" ? null : "origin")} className="shadow-sm">
                        <MapPinned className="w-4 h-4 mr-2"/> Geser Pin
                      </Button>
                    )}
                  </div>
                </div>

                <Button 
                  variant="secondary" 
                  size="md" 
                  onClick={handleGetLocation} 
                  className="w-full shadow-sm"
                >
                  <MapPin className="w-4 h-4 mr-2" /> Kunci GPS Saat Ini
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FOOTER FIXED: NAVIGATION BUTTONS (Absolute to container) */}
        {onboardingType && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-4 pb-safe flex gap-3 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <Button 
              variant="outline" 
              size="lg" 
              className="w-14 px-0 shrink-0"
              onClick={() => step === 1 ? setOnboardingType(null) : setStep(step - 1)} 
            >
              <ArrowLeft size={20} />
            </Button>
            
            {step < maxSteps ? (
              <Button 
                variant={brandColor === "blue" ? "primary" : "primary"} 
                className={cn("flex-1", brandColor === "blue" && "bg-gradient-to-b from-blue-500 to-blue-700 shadow-blue-500/20 border-blue-800")}
                size="lg"
                onClick={() => setStep(step + 1)} 
              >
                Selanjutnya <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                variant="primary" 
                className="flex-1 bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-700 shadow-emerald-500/20"
                size="lg"
                disabled={isSaving}
                onClick={submitOnboarding} 
              >
                {isSaving ? "Menyimpan Data..." : <><CheckCircle2 className="w-4 h-4 mr-2" /> Selesai & Ajukan</>}
              </Button>
            )}
          </div>
        )}
      </main>
    </div>,
    document.body // 🚀 RENDER KE LUAR DOM TREE (PORTAL)
  );
}

// --------------------------------------------------------------------------
// PREMIUM DOCUMENT UPLOAD BOX
// --------------------------------------------------------------------------
function DocBox({ label, currentUrl, onUpload, onError }: { label: string, currentUrl?: string, onUpload: (url: string) => void, onError: (msg: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try { 
      onUpload(await uploadToCloudinary(file)); 
    } catch { 
      onError("Gagal upload dokumen."); 
    } finally { 
      setIsUploading(false); 
    }
  };

  return (
    <label className={cn(
      "border-2 rounded-[1.25rem] p-4 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] tap-highlight-transparent",
      currentUrl 
        ? "bg-emerald-50/80 border-emerald-200 shadow-sm" 
        : "bg-white/60 border-slate-200 border-dashed hover:bg-white"
    )}>
      <input type="file" accept="image/*,application/pdf" className="hidden" ref={fileInputRef} onChange={handleFile} disabled={isUploading} />
      <div>
        <p className={cn("text-sm font-black tracking-tight", currentUrl ? "text-emerald-900" : "text-slate-800")}>{label}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
          {isUploading ? "Mengunggah file..." : currentUrl ? "File tersimpan. Ketuk ubah." : "Max 5MB (JPG/PNG)"}
        </p>
      </div>
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-colors",
        currentUrl ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-100 text-slate-400 border-white"
      )}>
        {isUploading ? <Loader2 size={18} className="animate-spin" /> : currentUrl ? <CheckCircle2 size={18} /> : <UploadCloud size={18} />}
      </div>
    </label>
  );
}