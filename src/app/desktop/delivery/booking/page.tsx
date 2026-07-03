"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  User, Phone, Mail, MapPin, Box, 
  DollarSign, Truck, Shield, Users, 
  ArrowRight, CheckCircle, Navigation, Info, HelpCircle
} from "lucide-react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Komponen Utama Form
function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    originDetail: "",
    destDetail: "",
    itemType: "",
    itemValue: "",
    origin: searchParams.get("origin") || "",
    destination: searchParams.get("destination") || "",
    weight: searchParams.get("weight") || "",
    length: searchParams.get("l") || "",
    width: searchParams.get("w") || "",
    height: searchParams.get("h") || "",
  });

  // State untuk Debounce Map (Mencegah patah-patah saat ngetik)
  const [debouncedOrigin, setDebouncedOrigin] = useState(formData.origin);
  const [debouncedDestination, setDebouncedDestination] = useState(formData.destination);

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>("Mobil Blind Van");
  const [addInsurance, setAddInsurance] = useState(false);
  const [addPorter, setAddPorter] = useState(false);

  // Efek Jeda (Debounce) agar peta tidak me-load berulang kali saat user masih mengetik
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOrigin(formData.origin);
      setDebouncedDestination(formData.destination);
    }, 1000); // Peta akan muncul 1 detik setelah user berhenti ngetik/paste
    return () => clearTimeout(timer);
  }, [formData.origin, formData.destination]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const vehicles = [
    { id: "Motor", name: "Motor Kurir", cap: "Maks 20 Kg", price: 35000, icon: Truck },
    { id: "Mobil Blind Van", name: "Mobil Blind Van", cap: "Maks 500 Kg", price: 150000, icon: Truck },
    { id: "Truk Engkel", name: "Truk Engkel (CDE)", cap: "Maks 2 Ton", price: 450000, icon: Truck },
  ];

  const baseVehiclePrice = vehicles.find(v => v.id === selectedVehicle)?.price || 0;
  const insuranceCost = addInsurance ? 25000 : 0;
  const porterCost = addPorter ? 50000 : 0;
  const totalCost = baseVehiclePrice + insuranceCost + porterCost;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      await addDoc(collection(db, "orders"), {
        ...formData,
        selectedVehicle,
        addInsurance,
        addPorter,
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

  // Komponen Pintar untuk me-render Peta Gratis tanpa API Key
  const renderMapPreview = (value: string, type: "origin" | "destination") => {
    if (!value || value.length < 5) return null;

    const isLink = value.includes("http") || value.includes("maps.app");
    const borderColor = type === "origin" ? "border-emerald-200" : "border-amber-200";
    const bgColor = type === "origin" ? "bg-emerald-50" : "bg-amber-50";
    const iconColor = type === "origin" ? "text-emerald-600" : "text-amber-600";

    // Jika user paste URL link asli (Google melarang iframe link pendek, jadi kita buat kotak notif elegan)
    if (isLink) {
      return (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 p-4 ${bgColor} border ${borderColor} rounded-xl flex items-start gap-3`}>
          <MapPin className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
          <div className="text-xs">
            <p className="font-bold text-gray-900 mb-0.5">Tautan Koordinat Peta Terdeteksi</p>
            <p className="text-gray-600 truncate max-w-[250px]">{value}</p>
            <p className={`mt-1 font-semibold ${iconColor}`}>Kurir akan menggunakan tautan ini sebagai navigasi.</p>
          </div>
        </motion.div>
      );
    }

    // Jika user paste/ngetik Teks Alamat, kita render Peta Visual
    return (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={`mt-3 w-full h-48 rounded-xl overflow-hidden border-2 ${borderColor} shadow-inner relative bg-gray-100`}>
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0 }}
          src={`https://maps.google.com/maps?q=${encodeURIComponent(value)}&output=embed`}
          allowFullScreen
        ></iframe>
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
          <p className="text-gray-500 mt-2 text-sm">
            Lengkapi detail penjemputan dan pengiriman untuk layanan domestik.
          </p>
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-2xl">
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <form id="booking-form" onSubmit={handleSubmit} className="space-y-8">
          
          {/* SEKSI 1 */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <User className="w-5 h-5 text-[#7A171D]" /> 1. Data Pemesan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Nama Lengkap</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" name="name" onChange={handleChange} placeholder="Nama Anda atau PIC Perusahaan" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50 text-gray-900 font-semibold placeholder:font-normal placeholder:text-gray-400" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nomor WhatsApp</label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="tel" name="phone" onChange={handleChange} placeholder="0812345678" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50 text-gray-900 font-semibold placeholder:font-normal placeholder:text-gray-400" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email Aktif</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" name="email" onChange={handleChange} placeholder="email@perusahaan.com" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50 text-gray-900 font-semibold placeholder:font-normal placeholder:text-gray-400" required />
                </div>
              </div>
            </div>
          </motion.div>

          {/* SEKSI 2: Peta Tanpa API Key */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <MapPin className="w-5 h-5 text-[#C5A059]" /> 2. Detail Rute Pengiriman
            </h3>
            
            <div className="space-y-6 relative">
              <div className="absolute top-8 bottom-24 left-[23px] w-0.5 bg-dashed border-l-2 border-dashed border-gray-200 z-0 hidden md:block"></div>

              {/* Titik Jemput */}
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-12 h-8 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center text-xs font-bold border border-gray-200">ASAL</div>
                    Titik Penjemputan (Pickup)
                  </label>
                  
                  <div className="relative">
                    <button type="button" onMouseEnter={() => setActiveTooltip("origin")} onMouseLeave={() => setActiveTooltip(null)} className="text-gray-400 hover:text-[#7A171D] transition-colors p-1">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {activeTooltip === "origin" && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 bottom-7 w-64 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 leading-relaxed border border-slate-800">
                          <strong>Fitur Smart Map:</strong> Ketik alamat atau paste link Google Maps. Sistem akan menampilkan pratinjau peta secara otomatis.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="relative">
                  <Navigation className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
                  <input type="text" name="origin" value={formData.origin} onChange={handleChange} placeholder="Ketik alamat atau paste link Google Maps..." className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none font-semibold text-gray-900 bg-gray-50 placeholder:font-normal placeholder:text-gray-400 transition-all" required />
                </div>
                
                {/* Visual Map Render untuk Asal */}
                {renderMapPreview(debouncedOrigin, "origin")}

                <textarea name="originDetail" onChange={handleChange} rows={2} placeholder="Detail alamat jemput: Nomor Gudang, Blok, Patokan Lokasi..." className="w-full px-4 py-3 mt-2 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none resize-none text-sm bg-gray-50 text-gray-900 font-semibold placeholder:font-normal placeholder:text-gray-400 transition-all" required></textarea>
              </div>

              {/* Titik Tujuan */}
              <div className="space-y-3 relative z-10 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-12 h-8 bg-[#7A171D]/10 text-[#7A171D] rounded-lg flex items-center justify-center text-xs font-bold border border-[#7A171D]/20">TUJUAN</div>
                    Titik Pengantaran (Drop-off)
                  </label>

                  <div className="relative">
                    <button type="button" onMouseEnter={() => setActiveTooltip("destination")} onMouseLeave={() => setActiveTooltip(null)} className="text-gray-400 hover:text-[#C5A059] transition-colors p-1">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {activeTooltip === "destination" && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 bottom-7 w-64 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 leading-relaxed border border-slate-800">
                          <strong>Fitur Smart Map:</strong> Ketik alamat atau paste link Google Maps. Sistem akan menampilkan pratinjau peta secara otomatis.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
                  <input type="text" name="destination" value={formData.destination} onChange={handleChange} placeholder="Ketik alamat atau paste link Google Maps..." className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none font-semibold text-gray-900 bg-gray-50 placeholder:font-normal placeholder:text-gray-400 transition-all" required />
                </div>

                {/* Visual Map Render untuk Tujuan */}
                {renderMapPreview(debouncedDestination, "destination")}

                <textarea name="destDetail" onChange={handleChange} rows={2} placeholder="Detail alamat drop-off penerima kargo..." className="w-full px-4 py-3 mt-2 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none resize-none text-sm bg-gray-50 text-gray-900 font-semibold placeholder:font-normal placeholder:text-gray-400 transition-all" required></textarea>
              </div>
            </div>
          </motion.div>

          {/* SEKSI 3 */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <Box className="w-5 h-5 text-gray-600" /> 3. Spesifikasi Barang
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2 md:col-span-3">
                <label className="text-sm font-semibold text-gray-700">Jenis Barang / Deskripsi Singkat</label>
                <input type="text" name="itemType" onChange={handleChange} placeholder="Cth: Dokumen / Sparepart" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none transition-all bg-gray-50 text-gray-900 font-semibold placeholder:font-normal placeholder:text-gray-400" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Berat (Kg)</label>
                <input type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="0" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none text-center font-bold bg-gray-50 text-gray-900 placeholder:font-normal placeholder:text-gray-400 transition-all" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Dimensi (P x L x T) cm</label>
                <div className="flex gap-2">
                  <input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="P" className="w-full px-3 py-3 rounded-xl border border-gray-200 text-center font-bold focus:border-[#7A171D] outline-none bg-gray-50 text-gray-900 placeholder:font-normal placeholder:text-gray-400 transition-all" required />
                  <input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="L" className="w-full px-3 py-3 rounded-xl border border-gray-200 text-center font-bold focus:border-[#7A171D] outline-none bg-gray-50 text-gray-900 placeholder:font-normal placeholder:text-gray-400 transition-all" required />
                  <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="T" className="w-full px-3 py-3 rounded-xl border border-gray-200 text-center font-bold focus:border-[#7A171D] outline-none bg-gray-50 text-gray-900 placeholder:font-normal placeholder:text-gray-400 transition-all" required />
                </div>
              </div>
              <div className="space-y-2 md:col-span-3">
                <label className="text-sm font-semibold text-gray-700">Estimasi Nilai Barang (Opsional untuk Asuransi)</label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" name="itemValue" onChange={handleChange} placeholder="1500000" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none transition-all bg-gray-50 text-gray-900 font-semibold placeholder:font-normal placeholder:text-gray-400" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* SEKSI 4 */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <Truck className="w-5 h-5 text-gray-600" /> 4. Armada & Layanan
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {vehicles.map((v) => (
                <label key={v.id} className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedVehicle === v.id ? 'border-[#7A171D] bg-[#7A171D]/5' : 'border-gray-200 hover:border-[#C5A059]/50'}`}>
                  <input type="radio" name="vehicle" value={v.id} checked={selectedVehicle === v.id} onChange={(e) => setSelectedVehicle(e.target.value)} className="hidden" />
                  {selectedVehicle === v.id && (
                    <div className="absolute top-3 right-3 text-[#7A171D]">
                      <CheckCircle className="w-5 h-5 fill-current text-white" />
                    </div>
                  )}
                  <v.icon className={`w-8 h-8 mb-3 ${selectedVehicle === v.id ? 'text-[#7A171D]' : 'text-gray-400'}`} />
                  <h4 className={`font-bold text-sm ${selectedVehicle === v.id ? 'text-[#7A171D]' : 'text-gray-900'}`}>{v.name}</h4>
                  <p className="text-xs text-gray-500 font-medium mt-1">{v.cap}</p>
                  <p className="text-sm font-black text-gray-900 mt-3">{formatRupiah(v.price)}</p>
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${addInsurance ? 'border-[#C5A059] bg-[#C5A059]/5' : 'border-gray-200'}`}>
                <input type="checkbox" checked={addInsurance} onChange={() => setAddInsurance(!addInsurance)} className="w-5 h-5 accent-[#C5A059] rounded" />
                <div className="flex-1 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Shield className={`w-5 h-5 ${addInsurance ? 'text-[#C5A059]' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Proteksi Asuransi Pengiriman</p>
                      <p className="text-xs text-gray-500">Jaminan ganti rugi kerusakan/kehilangan hingga Rp 10 Juta.</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">+Rp 25.000</span>
                </div>
              </label>

              <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${addPorter ? 'border-[#C5A059] bg-[#C5A059]/5' : 'border-gray-200'}`}>
                <input type="checkbox" checked={addPorter} onChange={() => setAddPorter(!addPorter)} className="w-5 h-5 accent-[#C5A059] rounded" />
                <div className="flex-1 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Users className={`w-5 h-5 ${addPorter ? 'text-[#C5A059]' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Tenaga Bantuan Angkut (Porter)</p>
                      <p className="text-xs text-gray-500">Bantuan menaikkan dan menurunkan barang dari armada.</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">+Rp 50.000</span>
                </div>
              </label>
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
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Armada</span>
              <span className="font-bold">{selectedVehicle}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Tarif Dasar</span>
              <span className="font-bold">{formatRupiah(baseVehiclePrice)}</span>
            </div>
            
            {(addInsurance || addPorter) && (
              <div className="pt-4 mt-4 border-t border-dashed border-gray-800 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase">Layanan Tambahan</p>
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
              </div>
            )}
          </div>

          <div className="border-t border-gray-800 pt-6 mb-6">
            <p className="text-xs text-gray-400 mb-1">Total Estimasi Biaya</p>
            <p className="text-3xl font-black text-[#C5A059]">{formatRupiah(totalCost)}</p>
            <div className="flex items-start gap-2 mt-3 bg-gray-900 p-3 rounded-xl border border-gray-800">
              <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-400 leading-relaxed">Tarif final dapat berubah berdasarkan hasil verifikasi kurir di lapangan.</p>
            </div>
          </div>

          <button 
            type="submit" 
            form="booking-form"
            disabled={isLoading}
            className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#7A171D]/30 disabled:opacity-70 group"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Memproses Order...
              </>
            ) : (
              <>
                Lanjut ke Pembayaran <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
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