"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  User, Phone, Mail, MapPin, Box, 
  DollarSign, Truck, Shield, Users, 
  ArrowRight, CheckCircle, Navigation, 
  HelpCircle, Plus, Trash2, Info, Clock, Route, Car, ArrowDown
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase"; 
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// --- INTERFACES ---
interface DeliveryItem {
  id: string;
  name: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  value: number;
}

interface Vehicle {
  id: string;
  name: string;
  maxWeight: number;
  price: number;
  iconStr: string;
}

const FALLBACK_VEHICLES: Vehicle[] = [
  { id: "motor", name: "Motor Kurir", maxWeight: 20, price: 35000, iconStr: "motor" },
  { id: "blind-van", name: "Mobil Blind Van", maxWeight: 500, price: 150000, iconStr: "van" },
  { id: "engkel", name: "Truk Engkel (CDE)", maxWeight: 2000, price: 450000, iconStr: "truck" },
];

// Reusable Input Style untuk UI yang lebih tegas dan profesional
const inputStyle = "w-full rounded-xl border-2 border-gray-200 bg-white outline-none text-gray-900 shadow-sm transition-all placeholder:text-gray-400 placeholder:font-normal font-semibold focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10";
const inputStyleGold = "w-full rounded-xl border-2 border-gray-200 bg-white outline-none text-gray-900 shadow-sm transition-all placeholder:text-gray-400 placeholder:font-normal font-semibold focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10";

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingVehicles, setIsFetchingVehicles] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // --- STATE 1: LAYANAN & ARMADA ---
  const [selectedService, setSelectedService] = useState<"Instan" | "Sameday">("Instan");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // --- STATE 2: LOKASI & KONTAK ---
  const [locationData, setLocationData] = useState({
    origin: searchParams.get("origin") || "",
    originDetail: "",
    destination: searchParams.get("destination") || "",
    destDetail: "",
    senderName: user?.name || "",
    senderPhone: "",
    receiverName: "",
    receiverPhone: "",
    receiverEmail: "",
  });

  const [debouncedOrigin, setDebouncedOrigin] = useState(locationData.origin);
  const [debouncedDestination, setDebouncedDestination] = useState(locationData.destination);

  // --- STATE 3: MULTI-ITEM & BIAYA EKSTRA ---
  const [items, setItems] = useState<DeliveryItem[]>([
    { id: `ITM-${Math.floor(1000 + Math.random() * 9000)}`, name: "", weight: Number(searchParams.get("weight")) || 0, length: 0, width: 0, height: 0, value: 0 }
  ]);
  
  const [addInsurance, setAddInsurance] = useState(false);
  const [addPorter, setAddPorter] = useState(false);
  const [tollFee, setTollFee] = useState<number>(0);

  // --- EFFECTS ---

  // 1. Fetch Armada Dinamis
  useEffect(() => {
    const fetchVehicles = async () => {
      setIsFetchingVehicles(true);
      try {
        const querySnapshot = await getDocs(collection(db, "vehicles"));
        if (!querySnapshot.empty) {
          const vData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
          setVehicles(vData);
          setSelectedVehicle(vData[0]);
        } else {
          setVehicles(FALLBACK_VEHICLES);
          setSelectedVehicle(FALLBACK_VEHICLES[0]);
        }
      } catch (error) {
        console.error("Gagal menarik data armada:", error);
        setVehicles(FALLBACK_VEHICLES);
        setSelectedVehicle(FALLBACK_VEHICLES[0]);
      } finally {
        setIsFetchingVehicles(false);
      }
    };
    fetchVehicles();
  }, []);

  // 2. Debounce Peta
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOrigin(locationData.origin);
      setDebouncedDestination(locationData.destination);
    }, 1000); 
    return () => clearTimeout(timer);
  }, [locationData.origin, locationData.destination]);

  // --- HANDLERS ---
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocationData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: keyof DeliveryItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { 
      id: `ITM-${Math.floor(1000 + Math.random() * 9000)}`, 
      name: "", weight: 0, length: 0, width: 0, height: 0, value: 0 
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // --- KALKULASI & VALIDASI ---
  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight), 0);
  const isOverweight = selectedVehicle ? totalWeight > selectedVehicle.maxWeight : false;

  const baseVehiclePrice = selectedVehicle?.price || 0;
  const insuranceCost = addInsurance ? 25000 : 0;
  const porterCost = addPorter ? 50000 : 0;
  const totalCost = baseVehiclePrice + insuranceCost + porterCost + Number(tollFee);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverweight) {
      setErrorMsg(`Total berat (${totalWeight} Kg) melebihi kapasitas ${selectedVehicle?.name} (${selectedVehicle?.maxWeight} Kg). Silakan kurangi barang atau ganti armada.`);
      return;
    }
    
    setIsLoading(true);
    setErrorMsg("");

    try {
      await addDoc(collection(db, "orders"), {
        ...locationData,
        email: user?.email || "guest@flashglobal.com",
        serviceType: selectedService,
        selectedVehicle: selectedVehicle?.name,
        items: items,
        totalWeight: totalWeight,
        addInsurance,
        addPorter,
        tollFee: Number(tollFee),
        totalCost,
        status: "Menunggu Pembayaran",
        createdAt: serverTimestamp(),
      });

      router.push("/pembayaran?type=domestik");
    } catch (error) {
      console.error("Gagal menyimpan pesanan:", error);
      setErrorMsg("Gagal memproses pesanan. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER MAP ---
  const renderMapPreview = (value: string, type: "origin" | "destination") => {
    if (!value || value.length < 5) return null;
    const isLink = value.includes("http") || value.includes("maps.app");
    const borderColor = type === "origin" ? "border-emerald-200" : "border-amber-200";
    const bgColor = type === "origin" ? "bg-emerald-50" : "bg-amber-50";
    const iconColor = type === "origin" ? "text-emerald-600" : "text-amber-600";

    if (isLink) {
      return (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 p-4 ${bgColor} border-2 ${borderColor} rounded-xl flex items-start gap-3 shadow-sm`}>
          <MapPin className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
          <div className="text-xs">
            <p className="font-bold text-gray-900 mb-0.5">Tautan Koordinat Peta Terdeteksi</p>
            <p className="text-gray-600 truncate max-w-[250px]">{value}</p>
            <p className={`mt-1 font-semibold ${iconColor}`}>Kurir akan menggunakan tautan ini sebagai navigasi.</p>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={`mt-3 w-full h-48 rounded-xl overflow-hidden border-2 ${borderColor} shadow-sm relative bg-gray-100`}>
        <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${encodeURIComponent(value)}&output=embed`} allowFullScreen></iframe>
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 relative z-10">
      
      {/* Kolom Kiri: Form Input Utama */}
      <div className="w-full lg:w-2/3">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#7A171D] bg-[#7A171D]/5 px-4 py-2 rounded-full border border-[#7A171D]/10 inline-block mb-3">
            Delivery Domestik
          </span>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Formulir Pesanan Kurir</h1>
          <p className="text-gray-500 mt-2 text-sm">Lengkapi detail pengiriman, sortir barang, dan pilih armada sesuai kebutuhan Anda.</p>
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-2xl shadow-sm">
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <form id="booking-form" onSubmit={handleSubmit} className="space-y-8">
          
          {/* STEP 1: LAYANAN & ARMADA */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <Route className="w-5 h-5 text-[#7A171D]" /> 1. Pilih Layanan & Armada
            </h3>
            
            <div className="space-y-6">
              {/* Opsi Layanan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button type="button" onClick={() => setSelectedService("Instan")} className={`p-4 rounded-xl border-2 text-left transition-all ${selectedService === "Instan" ? "border-[#7A171D] bg-[#7A171D]/5 shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"}`}>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-bold ${selectedService === "Instan" ? "text-[#7A171D]" : "text-gray-900"}`}>Instan</h4>
                    <Clock className={`w-4 h-4 ${selectedService === "Instan" ? "text-[#7A171D]" : "text-gray-400"}`} />
                  </div>
                  <p className="text-xs text-gray-500">1-3 Jam Tiba. Langsung ke tujuan.</p>
                </button>

                <button type="button" onClick={() => setSelectedService("Sameday")} className={`p-4 rounded-xl border-2 text-left transition-all ${selectedService === "Sameday" ? "border-[#7A171D] bg-[#7A171D]/5 shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"}`}>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-bold ${selectedService === "Sameday" ? "text-[#7A171D]" : "text-gray-900"}`}>Sameday</h4>
                    <Box className={`w-4 h-4 ${selectedService === "Sameday" ? "text-[#7A171D]" : "text-gray-400"}`} />
                  </div>
                  <p className="text-xs text-gray-500">Maks 8 Jam. Multi-drop & sortir rute.</p>
                </button>

                <button type="button" disabled className="p-4 rounded-xl border-2 border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed text-left relative overflow-hidden">
                  <div className="absolute -right-6 top-2 bg-slate-800 text-white text-[9px] font-bold px-6 py-0.5 rotate-45">MAINTENANCE</div>
                  <h4 className="font-bold text-gray-500 mb-1">Reguler / Kargo</h4>
                  <p className="text-xs text-gray-400">Antarkota. Gudang sedang direnovasi.</p>
                </button>
              </div>

              {/* Opsi Armada */}
              {isFetchingVehicles ? (
                <div className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {vehicles.map((v) => (
                    <label key={v.id} className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedVehicle?.id === v.id ? 'border-[#C5A059] bg-[#C5A059]/5 shadow-sm' : 'border-gray-100 bg-white hover:border-[#C5A059]/50'}`}>
                      <input type="radio" name="vehicle" value={v.id} checked={selectedVehicle?.id === v.id} onChange={() => setSelectedVehicle(v)} className="hidden" />
                      {selectedVehicle?.id === v.id && (
                        <div className="absolute top-3 right-3 text-[#C5A059]">
                          <CheckCircle className="w-5 h-5 fill-current text-white" />
                        </div>
                      )}
                      <Car className={`w-8 h-8 mb-3 ${selectedVehicle?.id === v.id ? 'text-[#C5A059]' : 'text-gray-400'}`} />
                      <h4 className={`font-bold text-sm ${selectedVehicle?.id === v.id ? 'text-[#C5A059]' : 'text-gray-900'}`}>{v.name}</h4>
                      <p className="text-xs text-gray-500 font-medium mt-1">Kapasitas: Maks {v.maxWeight} Kg</p>
                      <p className="text-sm font-black text-gray-900 mt-3">{formatRupiah(v.price)}</p>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* STEP 2: LOKASI & KONTAK */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <MapPin className="w-5 h-5 text-[#C5A059]" /> 2. Rute & Detail Kontak
            </h3>
            
            <div className="space-y-4">

              {/* Titik Jemput (Asal) Card */}
              <div className="p-5 md:p-6 bg-slate-50/50 border border-gray-200 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#7A171D]/10 flex items-center justify-center text-[#7A171D] shrink-0 border border-[#7A171D]/20">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Titik Penjemputan (Asal)</h4>
                      <p className="text-xs text-gray-500">Detail lokasi dan data pengirim</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button type="button" onMouseEnter={() => setActiveTooltip("origin")} onMouseLeave={() => setActiveTooltip(null)} className="text-gray-400 hover:text-[#7A171D] transition-colors p-1 bg-white rounded-full border border-gray-200 shadow-sm">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {activeTooltip === "origin" && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 bottom-8 w-64 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 leading-relaxed border border-slate-800">
                          <strong>Fitur Smart Map:</strong> Ketik alamat atau paste link Google Maps. Sistem akan menampilkan pratinjau peta otomatis.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Navigation className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
                    <input type="text" name="origin" value={locationData.origin} onChange={handleLocationChange} placeholder="Ketik alamat atau paste link Google Maps..." className={`${inputStyle} pl-11 pr-4 py-3.5`} required />
                  </div>
                  {renderMapPreview(debouncedOrigin, "origin")}
                  
                  <textarea name="originDetail" onChange={handleLocationChange} rows={2} placeholder="Detail patokan alamat jemput (Cth: Dekat pos satpam, pagar hitam)..." className={`${inputStyle} px-4 py-3 resize-none text-sm`} required></textarea>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" name="senderName" value={locationData.senderName} onChange={handleLocationChange} placeholder="Nama Pengirim" className={`${inputStyle} pl-11 pr-3 py-3 text-sm`} required />
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="tel" name="senderPhone" onChange={handleLocationChange} placeholder="No. HP Pengirim" className={`${inputStyle} pl-11 pr-3 py-3 text-sm`} required />
                    </div>
                  </div>
                </div>
              </div>

              {/* Panah Pemisah yang Elegan */}
              <div className="flex justify-center -my-3 relative z-10 pointer-events-none">
                <div className="w-10 h-10 bg-white border-2 border-gray-100 rounded-full flex items-center justify-center shadow-sm text-gray-400">
                  <ArrowDown className="w-5 h-5" />
                </div>
              </div>

              {/* Titik Tujuan (Tujuan) Card */}
              <div className="p-5 md:p-6 bg-slate-50/50 border border-gray-200 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] shrink-0 border border-[#C5A059]/20">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Titik Pengantaran (Tujuan)</h4>
                      <p className="text-xs text-gray-500">Detail lokasi dan data penerima</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Navigation className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
                    <input type="text" name="destination" value={locationData.destination} onChange={handleLocationChange} placeholder="Ketik alamat tujuan pengantaran..." className={`${inputStyleGold} pl-11 pr-4 py-3.5`} required />
                  </div>
                  {renderMapPreview(debouncedDestination, "destination")}
                  
                  <textarea name="destDetail" onChange={handleLocationChange} rows={2} placeholder="Detail patokan drop-off..." className={`${inputStyleGold} px-4 py-3 resize-none text-sm`} required></textarea>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" name="receiverName" onChange={handleLocationChange} placeholder="Nama Penerima" className={`${inputStyleGold} pl-11 pr-3 py-3 text-sm`} required />
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="tel" name="receiverPhone" onChange={handleLocationChange} placeholder="No. HP Penerima" className={`${inputStyleGold} pl-11 pr-3 py-3 text-sm`} required />
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="email" name="receiverEmail" onChange={handleLocationChange} placeholder="Email (Opsional)" className={`${inputStyleGold} pl-11 pr-3 py-3 text-sm`} />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>

          {/* STEP 3: SORTIR BARANG & ADD-ONS */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5">
            <div className="flex justify-between items-center border-b pb-4 border-gray-100 mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Box className="w-5 h-5 text-[#7A171D]" /> 3. Daftar Barang
              </h3>
              <button type="button" onClick={addItem} className="text-xs font-bold text-[#7A171D] bg-[#7A171D]/10 hover:bg-[#7A171D]/20 border border-[#7A171D]/20 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Tambah Barang
              </button>
            </div>
            
            <div className="space-y-5 mb-8">
              <AnimatePresence>
                {items.map((item, index) => (
                  <motion.div key={item.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-5 sm:p-6 border border-gray-200 rounded-2xl bg-gray-50/50 relative shadow-sm group">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="absolute top-5 right-5 text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-gray-900 text-white text-[10px] font-mono px-2 py-1 rounded tracking-widest shadow-sm">{item.id}</span>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Barang {index + 1}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-4 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700">Nama / Deskripsi Barang</label>
                        <input type="text" value={item.name} onChange={(e) => handleItemChange(index, "name", e.target.value)} placeholder="Cth: Dokumen / Sparepart" className={`${inputStyle} px-4 py-3 text-sm`} required />
                      </div>
                      
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700">Berat (Kg)</label>
                        <input type="number" value={item.weight || ""} onChange={(e) => handleItemChange(index, "weight", Number(e.target.value))} placeholder="0" className={`${inputStyle} px-3 py-3 text-sm text-center font-bold`} required />
                      </div>

                      <div className="md:col-span-3 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700">P x L x T (cm)</label>
                        <div className="flex gap-2">
                          <input type="number" value={item.length || ""} onChange={(e) => handleItemChange(index, "length", Number(e.target.value))} placeholder="P" className={`${inputStyle} px-2 py-3 text-xs text-center`} />
                          <input type="number" value={item.width || ""} onChange={(e) => handleItemChange(index, "width", Number(e.target.value))} placeholder="L" className={`${inputStyle} px-2 py-3 text-xs text-center`} />
                          <input type="number" value={item.height || ""} onChange={(e) => handleItemChange(index, "height", Number(e.target.value))} placeholder="T" className={`${inputStyle} px-2 py-3 text-xs text-center`} />
                        </div>
                      </div>

                      <div className="md:col-span-3 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700">Nilai (Rp) Asuransi</label>
                        <input type="number" value={item.value || ""} onChange={(e) => handleItemChange(index, "value", Number(e.target.value))} placeholder="Opsional" className={`${inputStyle} px-4 py-3 text-sm`} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-900 mb-3 border-t pt-5 border-gray-100">Biaya Tambahan (Opsional)</h4>
              
              <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all shadow-sm ${addInsurance ? 'border-[#C5A059] bg-[#C5A059]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input type="checkbox" checked={addInsurance} onChange={() => setAddInsurance(!addInsurance)} className="w-5 h-5 accent-[#C5A059] rounded" />
                <div className="flex-1 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Shield className={`w-5 h-5 ${addInsurance ? 'text-[#C5A059]' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Proteksi Asuransi Pengiriman</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Jaminan ganti rugi kerusakan/kehilangan hingga Rp 10 Juta.</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">+Rp 25.000</span>
                </div>
              </label>

              <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all shadow-sm ${addPorter ? 'border-[#C5A059] bg-[#C5A059]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input type="checkbox" checked={addPorter} onChange={() => setAddPorter(!addPorter)} className="w-5 h-5 accent-[#C5A059] rounded" />
                <div className="flex-1 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Users className={`w-5 h-5 ${addPorter ? 'text-[#C5A059]' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Tenaga Bantuan Angkut (Porter)</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Bantuan menaikkan dan menurunkan barang dari armada.</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">+Rp 50.000</span>
                </div>
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border-2 border-gray-200 bg-white focus-within:border-[#C5A059] focus-within:ring-4 focus-within:ring-[#C5A059]/10 transition-all shadow-sm">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">Uang Tol / Parkir Gedung</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Berikan saldo jika rute melintasi tol/gedung berbayar.</p>
                  </div>
                </div>
                <div className="relative w-full sm:w-40">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rp</span>
                  <input type="number" value={tollFee || ""} onChange={(e) => setTollFee(Number(e.target.value))} placeholder="0" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm font-bold text-right bg-gray-50 focus:bg-white focus:border-[#C5A059] transition-colors" />
                </div>
              </div>

            </div>
          </motion.div>
        </form>
      </div>

      {/* Kolom Kanan: Summary */}
      <div className="w-full lg:w-1/3">
        <div className="bg-[#111] text-white rounded-3xl p-6 md:p-8 shadow-2xl sticky top-28">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-gray-800 pb-4">
            Ringkasan Pesanan
          </h3>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Armada</span>
              <span className="font-bold text-right">{selectedVehicle?.name || "-"}</span>
            </div>

            <div className={`flex justify-between items-center text-sm p-3 rounded-xl border ${isOverweight ? 'bg-red-900/30 border-red-500/50' : 'bg-gray-800/50 border-gray-800'}`}>
              <span className={isOverweight ? "text-red-300 font-bold" : "text-gray-400"}>Total Berat</span>
              <span className={`font-bold ${isOverweight ? "text-red-400" : "text-white"}`}>
                {totalWeight} Kg <span className="text-xs text-gray-500 font-normal">/ {selectedVehicle?.maxWeight} Kg</span>
              </span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Tarif Dasar</span>
              <span className="font-bold">{formatRupiah(baseVehiclePrice)}</span>
            </div>
            
            {(addInsurance || addPorter || tollFee > 0) && (
              <div className="pt-4 mt-4 border-t border-dashed border-gray-800 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase">Biaya Tambahan</p>
                {addInsurance && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Asuransi</span>
                    <span className="font-bold text-[#C5A059]">+ {formatRupiah(insuranceCost)}</span>
                  </div>
                )}
                {addPorter && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Tenaga Angkut</span>
                    <span className="font-bold text-[#C5A059]">+ {formatRupiah(porterCost)}</span>
                  </div>
                )}
                {tollFee > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Tol / Parkir</span>
                    <span className="font-bold text-[#C5A059]">+ {formatRupiah(tollFee)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-gray-800 pt-6 mb-6">
            <p className="text-xs text-gray-400 mb-1">Total Estimasi Biaya</p>
            <p className="text-3xl font-black text-[#C5A059]">{formatRupiah(totalCost)}</p>
          </div>

          <button 
            type="submit" 
            form="booking-form"
            disabled={isLoading || isOverweight}
            className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#7A171D]/30 disabled:opacity-50 group disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Memproses...</>
            ) : isOverweight ? (
              "Kapasitas Melebihi Batas"
            ) : (
              <>Lanjut Pembayaran <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DesktopBookingPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#7A171D]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#C5A059]/10 rounded-full blur-[150px] pointer-events-none" />
      
      <Suspense fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center z-10 relative">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold animate-pulse">Menyiapkan Form Pemesanan...</p>
        </div>
      }>
        <BookingForm />
      </Suspense>
    </main>
  );
}