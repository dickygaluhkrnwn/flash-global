"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  MapPin, Scale, Navigation, 
  Car, ArrowRight, Truck, Globe2, Calculator
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

import { AdminPricingConfig, EstimateData, DynamicVehicle } from "@/types/order";

// --- IMPORT MOBILE COMPONENTS ---
import AuthModal from "@/app/mobile/components/AuthModal";
import VehicleShowcase from "@/app/mobile/components/VehicleShowcase";

interface ExtendedPricingConfig extends AdminPricingConfig {
  customVehicles?: DynamicVehicle[];
}

const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-[56px] w-full bg-slate-100 rounded-[1.25rem] animate-pulse flex items-center px-5 text-sm text-slate-400 font-bold">Menyiapkan radar...</div> 
});

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-full bg-slate-100/50 backdrop-blur-md animate-pulse flex flex-col items-center justify-center rounded-[2rem]">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-3"></div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Satelit Peta</p>
    </div>
  ) 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// ============================================================================
// LOGIKA SIMULASI HARGA
// ============================================================================
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

export default function MobilePortalPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [adminPricing, setAdminPricing] = useState<ExtendedPricingConfig | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<DynamicVehicle[]>([]);

  // --- STATE DOMESTIK ---
  const [isDomestikLoading, setIsDomestikLoading] = useState(false);
  const [domestikEstimate, setDomestikEstimate] = useState<EstimateData | null>(null);
  const [domestikData, setDomestikData] = useState({ origin: "", destination: "", weight: "", length: "", width: "", height: "", vehicle: "auto" });
  const [originCoords, setOriginCoords] = useState<{lng: number, lat: number} | null>(null);
  const [destCoords, setDestCoords] = useState<{lng: number, lat: number} | null>(null);
  const [routeData, setRouteData] = useState<unknown>(null); 
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);
  const [mapViewState, setMapViewState] = useState({ longitude: 118.0149, latitude: -2.5489, zoom: 3.5 });

  // --- STATE FORWARDING ---
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
      } catch (error) { console.error("Gagal sinkronisasi tarif:", error); }
    };
    fetchLivePricing();
  }, []);

  useEffect(() => {
    if (!originCoords && !destCoords) return;
    if ((originCoords && !destCoords) || (!originCoords && destCoords)) {
      const point = originCoords || destCoords;
      setMapViewState({ longitude: point!.lng, latitude: point!.lat, zoom: 11 });
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
          if (distanceKm < 5) dynamicZoom = 11.5;
          else if (distanceKm < 20) dynamicZoom = 10;
          else if (distanceKm < 50) dynamicZoom = 9;
          else if (distanceKm < 150) dynamicZoom = 7.5;
          else if (distanceKm < 400) dynamicZoom = 6;
          else if (distanceKm < 1000) dynamicZoom = 4.5;
          else if (distanceKm < 2500) dynamicZoom = 3.5;
          
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

  return (
    <div className="flex flex-col space-y-8 px-4 w-full font-sans">
      
      {/* ============================================================== */}
      {/* 📦 SECTION 1: DOMESTIK (MAP & KALKULATOR) */}
      {/* ============================================================== */}
      <section className="space-y-4 relative z-20">
        <div className="px-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#7A171D]" /> 
            Kargo Domestik
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-xs">Simulasi tarif instan ke seluruh Indonesia.</p>
        </div>

        {/* Peta Mini */}
        <div className="w-full h-[220px] glass-card rounded-[2rem] p-1.5 relative overflow-hidden z-10">
          <div className="absolute top-4 left-4 glass-panel px-3 py-2 rounded-xl z-20 flex items-center gap-2 pointer-events-none shadow-sm">
            <div className="relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute"></div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full relative z-10"></div>
            </div>
            <div>
              <p className="text-slate-900 text-[9px] font-black uppercase tracking-widest leading-none mb-0.5">Radar Aktif</p>
              <p className="text-slate-500 text-[8px] font-bold uppercase leading-none">{routeDistanceKm > 0 ? `${routeDistanceKm} KM` : "Pilih Lokasi"}</p>
            </div>
          </div>

          <div className="w-full h-full rounded-[1.5rem] relative overflow-hidden bg-slate-100/50">
            <MapBase
              longitude={mapViewState.longitude} latitude={mapViewState.latitude} zoom={mapViewState.zoom}
              interactive={false} className="w-full h-full" originCoords={originCoords} 
              drops={destCoords ? [{ id: "d1", lng: destCoords.lng, lat: destCoords.lat, address: domestikData.destination, detail: "", receiverName: "", receiverPhone: "", receiverEmail: "", items: [] }] : []}
              routeData={routeData}
            />
            {!originCoords && !destCoords && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] z-10">
                <MapPin className="w-8 h-8 text-[#7A171D] opacity-70 animate-bounce" />
              </div>
            )}
          </div>
        </div>

        {/* Form Kalkulator Mobile */}
        <div className="glass-card rounded-[2rem] p-5 relative z-30">
          <form onSubmit={handleCalculateDomestik} className="space-y-6 relative z-10">
            {/* Input Lokasi */}
            <div className="space-y-4 relative">
              <div className="absolute left-5 top-6 bottom-6 w-[2px] bg-slate-200 z-0"></div>
              
              <div className="relative z-50 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-white outline outline-4 outline-[#7A171D] border border-[#7A171D] shrink-0 ml-4"></div>
                <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[1.25rem] shadow-sm border border-slate-100 focus-within:ring-2 focus-within:ring-[#7A171D]/20 relative z-50">
                  <SearchBox
                    accessToken={MAPBOX_TOKEN} options={{ language: 'id', country: 'ID' }} value={domestikData.origin} placeholder="Titik Penjemputan..."
                    onRetrieve={(res) => {
                      const feature = res.features[0];
                      setDomestikData(p => ({ ...p, origin: feature.properties.full_address || feature.properties.name }));
                      setOriginCoords({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
                      setDomestikEstimate(null);
                    }}
                    theme={{ variables: { boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: 'none', colorBackground: '#ffffff', padding: '14px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '700' } }}
                  />
                </div>
              </div>
              
              <div className="relative z-40 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#7A171D] outline outline-4 outline-slate-100 shrink-0 ml-4"></div>
                <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[1.25rem] shadow-sm border border-slate-100 focus-within:ring-2 focus-within:ring-[#7A171D]/20 relative z-40">
                  <SearchBox
                    accessToken={MAPBOX_TOKEN} options={{ language: 'id', country: 'ID' }} value={domestikData.destination} placeholder="Lokasi Tujuan..."
                    onRetrieve={(res) => {
                      const feature = res.features[0];
                      setDomestikData(p => ({ ...p, destination: feature.properties.full_address || feature.properties.name }));
                      setDestCoords({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
                      setDomestikEstimate(null);
                    }}
                    theme={{ variables: { boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: 'none', colorBackground: '#ffffff', padding: '14px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '700' } }}
                  />
                </div>
              </div>
            </div>

            {/* Input Dimensi & Berat */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Berat (Kg)</label>
                <Input type="number" name="weight" min="1" value={domestikData.weight} onChange={(e) => { setDomestikData(p => ({...p, weight: e.target.value})); setDomestikEstimate(null); }} placeholder="Cth: 5" required className="h-12" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Dimensi (cm)</label>
                <div className={cn("flex bg-white/60 backdrop-blur-md rounded-[1.25rem] border border-slate-200/80 overflow-hidden h-12 focus-within:ring-[3px] focus-within:ring-[#7A171D]/15 focus-within:border-[#7A171D]/50 transition-all shadow-[inset_0_2px_5px_rgba(0,0,0,0.02)]")}>
                  <input type="number" placeholder="P" value={domestikData.length} onChange={(e) => { setDomestikData(p => ({...p, length: e.target.value})); setDomestikEstimate(null); }} className="w-1/3 px-1 text-center text-xs font-bold bg-transparent outline-none border-r border-slate-200" required />
                  <input type="number" placeholder="L" value={domestikData.width} onChange={(e) => { setDomestikData(p => ({...p, width: e.target.value})); setDomestikEstimate(null); }} className="w-1/3 px-1 text-center text-xs font-bold bg-transparent outline-none border-r border-slate-200" required />
                  <input type="number" placeholder="T" value={domestikData.height} onChange={(e) => { setDomestikData(p => ({...p, height: e.target.value})); setDomestikEstimate(null); }} className="w-1/3 px-1 text-center text-xs font-bold bg-transparent outline-none" required />
                </div>
              </div>
            </div>

            {/* Armada Selector: Terintegrasi dengan VehicleShowcase Mobile */}
            <div className="space-y-3 pt-4 relative z-10">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pilihan Armada</label>
              <VehicleShowcase 
                vehicles={availableVehicles} 
                selectedVehicleId={domestikData.vehicle} 
                onSelect={(id) => { 
                  setDomestikData(p => ({...p, vehicle: id})); 
                  setDomestikEstimate(null); 
                }} 
              />
            </div>

            {/* Button Kalkulasi / Result */}
            <div className="pt-4 relative z-10">
              {!domestikEstimate ? (
                <Button type="submit" isLoading={isDomestikLoading} variant="primary" className="w-full h-14 text-sm rounded-[1.25rem] shadow-md font-black">
                  Kalkulasi Tarif <Calculator className="w-4 h-4 ml-2 opacity-70"/>
                </Button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 flex flex-col gap-3 shadow-xl border border-slate-700 relative overflow-hidden">
                  <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-white/10 blur-[30px] rounded-full pointer-events-none"></div>
                  
                  <div className="flex justify-between items-center border-b border-slate-700/50 pb-3 relative z-10">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Tarif Live</p>
                      <h3 className="text-2xl font-black tracking-tight text-white">{formatRupiah(domestikEstimate.finalEstimate)}</h3>
                    </div>
                    <div className="text-[10px] font-black px-2 py-1 rounded-md bg-[#7A171D] text-white shadow-inner">
                      {domestikEstimate.chargeableWeight} Kg
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 text-[11px] text-slate-400 relative z-10">
                    <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5"/> Berat Rill:</span> <b className="text-white">{domestikEstimate.parameters.actualWeight} Kg</b></div>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5"/> Jarak:</span> <b className="text-white">{routeDistanceKm > 0 ? `${routeDistanceKm} Km` : "-"}</b></div>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-[#C5A059]"/> Armada:</span> <b className="text-[#C5A059]">{domestikEstimate.parameters.vehicleName}</b></div>
                  </div>

                  <Button type="button" onClick={() => handleProceed("domestik")} className="w-full mt-2 h-12 bg-white text-slate-900 hover:bg-slate-100 border-none relative z-10 text-sm font-black tap-highlight-transparent">
                    Lanjutkan <ArrowRight className="w-4 h-4 ml-2"/>
                  </Button>
                </motion.div>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 🌍 SECTION 3: KARGO INTERNASIONAL */}
      {/* ============================================================== */}
      <section className="pt-4 pb-6 relative z-10">
        <div className="px-1 mb-4">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-[#C5A059]" /> Forwarding
          </h2>
          <p className="text-slate-500 font-medium mt-1 text-xs">Cek estimasi biaya kargo internasional.</p>
        </div>

        <div className="glass-card rounded-[2rem] overflow-hidden border border-white relative p-5 shadow-sm">
          <div className="absolute top-[-50%] right-[-20%] w-[80%] h-[100%] bg-gradient-to-bl from-[#C5A059]/15 to-transparent pointer-events-none rounded-full blur-[40px]"></div>
          
          <form onSubmit={handleCalculateGlobal} className="space-y-4 relative z-10">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Asal</label>
                <Input name="origin" value={globalData.origin} onChange={(e) => { setGlobalData(p => ({...p, origin: e.target.value})); setGlobalEstimate(null); }} placeholder="Cth: ID" required className="h-12 text-xs font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Tujuan</label>
                <Input name="destination" value={globalData.destination} onChange={(e) => { setGlobalData(p => ({...p, destination: e.target.value})); setGlobalEstimate(null); }} placeholder="Cth: SG" required className="h-12 text-xs font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Berat (Kg)</label>
                <Input type="number" name="weight" min="1" value={globalData.weight} onChange={(e) => { setGlobalData(p => ({...p, weight: e.target.value})); setGlobalEstimate(null); }} placeholder="10" required className="h-12 text-xs font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Dimensi (cm)</label>
                <div className={cn("flex bg-white/60 backdrop-blur-md rounded-[1.25rem] border border-slate-200/80 overflow-hidden h-12 focus-within:ring-[3px] focus-within:ring-[#C5A059]/20 focus-within:border-[#C5A059]/50 transition-all shadow-[inset_0_2px_5px_rgba(0,0,0,0.02)]")}>
                  <input type="number" placeholder="P" value={globalData.length} onChange={(e) => { setGlobalData(p => ({...p, length: e.target.value})); setGlobalEstimate(null); }} className="w-1/3 px-1 text-center text-[10px] font-bold bg-transparent outline-none border-r border-slate-200" required />
                  <input type="number" placeholder="L" value={globalData.width} onChange={(e) => { setGlobalData(p => ({...p, width: e.target.value})); setGlobalEstimate(null); }} className="w-1/3 px-1 text-center text-[10px] font-bold bg-transparent outline-none border-r border-slate-200" required />
                  <input type="number" placeholder="T" value={globalData.height} onChange={(e) => { setGlobalData(p => ({...p, height: e.target.value})); setGlobalEstimate(null); }} className="w-1/3 px-1 text-center text-[10px] font-bold bg-transparent outline-none" required />
                </div>
              </div>
            </div>

            <div className="pt-2">
              {!globalEstimate ? (
                <Button type="submit" isLoading={isGlobalLoading} variant="gold" className="w-full h-14 text-sm font-black rounded-[1.25rem] shadow-md tap-highlight-transparent">
                  Cek Estimasi Global <Globe2 className="w-4 h-4 ml-2 opacity-70"/>
                </Button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] rounded-3xl p-5 flex flex-col gap-3 shadow-lg border border-[#A68345]">
                  <div className="flex justify-between items-center border-b border-white/20 pb-3">
                    <div>
                      <p className="text-[9px] font-bold text-white/80 uppercase tracking-widest mb-0.5">Estimasi Biaya</p>
                      <h3 className="text-2xl font-black tracking-tight text-white">{formatRupiah(globalEstimate.finalEstimate)}</h3>
                    </div>
                    <div className="text-[10px] font-black px-2 py-1 rounded-md bg-white text-[#C5A059] shadow-sm">
                      {globalEstimate.chargeableWeight} Kg
                    </div>
                  </div>
                  <Button type="button" onClick={() => handleProceed("forwarding")} className="w-full mt-1 h-12 bg-slate-900 text-white hover:bg-slate-800 border-none shadow-md text-sm font-black tap-highlight-transparent">
                    Buat Penawaran <ArrowRight className="w-4 h-4 ml-2"/>
                  </Button>
                </motion.div>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* MODAL LOGIN MOBILE */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}