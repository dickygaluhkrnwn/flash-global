"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
// PERBAIKAN IMPORT: Menghapus Map dan Navigation dari lucide-react untuk mencegah konflik dengan Mapbox
import { 
  User, Phone, MapPin, 
  DollarSign, Shield, Users, 
  ArrowRight, CheckCircle, Info, PackageOpen,
  Building, GripHorizontal, Clock, Route, Car, Plus, Trash2, Upload, Minus, MapPinned, X,
  AlertCircle, LocateFixed,
  Truck,
  Globe2
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase"; 
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// --- IMPORT UI KIT KITA ---
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// ======================================================================
// PENGGUNAAN DYNAMIC IMPORT SSR: FALSE
// ======================================================================
const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-[52px] w-full bg-gray-50/80 rounded-xl border-2 border-transparent animate-pulse flex items-center px-5 text-sm text-gray-400">Loading satelit Mapbox...</div> 
});

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-[#0B0F19] animate-pulse flex flex-col items-center justify-center"><div className="w-8 h-8 border-4 border-slate-700 border-t-[#C5A059] rounded-full animate-spin mb-4"></div><p className="text-slate-500 text-xs font-semibold">Menginisialisasi Radar...</p></div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// --- INTERFACES ---
interface DeliveryItem {
  id: string;
  name: string;
  weightType: "Kecil" | "Sedang";
  dimType: "S" | "M" | "L";
  weightVal: number;
  length: number;
  width: number;
  height: number;
  value: number;
}

interface DropDestination {
  id: string;
  address: string;
  detail: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail: string;
  items: DeliveryItem[];
  lng?: number;
  lat?: number;
}

interface DynamicVehicle {
  id: string;
  name: string;
  isMotor: boolean;
  maxWeight: number;
  baseFare: number;
  minKm: number;
  perKm: number;
  insurancePercent?: number;
}

const inputRed = "focus-visible:border-brand-maroon/50 focus-visible:ring-brand-maroon/10";
const inputGold = "focus-visible:border-brand-gold/50 focus-visible:ring-brand-gold/10";

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // State Info Popup
  const [activeInfo, setActiveInfo] = useState<{ title: string; text: string } | null>(null);

  const [isB2BClient, setIsB2BClient] = useState(false);
  const [b2bDiscountPercent, setB2bDiscountPercent] = useState(0);
  
  const [tarifPerPorter, setTarifPerPorter] = useState<number>(50000);
  const [motorSettings, setMotorSettings] = useState({ weightSmall: 5, weightMedium: 20, warrantyPercent: 1.5, dimS: {p:20, l:20, t:20}, dimM: {p:40, l:40, t:40}, dimL: {p:50, l:50, t:50} });
  const [vehicles, setVehicles] = useState<DynamicVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<DynamicVehicle | null>(null);

  const [selectedService, setSelectedService] = useState<"Instan" | "Sameday">("Instan");
  const [originData, setOriginData] = useState({ address: searchParams.get("origin") || "", detail: "", senderName: user?.name || "", senderPhone: "" });
  const [originCoords, setOriginCoords] = useState<{lng: number, lat: number} | null>(null);

  const [drops, setDrops] = useState<DropDestination[]>([{
    id: `DROP-${Math.floor(1000 + Math.random() * 9000)}`, address: searchParams.get("destination") || "", detail: "", receiverName: "", receiverPhone: "", receiverEmail: "",
    items: [{ id: `ITM-1`, name: "", weightType: "Kecil", dimType: "S", weightVal: 0, length: 0, width: 0, height: 0, value: 0 }]
  }]);

  const [addInsurance, setAddInsurance] = useState(false);
  const [porterCount, setPorterCount] = useState<number>(0);
  const [tollFee, setTollFee] = useState<number>(0);

  const [routeData, setRouteData] = useState<any>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);
  const [activeDraggable, setActiveDraggable] = useState<"origin" | string | null>(null);

  // Tarik Data Konfigurasi Admin (Kendaraan & Harga)
  useEffect(() => {
    const fetchCoreData = async () => {
      setIsFetchingData(true);
      try {
        if (user?.uid) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            if (role === "b2b_client" || userDoc.data().isB2B) setIsB2BClient(true);
          }
        }
        
        const [vSnap, pSnap] = await Promise.all([ getDoc(doc(db, "settings", "vehicles")), getDoc(doc(db, "settings", "pricing")) ]);

        if (vSnap.exists()) {
          const vData = vSnap.data();
          if (vData.motor) setMotorSettings(vData.motor);
        }

        if (pSnap.exists()) {
          const pData = pSnap.data();
          setB2bDiscountPercent(pData.b2bDiscount || 0);
          if (pData.tarifPorter) setTarifPerPorter(pData.tarifPorter);

          if (pData.customVehicles && Array.isArray(pData.customVehicles) && pData.customVehicles.length > 0) {
            setVehicles(pData.customVehicles);
            setSelectedVehicle(pData.customVehicles[0]);
          } else {
            const fallbackVehicles: DynamicVehicle[] = [
              { id: "motor", name: "Armada Motor", isMotor: true, maxWeight: 20, baseFare: 12000, minKm: 3, perKm: 2500, insurancePercent: 1.5 },
              { id: "mobil", name: "Mobil MPV/Van", isMotor: false, maxWeight: 300, baseFare: 45000, minKm: 5, perKm: 4000, insurancePercent: 0.2 },
            ];
            setVehicles(fallbackVehicles);
            setSelectedVehicle(fallbackVehicles[0]);
          }
        }
      } catch (error) { console.error("Gagal menarik data:", error); } finally { setIsFetchingData(false); }
    };
    fetchCoreData();
  }, [user]);

  // ======================================================================
  // PERBAIKAN: LOGIKA MAPBOX DIRECTIONS API V5
  // ======================================================================
  useEffect(() => {
    const fetchRealRoute = async () => {
      const validDrops = drops.filter(d => d.lng !== undefined && d.lat !== undefined);
      
      if (!originCoords || validDrops.length === 0) {
        setRouteData(null);
        setRouteDistanceKm(0);
        return;
      }
      
      const waypoints = [
        `${originCoords.lng},${originCoords.lat}`,
        ...validDrops.map(d => `${d.lng},${d.lat}`)
      ].join(";");
      
      try {
        // MENGGUNAKAN DIRECTIONS API YANG STABIL UNTUK MENARIK GARIS
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const currentRoute = data.routes[0];
          setRouteData(currentRoute.geometry);
          setRouteDistanceKm(Number((currentRoute.distance / 1000).toFixed(1))); 
        }
      } catch (err) {
        console.error("Gagal menarik garis lintasan rute:", err);
      }
    };
    
    // Memberikan delay debounce agar tidak hit API Mapbox setiap kali user ngetik
    const timer = setTimeout(fetchRealRoute, 800);
    return () => clearTimeout(timer);
  }, [originCoords, drops]);

  // Lock scroll saat Modal Info Terbuka
  useEffect(() => {
    if (activeInfo) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [activeInfo]);

  const handleOriginChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setOriginData({ ...originData, [e.target.name]: e.target.value });
  
  const addDrop = () => setDrops(prev => [...prev, { id: `DROP-${Math.floor(1000 + Math.random() * 9000)}`, address: "", detail: "", receiverName: "", receiverPhone: "", receiverEmail: "", items: [{ id: `ITM-1`, name: "", weightType: "Kecil", dimType: "S", weightVal: 0, length: 0, width: 0, height: 0, value: 0 }] }]);
  const removeDrop = (index: number) => setDrops(prev => prev.filter((_, i) => i !== index));
  const updateDropField = (dIndex: number, field: keyof DropDestination, val: any) => setDrops(prev => { const newDrops = [...prev]; newDrops[dIndex] = { ...newDrops[dIndex], [field]: val }; return newDrops; });
  const updateDropFieldsMulti = (dIndex: number, updates: Partial<DropDestination>) => setDrops(prev => { const newDrops = [...prev]; newDrops[dIndex] = { ...newDrops[dIndex], ...updates }; return newDrops; });
  const addItemToDrop = (dIndex: number) => setDrops(prev => { const newDrops = [...prev]; newDrops[dIndex].items.push({ id: `ITM-${Math.floor(1000 + Math.random() * 9000)}`, name: "", weightType: "Kecil", dimType: "S", weightVal: 0, length: 0, width: 0, height: 0, value: 0 }); return newDrops; });
  const removeItemFromDrop = (dIndex: number, iIndex: number) => setDrops(prev => { const newDrops = [...prev]; if (newDrops[dIndex].items.length > 1) { newDrops[dIndex].items = newDrops[dIndex].items.filter((_, i) => i !== iIndex); } return newDrops; });
  const updateItemField = (dIndex: number, iIndex: number, field: keyof DeliveryItem, val: string | number) => setDrops(prev => { const newDrops = [...prev]; const newItems = [...newDrops[dIndex].items]; newItems[iIndex] = { ...newItems[iIndex], [field]: val }; newDrops[dIndex] = { ...newDrops[dIndex], items: newItems }; return newDrops; });

  const handleMarkerDragEnd = useCallback((lng: number, lat: number, type: "origin" | string) => {
    if (type === "origin") setOriginCoords({ lng, lat });
    else { const dropIndex = drops.findIndex(d => d.id === type); if (dropIndex !== -1) updateDropFieldsMulti(dropIndex, { lng, lat }); }
  }, [drops]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const rows = text.split("\n").filter(row => row.trim().length > 0);
        const parsedDrops = rows.slice(1).map((row, idx) => {
          const cols = row.split(",");
          return {
            id: `DROP-CSV-${Date.now()}-${idx}`,
            address: cols[0] || "",
            receiverName: cols[1] || "",
            receiverPhone: cols[2] || "",
            detail: cols[3] || "",
            receiverEmail: "",
            items: [{ id: `ITM-${Date.now()}`, name: "Paket Bulk", weightType: "Kecil", dimType: "S", weightVal: 1, length: 10, width: 10, height: 10, value: 0 }]
          };
        }) as DropDestination[];
        if (parsedDrops.length > 0) setDrops(parsedDrops);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  let totalWeight = 0; let totalItemValue = 0; let motorWarrantyTotal = 0;
  drops.forEach(drop => { drop.items.forEach(item => { if (selectedVehicle?.isMotor) { totalWeight += item.weightType === "Kecil" ? motorSettings.weightSmall : motorSettings.weightMedium; motorWarrantyTotal += item.value * (motorSettings.warrantyPercent / 100); } else { totalWeight += Number(item.weightVal) || 0; } totalItemValue += Number(item.value) || 0; }); });
  const isOverweight = selectedVehicle ? totalWeight > selectedVehicle.maxWeight : false;
  
  let baseDeliveryCost = 0;
  if (selectedVehicle) { const extraKm = Math.max(0, routeDistanceKm - selectedVehicle.minKm); baseDeliveryCost = selectedVehicle.baseFare + (extraKm * selectedVehicle.perKm); }
  let finalInsuranceCost = 0;
  if (selectedVehicle?.isMotor) { 
    finalInsuranceCost = motorWarrantyTotal; 
  } else if (addInsurance) { 
    finalInsuranceCost = totalItemValue * ((selectedVehicle?.insurancePercent || 0) / 100); 
  }

  const porterCost = porterCount * tarifPerPorter;
  const subTotal = baseDeliveryCost + finalInsuranceCost + porterCost + Number(tollFee);
  const b2bDiscountAmount = isB2BClient ? subTotal * (b2bDiscountPercent / 100) : 0;
  const grandTotal = subTotal - b2bDiscountAmount;

  const formatRupiah = (val: number) => isNaN(val) ? "Rp 0" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverweight) { setErrorMsg(`Total estimasi berat (${totalWeight} Kg) melebihi kapasitas ${selectedVehicle?.name}.`); return; }
    if (routeDistanceKm === 0) { setErrorMsg(`Rute belum ditemukan. Pastikan alamat jemput dan tujuan sudah dipilih dari daftar pencarian.`); return; }
    setIsLoading(true); setErrorMsg("");
    try {
      await addDoc(collection(db, "orders"), {
        origin: { ...originData, ...originCoords }, destinations: drops, serviceType: selectedService, vehicleId: selectedVehicle?.id, vehicleName: selectedVehicle?.name, totalWeight, totalDistance: routeDistanceKm, isB2BApplied: isB2BClient,
        breakdown: { deliveryFee: baseDeliveryCost, insuranceFee: finalInsuranceCost, porterFee: porterCost, tollFee: Number(tollFee), b2bDiscount: b2bDiscountAmount, grandTotal }, status: "Menunggu Pembayaran", createdAt: serverTimestamp(),
        porterCount 
      });
      // Navigasi Publik Bersih (Tanpa /desktop)
      router.push("/pembayaran?type=domestik");
    } catch (error) { setErrorMsg("Gagal memproses pesanan. Periksa koneksi Anda."); } finally { setIsLoading(false); }
  };

  // HELPER KOMPONEN: Wrapper Field agar label dan info popup konsisten
  const FieldWrapper = ({ label, infoTitle, infoText, children, className }: any) => (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between px-1">
        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</label>
        {infoTitle && (
          <button type="button" onClick={() => setActiveInfo({ title: infoTitle, text: infoText })} className="text-gray-400 hover:text-brand-maroon transition-colors" title={`Informasi ${label}`}>
            <Info className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <>
      <div className="w-full relative z-10 pb-20">
        
        {/* ========================================================= */}
        {/* HEADER TITLE                                              */}
        {/* ========================================================= */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 mb-10 mt-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Badge variant="default" className="mb-4 bg-brand-maroon/10 text-brand-maroon border-brand-maroon/20">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-maroon animate-pulse mr-2"></span>
              Pengiriman Terjadwal
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Pesanan <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-maroon to-brand-gold">Logistik Baru</span>
            </h1>
            <p className="text-gray-500 mt-2 text-base max-w-xl">Lengkapi detail pengiriman untuk melihat rute interaktif dan estimasi biaya secara otomatis.</p>
          </div>

          {/* BUTTON NAVIGASI QUICK ACTION (Tanpa path /desktop) */}
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <Button onClick={() => router.push("/delivery/booking")} variant="primary" size="sm" className="whitespace-nowrap shadow-md">
              <Truck className="w-4 h-4 mr-1.5"/> Pesan Kurir
            </Button>
            <Button onClick={() => router.push("/forwarding/quote")} variant="outline" size="sm" className="whitespace-nowrap border-gray-200">
              <Globe2 className="w-4 h-4 mr-1.5 text-gray-500"/> Kargo Global
            </Button>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-[1400px] mx-auto px-4 md:px-8 mb-8">
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-2xl shadow-sm flex items-start gap-3 max-w-2xl">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* LAYOUT 2 KOLOM                                            */}
        {/* ========================================================= */}
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 px-4 md:px-8 items-start">
          
          {/* KOLOM KIRI: FORM SCROLLABLE */}
          <div className="w-full lg:w-[60%] xl:w-[65%] space-y-8">
            
            <form id="booking-form" onSubmit={handleSubmit} className="space-y-8">
              
              {/* STEP 1: LAYANAN & ARMADA */}
              <Card className="shadow-premium border-gray-100">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black shadow-md">1</div>
                      <h3 className="text-xl font-bold text-gray-900">Layanan & Kendaraan</h3>
                    </div>
                    <button type="button" onClick={() => setActiveInfo({ title: "Layanan & Kendaraan", text: "Pilih kecepatan pengiriman (Instan: langsung jalan, Sameday: sortir hemat) dan tentukan jenis kendaraan sesuai kapasitas barang Anda." })} className="text-gray-400 hover:text-brand-maroon transition-colors">
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button type="button" onClick={() => setSelectedService("Instan")} className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${selectedService === "Instan" ? "border-brand-maroon bg-brand-maroon shadow-md shadow-brand-maroon/20" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={`text-lg font-black ${selectedService === "Instan" ? "text-white" : "text-gray-900"}`}>Instan</h4>
                          <Clock className={`w-5 h-5 ${selectedService === "Instan" ? "text-white/80" : "text-gray-400"}`} />
                        </div>
                        <p className={`text-sm font-medium ${selectedService === "Instan" ? "text-white/80" : "text-gray-500"}`}>Prioritas tunggal, langsung meluncur tanpa transit.</p>
                      </button>

                      <button type="button" onClick={() => setSelectedService("Sameday")} className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${selectedService === "Sameday" ? "border-brand-gold bg-brand-gold shadow-md shadow-brand-gold/20" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={`text-lg font-black ${selectedService === "Sameday" ? "text-white" : "text-gray-900"}`}>Sameday</h4>
                          <Route className={`w-5 h-5 ${selectedService === "Sameday" ? "text-white/80" : "text-gray-400"}`} />
                        </div>
                        <p className={`text-sm font-medium ${selectedService === "Sameday" ? "text-white/80" : "text-gray-500"}`}>Sistem sortir rute hemat, ideal untuk Multi-drop.</p>
                      </button>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Car className="w-4 h-4"/> Spesifikasi Armada</h4>
                      {isFetchingData ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse"></div>)}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {vehicles.map((v) => (
                            <label key={v.id} className={`group relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-4 ${selectedVehicle?.id === v.id ? (selectedService === 'Instan' ? 'border-brand-maroon bg-brand-maroon/5 shadow-md' : 'border-brand-gold bg-brand-gold/5 shadow-md') : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'}`}>
                              <input type="radio" name="vehicle" value={v.id} checked={selectedVehicle?.id === v.id} onChange={() => setSelectedVehicle(v)} className="hidden" />
                              <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-colors ${selectedVehicle?.id === v.id ? (selectedService === 'Instan' ? 'bg-brand-maroon text-white' : 'bg-brand-gold text-white') : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'}`}>
                                <Car className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <h4 className={`font-black text-sm ${selectedVehicle?.id === v.id ? (selectedService === 'Instan' ? 'text-brand-maroon' : 'text-brand-gold') : 'text-gray-900'}`}>{v.name}</h4>
                                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Maks {v.maxWeight} Kg</p>
                              </div>
                              {selectedVehicle?.id === v.id && (
                                <div className={`absolute top-4 right-4 ${selectedService === 'Instan' ? 'text-brand-maroon' : 'text-brand-gold'}`}>
                                  <CheckCircle className="w-4 h-4 fill-current text-white" />
                                </div>
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* STEP 2: TITIK JEMPUT (ORIGIN) */}
              <Card className="shadow-premium border-gray-100 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-maroon"></div>
                <CardContent className="p-8 pl-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-maroon/10 text-brand-maroon flex items-center justify-center font-black">2</div>
                      <h3 className="text-xl font-bold text-gray-900">Titik Jemput (Asal)</h3>
                    </div>
                    {originCoords && (
                      <Button 
                        type="button" 
                        variant={activeDraggable === "origin" ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setActiveDraggable(activeDraggable === "origin" ? null : "origin")}
                        className={activeDraggable === "origin" ? "animate-pulse border-none shadow-none" : "border-gray-200 text-gray-500 hover:text-brand-maroon hover:border-brand-maroon hover:bg-brand-maroon/5"}
                      >
                        <GripHorizontal className="w-3.5 h-3.5 mr-1.5" />
                        {activeDraggable === "origin" ? "Geser Pin Merah di Peta" : "Sesuaikan Titik di Peta"}
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-5">
                    
                    <FieldWrapper label="Pencarian Alamat Jemput" infoTitle="Alamat Penjemputan" infoText="Ketik nama tempat, jalan, atau gedung asal pengiriman. Sistem kami akan mencari koordinatnya secara otomatis di peta.">
                      <div className="border-2 border-transparent focus-within:border-brand-maroon/40 focus-within:ring-4 focus-within:ring-brand-maroon/10 rounded-2xl transition-all bg-gray-50/80 hover:bg-gray-50 overflow-hidden">
                        <SearchBox
                          accessToken={MAPBOX_TOKEN}
                          options={{ language: 'id', country: 'ID' }}
                          value={originData.address}
                          onRetrieve={(res) => {
                            const feature = res.features[0];
                            setOriginData({ ...originData, address: feature.properties.full_address || feature.properties.name });
                            setOriginCoords({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
                          }}
                          theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '12px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '600' } }}
                        />
                      </div>
                    </FieldWrapper>
                    
                    <FieldWrapper label="Detail Patokan" infoTitle="Detail Patokan Lokasi" infoText="Tambahkan detail yang memudahkan kurir, contoh: 'Warna cat pagar hijau, ada pohon mangga di depan'.">
                      <div className="relative">
                        <MapPin className="w-5 h-5 absolute left-4 top-[14px] text-gray-400" />
                        <textarea name="detail" value={originData.detail} onChange={handleOriginChange} rows={2} placeholder="Detail patokan alamat jemput..." className={cn("flex w-full rounded-2xl border-2 border-gray-100 bg-gray-50/80 px-4 py-3 pl-12 text-sm font-semibold placeholder:text-gray-400 focus-visible:outline-none focus-visible:bg-white transition-all resize-none shadow-sm", inputRed)} required></textarea>
                      </div>
                    </FieldWrapper>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldWrapper label="Nama Pengirim">
                        <div className="relative">
                          <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <Input name="senderName" value={originData.senderName} onChange={handleOriginChange} placeholder="Nama Pengirim" className={cn("pl-12 bg-gray-50/80 border-gray-100", inputRed)} required />
                        </div>
                      </FieldWrapper>
                      
                      <FieldWrapper label="Nomor Handphone">
                        <div className="relative">
                          <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <Input type="tel" name="senderPhone" value={originData.senderPhone} onChange={handleOriginChange} placeholder="No. HP Pengirim" className={cn("pl-12 bg-gray-50/80 border-gray-100", inputRed)} required />
                        </div>
                      </FieldWrapper>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* STEP 3: TUJUAN PENGANTARAN (DROPS) */}
              <Card className="shadow-premium border-gray-100 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-gold"></div>
                <CardContent className="p-8 pl-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center font-black">3</div>
                      <h3 className="text-xl font-bold text-gray-900">Tujuan & Paket</h3>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {selectedService === "Sameday" && (
                        <>
                          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm text-xs">
                            <Upload className="w-3.5 h-3.5 mr-1.5" /> Bulk CSV
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={addDrop} className="border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white shadow-sm text-xs">
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Rute
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    {drops.length > 1 && <div className="absolute left-4 top-10 bottom-10 w-[2px] bg-gradient-to-b from-brand-gold/40 to-transparent dashed-line z-0 hidden md:block"></div>}

                    <div className="space-y-8 relative z-10">
                      <AnimatePresence>
                        {drops.map((drop, dIndex) => (
                          <motion.div key={drop.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="relative">
                            
                            <div className="absolute -left-[45px] top-4 w-6 h-6 rounded-full bg-white border-[3px] border-brand-gold hidden md:flex items-center justify-center z-10 shadow-sm">
                              <span className="text-[9px] font-black text-brand-gold">{dIndex + 1}</span>
                            </div>

                            <div className="bg-gray-50/50 border border-gray-200/60 rounded-[1.5rem] p-6 hover:border-brand-gold/40 transition-colors shadow-sm">
                              <div className="flex justify-between items-center mb-5">
                                <h4 className="font-black text-gray-800 tracking-wide uppercase text-sm flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-brand-gold text-white flex items-center justify-center text-[10px] md:hidden">{dIndex + 1}</span>
                                  Penerima Rute {dIndex + 1}
                                </h4>
                                <div className="flex items-center gap-2">
                                  {drop.lng && drop.lat && (
                                    <Button 
                                      type="button" 
                                      variant={activeDraggable === drop.id ? "gold" : "outline"}
                                      size="sm"
                                      onClick={() => setActiveDraggable(activeDraggable === drop.id ? null : drop.id)}
                                      className={`h-8 text-[10px] ${activeDraggable === drop.id ? "animate-pulse border-none shadow-none" : "border-gray-200 text-gray-500 hover:text-brand-gold hover:border-brand-gold hover:bg-brand-gold/5"}`}
                                    >
                                      <GripHorizontal className="w-3 h-3 mr-1" />
                                      {activeDraggable === drop.id ? `Geser Pin ${dIndex + 1}...` : "Sesuaikan Titik"}
                                    </Button>
                                  )}
                                  {drops.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDrop(dIndex)} className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-5 mb-6">
                                <FieldWrapper label="Pencarian Alamat Tujuan" infoTitle="Alamat Tujuan" infoText="Pastikan alamat lengkap. Ketik perlahan dan pilih alamat yang tepat dari saran yang muncul agar koordinat akurat.">
                                  <div className="border-2 border-transparent focus-within:border-brand-gold/50 focus-within:ring-4 focus-within:ring-brand-gold/15 rounded-2xl transition-all bg-white overflow-hidden shadow-sm">
                                    <SearchBox
                                      accessToken={MAPBOX_TOKEN}
                                      options={{ language: 'id', country: 'ID' }}
                                      value={drop.address}
                                      onRetrieve={(res) => {
                                        const feature = res.features[0];
                                        updateDropFieldsMulti(dIndex, {
                                          address: feature.properties.full_address || feature.properties.name,
                                          lng: feature.geometry.coordinates[0],
                                          lat: feature.geometry.coordinates[1]
                                        });
                                      }}
                                      theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '12px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '600' } }}
                                    />
                                  </div>
                                </FieldWrapper>

                                <FieldWrapper label="Detail Patokan Tujuan">
                                  <div className="relative">
                                    <MapPin className="w-5 h-5 absolute left-4 top-[14px] text-gray-400" />
                                    <textarea value={drop.detail} onChange={(e) => updateDropField(dIndex, "detail", e.target.value)} rows={2} placeholder="Patokan lokasi drop-off (Cth: Pagar hitam)..." className={cn("flex w-full rounded-2xl border-2 border-gray-100 bg-white px-4 py-3 pl-12 text-sm font-semibold placeholder:text-gray-400 focus-visible:outline-none transition-all resize-none shadow-sm", inputGold)} required></textarea>
                                  </div>
                                </FieldWrapper>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FieldWrapper label="Nama Penerima">
                                    <div className="relative">
                                      <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                      <Input value={drop.receiverName} onChange={(e) => updateDropField(dIndex, "receiverName", e.target.value)} placeholder="Nama Penerima" className={cn("pl-12 border-gray-100 shadow-sm", inputGold)} required />
                                    </div>
                                  </FieldWrapper>
                                  <FieldWrapper label="No. Handphone Penerima">
                                    <div className="relative">
                                      <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                      <Input type="tel" value={drop.receiverPhone} onChange={(e) => updateDropField(dIndex, "receiverPhone", e.target.value)} placeholder="No. HP Penerima" className={cn("pl-12 border-gray-100 shadow-sm", inputGold)} required />
                                    </div>
                                  </FieldWrapper>
                                </div>
                              </div>

                              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                  <h5 className="text-xs font-black text-gray-800 uppercase flex items-center gap-1.5"><PackageOpen className="w-4 h-4 text-brand-gold"/> Data Paket</h5>
                                  <Button type="button" variant="outline" size="sm" onClick={() => addItemToDrop(dIndex)} className="h-8 px-3 text-[11px] text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-600 hover:border-blue-600 hover:text-white">
                                    <Plus className="w-3.5 h-3.5 mr-1.5"/> Tambah Barang
                                  </Button>
                                </div>

                                <div className="space-y-5">
                                  {drop.items.map((item, iIndex) => (
                                    <div key={item.id} className="relative bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-4">
                                      {drop.items.length > 1 && (
                                        <button type="button" onClick={() => removeItemFromDrop(dIndex, iIndex)} className="absolute right-2 top-2 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                      )}
                                      
                                      <FieldWrapper label="Deskripsi Barang" infoTitle="Deskripsi Barang" infoText="Sebutkan isi paket agar kurir bisa berhati-hati. Contoh: 'Dokumen', 'Pecah Belah', atau 'Makanan Beku'.">
                                        <Input value={item.name} onChange={(e) => updateItemField(dIndex, iIndex, "name", e.target.value)} placeholder="Contoh: Dokumen Penting" className="h-10 text-xs border-gray-200" required />
                                      </FieldWrapper>

                                      <FieldWrapper label="Dimensi, Berat & Nilai Asuransi" infoTitle="Spesifikasi & Nilai Barang" infoText="Nilai barang (Rupiah) sangat penting diisi jika Anda ingin mengaktifkan proteksi asuransi di langkah selanjutnya.">
                                        {selectedVehicle?.isMotor ? (
                                          <div className="grid grid-cols-3 gap-3">
                                            <select value={item.weightType} onChange={(e) => updateItemField(dIndex, iIndex, "weightType", e.target.value)} className="flex h-10 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:border-brand-gold/50">
                                              <option value="Kecil">Kecil (Maks {motorSettings.weightSmall}Kg)</option>
                                              <option value="Sedang">Sedang (Maks {motorSettings.weightMedium}Kg)</option>
                                            </select>
                                            <select value={item.dimType} onChange={(e) => updateItemField(dIndex, iIndex, "dimType", e.target.value)} className="flex h-10 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:border-brand-gold/50">
                                              <option value="S">Size S</option>
                                              <option value="M">Size M</option>
                                              <option value="L">Size L</option>
                                            </select>
                                            <Input type="number" value={item.value || ""} onChange={(e) => updateItemField(dIndex, iIndex, "value", Number(e.target.value))} placeholder="Nilai (Rp)" className="h-10 px-3 text-xs font-mono border-gray-200" />
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-4 gap-3">
                                            <Input type="number" value={item.weightVal || ""} onChange={(e) => updateItemField(dIndex, iIndex, "weightVal", Number(e.target.value))} placeholder="Kg" className="h-10 px-3 text-xs text-center font-bold border-gray-200" required />
                                            <div className="col-span-2 flex gap-1">
                                              <Input type="number" value={item.length || ""} onChange={(e) => updateItemField(dIndex, iIndex, "length", Number(e.target.value))} placeholder="P" className="h-10 px-2 text-xs text-center border-gray-200" />
                                              <Input type="number" value={item.width || ""} onChange={(e) => updateItemField(dIndex, iIndex, "width", Number(e.target.value))} placeholder="L" className="h-10 px-2 text-xs text-center border-gray-200" />
                                              <Input type="number" value={item.height || ""} onChange={(e) => updateItemField(dIndex, iIndex, "height", Number(e.target.value))} placeholder="T" className="h-10 px-2 text-xs text-center border-gray-200" />
                                            </div>
                                            <Input type="number" value={item.value || ""} onChange={(e) => updateItemField(dIndex, iIndex, "value", Number(e.target.value))} placeholder="Nilai (Rp)" className="h-10 px-3 text-xs font-mono border-gray-200" />
                                          </div>
                                        )}
                                      </FieldWrapper>
                                    </div>
                                  ))}
                                </div>
                              </div>

                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* STEP 4: LAYANAN TAMBAHAN (OPSIONAL) */}
              <Card className="shadow-premium border-gray-100 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800"></div>
                <CardContent className="p-8 pl-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">4</div>
                      <h3 className="text-xl font-bold text-gray-900">Layanan Tambahan</h3>
                    </div>
                    <button type="button" onClick={() => setActiveInfo({ title: "Layanan Ekstra", text: "Centang opsi asuransi untuk menggaransi paket berharga Anda. Tambahkan tenaga porter jika barang butuh banyak kuli angkut." })} className="text-gray-400 hover:text-brand-maroon transition-colors">
                      <Info className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-5">
                    {/* Asuransi & Porter Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Asuransi Box */}
                      {!selectedVehicle?.isMotor && selectedVehicle?.insurancePercent !== undefined && (
                        <div 
                          className={cn("relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-start gap-4", addInsurance ? "border-brand-gold bg-brand-gold/5 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300")}
                          onClick={() => setAddInsurance(!addInsurance)}
                        >
                          <div className="pt-0.5">
                            <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors", addInsurance ? "bg-brand-gold border-brand-gold" : "border-gray-300")}>
                              {addInsurance && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </div>
                          <div className="flex-1 z-10">
                            <h4 className={cn("font-bold text-sm", addInsurance ? "text-brand-gold" : "text-gray-900")}>Proteksi Asuransi</h4>
                            <p className="text-xs text-gray-500 mt-1">Lindungi paket dengan asuransi ({selectedVehicle.insurancePercent}%)</p>
                          </div>
                          <Shield className={cn("w-12 h-12 absolute right-4 top-1/2 -translate-y-1/2 opacity-10 transition-opacity", addInsurance ? "text-brand-gold opacity-20" : "text-gray-400")} />
                        </div>
                      )}

                      {/* Porter Box */}
                      <div className={cn("relative p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col justify-between gap-4", porterCount > 0 ? "border-brand-gold bg-brand-gold/5 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300")}>
                        <div className="flex items-start gap-4 z-10">
                          <div className="p-2 rounded-lg bg-gray-100 text-gray-500 shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className={cn("font-bold text-sm", porterCount > 0 ? "text-brand-gold" : "text-gray-900")}>Tenaga Porter</h4>
                            <p className="text-xs text-gray-500 mt-1">+Rp {tarifPerPorter.toLocaleString("id-ID")}/orang</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-1 w-fit z-10">
                          <button type="button" onClick={() => setPorterCount(Math.max(0, porterCount - 1))} className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-black w-6 text-center">{porterCount}</span>
                          <button type="button" onClick={() => setPorterCount(porterCount + 1)} className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-brand-gold hover:text-white transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <Users className={cn("w-12 h-12 absolute right-4 top-1/2 -translate-y-1/2 opacity-5 transition-opacity pointer-events-none", porterCount > 0 ? "text-brand-gold opacity-10" : "text-gray-400")} />
                      </div>
                    </div>

                    {/* Deposit Tol & Parkir */}
                    <div className="flex items-center justify-between p-5 rounded-2xl border-2 border-gray-200 bg-white focus-within:border-brand-gold focus-within:ring-4 focus-within:ring-brand-gold/10 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-gray-100 text-gray-500 shrink-0">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">Deposit Tol & Parkir</h4>
                          <p className="text-xs text-gray-500 mt-0.5">Biaya tambahan di luar rute pengiriman</p>
                        </div>
                      </div>
                      <div className="relative w-36">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rp</span>
                        <Input type="number" value={tollFee || ""} onChange={(e) => setTollFee(Number(e.target.value))} placeholder="0" className="w-full pl-9 pr-3 h-11 rounded-xl outline-none text-sm font-black text-right border-gray-200 focus-visible:border-brand-gold shadow-none" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </form>
          </div>

          {/* ========================================================= */}
          {/* KOLOM KANAN: STICKY MAP & RECEIPT UI (SEJAJAR DENGAN KIRI)*/}
          {/* ========================================================= */}
          <div className="w-full lg:w-[40%] xl:w-[35%] lg:sticky lg:top-8 space-y-6">
            
            {/* MAPBOX INTERACTIVE ROUTING PANEL */}
            <div className="bg-slate-900 rounded-[2rem] p-1.5 shadow-premium relative overflow-hidden border border-slate-800">
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 z-20 flex items-center gap-2 shadow-lg">
                <div className={`w-2 h-2 rounded-full ${activeDraggable ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className="text-white text-[9px] font-black uppercase tracking-widest">{activeDraggable ? 'Mode Geser Aktif' : 'Peta Rute Interaktif'}</span>
              </div>

              <div className="w-full h-72 md:h-80 rounded-[1.75rem] flex flex-col items-center justify-center border border-slate-800 relative overflow-hidden bg-[#0B0F19]">
                <MapBase
                  longitude={originCoords?.lng} 
                  latitude={originCoords?.lat}
                  zoom={originCoords ? 12 : undefined}
                  interactive={true}
                  className="w-full h-full"
                  originCoords={originCoords}
                  drops={drops} // Passing DROPS UTUH agar MapBase bisa mapping .lng dan .lat-nya!
                  routeData={routeData}
                  activeDraggable={activeDraggable}
                  onMarkerDragEnd={handleMarkerDragEnd}
                />

                {!originCoords && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-md z-10 pointer-events-none">
                    <MapPinned className="w-10 h-10 text-slate-500 mb-3 opacity-80" />
                    <p className="text-slate-300 text-xs font-semibold bg-black/60 px-4 py-2 rounded-full border border-slate-700 shadow-lg mt-3">Ketik lokasi jemput untuk memulai</p>
                  </div>
                )}
                <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] pointer-events-none z-10"></div>
              </div>
            </div>

            {/* DARK RECEIPT UI - COMMAND CENTER STYLE */}
            <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-[2rem] p-7 md:p-8 shadow-premium border border-slate-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500 rounded-full blur-[100px] opacity-[0.03] pointer-events-none"></div>

              {isB2BClient && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 bg-emerald-900/20 border border-emerald-500/30 p-3.5 rounded-xl flex items-start gap-3">
                  <Building className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-emerald-100 font-medium leading-relaxed">Potongan B2B otomatis aktif sebesar {b2bDiscountPercent}%.</p>
                </motion.div>
              )}

              <h3 className="text-lg font-black mb-6 flex items-center gap-3">
                Kalkulasi Final <div className="h-[2px] flex-1 bg-slate-800 rounded-full"></div>
              </h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-medium">Kendaraan Terpilih</span>
                  <span className="font-bold text-white text-xs bg-slate-800 px-2 py-1 rounded-md border border-slate-700">{selectedVehicle?.name || "-"}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-medium">Total Titik Rute</span>
                  <span className="font-bold text-white text-xs">{drops.length} Lokasi</span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={routeDistanceKm} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-between items-center p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-900/50 shadow-inner">
                    <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5"><Route className="w-3.5 h-3.5"/> Total Jarak (Dioptimalkan)</span>
                    <span className="font-black text-emerald-400 tracking-wide text-sm">{routeDistanceKm > 0 ? `${routeDistanceKm} Km` : "-"}</span>
                  </motion.div>
                </AnimatePresence>

                <div className={`flex justify-between items-center p-3.5 rounded-xl border transition-colors ${isOverweight ? 'bg-red-950/30 border-red-500/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
                  <span className={`text-xs font-bold ${isOverweight ? "text-red-400" : "text-slate-300"}`}>Estimasi Berat</span>
                  <span className={`font-black text-xs ${isOverweight ? "text-red-400" : "text-brand-gold"}`}>
                    {totalWeight} <span className="font-medium opacity-70">/ {selectedVehicle?.maxWeight} Kg</span>
                  </span>
                </div>
                
                <div className="flex justify-between items-center pt-3">
                  <span className="text-slate-400 text-sm font-medium">Tarif Dasar Rute</span>
                  <span className="font-black text-white">{formatRupiah(baseDeliveryCost)}</span>
                </div>
                
                {(finalInsuranceCost > 0 || porterCount > 0 || tollFee > 0) && (
                  <div className="pt-4 mt-4 border-t border-dashed border-slate-700/80 space-y-3">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Komponen Ekstra</p>
                    {finalInsuranceCost > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-xs">Asuransi Proteksi</span>
                        <span className="font-bold text-brand-gold text-xs">+ {formatRupiah(finalInsuranceCost)}</span>
                      </div>
                    )}
                    {porterCount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-xs">Porter ({porterCount}x)</span>
                        <span className="font-bold text-brand-gold text-xs">+ {formatRupiah(porterCost)}</span>
                      </div>
                    )}
                    {tollFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-xs">Deposit Tol & Parkir</span>
                        <span className="font-bold text-brand-gold text-xs">+ {formatRupiah(tollFee)}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {isB2BClient && b2bDiscountAmount > 0 && (
                  <div className="pt-4 mt-4 border-t border-slate-700/80">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-400 text-xs font-bold">Diskon Korporat ({b2bDiscountPercent}%)</span>
                      <span className="font-black text-emerald-400 text-xs">- {formatRupiah(b2bDiscountAmount)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-brand-gold/20 to-transparent p-5 rounded-2xl border border-brand-gold/30 mb-6 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[shimmer_3s_infinite] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-[10px] text-brand-gold font-black uppercase tracking-widest mb-1 relative z-10">Total Tagihan Final</p>
                <p className="text-3xl font-black text-white tracking-tight relative z-10">{formatRupiah(grandTotal)}</p>
              </div>

              <Button 
                type="submit" 
                form="booking-form"
                disabled={isLoading || isOverweight || isFetchingData || routeDistanceKm === 0}
                className="w-full relative overflow-hidden bg-gradient-to-r from-brand-maroon to-[#5A0E13] hover:from-[#942128] hover:to-brand-maroon text-white font-black text-sm py-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_10px_20px_rgba(122,23,29,0.3)] disabled:opacity-50 disabled:grayscale group disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                {isLoading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Memproses...</>
                ) : isOverweight ? (
                  "Kapasitas Kendaraan Penuh"
                ) : routeDistanceKm === 0 ? (
                  "Isi Titik Lokasi Dulu"
                ) : (
                  <span className="flex items-center gap-2 relative z-10">Lanjut ke Pembayaran <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" /></span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL POPUP INFORMASI (i)                                 */}
      {/* ========================================================= */}
      <AnimatePresence>
        {activeInfo && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" 
              onClick={() => setActiveInfo(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                 <Info className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">{activeInfo.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">{activeInfo.text}</p>
              <Button onClick={() => setActiveInfo(null)} className="w-full">Mengerti</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function DesktopBookingPage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-16 relative overflow-hidden selection:bg-brand-maroon selection:text-white">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-maroon rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-gold rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-overlay"></div>
      
      <Suspense fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center z-10 relative">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin mb-4 shadow-lg"></div>
          <p className="text-gray-500 font-black tracking-widest uppercase text-[10px] animate-pulse">Menyiapkan Command Center...</p>
        </div>
      }>
        <BookingForm />
      </Suspense> 
    </main>
  );
}