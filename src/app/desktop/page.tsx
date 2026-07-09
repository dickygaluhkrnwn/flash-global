"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  MapPin, Box, ArrowRight, Maximize, 
  Star, Globe2, Calculator, Truck, Lock, X, ChevronRight, 
  User, PackageSearch, BarChart3, Scale, FastForward, MapPinned, Zap, Activity, Navigation
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// --- IMPORT UI KIT ---
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// ======================================================================
// PENGGUNAAN DYNAMIC IMPORT SSR: FALSE (UNTUK MAPBOX INDEPENDEN)
// ======================================================================
const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-[52px] w-full bg-gray-50/80 rounded-xl border animate-pulse flex items-center px-4 text-xs text-gray-400">Sinkronisasi satelit...</div> 
});

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-[#0B0F19] animate-pulse flex flex-col items-center justify-center"><div className="w-10 h-10 border-4 border-slate-700 border-t-[#C5A059] rounded-full animate-spin mb-4"></div><p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Menghidupkan Radar</p></div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// --- SIMULASI SERVICE API HARGA ADMIN TERINTEGRASI JARAK MAPBOX ---
const getAdminPricingSimulation = async (params: {
  category: "domestik" | "internasional";
  origin: string;
  destination: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  distanceKm: number; // Jarak riil dari Mapbox
  adminConfig: any;
}) => {
  // Simulasi waktu komputasi AI Logistics
  await new Promise(resolve => setTimeout(resolve, 1200));

  const volumeWeight = (params.length * params.width * params.height) / 6000;
  const chargeableWeight = Math.max(params.weight, volumeWeight);

  let finalPrice = 0;

  if (params.category === "domestik") {
    const motorRate = params.adminConfig?.motor || { baseFare: 12000, minKm: 3, perKm: 2500 };
    const mobilRate = params.adminConfig?.mobil || { baseFare: 45000, minKm: 5, perKm: 4000 };
    
    // Logika pemilihan armada otomatis
    const currentMatrix = chargeableWeight <= 20 ? motorRate : mobilRate;
    
    // PENGHITUNGAN CERDAS MENGGUNAKAN JARAK RIIL MAPBOX
    const realDistance = params.distanceKm > 0 ? params.distanceKm : 15; 
    const extraKm = Math.max(0, realDistance - currentMatrix.minKm);
    finalPrice = currentMatrix.baseFare + (extraKm * currentMatrix.perKm);

    // AI Regional Surcharge (Simulasi)
    if (params.origin.toLowerCase().includes("jakarta") && !params.destination.toLowerCase().includes("jakarta")) {
      finalPrice *= 1.15; 
    }
  } else {
    // Tarif Kargo Internasional per KG
    let baseInternationalPerKg = 150000;
    if (params.destination.toLowerCase().includes("usa") || params.destination.toLowerCase().includes("eropa") || params.destination.toLowerCase().includes("amerika")) {
      baseInternationalPerKg = 250000;
    }
    finalPrice = chargeableWeight * baseInternationalPerKg;
  }

  // AI Volume Discount
  if (chargeableWeight > 50) finalPrice *= 0.95; 

  return {
    chargeableWeight: parseFloat(chargeableWeight.toFixed(2)),
    finalEstimate: Math.round(finalPrice),
    parameters: {
      actualWeight: params.weight,
      volumeWeight: parseFloat(volumeWeight.toFixed(2)),
      distanceTraveled: params.distanceKm,
      category: params.category,
    }
  };
};

export default function DesktopLandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [estimateData, setEstimateData] = useState<any | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [activeWidget, setActiveWidget] = useState<"book" | "calc">("book");
  const [activeTab, setActiveTab] = useState<"domestik" | "internasional">("domestik");
  const [adminPricing, setAdminPricing] = useState<any>(null);

  // Form State & Live Maps Coordinates (Sangat Krusial untuk Route Drawing)
  const [formData, setFormData] = useState({ origin: "", destination: "", weight: "", length: "", width: "", height: "" });
  const [originCoords, setOriginCoords] = useState<{lng: number, lat: number} | null>(null);
  const [destCoords, setDestCoords] = useState<{lng: number, lat: number} | null>(null);
  
  // State untuk menyimpan geometri garis Mapbox dan jarak tempuh
  const [routeData, setRouteData] = useState<any>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);

  // 1. Tarik Data Konfigurasi Tarif Admin
  useEffect(() => {
    const fetchLivePricing = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setAdminPricing(docSnap.data());
      } catch (error) { console.error("Gagal sinkronisasi master data tarif:", error); }
    };
    fetchLivePricing();
  }, []);

  // 2. Intelligence Route Drawing (Menghubungkan Asal dan Tujuan di Mapbox)
  useEffect(() => {
    if (!originCoords || !destCoords) {
      setRouteData(null);
      setRouteDistanceKm(0);
      return;
    }
    const fetchRealRoute = async () => {
      try {
        const waypoints = `${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}`;
        // Menggunakan Directions API untuk rute akurat
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const currentRoute = data.routes[0];
          setRouteData(currentRoute.geometry); // Gambar garis biru di peta
          setRouteDistanceKm(Number((currentRoute.distance / 1000).toFixed(1))); // Jarak real dalam KM
        }
      } catch (err) { console.error("Gagal memproses AI Route:", err); }
    };
    
    // Debounce agar tidak spam API
    const timer = setTimeout(fetchRealRoute, 600); 
    return () => clearTimeout(timer);
  }, [originCoords, destCoords]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setEstimateData(null); 
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setEstimateData(null);

    if (!formData.origin || !formData.destination || !formData.weight || !formData.length || !formData.width || !formData.height) {
      setIsLoading(false); return;
    }

    try {
      // Mengirimkan jarak Real Mapbox ke sistem kalkulator!
      const result = await getAdminPricingSimulation({
        category: activeTab,
        origin: formData.origin, 
        destination: formData.destination,
        weight: parseFloat(formData.weight), 
        length: parseFloat(formData.length), 
        width: parseFloat(formData.width), 
        height: parseFloat(formData.height),
        distanceKm: routeDistanceKm, 
        adminConfig: adminPricing
      });
      setEstimateData(result);
    } catch (error) { console.error("Kalkulasi cerdas gagal:", error); } 
    finally { setIsLoading(false); }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(number);
  };

  // REVISI URL: Murni Publik (Tanpa /desktop)
  const getNextRouteWithData = () => {
    const params = new URLSearchParams({
      origin: formData.origin, destination: formData.destination, weight: formData.weight.toString(),
      l: formData.length.toString(), w: formData.width.toString(), h: formData.height.toString()
    }).toString();
    return activeTab === "domestik" ? `/delivery/booking?${params}` : `/forwarding/quote?${params}`;
  };

  const handleDirectRoute = (route: string) => {
    if (!user) { setShowAuthModal(true); return; }
    router.push(route); 
  };

  const handleProceed = () => {
    if (!user) { setShowAuthModal(true); return; }
    router.push(getNextRouteWithData());
  };

  // Format array destinations (drops) yang dibutuhkan oleh komponen MapBase agar marker tujuan muncul
  const dropsArrayForMap = destCoords ? [{
    id: "dest-1", lng: destCoords.lng, lat: destCoords.lat, 
    address: formData.destination, detail: "", receiverName: "", receiverPhone: "", receiverEmail: "", items: []
  }] : [];

  return (
    <main className="flex-grow relative overflow-hidden flex flex-col justify-center min-h-[calc(100vh-80px)]">
      
      {/* BACKGROUND ELEMENTS (CLEAN & PREMIUM) */}
      <div className="absolute inset-0 bg-[#F8F9FA] -z-20"></div>
      <div className="absolute top-0 right-[-10%] w-[50%] h-[60%] bg-brand-maroon/5 rounded-full blur-[150px] -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[50%] bg-brand-gold/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay -z-10"></div>
      {/* PERBAIKAN: Background globe dihilangkan agar tidak error 404 */}

      <div className="max-w-[1400px] w-full mx-auto px-6 md:px-10 lg:px-12 z-10 py-16 flex flex-col xl:flex-row items-center gap-10 xl:gap-16">
        
        {/* ========================================================= */}
        {/* KOLOM KIRI: SMART CALCULATOR & HERO TEXT                  */}
        {/* ========================================================= */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} 
          className="xl:w-[50%] w-full flex flex-col justify-center"
        >
          <div className="mb-10 text-center xl:text-left">
            <Badge variant="default" className="bg-white border-gray-200 text-gray-700 shadow-sm mb-6 px-4 py-2 font-bold inline-flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-brand-gold fill-brand-gold"/>
              <span>AI Logistics Platform 2.0</span>
            </Badge>

            <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.1] mb-6">
              Akselerasi Ekspedisi <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-maroon to-brand-gold">Masa Depan.</span>
            </h1>
            <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-xl mx-auto xl:mx-0">
              Hubungkan ribuan armada dalam satu sentuhan. Cek estimasi ongkos kirim cerdas secara live yang terintegrasi dengan radar satelit Mapbox kami.
            </p>
          </div>

          {/* SMART CALCULATOR WIDGET */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-8 shadow-premium w-full relative z-20">
            
            {/* Tab Jenis Kargo Cerdas */}
            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6 relative border border-gray-200/60">
              <button type="button" onClick={() => { setActiveTab("domestik"); setEstimateData(null); }} className={cn("flex-1 py-3 text-sm font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-2", activeTab === "domestik" ? "text-brand-maroon" : "text-gray-500 hover:text-gray-700")}>
                <Truck className="w-4 h-4"/> Domestik
              </button>
              <button type="button" onClick={() => { setActiveTab("internasional"); setEstimateData(null); }} className={cn("flex-1 py-3 text-sm font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-2", activeTab === "internasional" ? "text-brand-gold" : "text-gray-500 hover:text-gray-700")}>
                <Globe2 className="w-4 h-4"/> Internasional
              </button>
              <div className={cn("absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300", activeTab === "domestik" ? "left-1.5" : "left-[calc(50%+4px)]")}></div>
            </div>

            <form onSubmit={handleCalculate} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin className={cn("w-3 h-3", activeTab === "domestik" ? "text-brand-maroon" : "text-brand-gold")}/> Jaringan Rute Radar</label>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  
                  {/* INTEGRASI MAPBOX: Titik Asal */}
                  <div className={cn("flex-1 border-2 border-gray-100 focus-within:ring-4 rounded-xl transition-all bg-gray-50 overflow-hidden h-[52px] w-full", activeTab === "domestik" ? "focus-within:border-brand-maroon/40 focus-within:ring-brand-maroon/10" : "focus-within:border-brand-gold/40 focus-within:ring-brand-gold/10")}>
                    <SearchBox
                      accessToken={MAPBOX_TOKEN}
                      options={{ language: 'id', country: 'ID' }}
                      value={formData.origin}
                      placeholder="Ketik Kota Asal..."
                      onRetrieve={(res) => {
                        const feature = res.features[0];
                        handleInputChange({ target: { name: "origin", value: feature.properties.full_address || feature.properties.name } } as any);
                        setOriginCoords({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
                        setEstimateData(null);
                      }}
                      theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '15px 14px', fontFamily: 'inherit', unit: '13px', fontWeight: '700' } }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-center w-8 shrink-0 text-gray-300 rotate-90 sm:rotate-0"><ArrowRight className="w-5 h-5"/></div>
                  
                  {/* INTEGRASI MAPBOX: Titik Tujuan */}
                  <div className={cn("flex-1 border-2 border-gray-100 focus-within:ring-4 rounded-xl transition-all bg-gray-50 overflow-hidden h-[52px] w-full", activeTab === "domestik" ? "focus-within:border-brand-maroon/40 focus-within:ring-brand-maroon/10" : "focus-within:border-brand-gold/40 focus-within:ring-brand-gold/10")}>
                    <SearchBox
                      accessToken={MAPBOX_TOKEN}
                      options={{ language: 'id', country: 'ID' }}
                      value={formData.destination}
                      placeholder="Ketik Kota Tujuan..."
                      onRetrieve={(res) => {
                        const feature = res.features[0];
                        handleInputChange({ target: { name: "destination", value: feature.properties.full_address || feature.properties.name } } as any);
                        setDestCoords({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
                        setEstimateData(null);
                      }}
                      theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '15px 14px', fontFamily: 'inherit', unit: '13px', fontWeight: '700' } }}
                    />
                  </div>

                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Box className={cn("w-3 h-3", activeTab === "domestik" ? "text-brand-maroon" : "text-brand-gold")}/> Berat Aktual (Kg)</label>
                  <Input type="number" name="weight" min="1" value={formData.weight} onChange={handleInputChange} placeholder="Cth: 5" className={cn("h-[52px] text-center font-bold text-lg", activeTab === "domestik" ? "focus-visible:border-brand-maroon/50" : "focus-visible:border-brand-gold/50")} required />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Maximize className={cn("w-3 h-3", activeTab === "domestik" ? "text-brand-maroon" : "text-brand-gold")}/> Dimensi (P x L x T cm)</label>
                  <div className="flex gap-2">
                    <Input type="number" name="length" placeholder="P" value={formData.length} onChange={handleInputChange} className={cn("h-[52px] px-1 text-center font-bold text-gray-800", activeTab === "domestik" ? "focus-visible:border-brand-maroon/50" : "focus-visible:border-brand-gold/50")} required />
                    <Input type="number" name="width" placeholder="L" value={formData.width} onChange={handleInputChange} className={cn("h-[52px] px-1 text-center font-bold text-gray-800", activeTab === "domestik" ? "focus-visible:border-brand-maroon/50" : "focus-visible:border-brand-gold/50")} required />
                    <Input type="number" name="height" placeholder="T" value={formData.height} onChange={handleInputChange} className={cn("h-[52px] px-1 text-center font-bold text-gray-800", activeTab === "domestik" ? "focus-visible:border-brand-maroon/50" : "focus-visible:border-brand-gold/50")} required />
                  </div>
                </div>
              </div>

              {/* ACTION BUTTON & RESULT */}
              <div className="pt-2 flex flex-col gap-4">
                {!estimateData ? (
                  <Button type="submit" isLoading={isLoading} variant={activeTab === "domestik" ? "primary" : "gold"} className="w-full h-14 text-base shadow-[0_8px_20px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5">
                    Kalkulasi AI Logistics <Calculator className="w-5 h-5 ml-2 opacity-70"/>
                  </Button>
                ) : (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-in fade-in slide-in-from-top-4 shadow-xl">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-400">
                      <div className="flex items-center gap-1.5 text-xs"><Scale className="w-3.5 h-3.5 opacity-50"/> Berat Aktual: <b className="text-white">{estimateData.parameters.actualWeight} Kg</b></div>
                      <div className="flex items-center gap-1.5 text-xs"><Navigation className="w-3.5 h-3.5 opacity-50"/> Jarak Tempuh: <b className="text-white">{routeDistanceKm > 0 ? `${routeDistanceKm} Km` : "Global"}</b></div>
                      <div className="flex items-center gap-1.5 text-xs md:col-span-2"><BarChart3 className="w-3.5 h-3.5 opacity-50"/> Muatan Tertagih (Matrix): <b className={cn("text-base font-black px-1.5 py-0.5 rounded", activeTab === "domestik" ? "bg-brand-maroon text-white" : "bg-brand-gold text-gray-900")}>{estimateData.chargeableWeight} Kg</b></div>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0 sm:border-l sm:border-gray-700 sm:pl-5 w-full sm:w-auto">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">{activeTab === "domestik" ? "Tarif Live Ekspedisi" : "Estimasi Global"}</p>
                      <h3 className={cn("text-3xl font-black tracking-tight mb-3", activeTab === "domestik" ? "text-white" : "text-brand-gold")}>{formatRupiah(estimateData.finalEstimate)}</h3>
                      <button type="button" onClick={handleProceed} className="text-xs font-bold text-white flex items-center gap-1 hover:underline underline-offset-4">
                        Lanjutkan Pemesanan <ChevronRight className="w-3 h-3"/>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* DIRECT ROUTE BUTTONS IF THEY DONT WANT TO CALCULATE */}
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => handleDirectRoute("/delivery/booking")} className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-brand-maroon/5 text-brand-maroon hover:bg-brand-maroon hover:text-white transition-colors flex items-center justify-center gap-2">
                    <Truck className="w-3.5 h-3.5"/> Langsung Pesan Kurir
                  </button>
                  <button type="button" onClick={() => handleDirectRoute("/forwarding/quote")} className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-brand-gold/10 text-brand-gold hover:bg-brand-gold hover:text-white transition-colors flex items-center justify-center gap-2">
                    <Globe2 className="w-3.5 h-3.5"/> Pesan Kargo Global
                  </button>
                </div>
              </div>

            </form>
          </div>

        </motion.div>

        {/* ========================================================= */}
        {/* KOLOM KANAN: LIVE MAPBOX RADAR (Pamer Cerdas)             */}
        {/* ========================================================= */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="xl:w-[50%] w-full h-[400px] xl:h-[700px] relative hidden lg:block"
        >
          <div className="w-full h-full bg-slate-900 rounded-[3rem] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-800 relative overflow-hidden group">
            
            {/* Header Mapbox (Futuristic Radar Style) */}
            <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 z-20 flex flex-col gap-1 shadow-lg pointer-events-none">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                <span className="text-white text-[10px] font-black uppercase tracking-widest">Global Radar Active</span>
              </div>
              <p className="text-gray-400 text-[9px] font-mono uppercase">Satellites Connected: 24 | Latency: 12ms</p>
            </div>

            {/* Jika Rute Sudah Terhubung, Tampilkan Jarak di Peta */}
            <AnimatePresence>
              {routeDistanceKm > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-6 right-6 bg-brand-maroon/90 backdrop-blur-md px-4 py-2 rounded-xl border border-red-400/30 z-20 shadow-lg pointer-events-none">
                  <p className="text-red-200 text-[9px] font-black uppercase tracking-widest mb-0.5">Jarak Analisis</p>
                  <p className="text-white text-base font-black">{routeDistanceKm} KM</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full h-full rounded-[2.5rem] relative overflow-hidden bg-[#0B0F19]">
              {/* MAPBASE CERDAS: Menghubungkan titik origin dan destination */}
              <MapBase
                longitude={originCoords?.lng || destCoords?.lng || 118.0149} 
                latitude={originCoords?.lat || destCoords?.lat || -2.5489}
                zoom={originCoords && destCoords ? 5 : (originCoords || destCoords ? 10 : 4)}
                interactive={true}
                className="w-full h-full"
                originCoords={originCoords}
                drops={dropsArrayForMap}
                routeData={routeData}
              />

              {!originCoords && !destCoords && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-[2px] z-10 pointer-events-none">
                  <Activity className="w-16 h-16 text-white/40 mb-4 drop-shadow-xl animate-pulse" />
                  <p className="text-white/80 text-sm font-bold tracking-wide">Radar Menunggu Input Titik Anda...</p>
                </div>
              )}
              
              {/* Vignette Gelap agar Map terlihat Cinematic */}
              <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] pointer-events-none z-10"></div>
            </div>

            {/* Quick Access Floating Panel (Track) */}
            <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-3">
              <button onClick={() => router.push("/tracking")} className="bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 px-4 py-3 rounded-2xl flex items-center gap-3 transition-colors shadow-lg group">
                <div className="bg-white/20 p-2 rounded-xl text-white group-hover:scale-110 transition-transform"><PackageSearch className="w-4 h-4"/></div>
                <span className="text-white text-xs font-bold tracking-wide">Lacak Resi (AWB)</span>
              </button>
            </div>
          </div>
        </motion.div>

      </div>

      {/* ========================================================= */}
      {/* CUSTOM AUTH MODAL (Peringatan Login Cerdas)               */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAuthModal(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm cursor-pointer" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-hidden border border-gray-100">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-maroon to-brand-gold" />
              <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X className="w-5 h-5" /></button>

              <div className="w-18 h-18 bg-red-50 rounded-2xl flex items-center justify-center mb-6 border border-red-100">
                <Lock className="w-9 h-9 text-brand-maroon" />
              </div>
              
              <h3 className="text-3xl font-black text-gray-900 mb-2">Akses Cerdas Terbatas</h3>
              <p className="text-base text-gray-500 font-medium leading-relaxed mb-10">
                Sistem pesanan Flash Global terintegrasi penuh. Silakan masuk atau daftar akun terlebih dahulu untuk melanjutkan proses pemesanan data cerdas Anda.
              </p>
              
              <div className="flex gap-4">
                <Button onClick={() => setShowAuthModal(false)} variant="outline" className="flex-1 h-14 text-sm font-bold">
                  Batal
                </Button>
                <Button onClick={() => router.push("/login")} variant="primary" className="flex-1 h-14 text-sm font-bold flex items-center justify-center gap-2">
                  <User className="w-4 h-4 mr-2" /> Login Dulu
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}