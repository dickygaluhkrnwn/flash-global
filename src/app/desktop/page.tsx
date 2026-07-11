"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  MapPin, Box, Maximize, 
  Globe2, Calculator, Truck, Lock, X, ChevronRight, 
  User, PackageSearch, Scale, Navigation, Zap
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
  loading: () => <div className="h-[52px] w-full bg-slate-50 rounded-xl border border-slate-200 animate-pulse flex items-center px-4 text-xs text-slate-400 font-medium">Menyelaraskan koordinat...</div> 
});

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex flex-col items-center justify-center rounded-[2.5rem]"><div className="w-10 h-10 border-4 border-slate-300 border-t-[#7A171D] rounded-full animate-spin mb-4"></div><p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Menyiapkan Peta</p></div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// ======================================================================
// INTERFACES (Menghilangkan Tipe 'any' agar Linter Lolos)
// ======================================================================

interface AdminPricingConfig {
  domestik?: {
    motor?: { baseFare: number; minKm: number; perKm: number; maxWeight: number };
    mobil?: { baseFare: number; minKm: number; perKm: number; maxWeight: number };
  };
  internasional?: {
    basePerKg?: number;
  };
  discounts?: {
    thresholdKg?: number;
    rate?: number;
  };
}

interface EstimateData {
  chargeableWeight: number;
  finalEstimate: number;
  parameters: {
    actualWeight: number;
    volumeWeight: number;
    distanceTraveled: number;
    category: string;
    vehicleName: string;
  };
}

// ======================================================================
// LOGIKA KALKULASI TARIF MENGGUNAKAN DATA DINAMIS DARI ADMIN FIRESTORE
// ======================================================================
const getDynamicPricingSimulation = async (params: {
  category: "domestik" | "internasional";
  weight: number;
  length: number;
  width: number;
  height: number;
  distanceKm: number; 
  vehicle: string;
  adminConfig: AdminPricingConfig | null;
}): Promise<EstimateData> => {
  await new Promise(resolve => setTimeout(resolve, 800));

  const volumeWeight = (params.length * params.width * params.height) / 6000;
  const chargeableWeight = Math.max(params.weight, volumeWeight);

  let finalPrice = 0;
  let vehicleName = "Kargo Global";

  if (params.category === "domestik") {
    const defaultMotor = { baseFare: 15000, minKm: 3, perKm: 3000, maxWeight: 20 };
    const defaultMobil = { baseFare: 50000, minKm: 5, perKm: 5000, maxWeight: 500 };
    
    const motorRate = params.adminConfig?.domestik?.motor || defaultMotor;
    const mobilRate = params.adminConfig?.domestik?.mobil || defaultMobil;
    
    let currentMatrix;
    
    // Logika Pemilihan Armada Paksa vs Otomatis
    if (params.vehicle === "motor") {
      currentMatrix = motorRate;
      vehicleName = "Armada Motor";
    } else if (params.vehicle === "mobil") {
      currentMatrix = mobilRate;
      vehicleName = "Armada Mobil (Pickup/Van)";
    } else {
      currentMatrix = chargeableWeight <= motorRate.maxWeight ? motorRate : mobilRate;
      vehicleName = chargeableWeight <= motorRate.maxWeight ? "Armada Motor (AI Auto)" : "Armada Mobil (AI Auto)";
    }
    
    const realDistance = params.distanceKm > 0 ? params.distanceKm : 10; 
    const extraKm = Math.max(0, realDistance - currentMatrix.minKm);
    
    finalPrice = currentMatrix.baseFare + (extraKm * currentMatrix.perKm);

  } else {
    const baseInternationalPerKg = params.adminConfig?.internasional?.basePerKg || 250000;
    finalPrice = chargeableWeight * baseInternationalPerKg;
  }

  const discountThreshold = params.adminConfig?.discounts?.thresholdKg || 50;
  const discountRate = params.adminConfig?.discounts?.rate || 0.95; 
  
  if (chargeableWeight >= discountThreshold) {
    finalPrice *= discountRate; 
  }

  return {
    chargeableWeight: parseFloat(chargeableWeight.toFixed(2)),
    finalEstimate: Math.round(finalPrice),
    parameters: {
      actualWeight: params.weight,
      volumeWeight: parseFloat(volumeWeight.toFixed(2)),
      distanceTraveled: params.distanceKm,
      category: params.category,
      vehicleName: vehicleName
    }
  };
};

export default function DesktopLandingPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [estimateData, setEstimateData] = useState<EstimateData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"domestik" | "internasional">("domestik");
  const [adminPricing, setAdminPricing] = useState<AdminPricingConfig | null>(null);

  const [formData, setFormData] = useState({ 
    origin: "", destination: "", weight: "", length: "", width: "", height: "", vehicle: "auto" 
  });
  
  const [originCoords, setOriginCoords] = useState<{lng: number, lat: number} | null>(null);
  const [destCoords, setDestCoords] = useState<{lng: number, lat: number} | null>(null);
  const [routeData, setRouteData] = useState<unknown>(null); // unknown is safer than any for Mapbox geometry
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);
  
  const [mapViewState, setMapViewState] = useState({
    longitude: 118.0149,
    latitude: -2.5489,
    zoom: 4.5
  });

  useEffect(() => {
    const fetchLivePricing = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setAdminPricing(docSnap.data() as AdminPricingConfig);
      } catch (error) { 
        console.error("Gagal sinkronisasi master data tarif:", error); 
      }
    };
    fetchLivePricing();
  }, []);

  useEffect(() => {
    if (!originCoords && !destCoords) return;

    if ((originCoords && !destCoords) || (!originCoords && destCoords)) {
      const point = originCoords || destCoords;
      setMapViewState({ longitude: point!.lng, latitude: point!.lat, zoom: 12 });
      setRouteData(null);
      setRouteDistanceKm(0);
      return;
    }

    const fetchRealRoute = async () => {
      if (!originCoords || !destCoords) return;
      
      try {
        const waypoints = `${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}`;
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const currentRoute = data.routes[0];
          const distanceKm = Number((currentRoute.distance / 1000).toFixed(1));
          
          setRouteData(currentRoute.geometry); 
          setRouteDistanceKm(distanceKm);

          const midLng = (originCoords.lng + destCoords.lng) / 2;
          const midLat = (originCoords.lat + destCoords.lat) / 2;
          
          let dynamicZoom = 4;
          if (distanceKm < 5) dynamicZoom = 12.5;
          else if (distanceKm < 20) dynamicZoom = 11;
          else if (distanceKm < 50) dynamicZoom = 10;
          else if (distanceKm < 150) dynamicZoom = 8.5;
          else if (distanceKm < 400) dynamicZoom = 7;
          else if (distanceKm < 1000) dynamicZoom = 5.5;
          else if (distanceKm < 2500) dynamicZoom = 4.5;
          
          setMapViewState({ longitude: midLng, latitude: midLat, zoom: dynamicZoom });
        }
      } catch (err) { 
        console.error("Gagal memproses AI Route:", err); 
      }
    };
    
    const timer = setTimeout(fetchRealRoute, 500); 
    return () => clearTimeout(timer);
  }, [originCoords, destCoords]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setEstimateData(null); 
  };

  // Helper function to update state securely from Mapbox SearchBox without mocking "any" event
  const handleSmartMapChange = (name: string, value: string) => {
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
      const result = await getDynamicPricingSimulation({
        category: activeTab,
        weight: parseFloat(formData.weight), 
        length: parseFloat(formData.length), 
        width: parseFloat(formData.width), 
        height: parseFloat(formData.height),
        distanceKm: routeDistanceKm, 
        vehicle: formData.vehicle,
        adminConfig: adminPricing
      });
      setEstimateData(result);
    } catch (error) { 
      console.error("Kalkulasi cerdas gagal:", error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(number);
  };

  // PERBAIKAN: Routing Canonical (Tanpa /desktop)
  const getNextRouteWithData = () => {
    const params = new URLSearchParams({
      origin: formData.origin, destination: formData.destination, weight: formData.weight.toString(),
      l: formData.length.toString(), w: formData.width.toString(), h: formData.height.toString()
    }).toString();
    return activeTab === "domestik" ? `/delivery/booking?${params}` : `/forwarding/quote?${params}`;
  };

  const handleDirectRoute = (route: string) => {
    if (!isHydrated) return;
    if (!user) { setShowAuthModal(true); return; }
    router.push(route); 
  };

  const handleProceed = () => {
    if (!isHydrated) return;
    if (!user) { setShowAuthModal(true); return; }
    router.push(getNextRouteWithData());
  };

  const dropsArrayForMap = destCoords ? [{
    id: "dest-1", lng: destCoords.lng, lat: destCoords.lat, 
    address: formData.destination, detail: "", receiverName: "", receiverPhone: "", receiverEmail: "", items: []
  }] : [];

  return (
    <main className="flex-grow relative overflow-x-hidden min-h-screen bg-slate-50 pt-24 pb-16">
      
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-[#7A171D]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-[#C5A059]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-6 md:px-8 lg:px-12 relative z-10">
        
        {/* HERO SECTION (PRO SAAS LAYOUT: Split Header) */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10 mt-4">
          <div className="max-w-2xl text-left">
            <Badge variant="brand" className="mb-6 px-4 py-1.5 shadow-sm inline-flex items-center gap-2">
              <Zap className="w-4 h-4 fill-current"/>
              Sistem Logistik Cerdas
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15] mb-4">
              Akselerasi Pengiriman <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Tanpa Batas Wilayah.</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-xl">
              Dapatkan kalkulasi biaya pengiriman *real-time* yang terintegrasi penuh dengan satelit Mapbox.
            </p>
          </div>
          
          {/* QUICK ACCESS BUTTONS: Pindah ke kanan atas agar rapi */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0 pb-1">
            <Button 
              // PERBAIKAN: Canonical Route
              onClick={() => handleDirectRoute("/delivery/booking")}
              variant="primary" 
              className="w-full sm:w-auto h-12 px-6 text-sm font-bold shadow-lg shadow-[#7A171D]/20 rounded-xl flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" /> Pesan Domestik Langsung
            </Button>
            <Button 
              // PERBAIKAN: Canonical Route
              onClick={() => handleDirectRoute("/forwarding/quote")}
              variant="outline" 
              className="w-full sm:w-auto h-12 px-6 text-sm font-bold bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm rounded-xl flex items-center justify-center gap-2"
            >
              <Globe2 className="w-4 h-4 text-[#C5A059]" /> Global Forwarding
            </Button>
          </div>
        </div>

        {/* MAIN LAYOUT: GRID 12 KOLOM */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          
          {/* KOLOM KIRI: KALKULATOR (Lebar Proporsional 5 Kolom) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} 
            className="lg:col-span-5 flex flex-col"
          >
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 lg:p-8 shadow-xl shadow-slate-200/50 w-full h-full flex flex-col">
              
              <div className="flex bg-slate-100 p-1.5 rounded-xl mb-8 relative border border-slate-200">
                <button type="button" onClick={() => { setActiveTab("domestik"); setEstimateData(null); }} className={cn("flex-1 py-3 text-sm font-bold transition-all rounded-lg relative z-10 flex items-center justify-center gap-2", activeTab === "domestik" ? "text-[#7A171D]" : "text-slate-500 hover:text-slate-700")}>
                  <Truck className="w-4 h-4"/> Domestik
                </button>
                <button type="button" onClick={() => { setActiveTab("internasional"); setEstimateData(null); }} className={cn("flex-1 py-3 text-sm font-bold transition-all rounded-lg relative z-10 flex items-center justify-center gap-2", activeTab === "internasional" ? "text-[#C5A059]" : "text-slate-500 hover:text-slate-700")}>
                  <Globe2 className="w-4 h-4"/> Internasional
                </button>
                <div className={cn("absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out", activeTab === "domestik" ? "left-1.5" : "left-[calc(50%+4px)]")}></div>
              </div>

              <form onSubmit={handleCalculate} className="space-y-6 flex-grow flex flex-col justify-between">
                
                <div className="space-y-5">
                  <div className="space-y-3 relative">
                    <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200 z-0"></div>
                    
                    <div className="relative z-10 flex items-center gap-4">
                      <div className={cn("w-3 h-3 rounded-full outline outline-4 shrink-0", activeTab === "domestik" ? "bg-white outline-[#7A171D] border-2 border-[#7A171D]" : "bg-white outline-[#C5A059] border-2 border-[#C5A059]")}></div>
                      <div className={cn("flex-1 border border-slate-200 focus-within:ring-4 rounded-xl transition-all bg-white overflow-hidden h-[52px] shadow-sm", activeTab === "domestik" ? "focus-within:border-[#7A171D] focus-within:ring-[#7A171D]/10" : "focus-within:border-[#C5A059] focus-within:ring-[#C5A059]/10")}>
                        <SearchBox
                          accessToken={MAPBOX_TOKEN}
                          options={{ language: 'id', country: 'ID' }}
                          value={formData.origin}
                          placeholder="Titik Penjemputan..."
                          onRetrieve={(res) => {
                            const feature = res.features[0];
                            handleSmartMapChange("origin", feature.properties.full_address || feature.properties.name);
                            setOriginCoords({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
                          }}
                          theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '15px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '600' } }}
                        />
                      </div>
                    </div>
                    
                    <div className="relative z-10 flex items-center gap-4">
                      <div className={cn("w-3 h-3 rounded-full outline outline-4 shrink-0", activeTab === "domestik" ? "bg-[#7A171D] outline-slate-100" : "bg-[#C5A059] outline-slate-100")}></div>
                      <div className={cn("flex-1 border border-slate-200 focus-within:ring-4 rounded-xl transition-all bg-white overflow-hidden h-[52px] shadow-sm", activeTab === "domestik" ? "focus-within:border-[#7A171D] focus-within:ring-[#7A171D]/10" : "focus-within:border-[#C5A059] focus-within:ring-[#C5A059]/10")}>
                        <SearchBox
                          accessToken={MAPBOX_TOKEN}
                          options={{ language: 'id', country: 'ID' }}
                          value={formData.destination}
                          placeholder="Lokasi Pengiriman..."
                          onRetrieve={(res) => {
                            const feature = res.features[0];
                            handleSmartMapChange("destination", feature.properties.full_address || feature.properties.name);
                            setDestCoords({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
                          }}
                          theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '15px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '600' } }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Box className={cn("w-3.5 h-3.5", activeTab === "domestik" ? "text-[#7A171D]" : "text-[#C5A059]")}/> Berat (Kg)</label>
                    <Input type="number" name="weight" min="1" value={formData.weight} onChange={handleInputChange} placeholder="Cth: 5" className={cn("h-[52px] font-bold border-slate-200 bg-slate-50", activeTab === "domestik" ? "focus-visible:border-[#7A171D]" : "focus-visible:border-[#C5A059]")} required />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Maximize className={cn("w-3.5 h-3.5", activeTab === "domestik" ? "text-[#7A171D]" : "text-[#C5A059]")}/> Dimensi (cm)</label>
                    <div className="flex bg-slate-50 rounded-xl border border-slate-200 overflow-hidden h-[52px] focus-within:ring-4 transition-all">
                      <input type="number" name="length" placeholder="P" value={formData.length} onChange={handleInputChange} className="w-1/3 px-2 text-center text-sm font-bold bg-transparent outline-none border-r border-slate-200" required />
                      <input type="number" name="width" placeholder="L" value={formData.width} onChange={handleInputChange} className="w-1/3 px-2 text-center text-sm font-bold bg-transparent outline-none border-r border-slate-200" required />
                      <input type="number" name="height" placeholder="T" value={formData.height} onChange={handleInputChange} className="w-1/3 px-2 text-center text-sm font-bold bg-transparent outline-none" required />
                    </div>
                  </div>
                  
                  {/* PENAMBAHAN INPUT PILIH ARMADA KHUSUS DOMESTIK */}
                  {activeTab === "domestik" && (
                    <div className="col-span-2 space-y-2 mt-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#7A171D]"/> Pilihan Armada
                      </label>
                      <div className="relative">
                        <select 
                          name="vehicle" 
                          value={formData.vehicle} 
                          onChange={handleInputChange}
                          className="w-full h-[52px] px-4 text-sm font-bold border border-slate-200 bg-slate-50 rounded-xl focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none appearance-none transition-all cursor-pointer"
                        >
                          <option value="auto">Otomatis (Rekomendasi AI berdasarkan berat)</option>
                          <option value="motor">Armada Motor (Maks 20 Kg)</option>
                          <option value="mobil">Armada Mobil Kargo (Pickup/Van)</option>
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                  )}

                </div>

                <div className="pt-4">
                  {!estimateData ? (
                    <Button type="submit" isLoading={isLoading} variant={activeTab === "domestik" ? "primary" : "gold"} className="w-full h-14 text-base font-black shadow-lg">
                      Kalkulasi AI Logistics <Calculator className="w-5 h-5 ml-2 opacity-70"/>
                    </Button>
                  ) : (
                    <div className="bg-slate-900 rounded-[1.5rem] p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300 shadow-xl shadow-slate-900/20">
                      
                      <div className="flex justify-between items-start border-b border-slate-700/50 pb-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{activeTab === "domestik" ? "Tarif Live Ekspedisi" : "Estimasi Kargo Global"}</p>
                          <h3 className={cn("text-3xl font-black tracking-tight", activeTab === "domestik" ? "text-white" : "text-[#C5A059]")}>{formatRupiah(estimateData.finalEstimate)}</h3>
                        </div>
                        <div className={cn("text-sm font-black px-2 py-1 rounded-lg", activeTab === "domestik" ? "bg-[#7A171D] text-white" : "bg-[#C5A059] text-slate-900")}>
                          {estimateData.chargeableWeight} Kg
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between text-sm text-slate-400 gap-y-3">
                        <div className="flex items-center gap-1.5"><Scale className="w-4 h-4 opacity-70"/> <span className="font-medium">Berat: <b className="text-white">{estimateData.parameters.actualWeight} Kg</b></span></div>
                        <div className="flex items-center gap-1.5"><Navigation className="w-4 h-4 opacity-70"/> <span className="font-medium">Jarak: <b className="text-white">{routeDistanceKm > 0 ? `${routeDistanceKm} Km` : "Global"}</b></span></div>
                        
                        {/* Menampilkan Armada yang Dipilih Sistem/User */}
                        {activeTab === "domestik" && (
                          <div className="flex items-center gap-1.5 w-full mt-1 pt-3 border-t border-slate-700/50">
                            <Truck className="w-4 h-4 opacity-70 text-[#C5A059]"/> 
                            <span className="font-medium">Armada Terpilih: <b className="text-[#C5A059]">{estimateData.parameters.vehicleName}</b></span>
                          </div>
                        )}
                      </div>

                      <button type="button" onClick={handleProceed} className="w-full mt-2 py-3 bg-white text-slate-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                        Lanjutkan Pemesanan <ChevronRight className="w-4 h-4"/>
                      </button>
                    </div>
                  )}
                </div>

              </form>
            </div>
          </motion.div>

          {/* ========================================================= */}
          {/* KOLOM KANAN: LIVE MAPBOX RADAR (Lebar Proporsional 7 Kolom) */}
          {/* ========================================================= */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-7 h-[500px] lg:h-auto relative"
          >
            <div className="w-full h-full bg-white rounded-[2rem] p-2 shadow-xl shadow-slate-200/50 border border-slate-200 relative overflow-hidden group">
              
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 z-20 flex items-center gap-3 shadow-sm pointer-events-none">
                <div className="relative flex items-center justify-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute"></div>
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative z-10"></div>
                </div>
                <div>
                  <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Radar Aktif</p>
                  <p className="text-slate-500 text-[9px] font-bold uppercase leading-none">{routeDistanceKm > 0 ? `Jarak: ${routeDistanceKm} KM` : "Menunggu Koordinat"}</p>
                </div>
              </div>

              <div className="w-full h-full rounded-[1.5rem] relative overflow-hidden bg-slate-100 border border-slate-200/50">
                <MapBase
                  longitude={mapViewState.longitude} 
                  latitude={mapViewState.latitude}
                  zoom={mapViewState.zoom}
                  interactive={true}
                  className="w-full h-full"
                  originCoords={originCoords}
                  drops={dropsArrayForMap}
                  routeData={routeData}
                />

                {!originCoords && !destCoords && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm z-10 pointer-events-none">
                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center">
                      <MapPin className="w-8 h-8 text-[#7A171D] mb-3 animate-bounce" />
                      <p className="text-slate-700 text-sm font-bold tracking-wide">Pilih lokasi pada form kalkulator</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-6 right-6 z-20">
                <button onClick={() => router.push("/tracking")} className="bg-white/95 backdrop-blur-md hover:bg-white border border-slate-200 px-5 py-3.5 rounded-2xl flex items-center gap-3 transition-colors shadow-lg group">
                  <div className="bg-[#7A171D]/10 p-2 rounded-xl text-[#7A171D] group-hover:scale-110 transition-transform"><PackageSearch className="w-4 h-4"/></div>
                  <span className="text-slate-800 text-xs font-bold tracking-wide">Cek Pengiriman</span>
                </button>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* AUTH MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAuthModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 md:p-10 overflow-hidden border border-slate-200">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#7A171D] to-[#C5A059]" />
              <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X className="w-4 h-4" /></button>

              <div className="w-16 h-16 bg-[#7A171D]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#7A171D]/20">
                <Lock className="w-8 h-8 text-[#7A171D]" />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2">Akses Terbatas</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                Untuk menjaga keamanan data pengiriman, sistem mewajibkan Anda untuk masuk atau mendaftar akun sebelum membuat pesanan logistik baru.
              </p>
              
              <div className="flex gap-4">
                <Button onClick={() => setShowAuthModal(false)} variant="outline" className="flex-1 h-12 text-sm font-bold rounded-xl">
                  Batal
                </Button>
                <Button onClick={() => router.push("/login")} variant="primary" className="flex-1 h-12 text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                  <User className="w-4 h-4" /> Login Dulu
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}