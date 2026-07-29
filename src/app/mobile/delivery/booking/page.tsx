"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft, Info, ShieldAlert, Wallet, MapPin, Package, ShieldCheck, Truck, MapPinned } from "lucide-react";
import dynamic from "next/dynamic";

import { db } from "@/lib/firebase"; 
import { doc, getDoc, collection, serverTimestamp, query, where, getDocs, writeBatch, increment } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// --- CHILD COMPONENTS ---
import ServiceVehicleSelector from "./components/ServiceVehicleSelector";
import OriginForm from "./components/OriginForm";
import DropsAccordion from "./components/DropsAccordion";
import ExtraServices from "./components/ExtraServices";
import BookingReceipt from "./components/BookingReceipt";

// --- GLOBAL TYPES ---
import { DropDestination, DynamicVehicle, Coordinates, MapViewState, OriginData, MapDropItem } from "@/types/order";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// DYNAMIC IMPORT MAPBASE SEBAGAI GLOBAL HEADER MAP
const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-full bg-slate-200/50 backdrop-blur-md flex flex-col items-center justify-center rounded-[1.5rem]">
      <div className="w-8 h-8 border-[3px] border-slate-300 border-t-[#7A171D] rounded-full animate-spin mb-2"></div>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest animate-pulse">Memuat Peta...</p>
    </div>
  ) 
});

// ======================================================================
// MAIN WIZARD COMPONENT
// ======================================================================
function BookingWizardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isHydrated } = useAuthStore();
  
  // --- UI STATE (STEPPER & MODALS) ---
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeInfo, setActiveInfo] = useState<{ title: string; text: string } | null>(null);

  // --- B2B & KEUANGAN ---
  const [isB2BClient, setIsB2BClient] = useState(false);
  const [b2bDiscountPercent, setB2bDiscountPercent] = useState(0);
  const [b2bLimit, setB2bLimit] = useState(0);
  const [b2bOutstanding, setB2bOutstanding] = useState(0);
  const [b2bDeposit, setB2bDeposit] = useState(0); 

  // --- TARIF & ARMADA ---
  const [tarifPerPorter, setTarifPerPorter] = useState<number>(50000);
  const [motorSettings, setMotorSettings] = useState({ weightSmall: 5, weightMedium: 20, warrantyPercent: 1.5, dimS: {p:20, l:20, t:20}, dimM: {p:40, l:40, t:40}, dimL: {p:50, l:50, t:50} });
  const [vehicles, setVehicles] = useState<DynamicVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<DynamicVehicle | null>(null);
  const [selectedService, setSelectedService] = useState<"Instan" | "Sameday">("Instan");
  
  // --- LOKASI JEMPUT ---
  const [originData, setOriginData] = useState<OriginData>({ address: searchParams.get("origin") || "", detail: "", senderName: user?.displayName || "", senderPhone: "" });
  const [originCoords, setOriginCoords] = useState<Coordinates | null>(null);

  // --- TUJUAN (MULTI-DROP) ---
  const initialDropId = `DROP-${Math.floor(1000 + Math.random() * 9000)}`;
  const [drops, setDrops] = useState<DropDestination[]>([{
    id: initialDropId, address: searchParams.get("destination") || "", detail: "", receiverName: "", receiverPhone: "", receiverEmail: "",
    items: [{ id: `ITM-1`, name: "", weightType: "Kecil", dimType: "S", weightVal: Number(searchParams.get("weight")) || 0, length: Number(searchParams.get("l")) || 0, width: Number(searchParams.get("w")) || 0, height: Number(searchParams.get("h")) || 0, value: 0 }]
  }]);
  const [activeDropId, setActiveDropId] = useState<string | null>(initialDropId);

  // --- LAYANAN EKSTRA ---
  const [addInsurance, setAddInsurance] = useState(false);
  const [porterCount, setPorterCount] = useState<number>(0);
  const [tollFee, setTollFee] = useState<number>(0);

  // --- MAPBOX STATE ---
  const [routeData, setRouteData] = useState<unknown>(null); 
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);
  const [activeDraggable, setActiveDraggable] = useState<"origin" | string | null>(null);
  const [mapViewState, setMapViewState] = useState<MapViewState>({ longitude: 118.0149, latitude: -2.5489, zoom: 4.5 });

  // 1. Auth Check
  useEffect(() => {
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  // 2. Auto Geocoding
  useEffect(() => {
    const autoGeocode = async () => {
      const originParam = searchParams.get("origin");
      const destParam = searchParams.get("destination");
      if (!MAPBOX_TOKEN) return;

      if (originParam && !originCoords) {
        try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(originParam)}.json?access_token=${MAPBOX_TOKEN}&country=id&limit=1`);
          const data = await res.json();
          if (data.features?.length > 0) setOriginCoords({ lng: data.features[0].center[0], lat: data.features[0].center[1] });
        } catch (e) { console.error("Auto Geocoding origin error", e); }
      }

      if (destParam && drops.length > 0 && !drops[0].lng) {
        try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destParam)}.json?access_token=${MAPBOX_TOKEN}&country=id&limit=1`);
          const data = await res.json();
          if (data.features?.length > 0) {
            setDrops(prev => {
              const newDrops = [...prev];
              newDrops[0] = { ...newDrops[0], lng: data.features[0].center[0], lat: data.features[0].center[1] };
              return newDrops;
            });
          }
        } catch (e) { console.error("Auto Geocoding dest error", e); }
      }
    };
    autoGeocode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 3. Fetch Data Master & Finance
  useEffect(() => {
    const fetchCoreData = async () => {
      setIsFetchingData(true);
      try {
        if (user?.role === "b2b") {
          setIsB2BClient(true);
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setB2bLimit(userData.b2bLimit || 0);
            setB2bDeposit(userData.depositBalance || 0); 
          }

          const qDebt = query(collection(db, "orders"), where("userId", "==", user.uid), where("isB2BApplied", "==", true));
          const debtSnap = await getDocs(qDebt);
          let totalHutang = 0;
          debtSnap.forEach(d => {
            const oData = d.data();
            if (oData.paymentStatus !== "Lunas") totalHutang += (oData.finalGrandTotal || oData.breakdown?.grandTotal || oData.totalCost || 0);
          });
          setB2bOutstanding(totalHutang);
        }

        const [vSnap, pSnap] = await Promise.all([ getDoc(doc(db, "settings", "vehicles")), getDoc(doc(db, "settings", "pricing")) ]);

        if (vSnap.exists() && vSnap.data().motor) {
          setMotorSettings(prev => ({ ...prev, ...vSnap.data().motor }));
        }

        if (pSnap.exists()) {
          const pData = pSnap.data();
          setB2bDiscountPercent(pData.b2bDiscount || 0);
          if (pData.tarifPorter) setTarifPerPorter(pData.tarifPorter);

          if (pData.customVehicles && Array.isArray(pData.customVehicles) && pData.customVehicles.length > 0) {
            const sortedVehicles = (pData.customVehicles as DynamicVehicle[]).sort((a, b) => a.maxWeight - b.maxWeight);
            setVehicles(sortedVehicles);
            
            const paramVehicleId = searchParams.get("vehicle");
            if (paramVehicleId && paramVehicleId !== "auto") {
              const matched = sortedVehicles.find(v => v.id === paramVehicleId);
              if (matched) setSelectedVehicle(matched);
              else setSelectedVehicle(sortedVehicles[0]);
            } else {
              setSelectedVehicle(sortedVehicles[0]);
            }
          }
        }
      } catch (error) { 
        console.error("Gagal menarik data:", error); 
      } finally { 
        setIsFetchingData(false); 
      }
    };
    if (user) fetchCoreData();
  }, [user, searchParams]);

  // 4. Kalkulasi Kapasitas & Berat
  let totalWeight = 0; 
  let totalItemValue = 0; 
  drops.forEach(drop => { 
    drop.items.forEach(item => { 
      if (selectedVehicle?.isMotor) { 
        totalWeight += item.weightType === "Kecil" ? motorSettings.weightSmall : motorSettings.weightMedium; 
      } else { 
        const volumeWeight = ((Number(item.length) || 0) * (Number(item.width) || 0) * (Number(item.height) || 0)) / 6000;
        const chargeableWeight = Math.max(Number(item.weightVal) || 0, volumeWeight);
        totalWeight += chargeableWeight; 
      } 
      totalItemValue += Number(item.value) || 0; 
    }); 
  });

  useEffect(() => {
    if (vehicles.length > 0 && selectedVehicle) {
      if (totalWeight > selectedVehicle.maxWeight) {
        const suitableVehicle = vehicles.find(v => v.maxWeight >= totalWeight);
        if (suitableVehicle && suitableVehicle.id !== selectedVehicle.id) setSelectedVehicle(suitableVehicle);
      }
    }
  }, [totalWeight, vehicles, selectedVehicle]);

  const isOverweight = selectedVehicle ? totalWeight > selectedVehicle.maxWeight : false;

  // 5. Routing AI Mapbox
  useEffect(() => {
    const fetchRealRoute = async () => {
      // BUG FIX: Filter koordinat yang tidak valid agar tidak lari ke Null Island (0,0)
      const validDrops = drops.filter(d => d.lng !== undefined && d.lat !== undefined && d.lng !== 0 && d.lat !== 0);
      
      if (!originCoords || validDrops.length === 0) {
        setRouteData(null); setRouteDistanceKm(0);
        if (originCoords) setMapViewState({ longitude: originCoords.lng, latitude: originCoords.lat, zoom: 14 }); // Zoom lebih dekat ke Origin
        return;
      }
      
      const maxAllowedDrops = validDrops.slice(0, 24);
      const waypoints = [`${originCoords.lng},${originCoords.lat}`, ...maxAllowedDrops.map(d => `${d.lng},${d.lat}`)].join(";");
      
      try {
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const currentRoute = data.routes[0];
          const distanceKm = Number((currentRoute.distance / 1000).toFixed(1));
          setRouteData(currentRoute.geometry);
          setRouteDistanceKm(distanceKm);

          let midLng = originCoords.lng;
          let midLat = originCoords.lat;
          if (maxAllowedDrops.length === 1) {
            midLng = (originCoords.lng + maxAllowedDrops[0].lng!) / 2;
            midLat = (originCoords.lat + maxAllowedDrops[0].lat!) / 2;
          }

          let dynamicZoom = 4;
          if (distanceKm < 5) dynamicZoom = 12.5;
          else if (distanceKm < 20) dynamicZoom = 11;
          else if (distanceKm < 50) dynamicZoom = 10;
          else if (distanceKm < 150) dynamicZoom = 8.5;
          else if (distanceKm < 400) dynamicZoom = 7;
          else if (distanceKm < 1000) dynamicZoom = 5.5;
          
          setMapViewState({ longitude: midLng, latitude: midLat, zoom: dynamicZoom });
        }
      } catch (err) { console.error("Gagal menarik garis rute:", err); }
    };
    const timer = setTimeout(fetchRealRoute, 600);
    return () => clearTimeout(timer);
  }, [originCoords, drops]);

  // Handle Modals & Map Events
  const handleInfoClick = (title: string, text: string) => setActiveInfo({ title, text });
  const handleOriginChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setOriginData({ ...originData, [e.target.name]: e.target.value });
  
  const handleMarkerDragEnd = useCallback((lng: number, lat: number, type: "origin" | string) => {
    if (type === "origin") setOriginCoords({ lng, lat });
    else {
      const dropIndex = drops.findIndex(d => d.id === type);
      if (dropIndex !== -1) {
        const newDrops = [...drops];
        newDrops[dropIndex] = { ...newDrops[dropIndex], lng, lat };
        setDrops(newDrops);
      }
    }
  }, [drops]);

  // 6. Final Calculation
  let baseDeliveryCost = 0;
  if (selectedVehicle) { 
    const extraKm = Math.max(0, routeDistanceKm - selectedVehicle.minKm); 
    baseDeliveryCost = selectedVehicle.baseFare + (extraKm * selectedVehicle.perKm); 
  }

  let finalInsuranceCost = 0;
  if (selectedVehicle?.isMotor) {
    finalInsuranceCost = totalItemValue * ((selectedVehicle.insurancePercent || 0) / 100); 
  } else if (addInsurance) {
    finalInsuranceCost = totalItemValue * ((selectedVehicle?.insurancePercent || 0) / 100); 
  }

  const porterCost = porterCount * tarifPerPorter;
  const subTotal = baseDeliveryCost + finalInsuranceCost + porterCost + Number(tollFee);
  const b2bDiscountAmount = isB2BClient ? subTotal * (b2bDiscountPercent / 100) : 0;
  const grandTotal = subTotal - b2bDiscountAmount;

  const isDepositSufficient = isB2BClient && b2bDeposit >= grandTotal;
  const isLimitExceeded = isB2BClient && !isDepositSufficient && b2bLimit > 0 && (b2bOutstanding + grandTotal > b2bLimit);

  const formatRupiah = (val: number) => isNaN(val) ? "Rp 0" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  // ======================================================================
  // NATIVE WIZARD LOGIC
  // ======================================================================
  const stepsConfig = [
    { id: 1, title: "Armada", icon: Truck },
    { id: 2, title: "Jemput", icon: MapPin },
    { id: 3, title: "Tujuan", icon: Package },
    { id: 4, title: "Proteksi", icon: ShieldCheck }
  ];

  const handleNextStep = () => {
    setErrorMsg("");
    // Validasi Step 1: Armada
    if (currentStep === 1) {
      if (!selectedVehicle) {
        setErrorMsg("Pilih armada terlebih dahulu sebelum melanjutkan.");
        return;
      }
    }
    // Validasi Step 2: Penjemputan
    if (currentStep === 2) {
      if (!originData.address || !originData.senderName || !originData.senderPhone) {
        setErrorMsg("Lengkapi detail lokasi dan kontak pengirim.");
        return;
      }
      if (!originCoords) {
        setErrorMsg("Sistem belum mendeteksi titik koordinat. Silakan pilih alamat dari saran otomatis.");
        return;
      }
    }
    // Validasi Step 3: Tujuan
    if (currentStep === 3) {
      const isDropsValid = drops.every(d => d.address && d.receiverName && d.receiverPhone && d.items.length > 0);
      if (!isDropsValid) {
        setErrorMsg("Lengkapi semua lokasi tujuan beserta detail penerima dan barang.");
        return;
      }
      const isDropsCoordsValid = drops.every(d => d.lng && d.lat);
      if (!isDropsCoordsValid) {
        setErrorMsg("Beberapa alamat tujuan belum terdeteksi koordinatnya. Pilih dari saran alamat.");
        return;
      }
      if (isOverweight) {
        setErrorMsg(`Total berat kargo Anda melebihi kapasitas ${selectedVehicle?.name}.`);
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg("");
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!user?.uid) return;
    if (isOverweight) { setErrorMsg(`Berat berlebih untuk ${selectedVehicle?.name}.`); return; }
    if (routeDistanceKm === 0) { setErrorMsg(`Rute belum terpetakan.`); return; }
    if (isLimitExceeded) { setErrorMsg(`Plafon B2B tidak mencukupi.`); return; }
    
    setIsLoading(true); setErrorMsg("");
    
    try {
      const resiInduk = `FLG-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
      const dropsWithResi = drops.map((drop, idx) => ({ ...drop, resi: `${resiInduk}-${idx+1}` }));

      let finalStatus = "Menunggu Pembayaran";
      let finalPaymentStatus = "Belum Bayar";
      let finalPaymentMethod = "Belum Dipilih";

      if (isB2BClient) {
        if (isDepositSufficient) {
          finalStatus = "Menunggu Kurir"; finalPaymentStatus = "Lunas"; finalPaymentMethod = "Potong Saldo Deposit";
        } else {
          finalStatus = "Menunggu Kurir"; finalPaymentStatus = "Piutang B2B"; finalPaymentMethod = "Invoice / Net 30";
        }
      }

      const batch = writeBatch(db);
      const newOrderRef = doc(collection(db, "orders"));
      batch.set(newOrderRef, {
        userId: user.uid, resi: resiInduk, origin: { ...originData, ...originCoords }, destinations: dropsWithResi, 
        serviceType: selectedService, vehicleId: selectedVehicle?.id, vehicleName: selectedVehicle?.name, 
        totalWeight, totalDistance: routeDistanceKm, isB2BApplied: isB2BClient,
        breakdown: { deliveryFee: baseDeliveryCost, insuranceFee: finalInsuranceCost, porterFee: porterCost, tollFee: Number(tollFee), b2bDiscount: b2bDiscountAmount, grandTotal }, 
        status: finalStatus, paymentStatus: finalPaymentStatus, paymentMethod: finalPaymentMethod, createdAt: serverTimestamp(), porterCount 
      });

      if (isB2BClient && isDepositSufficient) {
        const userRef = doc(db, "users", user.uid);
        batch.update(userRef, { depositBalance: increment(-grandTotal) });
        const logRef = doc(collection(db, "wallet_logs"));
        batch.set(logRef, {
          entityId: user.uid, entityName: user.companyName || user.displayName || "Klien B2B", entityType: "B2B",
          type: "payment", amount: grandTotal, timestamp: serverTimestamp(), adminNote: `Pembayaran otomatis AWB #${resiInduk}`
        });
      }

      await batch.commit();
      router.push(isB2BClient ? "/dashboard" : "/pembayaran");

    } catch (error) { 
      console.error("Kesalahan sistem submit order", error); 
      setErrorMsg("Gagal memproses pesanan. Periksa koneksi Anda."); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // Kalkulasi Progress Bar
  const progressPercent = (currentStep / stepsConfig.length) * 100;
  
  // Menyiapkan titik valid agar map tidak error/crash
  const validDropsForMap: MapDropItem[] = drops
    .filter(d => d.lng !== undefined && d.lat !== undefined && d.lng !== 0)
    .map(d => ({ id: d.id, lng: d.lng as number, lat: d.lat as number, address: d.address }));

  return (
    // FULL OVERLAY (Native Push View)
    <div className="fixed inset-0 z-[150] bg-[#f8fafc] flex justify-center font-sans overflow-hidden">
      <div className="w-full max-w-md relative flex flex-col h-[100dvh] bg-[#f8fafc] shadow-2xl">
        
        {/* AMBIENT GLOW LOKAL */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-5%] left-[-10%] w-[60vw] h-[30vh] rounded-full bg-rose-200/40 blur-[100px]" />
          <div className="absolute bottom-[-5%] right-[-10%] w-[60vw] h-[30vh] rounded-full bg-amber-100/40 blur-[100px]" />
        </div>

        {/* ==============================================================
            1. APP BAR (NATIVE HEADER) & PROGRESS
            ============================================================== */}
        <div className="flex-none bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm pt-safe relative z-30">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={handlePrevStep} className="w-10 h-10 flex items-center justify-center text-slate-700 bg-slate-100 rounded-full active:scale-90 tap-highlight-transparent transition-transform">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">{stepsConfig[currentStep - 1].title}</h2>
              <p className="text-[10px] font-bold text-[#7A171D] uppercase tracking-widest">Langkah {currentStep} dari 4</p>
            </div>
            <div className="w-10 h-10"></div>
          </div>
          {/* Progress Bar Tipis */}
          <div className="w-full h-1 bg-slate-100">
            <motion.div 
              initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-[#9A242B] to-[#7A171D]"
            />
          </div>
        </div>

        {/* ERROR MESSAGE TOAST (Melayang di bawah header) */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute top-[70px] left-4 right-4 z-40">
              <div className="p-3 bg-red-50/90 backdrop-blur-md border border-red-200 text-red-700 text-xs font-bold rounded-2xl shadow-lg flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==============================================================
            2. SCROLLABLE WIZARD CONTENT
            ============================================================== */}
        <main className="flex-grow overflow-y-auto overflow-x-hidden p-4 pb-[100px] relative z-10 no-scrollbar">
          
          {/* PETA GLOBAL (SELALU MUNCUL SEBAGAI RADAR DI ATAS) */}
          <div className="w-full h-[220px] glass-card p-1.5 rounded-[2rem] relative overflow-hidden shadow-sm shrink-0 mb-6 border border-white">
            {/* Overlay Jarak */}
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white z-20 flex items-center gap-2 shadow-sm pointer-events-none">
              <div className="relative flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full relative z-10"></div>
              </div>
              <div>
                <p className="text-slate-900 text-[8px] font-black uppercase tracking-widest leading-none mb-0.5">Jarak Tempuh</p>
                <p className="text-slate-500 text-[10px] font-bold leading-none">
                  {routeDistanceKm > 0 ? `${routeDistanceKm} KM` : "Menganalisis Rute..."}
                </p>
              </div>
            </div>

            <div className="w-full h-full rounded-[1.5rem] relative overflow-hidden bg-slate-100/50">
              <MapBase
                longitude={mapViewState.longitude} 
                latitude={mapViewState.latitude}
                zoom={mapViewState.zoom}
                interactive={true}
                className="w-full h-full"
                originCoords={originCoords}
                drops={validDropsForMap} 
                routeData={routeData}
                activeDraggable={activeDraggable}
                onMarkerDragEnd={handleMarkerDragEnd}
              />
              {!originCoords && validDropsForMap.length === 0 && (
                <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-white/40 backdrop-blur-sm z-10 pointer-events-none">
                  <MapPinned className="w-8 h-8 text-[#7A171D] opacity-60 animate-bounce" />
                </div>
              )}
            </div>
          </div>

          {/* AREA FORM WIZARD */}
          <AnimatePresence mode="wait">
            
            {/* STEP 1: ARMADA */}
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="mb-6 px-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Pilih Armada</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Sesuaikan jenis kendaraan dengan volume kargo Anda.</p>
                </div>
                <div className="glass-card p-5 rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <ServiceVehicleSelector 
                    selectedService={selectedService} setSelectedService={setSelectedService}
                    vehicles={vehicles} selectedVehicle={selectedVehicle} setSelectedVehicle={setSelectedVehicle}
                    isFetchingData={isFetchingData} totalWeight={totalWeight} handleInfoClick={handleInfoClick}
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 2: PENJEMPUTAN */}
            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="mb-6 px-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Lokasi Asal</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Tentukan titik awal kurir mengambil kargo Anda.</p>
                </div>
                <div className="glass-card p-5 rounded-[2rem] border border-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <OriginForm 
                    originData={originData} setOriginData={setOriginData} setOriginCoords={setOriginCoords}
                    handleOriginChange={handleOriginChange} handleInfoClick={handleInfoClick}
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 3: TUJUAN */}
            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="mb-6 px-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tujuan & Muatan</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Masukkan alamat tujuan dan rincian spesifikasi barang.</p>
                </div>
                <DropsAccordion 
                  drops={drops} setDrops={setDrops} selectedService={selectedService} selectedVehicle={selectedVehicle}
                  motorSettings={motorSettings} activeDropId={activeDropId} setActiveDropId={setActiveDropId}
                  activeDraggable={activeDraggable} setActiveDraggable={setActiveDraggable}
                  handleInfoClick={handleInfoClick} setErrorMsg={setErrorMsg} 
                />
              </motion.div>
            )}

            {/* STEP 4: EKSTRA & RINGKASAN */}
            {currentStep === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="mb-6 px-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Proteksi & Tagihan</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Tambahkan layanan ekstra dan periksa total biaya.</p>
                </div>
                
                <ExtraServices 
                  selectedVehicle={selectedVehicle} addInsurance={addInsurance} setAddInsurance={setAddInsurance}
                  porterCount={porterCount} setPorterCount={setPorterCount} tarifPerPorter={tarifPerPorter}
                  tollFee={tollFee} setTollFee={setTollFee} handleInfoClick={handleInfoClick}
                />

                <div className="mt-6">
                  <BookingReceipt 
                    selectedVehicle={selectedVehicle} drops={drops} totalWeight={totalWeight} isOverweight={isOverweight || isLimitExceeded}
                    baseDeliveryCost={baseDeliveryCost} finalInsuranceCost={finalInsuranceCost} porterCount={porterCount}
                    porterCost={porterCost} tollFee={tollFee} isB2BClient={isB2BClient} b2bDiscountPercent={b2bDiscountPercent}
                    b2bDiscountAmount={b2bDiscountAmount} grandTotal={grandTotal} isLoading={isLoading} isFetchingData={isFetchingData}
                    formatRupiah={formatRupiah}
                  >
                    {/* B2B WARNING PANEL */}
                    {isB2BClient && (
                      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[2rem] p-5 shadow-lg relative overflow-hidden text-white mt-6 mb-2">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#C5A059] rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-3 text-[#C5A059]">
                          <ShieldAlert className="w-3.5 h-3.5"/> Corporate Info
                        </h3>
                        
                        <div className="space-y-2 text-xs font-medium">
                          <div className="flex justify-between items-center text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                            <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5"/> Saldo</span>
                            <span className="font-black">{formatRupiah(b2bDeposit)}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-400 mt-2 px-1">
                            <span>Sisa Plafon</span>
                            <span className={cn("font-bold", b2bLimit - b2bOutstanding - grandTotal < 0 ? "text-red-400" : "text-amber-400")}>
                              {formatRupiah(b2bLimit - b2bOutstanding - grandTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </BookingReceipt>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* ==============================================================
            3. ACTION BAR (FOOTER NATIVE)
            ============================================================== */}
        <div className="absolute bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)] bg-white/90 flex items-center gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handlePrevStep} 
            className="w-14 h-14 shrink-0 rounded-[1.25rem] bg-white border border-slate-200 text-slate-600 shadow-sm active:scale-90 tap-highlight-transparent"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          {currentStep < 4 ? (
            <Button 
              type="button" 
              onClick={handleNextStep} 
              className="flex-1 h-14 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white rounded-[1.25rem] font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 tap-highlight-transparent border border-[#5A0E13] text-sm"
            >
              Lanjutkan <ChevronRight className="w-5 h-5" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || isOverweight || isFetchingData || routeDistanceKm === 0}
              className="flex-1 h-14 bg-gradient-to-b from-amber-500 to-amber-600 text-white rounded-[1.25rem] font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 tap-highlight-transparent border border-amber-700 text-sm disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Konfirmasi & Pesan <CheckCircle2 className="w-5 h-5" /></>
              )}
            </Button>
          )}
        </div>

      </div>

      {/* MODAL INFO POPUP */}
      <AnimatePresence>
        {activeInfo && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveInfo(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border border-white">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-[1.25rem] flex items-center justify-center mb-5 border border-blue-100 shadow-sm">
                 <Info className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight tracking-tight">{activeInfo.title}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8">{activeInfo.text}</p>
              <Button onClick={() => setActiveInfo(null)} variant="primary" className="w-full h-12 rounded-xl text-sm">Mengerti</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function MobileBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 z-[150] fixed inset-0">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-black tracking-widest uppercase text-[10px] animate-pulse">Menyiapkan Form...</p>
      </div>
    }>
      <BookingWizardForm />
    </Suspense> 
  );
}