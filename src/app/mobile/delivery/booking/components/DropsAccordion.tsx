"use client";

import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "./FieldLabel";
import { DropDestination, DynamicVehicle, DeliveryItem } from "@/types/order";
import { cn } from "@/lib/utils"; 
import { User, Phone, MapPin, PackageOpen, Plus, Trash2, MapPinned, ChevronDown, RefreshCw } from "lucide-react";

// DYNAMIC IMPORT UNTUK MAPBOX
const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-14 w-full bg-white/60 rounded-[1.25rem] animate-pulse flex items-center px-4 text-xs font-bold text-slate-400">Menyinkronkan satelit...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const inputFocus = "focus-within:ring-2 focus-within:ring-[#C5A059]/20 focus-within:border-[#C5A059]/50 focus-within:bg-white";

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
  handleInfoClick: (t: string, text: string) => void; 
  setErrorMsg: (msg: string) => void;
}

export default function DropsAccordion({
  drops, setDrops, selectedService, selectedVehicle, motorSettings,
  activeDropId, setActiveDropId, activeDraggable, setActiveDraggable, handleInfoClick, setErrorMsg
}: Props) {

  const addDrop = () => {
    if (drops.length >= 24) {
      setErrorMsg("Maksimal titik tujuan adalah 24 lokasi.");
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

  return (
    <div className="w-full relative z-40">
      
      {/* 1. KONTROL ATAS (Hanya Tampil Tambah Rute di Mobile) */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Rute Tujuan</h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Total {drops.length} Titik</p>
        </div>

        {selectedService === "Sameday" && (
          <Button type="button" variant="primary" size="sm" onClick={addDrop} className="h-10 px-4 rounded-xl text-xs shadow-sm tap-highlight-transparent">
            <Plus className="w-4 h-4 mr-1" /> Tambah Rute
          </Button>
        )}
      </div>

      {/* 2. DAFTAR LOKASI TUJUAN */}
      <div className="space-y-4">
        <AnimatePresence>
          {drops.map((drop, dIndex) => {
            const isExpanded = activeDropId === drop.id;

            return (
              <motion.div key={drop.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("relative", isExpanded ? "z-50" : "z-10")}>
                
                {/* Connector Line Khusus Mobile */}
                {dIndex !== drops.length - 1 && <div className="absolute left-6 top-14 bottom-[-16px] w-[2px] bg-slate-200 z-0 rounded-full"></div>}

                <div className={cn("relative z-10 bg-white/80 backdrop-blur-md border transition-all duration-300 shadow-sm rounded-3xl", isExpanded ? "border-[#C5A059]/50 shadow-md bg-white" : "border-slate-100")}>
                  
                  {/* ACCORDION HEADER */}
                  <div 
                    className="p-4 flex justify-between items-center select-none tap-highlight-transparent cursor-pointer"
                    onClick={() => setExpandedDrop(drop.id)}
                  >
                    <div className="flex items-center gap-3 truncate pr-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] text-white flex shrink-0 items-center justify-center text-xs font-black shadow-sm border border-[#A68345]">
                        {dIndex + 1}
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-slate-900 text-sm tracking-tight truncate">
                          {drop.address ? drop.address.split(",")[0] : `Lokasi Tujuan ${dIndex + 1}`}
                        </h4>
                        {drop.receiverName && <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">{drop.receiverName}</p>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {isExpanded && drop.lng && drop.lat && (
                        <Button 
                          type="button" 
                          variant={activeDraggable === drop.id ? "gold" : "outline"}
                          onClick={() => setActiveDraggable(activeDraggable === drop.id ? null : drop.id)}
                          className={cn("h-8 px-3 text-[10px] rounded-lg", activeDraggable === drop.id ? "shadow-sm" : "border-slate-200 bg-white text-slate-600")}
                        >
                          <MapPinned className="w-3 h-3 mr-1" />
                          {activeDraggable === drop.id ? `Geser` : "Edit"}
                        </Button>
                      )}
                      {drops.length > 1 && (
                        <button type="button" onClick={() => removeDrop(dIndex)} className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg active:scale-90 transition-transform"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                      <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-slate-500 transition-colors" onClick={() => setExpandedDrop(drop.id)}>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                      </div>
                    </div>
                  </div>

                  {/* ACCORDION BODY */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                        className="border-t border-slate-100 bg-slate-50/50 rounded-b-3xl" // HILANGKAN OVERFLOW HIDDEN
                      >
                        <div className="p-4 space-y-6">
                          
                          {/* DETAIL LOKASI */}
                          <div className="space-y-4 relative z-50">
                            <div className="relative z-50">
                              <FieldLabel label="Pencarian Alamat Tujuan" infoTitle="Alamat Tujuan" infoText="Pilih alamat dari saran yang muncul agar satelit bisa menangkap titik koordinatnya dengan presisi." onInfoClick={handleInfoClick}/>
                              <div className={cn("relative group flex items-center bg-white border border-slate-200 rounded-[1.25rem] h-14 transition-all duration-300 shadow-sm", inputFocus)}>
                                <div className="pl-4 flex items-center pointer-events-none">
                                  <MapPin className="w-5 h-5 text-slate-400 group-focus-within:text-[#C5A059]" />
                                </div>
                                <div className="flex-1 relative z-50">
                                  <SearchBox
                                    accessToken={MAPBOX_TOKEN} options={{ language: 'id', country: 'ID' }} value={drop.address} placeholder="Ketik daerah..."
                                    onRetrieve={(res) => {
                                      const feature = res.features[0];
                                      updateDropFieldsMulti(dIndex, {
                                        address: feature.properties.full_address || feature.properties.name,
                                        lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1]
                                      });
                                    }}
                                    theme={{ variables: { boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: 'none', colorBackground: '#ffffff', padding: '14px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '600' } }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="relative z-40">
                              <FieldLabel label="Detail Patokan (Ops." />
                              <div className="relative group">
                                <textarea value={drop.detail} onChange={(e) => updateDropField(dIndex, "detail", e.target.value)} rows={2} placeholder="Cth: Pagar hitam..." className={cn("w-full bg-white border border-slate-200 rounded-[1.25rem] p-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none resize-none shadow-sm transition-all", inputFocus)} required></textarea>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 relative z-30">
                              <div>
                                <FieldLabel label="Penerima" />
                                <div className={cn("relative group flex items-center bg-white border border-slate-200 rounded-[1.25rem] h-14 shadow-sm", inputFocus)}>
                                  <div className="pl-4 flex items-center pointer-events-none"><User className="w-5 h-5 text-slate-400 group-focus-within:text-[#C5A059]" /></div>
                                  <input type="text" value={drop.receiverName} onChange={(e) => updateDropField(dIndex, "receiverName", e.target.value)} placeholder="Nama Lengkap" className="w-full bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                                </div>
                              </div>
                              <div>
                                <FieldLabel label="No. Handphone" />
                                <div className={cn("relative group flex items-center bg-white border border-slate-200 rounded-[1.25rem] h-14 shadow-sm", inputFocus)}>
                                  <div className="pl-4 flex items-center pointer-events-none"><Phone className="w-5 h-5 text-slate-400 group-focus-within:text-[#C5A059]" /></div>
                                  <input type="tel" value={drop.receiverPhone} onChange={(e) => updateDropField(dIndex, "receiverPhone", e.target.value)} placeholder="08..." className="w-full bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* DATA BARANG (KOLI) */}
                          <div className="pt-6 border-t border-slate-200 relative z-20">
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <h5 className="text-sm font-black text-slate-900 flex items-center gap-1.5"><PackageOpen className="w-4 h-4 text-[#C5A059]"/> Detail Kargo</h5>
                              </div>
                            </div>

                            <div className="space-y-4">
                              {drop.items.map((item, iIndex) => (
                                <div key={`item-${dIndex}-${iIndex}`} className="relative bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                  {drop.items.length > 1 && (
                                    <button type="button" onClick={() => removeItemFromDrop(dIndex, iIndex)} className="absolute right-3 top-3 text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                  )}
                                  
                                  <div className="space-y-4 pr-6">
                                    <div>
                                      <FieldLabel label="Kode Koli" />
                                      <div className={cn("relative flex items-center bg-slate-50 border border-slate-200 rounded-xl h-12", inputFocus)}>
                                        <input value={item.id} onChange={(e) => updateItemField(dIndex, iIndex, "id", e.target.value.toUpperCase())} placeholder="ITM-XXXX" className="w-full bg-transparent border-none outline-none px-3 text-xs font-mono font-bold uppercase text-slate-700" required />
                                        <button type="button" onClick={() => updateItemField(dIndex, iIndex, "id", `ITM-${Math.floor(10000 + Math.random() * 90000)}`)} className="h-full px-3 text-slate-400 hover:text-[#C5A059] border-l border-slate-200 shrink-0">
                                          <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    <div>
                                      <FieldLabel label="Nama Barang" />
                                      <div className={cn("relative flex items-center bg-slate-50 border border-slate-200 rounded-xl h-12", inputFocus)}>
                                        <input value={item.name} onChange={(e) => updateItemField(dIndex, iIndex, "name", e.target.value)} placeholder="Cth: Dokumen / Kaca" className="w-full bg-transparent border-none outline-none px-3 text-xs font-bold text-slate-900 placeholder:text-slate-400" required />
                                      </div>
                                    </div>

                                    <div className="pt-2">
                                      <FieldLabel label="Spesifikasi (Dimensi & Harga)" />
                                      {selectedVehicle?.isMotor ? (
                                        <div className="grid grid-cols-2 gap-2">
                                          <select value={item.weightType} onChange={(e) => updateItemField(dIndex, iIndex, "weightType", e.target.value)} className={cn("bg-slate-50 border border-slate-200 rounded-xl h-12 px-2 text-xs font-bold text-slate-700 outline-none", inputFocus)}>
                                            <option value="Kecil">Kecil (&lt;{motorSettings?.weightSmall||5}Kg)</option>
                                            <option value="Sedang">Sedang (&lt;{motorSettings?.weightMedium||20}Kg)</option>
                                          </select>
                                          <select value={item.dimType} onChange={(e) => updateItemField(dIndex, iIndex, "dimType", e.target.value)} className={cn("bg-slate-50 border border-slate-200 rounded-xl h-12 px-2 text-xs font-bold text-slate-700 outline-none", inputFocus)}>
                                            <option value="S">Dimensi S</option>
                                            <option value="M">Dimensi M</option>
                                            <option value="L">Dimensi L</option>
                                          </select>
                                          <input type="number" value={item.value || ""} onChange={(e) => updateItemField(dIndex, iIndex, "value", Number(e.target.value))} placeholder="Nilai Barang (Rp)" className={cn("col-span-2 bg-slate-50 border border-slate-200 rounded-xl h-12 px-3 text-xs font-mono font-bold text-[#C5A059] outline-none placeholder:text-slate-400", inputFocus)} />
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-3 gap-2">
                                          <input type="number" value={item.weightVal || ""} onChange={(e) => updateItemField(dIndex, iIndex, "weightVal", Number(e.target.value))} placeholder="Berat (Kg)" className={cn("col-span-3 bg-slate-50 border border-slate-200 rounded-xl h-12 px-3 text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400", inputFocus)} required />
                                          <div className={cn("col-span-3 flex bg-slate-50 border border-slate-200 rounded-xl h-12 overflow-hidden", inputFocus)}>
                                            <input type="number" value={item.length || ""} onChange={(e) => updateItemField(dIndex, iIndex, "length", Number(e.target.value))} placeholder="P" className="w-1/3 h-full px-1 text-xs font-bold text-center border-r border-slate-200 bg-transparent outline-none" required/>
                                            <input type="number" value={item.width || ""} onChange={(e) => updateItemField(dIndex, iIndex, "width", Number(e.target.value))} placeholder="L" className="w-1/3 h-full px-1 text-xs font-bold text-center border-r border-slate-200 bg-transparent outline-none" required/>
                                            <input type="number" value={item.height || ""} onChange={(e) => updateItemField(dIndex, iIndex, "height", Number(e.target.value))} placeholder="T" className="w-1/3 h-full px-1 text-xs font-bold text-center bg-transparent outline-none" required/>
                                          </div>
                                          <input type="number" value={item.value || ""} onChange={(e) => updateItemField(dIndex, iIndex, "value", Number(e.target.value))} placeholder="Nilai (Rp)" className={cn("col-span-3 bg-slate-50 border border-slate-200 rounded-xl h-12 px-3 text-xs font-mono font-bold text-[#C5A059] outline-none placeholder:text-slate-400", inputFocus)} />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              <Button type="button" variant="outline" size="sm" onClick={() => addItemToDrop(dIndex)} className="w-full h-12 rounded-xl border-dashed border-slate-300 text-slate-500 hover:border-[#C5A059] hover:text-[#C5A059] shadow-none tap-highlight-transparent bg-white">
                                <Plus className="w-4 h-4 mr-1"/> Tambah Koli / Dus
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