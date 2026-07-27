"use client";

import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "./FieldLabel"; // Dipertahankan karena masih dipakai
import { DropDestination, DynamicVehicle, DeliveryItem } from "@/types/order";
import { cn } from "@/lib/utils"; // Dipertahankan karena masih dipakai
import { User, Phone, MapPin, PackageOpen, Plus, Trash2, MapPinned, ChevronDown, Download, Upload, Info, RefreshCw } from "lucide-react";

// DYNAMIC IMPORT UNTUK MAPBOX
const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-[56px] w-full bg-white/60 rounded-2xl border border-white animate-pulse flex items-center px-4 text-xs font-bold text-slate-400">Menyinkronkan satelit...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const inputFocus = "focus-within:ring-[3px] focus-within:ring-[#C5A059]/20 focus-within:border-[#C5A059]/50 focus-within:bg-white";

interface MotorSettings {
  weightSmall?: number;
  weightMedium?: number;
  [key: string]: unknown;
}

interface Props {
  drops: DropDestination[];
  setDrops: React.Dispatch<React.SetStateAction<DropDestination[]>>;
  selectedService: string;
  selectedVehicle: DynamicVehicle | null;
  motorSettings: MotorSettings | null; 
  activeDropId: string | null;
  setActiveDropId: (id: string | null) => void;
  activeDraggable: string | null;
  setActiveDraggable: (id: string | null) => void;
  handleInfoClick: (t: string, text: string) => void; // Dipertahankan karena dipakai di <FieldLabel onInfoClick={...} />
  setErrorMsg: (msg: string) => void;
}

export default function DropsAccordion({
  drops, setDrops, selectedService, selectedVehicle, motorSettings,
  activeDropId, setActiveDropId, activeDraggable, setActiveDraggable, handleInfoClick, setErrorMsg
}: Props) {

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addDrop = () => {
    if (drops.length >= 24) {
      setErrorMsg("Maksimal titik tujuan adalah 24 lokasi dalam sekali pengiriman.");
      return;
    }
    const newId = `DROP-${Math.floor(1000 + Math.random() * 9000)}`;
    const newItemId = `ITM-${Math.floor(10000 + Math.random() * 90000)}`; 
    setDrops(prev => [...prev, { id: newId, address: "", detail: "", receiverName: "", receiverPhone: "", receiverEmail: "", items: [{ id: newItemId, name: "", weightType: "Kecil", dimType: "S", weightVal: 0, length: 0, width: 0, height: 0, value: 0 }] }]);
    setExpandedDrop(newId);
  };

  const removeDrop = (index: number) => setDrops(prev => prev.filter((_, i) => i !== index));
  
  const updateDropField = (dIndex: number, field: keyof DropDestination, val: string) => setDrops(prev => { const newDrops = [...prev]; newDrops[dIndex] = { ...newDrops[dIndex], [field]: val }; return newDrops; });
  const updateDropFieldsMulti = (dIndex: number, updates: Partial<DropDestination>) => setDrops(prev => { const newDrops = [...prev]; newDrops[dIndex] = { ...newDrops[dIndex], ...updates }; return newDrops; });
  const addItemToDrop = (dIndex: number) => setDrops(prev => { const newDrops = [...prev]; newDrops[dIndex].items.push({ id: `ITM-${Math.floor(10000 + Math.random() * 90000)}`, name: "", weightType: "Kecil", dimType: "S", weightVal: 0, length: 0, width: 0, height: 0, value: 0 }); return newDrops; });
  const removeItemFromDrop = (dIndex: number, iIndex: number) => setDrops(prev => { const newDrops = [...prev]; if (newDrops[dIndex].items.length > 1) { newDrops[dIndex].items = newDrops[dIndex].items.filter((_, i) => i !== iIndex); } return newDrops; });
  const updateItemField = (dIndex: number, iIndex: number, field: keyof DeliveryItem, val: string | number) => setDrops(prev => { const newDrops = [...prev]; const newItems = [...newDrops[dIndex].items]; newItems[iIndex] = { ...newItems[iIndex], [field]: val }; newDrops[dIndex] = { ...newDrops[dIndex], items: newItems }; return newDrops; });

  const setExpandedDrop = (id: string) => {
    setActiveDraggable(null);
    setActiveDropId(activeDropId === id ? null : id);
  };

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
            address: cols[0]?.trim() || "",
            receiverName: cols[1]?.trim() || "",
            receiverPhone: cols[2]?.trim() || "",
            detail: cols[3]?.trim() || "",
            receiverEmail: "",
            items: [{ 
              id: `ITM-${Math.floor(10000 + Math.random() * 90000)}`, 
              name: cols[4]?.trim() || "Paket CSV", 
              weightType: "Sedang" as const, dimType: "M" as const, 
              weightVal: Number(cols[5]) || 1, length: Number(cols[6]) || 10, width: Number(cols[7]) || 10, height: Number(cols[8]) || 10, value: Number(cols[9]) || 0 
            }]
          };
        }) as DropDestination[];
        
        if (parsedDrops.length > 0) {
          if (parsedDrops.length > 24) {
             setErrorMsg("Maksimal titik tujuan dari CSV adalah 24. Sistem hanya akan memuat 24 data pertama demi kestabilan radar.");
             setDrops(parsedDrops.slice(0, 24));
          } else {
             setDrops(parsedDrops);
          }
          setActiveDropId(parsedDrops[0].id); 
        } else {
          setErrorMsg("Format CSV kosong atau tidak valid.");
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    const header = "AlamatLengkap,NamaPenerima,NoHP,DetailPatokan,NamaBarang,BeratKg,Panjang,Lebar,Tinggi,NilaiBarang\n";
    const example = '"Jl. Sudirman No 1 Jakarta","Budi Santoso","08123456789","Rumah Pagar Hitam","Baju Kemeja",2,20,20,10,150000\n';
    const blob = new Blob([header + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Bulk_FlashGlobal.csv';
    a.click();
  };

  return (
    <div className="w-full">
      {/* 1. KONTROL ATAS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Rute Pengiriman
          </h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total {drops.length} Lokasi Tujuan</p>
        </div>

        {selectedService === "Sameday" && (
          <div className="flex flex-wrap items-center gap-2 bg-white/60 p-2 rounded-2xl border border-white shadow-sm">
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <Button type="button" variant="outline" size="sm" onClick={() => handleInfoClick("Cara Upload CSV", "Unduh template CSV, isi sesuai format (Alamat, Nama, NoHP, Patokan, NamaBarang, Berat, P, L, T, Nilai). Lalu klik Upload Bulk CSV.")} className="text-slate-400 border-transparent hover:bg-slate-100 h-9 w-9 p-0 rounded-xl">
              <Info className="w-4 h-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate} className="text-xs h-9 rounded-xl hidden md:flex border-slate-200">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Template
            </Button>
            <Button type="button" variant="gold" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs h-9 rounded-xl shadow-none">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Bulk CSV
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={addDrop} className="text-xs h-9 rounded-xl shadow-none">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Rute
            </Button>
          </div>
        )}
      </div>

      {/* Warning Mapbox Limit Khusus Sameday/CSV */}
      {selectedService === "Sameday" && (
        <div className="mb-6 bg-blue-50/80 backdrop-blur-sm border border-blue-100 p-4 rounded-2xl flex gap-3 items-start shadow-sm">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-blue-800 text-xs leading-relaxed font-medium">
                <strong className="block mb-1 text-sm text-blue-900">Panduan Bulk CSV & Limit Peta</strong>
                Sistem membatasi maksimal <b>24 rute tujuan</b> dalam satu order agar pelacakan satelit tetap stabil dan akurat.
            </div>
        </div>
      )}

      {/* 2. DAFTAR LOKASI TUJUAN */}
      <div className="space-y-4">
        <AnimatePresence>
          {drops.map((drop, dIndex) => {
            const isExpanded = activeDropId === drop.id;

            return (
              <motion.div key={drop.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative">
                
                {/* Connector Line untuk visualisasi rute */}
                {dIndex !== drops.length - 1 && <div className="absolute left-6 top-14 bottom-[-16px] w-[2px] bg-slate-200 z-0"></div>}

                <div className={cn("relative z-10 bg-white/80 backdrop-blur-md border transition-all duration-300 shadow-sm rounded-3xl overflow-hidden", isExpanded ? "border-[#C5A059]/40 shadow-md bg-white" : "border-white hover:border-[#C5A059]/30 cursor-pointer")}>
                  
                  {/* ACCORDION HEADER */}
                  <div 
                    className="p-5 flex justify-between items-center select-none"
                    onClick={() => setExpandedDrop(drop.id)}
                  >
                    <div className="flex items-center gap-4 truncate pr-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] text-white flex shrink-0 items-center justify-center text-xs font-black shadow-sm">
                        {dIndex + 1}
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm tracking-wide truncate">
                        {drop.address ? drop.address.split(",")[0] : `Lokasi Tujuan ${dIndex + 1}`}
                        {drop.receiverName && <span className="text-slate-400 font-semibold ml-2">- {drop.receiverName}</span>}
                      </h4>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {isExpanded && drop.lng && drop.lat && (
                        <Button 
                          type="button" 
                          variant={activeDraggable === drop.id ? "gold" : "outline"}
                          size="sm"
                          onClick={() => setActiveDraggable(activeDraggable === drop.id ? null : drop.id)}
                          className={cn("h-9 text-xs rounded-xl", activeDraggable === drop.id ? "shadow-[0_0_10px_rgba(197,160,89,0.5)]" : "border-slate-200 bg-white text-slate-600 hover:text-[#C5A059]")}
                        >
                          <MapPinned className="w-3.5 h-3.5 mr-1.5" />
                          {activeDraggable === drop.id ? `Geser Pin` : "Edit Pin"}
                        </Button>
                      )}
                      {drops.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeDrop(dIndex)} className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                      )}
                      <div className="w-9 h-9 flex items-center justify-center bg-slate-50/80 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer border border-white shadow-sm" onClick={() => setExpandedDrop(drop.id)}>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                      </div>
                    </div>
                  </div>

                  {/* ACCORDION BODY */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: "auto", opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-slate-100/60 bg-slate-50/30"
                      >
                        <div className="p-6 md:p-8 space-y-8">
                          
                          {/* DETAIL LOKASI */}
                          <div className="space-y-5">
                            <div>
                              <FieldLabel label="Pencarian Alamat Tujuan" infoTitle="Alamat Tujuan" infoText="Ketik perlahan dan pilih alamat dari saran yang muncul agar satelit bisa menangkap titik koordinatnya dengan presisi." onInfoClick={handleInfoClick}/>
                              <div className={cn("relative group flex items-center bg-white border border-slate-200 rounded-2xl h-[56px] transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]", inputFocus)}>
                                <div className="pl-4 flex items-center pointer-events-none">
                                  <MapPin className="w-5 h-5 text-slate-400 group-focus-within:text-[#C5A059]" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <SearchBox
                                    accessToken={MAPBOX_TOKEN} options={{ language: 'id', country: 'ID' }} value={drop.address} placeholder="Ketik jalan, gedung, atau daerah..."
                                    onRetrieve={(res) => {
                                      const feature = res.features[0];
                                      updateDropFieldsMulti(dIndex, {
                                        address: feature.properties.full_address || feature.properties.name,
                                        lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1]
                                      });
                                    }}
                                    theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '16px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '600' } }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <FieldLabel label="Detail Patokan Jalan" />
                              <div className="relative group">
                                <textarea 
                                  value={drop.detail} 
                                  onChange={(e) => updateDropField(dIndex, "detail", e.target.value)} 
                                  rows={2} 
                                  placeholder="Cth: Pagar cat hitam, depan masjid..." 
                                  className={cn("w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none resize-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all", inputFocus)} 
                                  required
                                ></textarea>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div>
                                <FieldLabel label="Nama Penerima" />
                                <div className={cn("relative group flex items-center bg-white border border-slate-200 rounded-2xl h-[56px] transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]", inputFocus)}>
                                  <div className="pl-4 flex items-center pointer-events-none"><User className="w-5 h-5 text-slate-400 group-focus-within:text-[#C5A059]" /></div>
                                  <input type="text" value={drop.receiverName} onChange={(e) => updateDropField(dIndex, "receiverName", e.target.value)} placeholder="Nama Lengkap" className="w-full bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                                </div>
                              </div>
                              <div>
                                <FieldLabel label="No. Handphone" />
                                <div className={cn("relative group flex items-center bg-white border border-slate-200 rounded-2xl h-[56px] transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]", inputFocus)}>
                                  <div className="pl-4 flex items-center pointer-events-none"><Phone className="w-5 h-5 text-slate-400 group-focus-within:text-[#C5A059]" /></div>
                                  <input type="tel" value={drop.receiverPhone} onChange={(e) => updateDropField(dIndex, "receiverPhone", e.target.value)} placeholder="08..." className="w-full bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* DATA BARANG (KOLI) */}
                          <div className="pt-8 border-t border-slate-200/60">
                            <div className="flex justify-between items-center mb-6">
                              <div>
                                <h5 className="text-sm font-black text-slate-900 flex items-center gap-2"><PackageOpen className="w-5 h-5 text-[#C5A059]"/> Detail Kargo & Muatan</h5>
                                <p className="text-xs text-slate-500 font-medium mt-1">Masukkan spesifikasi untuk perhitungan berat dan asuransi.</p>
                              </div>
                              <Button type="button" variant="outline" size="sm" onClick={() => addItemToDrop(dIndex)} className="h-10 px-4 rounded-xl border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white shadow-sm transition-colors hidden sm:flex">
                                <Plus className="w-4 h-4 mr-1.5"/> Tambah Barang
                              </Button>
                            </div>

                            <div className="space-y-4">
                              {drop.items.map((item, iIndex) => (
                                <div key={`item-${dIndex}-${iIndex}`} className="relative bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group hover:border-[#C5A059]/30 transition-colors">
                                  {drop.items.length > 1 && (
                                    <button type="button" onClick={() => removeItemFromDrop(dIndex, iIndex)} className="absolute right-4 top-4 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-2 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                                  )}
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    <div className="md:col-span-4">
                                      <FieldLabel label="ID / Kode Koli" infoTitle="Identifikasi Barang" infoText="Kode unik untuk pelacakan spesifik per koli/kardus. Sangat penting jika mengajukan klaim asuransi." onInfoClick={handleInfoClick}/>
                                      <div className={cn("relative flex items-center bg-slate-50 border border-slate-200 rounded-xl h-11 transition-all shadow-inner", inputFocus)}>
                                        <input value={item.id} onChange={(e) => updateItemField(dIndex, iIndex, "id", e.target.value.toUpperCase())} placeholder="ITM-XXXX" className="w-full bg-transparent border-none outline-none px-3 text-xs font-mono font-bold uppercase text-slate-700" required />
                                        <button type="button" onClick={() => updateItemField(dIndex, iIndex, "id", `ITM-${Math.floor(10000 + Math.random() * 90000)}`)} className="h-full px-3 text-slate-400 hover:text-[#C5A059] border-l border-slate-200 shrink-0" title="Generate ID Baru">
                                          <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="md:col-span-8 pr-8 md:pr-0">
                                      <FieldLabel label="Nama Barang" infoTitle="Deskripsi Barang" infoText="Sebutkan isi paket agar kurir bisa berhati-hati. Contoh: 'Dokumen', 'Pecah Belah'." onInfoClick={handleInfoClick}/>
                                      <div className={cn("relative flex items-center bg-slate-50 border border-slate-200 rounded-xl h-11 transition-all shadow-inner", inputFocus)}>
                                        <input value={item.name} onChange={(e) => updateItemField(dIndex, iIndex, "name", e.target.value)} placeholder="Cth: Dokumen / Pecah Belah" className="w-full bg-transparent border-none outline-none px-4 text-xs font-bold text-slate-900 placeholder:text-slate-400" required />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 pt-4 border-t border-slate-100">
                                    <FieldLabel label="Spesifikasi (Dimensi & Harga)" infoTitle="Spesifikasi" infoText="Isi nilai barang (Rp) secara akurat untuk fitur asuransi premium." onInfoClick={handleInfoClick}/>
                                    
                                    {selectedVehicle?.isMotor ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className={cn("bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 shadow-inner", inputFocus)}>
                                          <select value={item.weightType} onChange={(e) => updateItemField(dIndex, iIndex, "weightType", e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-700 appearance-none cursor-pointer">
                                            <option value="Kecil">Kecil (&lt; {motorSettings?.weightSmall || 5}Kg)</option>
                                            <option value="Sedang">Sedang (&lt; {motorSettings?.weightMedium || 20}Kg)</option>
                                          </select>
                                        </div>
                                        <div className={cn("bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 shadow-inner", inputFocus)}>
                                          <select value={item.dimType} onChange={(e) => updateItemField(dIndex, iIndex, "dimType", e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-700 appearance-none cursor-pointer">
                                            <option value="S">Dimensi (Size S)</option>
                                            <option value="M">Dimensi (Size M)</option>
                                            <option value="L">Dimensi (Size L)</option>
                                          </select>
                                        </div>
                                        <div className={cn("bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 shadow-inner", inputFocus)}>
                                          <input type="number" value={item.value || ""} onChange={(e) => updateItemField(dIndex, iIndex, "value", Number(e.target.value))} placeholder="Nilai Barang (Rp)" className="w-full h-full bg-transparent border-none outline-none text-xs font-mono font-bold text-[#C5A059] placeholder:text-slate-400" />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <div className={cn("bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 shadow-inner", inputFocus)}>
                                          <input type="number" value={item.weightVal || ""} onChange={(e) => updateItemField(dIndex, iIndex, "weightVal", Number(e.target.value))} placeholder="Berat Akt. (Kg)" className="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400 text-center" required />
                                        </div>
                                        <div className={cn("sm:col-span-2 flex bg-slate-50 border border-slate-200 rounded-xl h-11 overflow-hidden shadow-inner", inputFocus)}>
                                          <input type="number" value={item.length || ""} onChange={(e) => updateItemField(dIndex, iIndex, "length", Number(e.target.value))} placeholder="P" className="w-1/3 h-full px-2 text-xs font-bold text-center border-r border-slate-200 bg-transparent outline-none" required/>
                                          <input type="number" value={item.width || ""} onChange={(e) => updateItemField(dIndex, iIndex, "width", Number(e.target.value))} placeholder="L" className="w-1/3 h-full px-2 text-xs font-bold text-center border-r border-slate-200 bg-transparent outline-none" required/>
                                          <input type="number" value={item.height || ""} onChange={(e) => updateItemField(dIndex, iIndex, "height", Number(e.target.value))} placeholder="T" className="w-1/3 h-full px-2 text-xs font-bold text-center bg-transparent outline-none" required/>
                                        </div>
                                        <div className={cn("bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 shadow-inner", inputFocus)}>
                                          <input type="number" value={item.value || ""} onChange={(e) => updateItemField(dIndex, iIndex, "value", Number(e.target.value))} placeholder="Harga (Rp)" className="w-full h-full bg-transparent border-none outline-none text-xs font-mono font-bold text-[#C5A059] placeholder:text-slate-400" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Tombol Tambah Barang Khusus Mobile */}
                              <Button type="button" variant="outline" size="sm" onClick={() => addItemToDrop(dIndex)} className="w-full h-11 rounded-xl border-dashed border-slate-300 text-slate-500 hover:border-[#C5A059] hover:text-[#C5A059] hover:bg-[#C5A059]/5 shadow-none transition-colors sm:hidden">
                                <Plus className="w-4 h-4 mr-1.5"/> Tambah Barang Lain
                              </Button>
                            </div>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}