"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  MapPin, Box, Maximize, 
  Globe2, Calculator, Truck, ChevronRight, 
  Scale, Navigation, Car, ArrowRight, ShieldCheck, Zap
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { AdminPricingConfig, EstimateData, DynamicVehicle } from "@/types/order";

// --- IMPORT KOMPONEN BARU ---
import AuthModal from "./components/AuthModal";
import VehicleShowcase from "./components/VehicleShowcase";

interface ExtendedPricingConfig extends AdminPricingConfig {
  customVehicles?: DynamicVehicle[];
}

const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-[56px] w-full bg-slate-100 rounded-2xl animate-pulse flex items-center px-5 text-sm text-slate-400 font-bold">Menyiapkan radar lokasi...</div> 
});

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-full bg-slate-100/50 backdrop-blur-md animate-pulse flex flex-col items-center justify-center rounded-[2.5rem]">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
      <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Memuat Peta Satelit</p>
    </div>
  ) 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

const getDynamicPricingSimulation = async (params: {
  category: "domestik" | "internasional"; weight: number; length: number; width: number; height: number;
  distanceKm: number; vehicle: string; adminConfig: ExtendedPricingConfig | null;
}): Promise<EstimateData> => {
  await new Promise(resolve => setTimeout(resolve, 800)); 

  const volumeWeight = (params.length * params.width * params.height) / 6000;
  const chargeableWeight = Math.max(params.weight, volumeWeight);

  let finalPrice = 0;
  let vehicleName = "Kargo Global";

  if (params.category === "domestik") {
    const vehiclesArray: DynamicVehicle[] = params.adminConfig?.customVehicles || [];
    let selectedMatrix: DynamicVehicle | undefined;

    if (params.vehicle === "auto") {
      const sortedVehicles = [...vehiclesArray].sort((a, b) => a.maxWeight - b.maxWeight);
      selectedMatrix = sortedVehicles.find(v => v.maxWeight >= chargeableWeight) || sortedVehicles[sortedVehicles.length - 1];
      vehicleName = selectedMatrix ? `${selectedMatrix.name} (AI Auto)` : "Armada Default";
    } else {
      selectedMatrix = vehiclesArray.find(v => v.id === params.vehicle);
      vehicleName = selectedMatrix ? selectedMatrix.name : "Armada Khusus";
    }

    if (selectedMatrix) {
      const realDistance = params.distanceKm > 0 ? params.distanceKm : 10; 
      const extraKm = Math.max(0, realDistance - selectedMatrix.minKm);
      finalPrice = selectedMatrix.baseFare + (extraKm * selectedMatrix.perKm);
    } else {
      finalPrice = 50000 + (params.distanceKm * 5000);
    }
  } else {
    const baseInternationalPerKg = params.adminConfig?.internasional?.basePerKg || 250000;
    finalPrice = chargeableWeight * baseInternationalPerKg;
  }

  const discountThreshold = params.adminConfig?.discounts?.thresholdKg || 50;
  const discountRate = params.adminConfig?.discounts?.rate || 0.95; 
  if (chargeableWeight >= discountThreshold) { finalPrice *= discountRate; }

  return {
    chargeableWeight: parseFloat(chargeableWeight.toFixed(2)),
    finalEstimate: Math.round(finalPrice),
    parameters: { actualWeight: params.weight, volumeWeight: parseFloat(volumeWeight.toFixed(2)), distanceTraveled: params.distanceKm, category: params.category, vehicleName }
  };
};

export default function DesktopPortalPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const domestikRef = useRef<HTMLElement>(null);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [adminPricing, setAdminPricing] = useState<ExtendedPricingConfig | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<DynamicVehicle[]>([]);

  // --- STATE KHUSUS DOMESTIK ---
  const [isDomestikLoading, setIsDomestikLoading] = useState(false);
  const [domestikEstimate, setDomestikEstimate] = useState<EstimateData | null>(null);
  const [domestikData, setDomestikData] = useState({ origin: "", destination: "", weight: "", length: "", width: "", height: "", vehicle: "auto" });
  const [originCoords, setOriginCoords] = useState<{lng: number, lat: number} | null>(null);
  const [destCoords, setDestCoords] = useState<{lng: number, lat: number} | null>(null);
  const [routeData, setRouteData] = useState<unknown>(null); 
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);
  const [mapViewState, setMapViewState] = useState({ longitude: 118.0149, latitude: -2.5489, zoom: 4.5 });

  // --- STATE KHUSUS FORWARDING ---
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [globalEstimate, setGlobalEstimate] = useState<EstimateData | null>(null);
  const [globalData, setGlobalData] = useState({ origin: "", destination: "", weight: "", length: "", width: "", height: "" });

  useEffect(() => {
    const fetchLivePricing = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as ExtendedPricingConfig;
          setAdminPricing(data);
          if (data.customVehicles && Array.isArray(data.customVehicles)) {
            setAvailableVehicles(data.customVehicles.sort((a, b) => a.maxWeight - b.maxWeight));
          }
        }
      } catch (error) { console.error("Gagal sinkronisasi master data tarif:", error); }
    };
    fetchLivePricing();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash) {
        setTimeout(() => {
          const el = document.getElementById(hash.substring(1));
          if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 500);
      }
    }
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
      } catch (err) { console.error("Gagal memproses AI Route:", err); }
    };
    
    const timer = setTimeout(fetchRealRoute, 500); 
    return () => clearTimeout(timer);
  }, [originCoords, destCoords]);

  const handleCalculateDomestik = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDomestikLoading(true); setDomestikEstimate(null);
    if (!domestikData.origin || !domestikData.destination || !domestikData.weight || !domestikData.length) {
      setIsDomestikLoading(false); return;
    }
    try {
      const result = await getDynamicPricingSimulation({
        category: "domestik", weight: parseFloat(domestikData.weight), length: parseFloat(domestikData.length), width: parseFloat(domestikData.width), height: parseFloat(domestikData.height),
        distanceKm: routeDistanceKm, vehicle: domestikData.vehicle, adminConfig: adminPricing
      });
      setDomestikEstimate(result);
    } catch (error) { console.error(error); } finally { setIsDomestikLoading(false); }
  };

  const handleCalculateGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGlobalLoading(true); setGlobalEstimate(null);
    if (!globalData.origin || !globalData.destination || !globalData.weight) {
      setIsGlobalLoading(false); return;
    }
    try {
      const result = await getDynamicPricingSimulation({
        category: "internasional", weight: parseFloat(globalData.weight), length: parseFloat(globalData.length), width: parseFloat(globalData.width), height: parseFloat(globalData.height),
        distanceKm: 0, vehicle: "auto", adminConfig: adminPricing
      });
      setGlobalEstimate(result);
    } catch (error) { console.error(error); } finally { setIsGlobalLoading(false); }
  };

  const formatRupiah = (number: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(number);

  const handleProceed = (type: "domestik" | "forwarding") => {
    if (!isHydrated) return;
    if (!user) { setShowAuthModal(true); return; }
    
    const data = type === "domestik" ? domestikData : globalData;
    const params = new URLSearchParams({
      origin: data.origin, destination: data.destination, weight: data.weight,
      l: data.length, w: data.width, h: data.height
    }).toString();
    
    router.push(type === "domestik" ? `/delivery/booking?${params}` : `/forwarding/quote?${params}`);
  };

  // Helper local function for class string builder because cn is removed
  const cls = (...classes: (string | boolean | undefined | null)[]) => {
    return classes.filter(Boolean).join(" ");
  };

  return (
    <main className="relative min-h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-x-hidden pb-32">
      
      {/* --- AMBIENT GLOWING BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] rounded-full bg-rose-200/30 blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vh] rounded-full bg-amber-100/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vh] rounded-full bg-blue-100/30 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-8">
        
        {/* ============================================================== */}
        {/* 📦 SECTION 1: PENGIRIMAN DOMESTIK (#domestik) */}
        {/* ============================================================== */}
        <section id="domestik" ref={domestikRef} className="pt-8 pb-16">
          <div className="mb-8 px-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#7A171D]/10 text-[#7A171D] border border-[#7A171D]/20"><Truck className="w-7 h-7" /></div>
                Kalkulator Domestik
              </h1>
              <p className="text-slate-500 font-medium mt-3 text-base max-w-xl">Simulasi otomatis tarif pengiriman ke seluruh Indonesia dengan integrasi pemetaan satelit.</p>
            </div>
            <Button onClick={() => { if(!user) setShowAuthModal(true); else router.push("/delivery/booking"); }} variant="primary" className="shadow-md h-12">
              <Calculator className="w-4 h-4 mr-2"/> Booking Domestik
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch mb-16">
            
            {/* KIRI: MAPBOX */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="lg:col-span-7 h-[400px] lg:h-auto min-h-[500px] relative order-2 lg:order-1">
              <div className="glass-card w-full h-full p-2 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-6 left-6 glass-panel px-4 py-3 rounded-2xl z-20 flex items-center gap-3 pointer-events-none">
                  <div className="relative flex items-center justify-center">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute"></div>
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative z-10"></div>
                  </div>
                  <div>
                    <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Satelit Radar</p>
                    <p className="text-slate-500 text-[9px] font-bold uppercase leading-none">{routeDistanceKm > 0 ? `Jarak Tempuh: ${routeDistanceKm} KM` : "Menunggu Koordinat"}</p>
                  </div>
                </div>

                <div className="w-full h-full rounded-[2rem] relative overflow-hidden bg-slate-100 border border-white/50">
                  <MapBase
                    longitude={mapViewState.longitude} latitude={mapViewState.latitude} zoom={mapViewState.zoom}
                    interactive={true} className="w-full h-full" originCoords={originCoords} 
                    drops={destCoords ? [{ id: "d1", lng: destCoords.lng, lat: destCoords.lat, address: domestikData.destination, detail: "", receiverName: "", receiverPhone: "", receiverEmail: "", items: [] }] : []}
                    routeData={routeData}
                  />
                  {!originCoords && !destCoords && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-md z-10 pointer-events-none">
                      <div className="bg-white/90 p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-white flex flex-col items-center">
                        <MapPin className="w-10 h-10 text-[#7A171D] mb-3 animate-bounce" />
                        <p className="text-slate-800 text-sm font-black tracking-wide">Pilih lokasi pada form kalkulator</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* KANAN: FORM DOMESTIK */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="lg:col-span-5 order-1 lg:order-2">
              <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 h-full flex flex-col">
                <form onSubmit={handleCalculateDomestik} className="flex-grow flex flex-col justify-between space-y-6">
                  <div className="space-y-5 relative z-10">
                    <div className="space-y-4 relative">
                      <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200 z-0"></div>
                      <div className="relative z-10 flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-white outline outline-4 outline-[#7A171D] border-2 border-[#7A171D] shrink-0"></div>
                        <div className={cls("flex-1 bg-white/60 backdrop-blur-md border border-white focus-within:ring-[3px] focus-within:ring-[#7A171D]/20 focus-within:bg-white rounded-2xl transition-all h-[56px] shadow-sm")}>
                          <SearchBox
                            accessToken={MAPBOX_TOKEN} options={{ language: 'id', country: 'ID' }} value={domestikData.origin} placeholder="Titik Penjemputan..."
                            onRetrieve={(res) => {
                              const feature = res.features[0];
                              setDomestikData(prev => ({ ...prev, origin: feature.properties.full_address || feature.properties.name }));
                              setOriginCoords({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
                              setDomestikEstimate(null);
                            }}
                            theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '16px 20px', fontFamily: 'inherit', unit: '14px', fontWeight: '700' } }}
                          />
                        </div>
                      </div>
                      <div className="relative z-10 flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-[#7A171D] outline outline-4 outline-slate-100 shrink-0"></div>
                        <div className={cls("flex-1 bg-white/60 backdrop-blur-md border border-white focus-within:ring-[3px] focus-within:ring-[#7A171D]/20 focus-within:bg-white rounded-2xl transition-all h-[56px] shadow-sm")}>
                          <SearchBox
                            accessToken={MAPBOX_TOKEN} options={{ language: 'id', country: 'ID' }} value={domestikData.destination} placeholder="Lokasi Pengiriman..."
                            onRetrieve={(res) => {
                              const feature = res.features[0];
                              setDomestikData(prev => ({ ...prev, destination: feature.properties.full_address || feature.properties.name }));
                              setDestCoords({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
                              setDomestikEstimate(null);
                            }}
                            theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '16px 20px', fontFamily: 'inherit', unit: '14px', fontWeight: '700' } }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Box className="w-3.5 h-3.5 text-[#7A171D]"/> Berat (Kg)</label>
                        <Input type="number" name="weight" min="1" value={domestikData.weight} onChange={(e) => { setDomestikData(p => ({...p, weight: e.target.value})); setDomestikEstimate(null); }} placeholder="Cth: 5" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Maximize className="w-3.5 h-3.5 text-[#7A171D]"/> Dimensi (cm)</label>
                        <div className={cls("flex bg-white/60 backdrop-blur-md rounded-2xl border border-white overflow-hidden h-[56px] focus-within:ring-[3px] focus-within:ring-[#7A171D]/20 focus-within:bg-white transition-all shadow-sm")}>
                          <input type="number" placeholder="P" value={domestikData.length} onChange={(e) => { setDomestikData(p => ({...p, length: e.target.value})); setDomestikEstimate(null); }} className="w-1/3 px-2 text-center text-sm font-bold bg-transparent outline-none border-r border-slate-200" required />
                          <input type="number" placeholder="L" value={domestikData.width} onChange={(e) => { setDomestikData(p => ({...p, width: e.target.value})); setDomestikEstimate(null); }} className="w-1/3 px-2 text-center text-sm font-bold bg-transparent outline-none border-r border-slate-200" required />
                          <input type="number" placeholder="T" value={domestikData.height} onChange={(e) => { setDomestikData(p => ({...p, height: e.target.value})); setDomestikEstimate(null); }} className="w-1/3 px-2 text-center text-sm font-bold bg-transparent outline-none" required />
                        </div>
                      </div>
                      <div className="col-span-2 space-y-2 mt-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-[#7A171D]"/> Pilihan Armada</label>
                        <div className="relative">
                          <select value={domestikData.vehicle} onChange={(e) => { setDomestikData(p => ({...p, vehicle: e.target.value})); setDomestikEstimate(null); }} className="w-full h-[56px] px-5 text-sm font-bold border border-white bg-white/60 backdrop-blur-md rounded-2xl focus:border-[#7A171D]/50 focus:ring-[3px] focus:ring-[#7A171D]/15 focus:bg-white outline-none appearance-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] cursor-pointer">
                            <option value="auto">Otomatis (AI Rekomendasi)</option>
                            {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.name} (Maks {v.maxWeight} Kg)</option>)}
                          </select>
                          <ChevronRight className="w-4 h-4 text-slate-400 absolute right-5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    {!domestikEstimate ? (
                      <Button type="submit" isLoading={isDomestikLoading} variant="primary" className="w-full h-14 text-base rounded-[1.25rem]">
                        Kalkulasi Jarak & Tarif <Calculator className="w-5 h-5 ml-2 opacity-70"/>
                      </Button>
                    ) : (
                      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[1.5rem] p-6 flex flex-col gap-4 shadow-[0_8px_30px_rgba(15,23,42,0.3)] border border-slate-700 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start border-b border-slate-700/50 pb-4 relative z-10">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tarif Live Ekspedisi</p>
                            <h3 className="text-3xl font-black tracking-tight text-white">{formatRupiah(domestikEstimate.finalEstimate)}</h3>
                          </div>
                          <div className="text-xs font-black px-3 py-1.5 rounded-lg bg-[#7A171D] text-white border border-[#9A242B] shadow-inner">
                            {domestikEstimate.chargeableWeight} Kg
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 text-sm text-slate-400 relative z-10">
                          <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Scale className="w-4 h-4"/> Berat Dihitung:</span> <b className="text-white">{domestikEstimate.parameters.actualWeight} Kg</b></div>
                          <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Navigation className="w-4 h-4"/> Jarak Tempuh:</span> <b className="text-white">{routeDistanceKm > 0 ? `${routeDistanceKm} Km` : "-"}</b></div>
                          <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Car className="w-4 h-4 text-[#C5A059]"/> Armada:</span> <b className="text-[#C5A059]">{domestikEstimate.parameters.vehicleName}</b></div>
                        </div>

                        <Button type="button" onClick={() => handleProceed("domestik")} className="w-full mt-3 h-12 bg-white text-slate-900 hover:bg-slate-100 border-none relative z-10">
                          Lanjutkan Pemesanan <ArrowRight className="w-4 h-4 ml-2"/>
                        </Button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
          
          {/* ============================================================== */}
          {/* COMPONENT: INTERACTIVE VEHICLE SLIDER */}
          {/* ============================================================== */}
          <div className="mt-6">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#7A171D]" /> Katalog Kapasitas Armada
            </h3>
            
            {availableVehicles.length > 0 ? (
              <VehicleShowcase 
                vehicles={availableVehicles}
                selectedVehicleId={domestikData.vehicle}
                onSelect={(id) => {
                  setDomestikData(p => ({...p, vehicle: id})); 
                  setDomestikEstimate(null);
                }}
              />
            ) : (
              <div className="w-full h-[400px] bg-slate-100 rounded-[3rem] animate-pulse"></div>
            )}
          </div>

        </section>

        <div className="w-full max-w-4xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-slate-300 to-transparent my-10"></div>

        {/* ============================================================== */}
        {/* 🌍 SECTION 2: KARGO INTERNASIONAL (FORWARDING) (#forwarding) */}
        {/* ============================================================== */}
        <section id="forwarding" className="pt-8 pb-32 scroll-mt-24">
          
          <div className="mb-8 px-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"><Globe2 className="w-7 h-7" /></div>
                Kalkulator Forwarding
              </h2>
              <p className="text-slate-500 font-medium mt-3 text-base max-w-xl">
                Cek estimasi biaya kargo internasional secara instan.
              </p>
            </div>
            <Button onClick={() => { if(!user) setShowAuthModal(true); else router.push("/forwarding/quote"); }} variant="gold" className="shadow-md h-12">
              <Calculator className="w-4 h-4 mr-2"/> Ajukan Penawaran
            </Button>
          </div>

          <div className="glass-card rounded-[3rem] overflow-hidden bg-white/40 border border-white relative">
            <div className="absolute top-0 right-0 w-[50%] h-[100%] bg-gradient-to-l from-[#C5A059]/10 to-transparent pointer-events-none"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
              <div className="p-8 lg:p-16 relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-[#C5A059]/30 border border-[#A68345]">
                  <Globe2 className="w-7 h-7" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight mb-4 text-balance">
                  Kargo Global, <br/><span className="text-[#C5A059]">Kini Lebih Cepat.</span>
                </h2>
                <p className="text-slate-500 font-medium text-lg mb-8 leading-relaxed max-w-md">
                  Pengiriman ekspor-impor bebas hambatan. Sistem mengkalkulasi estimasi berdasarkan dimensi muatan dan regulasi Bea Cukai terbaru.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3"><Zap className="w-5 h-5 text-[#C5A059]" /> <span className="font-bold text-slate-700">Dukungan 200+ Negara & Teritori</span></div>
                  <div className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-[#C5A059]" /> <span className="font-bold text-slate-700">Asuransi Kargo Internasional Menyeluruh</span></div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xl p-8 lg:p-12 h-full border-l border-white/50 relative z-10 flex flex-col justify-center">
                <form onSubmit={handleCalculateGlobal} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Negara Asal</label>
                      <Input name="origin" value={globalData.origin} onChange={(e) => { setGlobalData(p => ({...p, origin: e.target.value})); setGlobalEstimate(null); }} placeholder="Cth: Indonesia" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Negara Tujuan</label>
                      <Input name="destination" value={globalData.destination} onChange={(e) => { setGlobalData(p => ({...p, destination: e.target.value})); setGlobalEstimate(null); }} placeholder="Cth: Singapore" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Berat (Kg)</label>
                      <Input type="number" name="weight" min="1" value={globalData.weight} onChange={(e) => { setGlobalData(p => ({...p, weight: e.target.value})); setGlobalEstimate(null); }} placeholder="Cth: 15" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Dimensi (cm)</label>
                      <div className={cls("flex bg-white/60 backdrop-blur-md rounded-2xl border border-white overflow-hidden h-[56px] focus-within:ring-[3px] focus-within:ring-[#C5A059]/20 focus-within:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]")}>
                        <input type="number" placeholder="P" value={globalData.length} onChange={(e) => { setGlobalData(p => ({...p, length: e.target.value})); setGlobalEstimate(null); }} className="w-1/3 px-2 text-center text-sm font-bold bg-transparent outline-none border-r border-slate-200" required />
                        <input type="number" placeholder="L" value={globalData.width} onChange={(e) => { setGlobalData(p => ({...p, width: e.target.value})); setGlobalEstimate(null); }} className="w-1/3 px-2 text-center text-sm font-bold bg-transparent outline-none border-r border-slate-200" required />
                        <input type="number" placeholder="T" value={globalData.height} onChange={(e) => { setGlobalData(p => ({...p, height: e.target.value})); setGlobalEstimate(null); }} className="w-1/3 px-2 text-center text-sm font-bold bg-transparent outline-none" required />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    {!globalEstimate ? (
                      <Button type="submit" isLoading={isGlobalLoading} variant="gold" className="w-full h-14 text-base rounded-[1.25rem]">
                        Cek Estimasi Global <Globe2 className="w-5 h-5 ml-2 opacity-70"/>
                      </Button>
                    ) : (
                      <div className="bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] rounded-[1.5rem] p-6 flex flex-col gap-4 shadow-[0_8px_30px_rgba(197,160,89,0.3)] border border-[#A68345] animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-start border-b border-white/20 pb-4">
                          <div>
                            <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-1">Estimasi Kargo Global</p>
                            <h3 className="text-3xl font-black tracking-tight text-white">{formatRupiah(globalEstimate.finalEstimate)}</h3>
                          </div>
                          <div className="text-xs font-black px-3 py-1.5 rounded-lg bg-white text-[#C5A059] shadow-sm">
                            {globalEstimate.chargeableWeight} Kg
                          </div>
                        </div>
                        <Button type="button" onClick={() => handleProceed("forwarding")} className="w-full mt-2 h-12 bg-slate-900 text-white hover:bg-slate-800 border-none shadow-xl">
                          Buat Penawaran Quote <ArrowRight className="w-4 h-4 ml-2"/>
                        </Button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* COMPONENT: MODAL AUTH */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

    </main>
  );
}