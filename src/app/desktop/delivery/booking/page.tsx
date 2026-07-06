"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  User, Phone, MapPin, 
  DollarSign, Shield, Users, 
  ArrowRight, CheckCircle, Navigation, 
  Plus, Trash2, Clock, Route, Car, Map, Info, PackageOpen,
  Building
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase"; 
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

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
}

interface DynamicVehicle {
  id: string;
  name: string;
  isMotor: boolean;
  maxWeight: number;
  baseFare: number;
  minKm: number;
  perKm: number;
}

// --- PREMIUM INPUT STYLES ---
const inputBase = "w-full bg-gray-50/50 hover:bg-gray-50 focus:bg-white border-2 border-transparent rounded-2xl transition-all outline-none text-gray-900 font-semibold text-sm placeholder:text-gray-400 placeholder:font-medium";
const inputRed = `${inputBase} focus:border-[#7A171D]/40 focus:ring-4 focus:ring-[#7A171D]/10`;
const inputGold = `${inputBase} focus:border-[#C5A059]/50 focus:ring-4 focus:ring-[#C5A059]/15`;

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // --- STATE CONFIG ADMIN (Hasil Fetch) ---
  const [isB2BClient, setIsB2BClient] = useState(false);
  const [b2bDiscountPercent, setB2bDiscountPercent] = useState(0);
  
  const [motorSettings, setMotorSettings] = useState({ weightSmall: 5, weightMedium: 20, warrantyPercent: 1.5, dimS: {p:20, l:20, t:20}, dimM: {p:40, l:40, t:40}, dimL: {p:50, l:50, t:50} });
  const [mobilSettings, setMobilSettings] = useState({ insurancePercent: 0.2 });
  
  const [vehicles, setVehicles] = useState<DynamicVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<DynamicVehicle | null>(null);

  // --- STATE TRANSAKSI ---
  const [selectedService, setSelectedService] = useState<"Instan" | "Sameday">("Instan");
  
  const [originData, setOriginData] = useState({
    address: searchParams.get("origin") || "",
    detail: "",
    senderName: user?.name || "",
    senderPhone: "",
  });

  // MULTI-DROP STATE (Array Penerima)
  const [drops, setDrops] = useState<DropDestination[]>([{
    id: `DROP-${Math.floor(1000 + Math.random() * 9000)}`,
    address: searchParams.get("destination") || "",
    detail: "",
    receiverName: "",
    receiverPhone: "",
    receiverEmail: "",
    items: [{ id: `ITM-1`, name: "", weightType: "Kecil", dimType: "S", weightVal: 0, length: 0, width: 0, height: 0, value: 0 }]
  }]);

  const [addInsurance, setAddInsurance] = useState(false);
  const [addPorter, setAddPorter] = useState(false);
  const [tollFee, setTollFee] = useState<number>(0);

  // --- 1. FETCH DATA ADMIN & USER ROLE SECARA PARALEL ---
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

        const [vSnap, pSnap] = await Promise.all([
          getDoc(doc(db, "settings", "vehicles")),
          getDoc(doc(db, "settings", "pricing"))
        ]);

        if (vSnap.exists()) {
          const vData = vSnap.data();
          if (vData.motor) setMotorSettings(vData.motor);
          if (vData.mobil) setMobilSettings(vData.mobil);
        }

        if (pSnap.exists()) {
          const pData = pSnap.data();
          setB2bDiscountPercent(pData.b2bDiscount || 0);

          const dynamicV: DynamicVehicle[] = [
            { id: "motor", name: "Armada Motor", isMotor: true, maxWeight: vSnap.data()?.motor?.weightMedium || 20, ...pData.motor },
            { id: "mobil", name: "Mobil (Hatchback/MPV)", isMotor: false, maxWeight: 300, ...pData.mobil },
            { id: "pickup", name: "Pickup (Bak/Box)", isMotor: false, maxWeight: 1000, ...pData.pickup },
            { id: "truk", name: "Truk (Engkel)", isMotor: false, maxWeight: 2500, ...pData.truk },
          ];
          setVehicles(dynamicV);
          setSelectedVehicle(dynamicV[0]);
        }
      } catch (error) {
        console.error("Gagal menarik core data:", error);
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchCoreData();
  }, [user]);

  // --- HANDLERS MULTI-DROP ---
  const handleOriginChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setOriginData({ ...originData, [e.target.name]: e.target.value });
  };

  const addDrop = () => {
    setDrops([...drops, {
      id: `DROP-${Math.floor(1000 + Math.random() * 9000)}`,
      address: "", detail: "", receiverName: "", receiverPhone: "", receiverEmail: "",
      items: [{ id: `ITM-1`, name: "", weightType: "Kecil", dimType: "S", weightVal: 0, length: 0, width: 0, height: 0, value: 0 }]
    }]);
  };

  const removeDrop = (index: number) => {
    if (drops.length > 1) {
      setDrops(drops.filter((_, i) => i !== index));
    }
  };

  const updateDropField = (dIndex: number, field: keyof DropDestination, val: string) => {
    const newDrops = [...drops];
    newDrops[dIndex] = { ...newDrops[dIndex], [field]: val };
    setDrops(newDrops);
  };

  const addItemToDrop = (dIndex: number) => {
    const newDrops = [...drops];
    newDrops[dIndex].items.push({ id: `ITM-${Math.floor(1000 + Math.random() * 9000)}`, name: "", weightType: "Kecil", dimType: "S", weightVal: 0, length: 0, width: 0, height: 0, value: 0 });
    setDrops(newDrops);
  };

  const removeItemFromDrop = (dIndex: number, iIndex: number) => {
    const newDrops = [...drops];
    if (newDrops[dIndex].items.length > 1) {
      newDrops[dIndex].items = newDrops[dIndex].items.filter((_, i) => i !== iIndex);
      setDrops(newDrops);
    }
  };

  const updateItemField = (dIndex: number, iIndex: number, field: keyof DeliveryItem, val: string | number) => {
    const newDrops = [...drops];
    newDrops[dIndex].items[iIndex] = { ...newDrops[dIndex].items[iIndex], [field]: val };
    setDrops(newDrops);
  };

  // --- KALKULASI PINTAR (SMART CALCULATION) ---
  let totalWeight = 0;
  let totalItemValue = 0;
  let motorWarrantyTotal = 0;

  drops.forEach(drop => {
    drop.items.forEach(item => {
      if (selectedVehicle?.isMotor) {
        totalWeight += item.weightType === "Kecil" ? motorSettings.weightSmall : motorSettings.weightMedium;
        motorWarrantyTotal += item.value * (motorSettings.warrantyPercent / 100);
      } else {
        totalWeight += Number(item.weightVal) || 0;
      }
      totalItemValue += Number(item.value) || 0;
    });
  });

  const isOverweight = selectedVehicle ? totalWeight > selectedVehicle.maxWeight : false;
  const estimatedDistance = drops.length > 0 ? 10 + ((drops.length - 1) * 5) : 0;
  
  let baseDeliveryCost = 0;
  if (selectedVehicle) {
    const extraKm = Math.max(0, estimatedDistance - selectedVehicle.minKm);
    baseDeliveryCost = selectedVehicle.baseFare + (extraKm * selectedVehicle.perKm);
  }

  let finalInsuranceCost = 0;
  if (selectedVehicle?.isMotor) {
    finalInsuranceCost = motorWarrantyTotal; 
  } else if (addInsurance) {
    finalInsuranceCost = totalItemValue * (mobilSettings.insurancePercent / 100); 
  }

  const porterCost = addPorter ? 50000 : 0;
  const subTotal = baseDeliveryCost + finalInsuranceCost + porterCost + Number(tollFee);
  
  const b2bDiscountAmount = isB2BClient ? subTotal * (b2bDiscountPercent / 100) : 0;
  const grandTotal = subTotal - b2bDiscountAmount;

  const formatRupiah = (val: number) => {
    if (isNaN(val)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  // --- SUBMIT TRANSAKSI ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverweight) {
      setErrorMsg(`Total estimasi berat (${totalWeight} Kg) melebihi kapasitas ${selectedVehicle?.name}.`);
      return;
    }
    
    setIsLoading(true);
    setErrorMsg("");

    try {
      await addDoc(collection(db, "orders"), {
        origin: originData,
        destinations: drops,
        serviceType: selectedService,
        vehicleId: selectedVehicle?.id,
        vehicleName: selectedVehicle?.name,
        totalWeight,
        totalDistance: estimatedDistance,
        isB2BApplied: isB2BClient,
        breakdown: {
          deliveryFee: baseDeliveryCost,
          insuranceFee: finalInsuranceCost,
          porterFee: porterCost,
          tollFee: Number(tollFee),
          b2bDiscount: b2bDiscountAmount,
          grandTotal
        },
        status: "Menunggu Pembayaran",
        createdAt: serverTimestamp(),
      });

      router.push("/pembayaran?type=domestik");
    } catch (error) {
      console.error("Gagal menyimpan pesanan:", error);
      setErrorMsg("Gagal memproses pesanan. Periksa koneksi Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 relative z-10 px-4 md:px-8">
      
      {/* ========================================================= */}
      {/* KOLOM KIRI: FORM INPUT UTAMA (PREMIUM UI)                 */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[65%] xl:w-[70%]">
        
        {/* Header Title */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#7A171D]/10 to-transparent border border-[#7A171D]/10 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#7A171D] animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A171D]">Pengiriman Terjadwal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Formulir <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Kurir Logistik</span>
          </h1>
          <p className="text-gray-500 mt-3 text-base md:text-lg max-w-xl leading-relaxed">
            Konfigurasi rute multi-drop Anda dengan mesin pintar kami. Pilih layanan, tentukan titik antaran, dan biarkan kami yang mengurus sisanya.
          </p>
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-8 p-5 bg-red-50/80 backdrop-blur-sm border border-red-200/60 text-red-700 text-sm font-semibold rounded-2xl shadow-sm flex items-start gap-3">
              <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form id="booking-form" onSubmit={handleSubmit} className="space-y-10">
          
          {/* STEP 1: LAYANAN & ARMADA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden relative">
            <div className="p-8 md:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7A171D] to-[#5A0E13] text-white flex items-center justify-center font-black shadow-lg shadow-[#7A171D]/20">1</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Layanan & Armada</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Tentukan kecepatan dan kapasitas kendaraan.</p>
                </div>
              </div>
              
              <div className="space-y-8">
                {/* Opsi Layanan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button type="button" onClick={() => setSelectedService("Instan")} className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${selectedService === "Instan" ? "border-[#7A171D] bg-[#7A171D]/[0.02] shadow-md shadow-[#7A171D]/5 scale-[1.02]" : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`text-lg font-black ${selectedService === "Instan" ? "text-[#7A171D]" : "text-gray-900"}`}>Instan</h4>
                      <div className={`p-2 rounded-xl ${selectedService === "Instan" ? "bg-[#7A171D]/10 text-[#7A171D]" : "bg-gray-100 text-gray-400"}`}>
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Prioritas rute tunggal. Kurir langsung meluncur ke tujuan tanpa transit.</p>
                  </button>

                  <button type="button" onClick={() => setSelectedService("Sameday")} className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${selectedService === "Sameday" ? "border-[#7A171D] bg-[#7A171D]/[0.02] shadow-md shadow-[#7A171D]/5 scale-[1.02]" : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`text-lg font-black ${selectedService === "Sameday" ? "text-[#7A171D]" : "text-gray-900"}`}>Sameday</h4>
                      <div className={`p-2 rounded-xl ${selectedService === "Sameday" ? "bg-[#7A171D]/10 text-[#7A171D]" : "bg-gray-100 text-gray-400"}`}>
                        <Route className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Sangat cocok untuk <strong className="text-gray-700">Multi-drop</strong>. Hemat biaya dengan sistem sortir rute pintar.</p>
                  </button>
                </div>

                {/* Opsi Armada */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Car className="w-4 h-4 text-gray-400"/> Pilih Kendaraan</h4>
                  {isFetchingData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {vehicles.map((v) => (
                        <label key={v.id} className={`group relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-4 ${selectedVehicle?.id === v.id ? 'border-[#C5A059] bg-[#C5A059]/[0.03] shadow-md shadow-[#C5A059]/10' : 'border-gray-100 bg-white hover:border-[#C5A059]/30 hover:shadow-sm'}`}>
                          <input type="radio" name="vehicle" value={v.id} checked={selectedVehicle?.id === v.id} onChange={() => setSelectedVehicle(v)} className="hidden" />
                          <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center transition-colors ${selectedVehicle?.id === v.id ? 'bg-[#C5A059] text-white shadow-inner' : 'bg-gray-100 text-gray-400 group-hover:bg-[#C5A059]/10 group-hover:text-[#C5A059]'}`}>
                            <Car className="w-7 h-7" />
                          </div>
                          <div className="flex-1">
                            <h4 className={`font-black text-base ${selectedVehicle?.id === v.id ? 'text-[#C5A059]' : 'text-gray-900'}`}>{v.name}</h4>
                            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Maks {v.maxWeight} Kg</p>
                          </div>
                          {selectedVehicle?.id === v.id && (
                            <div className="absolute top-4 right-4 text-[#C5A059] animate-in zoom-in">
                              <CheckCircle className="w-5 h-5 fill-current text-white" />
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* MOCKUP MAPBOX PREVIEW (PREMIUM UI) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-900 p-1.5 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgb(0,0,0,0.15)] relative group">
            <div className="absolute top-5 left-5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 z-10 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              <span className="text-white text-[10px] font-bold uppercase tracking-widest">Mapbox Live Routing</span>
            </div>
            
            <div className="w-full h-56 bg-[#0B0F19] rounded-[1.75rem] flex flex-col items-center justify-center border border-slate-800 relative overflow-hidden">
              {/* Grid Pattern Background */}
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
              
              <Map className="w-12 h-12 text-slate-700 mb-3 opacity-60 group-hover:scale-110 transition-transform duration-700" />
              <p className="text-slate-500 text-xs font-semibold tracking-wide z-10 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-800 backdrop-blur-md">Pratinjau Rute Dinamis Tersedia Saat Alamat Diisi</p>
              
              {/* Glowing Route Line Simulasi */}
              <div className="absolute w-[150%] h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent rotate-12 opacity-30 shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
            </div>
          </motion.div>

          {/* STEP 2: TITIK JEMPUT (ORIGIN) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#7A171D]"></div>
            <div className="p-8 md:p-10 pl-10 md:pl-12">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-[#7A171D]/10 text-[#7A171D] flex items-center justify-center font-black">2</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Titik Penjemputan (Asal)</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Lokasi pengambilan barang dan data pengirim.</p>
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="relative">
                  <Navigation className="w-5 h-5 absolute left-5 top-[18px] text-gray-400" />
                  <input type="text" name="address" value={originData.address} onChange={handleOriginChange} placeholder="Ketik alamat atau paste link Google Maps..." className={`${inputRed} pl-14 pr-5 py-4`} required />
                </div>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-5 top-[18px] text-gray-400" />
                  <textarea name="detail" value={originData.detail} onChange={handleOriginChange} rows={2} placeholder="Detail patokan alamat jemput (Cth: Dekat pos satpam)..." className={`${inputRed} pl-14 pr-5 py-4 resize-none`} required></textarea>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" name="senderName" value={originData.senderName} onChange={handleOriginChange} placeholder="Nama Pengirim" className={`${inputRed} pl-14 pr-5 py-4`} required />
                  </div>
                  <div className="relative">
                    <Phone className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" name="senderPhone" value={originData.senderPhone} onChange={handleOriginChange} placeholder="No. HP Pengirim Aktif" className={`${inputRed} pl-14 pr-5 py-4`} required />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* STEP 3: MULTI-DROP DESTINATIONS */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#C5A059]"></div>
            <div className="p-8 md:p-10 pl-10 md:pl-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#C5A059]/10 text-[#C5A059] flex items-center justify-center font-black">3</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Tujuan Pengantaran</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Lokasi drop-off dan rincian paket.</p>
                  </div>
                </div>
                {selectedService === "Sameday" && (
                  <button type="button" onClick={addDrop} className="text-sm font-bold text-[#C5A059] bg-[#C5A059]/10 hover:bg-[#C5A059]/20 px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all">
                    <Plus className="w-4 h-4" /> Tambah Tujuan (Multi-Drop)
                  </button>
                )}
              </div>
              
              {/* TIMELINE NODE UI UNTUK DROPS */}
              <div className="relative">
                {/* Garis vertikal timeline */}
                {drops.length > 1 && (
                  <div className="absolute left-6 top-10 bottom-10 w-[2px] bg-gradient-to-b from-[#C5A059]/50 via-[#C5A059]/20 to-transparent dashed-line z-0 hidden md:block"></div>
                )}

                <div className="space-y-10 relative z-10">
                  <AnimatePresence>
                    {drops.map((drop, dIndex) => (
                      <motion.div key={drop.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative">
                        
                        {/* Bulatan Timeline di kiri */}
                        <div className="absolute -left-[54px] top-6 w-8 h-8 rounded-full bg-white border-4 border-[#C5A059] shadow-sm hidden md:flex items-center justify-center z-10">
                          <span className="text-[10px] font-black text-[#C5A059]">{dIndex + 1}</span>
                        </div>

                        <div className="bg-gray-50/40 border border-gray-100 rounded-3xl p-6 md:p-8 hover:border-[#C5A059]/30 transition-colors shadow-sm">
                          {/* Header Drop */}
                          <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-[#C5A059] text-white flex items-center justify-center font-black text-sm shadow-md md:hidden">{dIndex + 1}</div>
                              <h4 className="font-black text-gray-900 tracking-wide uppercase text-sm">Penerima {dIndex + 1}</h4>
                            </div>
                            {drops.length > 1 && (
                              <button type="button" onClick={() => removeDrop(dIndex)} className="text-gray-400 hover:text-red-500 bg-white p-2 rounded-xl border border-gray-200 shadow-sm transition-all hover:bg-red-50 hover:border-red-200"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>

                          {/* Form Alamat Drop */}
                          <div className="space-y-4 mb-8">
                            <div className="relative">
                              <Navigation className="w-5 h-5 absolute left-5 top-[18px] text-gray-400" />
                              <input type="text" value={drop.address} onChange={(e) => updateDropField(dIndex, "address", e.target.value)} placeholder="Alamat tujuan pengantaran..." className={`${inputGold} pl-14 pr-5 py-4`} required />
                            </div>
                            <div className="relative">
                              <MapPin className="w-5 h-5 absolute left-5 top-[18px] text-gray-400" />
                              <textarea value={drop.detail} onChange={(e) => updateDropField(dIndex, "detail", e.target.value)} rows={2} placeholder="Detail patokan drop-off..." className={`${inputGold} pl-14 pr-5 py-4 resize-none`} required></textarea>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="relative">
                                <User className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" value={drop.receiverName} onChange={(e) => updateDropField(dIndex, "receiverName", e.target.value)} placeholder="Nama Penerima" className={`${inputGold} pl-14 pr-5 py-4`} required />
                              </div>
                              <div className="relative">
                                <Phone className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="tel" value={drop.receiverPhone} onChange={(e) => updateDropField(dIndex, "receiverPhone", e.target.value)} placeholder="No. HP Penerima" className={`${inputGold} pl-14 pr-5 py-4`} required />
                              </div>
                            </div>
                          </div>

                          {/* INNER CARD: Rincian Paket */}
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-200 to-gray-50"></div>
                            <div className="flex justify-between items-center mb-6">
                              <h5 className="text-sm font-black text-gray-800 uppercase flex items-center gap-2 tracking-wider"><PackageOpen className="w-4 h-4 text-[#C5A059]"/> Rincian Paket</h5>
                              <button type="button" onClick={() => addItemToDrop(dIndex)} className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"><Plus className="w-3.5 h-3.5"/> Tambah Barang</button>
                            </div>

                            <div className="space-y-6">
                              {drop.items.map((item, iIndex) => (
                                <div key={item.id} className="relative bg-gray-50/50 p-4 rounded-xl border border-gray-100 group">
                                  {drop.items.length > 1 && (
                                    <button type="button" onClick={() => removeItemFromDrop(dIndex, iIndex)} className="absolute -right-2 -top-2 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3 h-3" /></button>
                                  )}
                                  
                                  <div className="mb-4">
                                    <label className="text-xs font-bold text-gray-500 block mb-1.5 ml-1">Deskripsi Isi Paket</label>
                                    <input type="text" value={item.name} onChange={(e) => updateItemField(dIndex, iIndex, "name", e.target.value)} placeholder="Cth: Dokumen rahasia / Sparepart mobil" className={`${inputBase} bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/10 px-4 py-3`} required />
                                  </div>

                                  {/* LOGIKA BERSYARAT: MOTOR VS MOBIL */}
                                  {selectedVehicle?.isMotor ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="text-[11px] font-bold text-gray-500 block mb-1.5 ml-1">Kategori Berat</label>
                                        <select value={item.weightType} onChange={(e) => updateItemField(dIndex, iIndex, "weightType", e.target.value)} className={`${inputBase} bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/10 px-4 py-3`}>
                                          <option value="Kecil">Kecil (Maks {motorSettings.weightSmall}Kg)</option>
                                          <option value="Sedang">Sedang (Maks {motorSettings.weightMedium}Kg)</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[11px] font-bold text-gray-500 block mb-1.5 ml-1">Estimasi Dimensi</label>
                                        <select value={item.dimType} onChange={(e) => updateItemField(dIndex, iIndex, "dimType", e.target.value)} className={`${inputBase} bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500/10 px-4 py-3`}>
                                          <option value="S">Size S ({motorSettings.dimS.p}x{motorSettings.dimS.l}x{motorSettings.dimS.t}cm)</option>
                                          <option value="M">Size M ({motorSettings.dimM.p}x{motorSettings.dimM.l}x{motorSettings.dimM.t}cm)</option>
                                          <option value="L">Size L ({motorSettings.dimL.p}x{motorSettings.dimL.l}x{motorSettings.dimL.t}cm)</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[11px] font-bold text-gray-500 block mb-1.5 ml-1">Nilai Barang (Rp)</label>
                                        <input type="number" value={item.value || ""} onChange={(e) => updateItemField(dIndex, iIndex, "value", Number(e.target.value))} placeholder="0 (Opsional)" className={`${inputBase} bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500/10 px-4 py-3 font-mono`} />
                                        {item.value > 0 && (
                                          <p className="text-[10px] text-purple-600 font-bold mt-1.5 ml-1 flex items-center gap-1"><Shield className="w-3 h-3"/> Garansi: {formatRupiah(item.value * (motorSettings.warrantyPercent / 100))}</p>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                      <div>
                                        <label className="text-[11px] font-bold text-gray-500 block mb-1.5 ml-1">Berat Aktual (Kg)</label>
                                        <input type="number" value={item.weightVal || ""} onChange={(e) => updateItemField(dIndex, iIndex, "weightVal", Number(e.target.value))} placeholder="0" className={`${inputBase} bg-white border-gray-200 focus:border-amber-500 focus:ring-amber-500/10 px-4 py-3 text-center font-black`} required />
                                      </div>
                                      <div className="col-span-2">
                                        <label className="text-[11px] font-bold text-gray-500 block mb-1.5 ml-1">Dimensi Custom (P x L x T cm)</label>
                                        <div className="flex gap-2">
                                          <input type="number" value={item.length || ""} onChange={(e) => updateItemField(dIndex, iIndex, "length", Number(e.target.value))} placeholder="P" className={`${inputBase} bg-white border-gray-200 focus:border-amber-500 focus:ring-amber-500/10 px-2 py-3 text-center font-mono`} />
                                          <input type="number" value={item.width || ""} onChange={(e) => updateItemField(dIndex, iIndex, "width", Number(e.target.value))} placeholder="L" className={`${inputBase} bg-white border-gray-200 focus:border-amber-500 focus:ring-amber-500/10 px-2 py-3 text-center font-mono`} />
                                          <input type="number" value={item.height || ""} onChange={(e) => updateItemField(dIndex, iIndex, "height", Number(e.target.value))} placeholder="T" className={`${inputBase} bg-white border-gray-200 focus:border-amber-500 focus:ring-amber-500/10 px-2 py-3 text-center font-mono`} />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[11px] font-bold text-gray-500 block mb-1.5 ml-1">Nilai Barang (Rp)</label>
                                        <input type="number" value={item.value || ""} onChange={(e) => updateItemField(dIndex, iIndex, "value", Number(e.target.value))} placeholder="0 (Opsional)" className={`${inputBase} bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500/10 px-4 py-3 font-mono`} />
                                      </div>
                                    </div>
                                  )}
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
            </div>
          </motion.div>

          {/* OPSI TAMBAHAN GLOBAL */}
          <div className="space-y-4 pt-6">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest pl-2 mb-4">Opsi Layanan Ekstra</h4>
            
            {!selectedVehicle?.isMotor && (
              <label className={`group flex items-center gap-5 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${addInsurance ? 'border-[#C5A059] bg-[#C5A059]/5 shadow-md shadow-[#C5A059]/5' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}>
                <input type="checkbox" checked={addInsurance} onChange={() => setAddInsurance(!addInsurance)} className="w-5 h-5 accent-[#C5A059] rounded" />
                <div className="flex-1 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl transition-colors ${addInsurance ? 'bg-[#C5A059] text-white' : 'bg-gray-100 text-gray-400 group-hover:text-gray-600'}`}>
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`text-base font-bold transition-colors ${addInsurance ? 'text-[#C5A059]' : 'text-gray-900'}`}>Proteksi Asuransi Pengiriman ({mobilSettings.insurancePercent}%)</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Asuransi otomatis dikalkulasi dari total nilai seluruh barang Anda.</p>
                    </div>
                  </div>
                </div>
              </label>
            )}

            <label className={`group flex items-center gap-5 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${addPorter ? 'border-[#C5A059] bg-[#C5A059]/5 shadow-md shadow-[#C5A059]/5' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}>
              <input type="checkbox" checked={addPorter} onChange={() => setAddPorter(!addPorter)} className="w-5 h-5 accent-[#C5A059] rounded" />
              <div className="flex-1 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl transition-colors ${addPorter ? 'bg-[#C5A059] text-white' : 'bg-gray-100 text-gray-400 group-hover:text-gray-600'}`}>
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className={`text-base font-bold transition-colors ${addPorter ? 'text-[#C5A059]' : 'text-gray-900'}`}>Tenaga Bantuan Angkut (Porter)</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Sopir membantu bongkar muat barang hingga ke dalam gedung/rumah.</p>
                  </div>
                </div>
                <span className="font-black text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg">+Rp 50K</span>
              </div>
            </label>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border-2 border-gray-200 bg-white focus-within:border-[#C5A059] focus-within:shadow-md focus-within:shadow-[#C5A059]/5 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-gray-100 text-gray-400">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">Uang Tol / Parkir Gedung</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Berikan saldo deposit jalan untuk kurir (Opsional).</p>
                </div>
              </div>
              <div className="relative w-full md:w-48">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Rp</span>
                <input type="number" value={tollFee || ""} onChange={(e) => setTollFee(Number(e.target.value))} placeholder="0" className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-100 outline-none text-base font-black text-right bg-gray-50 hover:bg-gray-100 focus:bg-white focus:border-[#C5A059] transition-all" />
              </div>
            </div>

          </div>

        </form>
      </div>

      {/* ========================================================= */}
      {/* KOLOM KANAN: RINGKASAN SMART CALCULATION (DARK RECEIPT UI)*/}
      {/* ========================================================= */}
      <div className="w-full lg:w-[35%] xl:w-[30%]">
        <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_50px_rgb(0,0,0,0.2)] sticky top-28 border border-slate-800 relative overflow-hidden">
          
          {/* Aksen Emas di background */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

          {isB2BClient && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 bg-gradient-to-r from-emerald-900/40 to-emerald-900/10 border border-emerald-500/30 p-4 rounded-2xl flex items-start gap-3 shadow-inner">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-100 font-medium leading-relaxed"><strong className="text-emerald-400 block mb-0.5 text-xs uppercase tracking-wider">Corporate Mode</strong> Akun B2B aktif. Anda mendapatkan potongan grosir otomatis sebesar {b2bDiscountPercent}%.</p>
            </motion.div>
          )}

          <h3 className="text-xl font-black mb-8 flex items-center gap-3">
            Ringkasan Biaya <div className="h-1 flex-1 bg-slate-800 rounded-full"></div>
          </h3>
          
          <div className="space-y-5 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-medium">Jenis Armada</span>
              <span className="font-bold text-white bg-slate-800 px-3 py-1 rounded-lg text-xs tracking-wide">{selectedVehicle?.name || "-"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-medium">Total Titik Rute</span>
              <span className="font-bold text-white">{drops.length} Lokasi</span>
            </div>

            <div className={`flex justify-between items-center p-4 rounded-2xl border transition-colors ${isOverweight ? 'bg-red-950/30 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'bg-slate-800/50 border-slate-700/50'}`}>
              <span className={`text-sm font-bold ${isOverweight ? "text-red-400" : "text-slate-300"}`}>Estimasi Berat</span>
              <span className={`font-black tracking-wide ${isOverweight ? "text-red-400" : "text-[#C5A059]"}`}>
                {totalWeight} <span className="text-xs font-semibold opacity-70">/ {selectedVehicle?.maxWeight} Kg</span>
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-400 text-sm font-medium">Tarif Dasar Rute</span>
              <span className="font-black text-white">{formatRupiah(baseDeliveryCost)}</span>
            </div>
            
            {(finalInsuranceCost > 0 || addPorter || tollFee > 0) && (
              <div className="pt-5 mt-5 border-t border-dashed border-slate-700/80 space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Komponen Ekstra</p>
                {finalInsuranceCost > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Asuransi Proteksi</span>
                    <span className="font-bold text-emerald-400">+ {formatRupiah(finalInsuranceCost)}</span>
                  </div>
                )}
                {addPorter && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Tenaga Angkut</span>
                    <span className="font-bold text-emerald-400">+ {formatRupiah(porterCost)}</span>
                  </div>
                )}
                {tollFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Tol & Parkir</span>
                    <span className="font-bold text-emerald-400">+ {formatRupiah(tollFee)}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Baris Diskon B2B */}
            {isB2BClient && b2bDiscountAmount > 0 && (
              <div className="pt-5 mt-5 border-t border-slate-700/80">
                <div className="flex justify-between items-center bg-emerald-950/20 p-3 -mx-3 rounded-xl border border-emerald-900/30">
                  <span className="text-emerald-400 text-sm font-bold flex items-center gap-1.5"><Building className="w-4 h-4"/> Diskon B2B ({b2bDiscountPercent}%)</span>
                  <span className="font-black text-emerald-400">- {formatRupiah(b2bDiscountAmount)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-[#C5A059]/20 to-transparent p-6 rounded-2xl border border-[#C5A059]/30 mb-8 backdrop-blur-sm">
            <p className="text-[11px] text-[#C5A059] font-black uppercase tracking-widest mb-1.5">Total Tagihan Final</p>
            <p className="text-4xl font-black text-white tracking-tight">{formatRupiah(grandTotal)}</p>
          </div>

          <button 
            type="submit" 
            form="booking-form"
            disabled={isLoading || isOverweight || isFetchingData}
            className="w-full relative overflow-hidden bg-gradient-to-r from-[#7A171D] to-[#5A0E13] hover:from-[#942128] hover:to-[#7A171D] text-white font-black text-base py-5 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_10px_20px_rgba(122,23,29,0.3)] disabled:opacity-50 group disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            
            {isLoading ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Memproses...</>
            ) : isOverweight ? (
              "Kapasitas Melebihi Batas"
            ) : (
              <span className="flex items-center gap-2 relative z-10">Bayar Pesanan <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" /></span>
            )}
          </button>
          
          <p className="text-center text-[10px] text-slate-500 font-medium mt-5 flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3"/> Pembayaran diproses dengan aman & terenkripsi
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DesktopBookingPage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] py-16 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-overlay"></div>
      
      <Suspense fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center z-10 relative">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#C5A059] rounded-full animate-spin mb-5 shadow-lg shadow-[#C5A059]/20"></div>
          <p className="text-gray-600 font-black tracking-widest uppercase text-xs animate-pulse">Inisialisasi Sistem Logistik...</p>
        </div>
      }>
        <BookingForm />
      </Suspense>
    </main>
  );
}