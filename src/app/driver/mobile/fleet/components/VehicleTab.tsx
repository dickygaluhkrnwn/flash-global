"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom"; // 🚀 SOLUSI PORTAL
import { motion, AnimatePresence } from "framer-motion";
import { 
  Truck, Plus, X, CheckCircle, 
  UserSquare2, FileText, ShieldAlert, AlertTriangle, Trash2, Edit2,
  History, MapPin, Package, CheckCircle2, ChevronDown
} from "lucide-react";
import { collection, query, where, setDoc, doc, serverTimestamp, getDoc, onSnapshot, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { OrderDetail } from "@/types/order";
 
// ==========================================
// UTILS
// ==========================================
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

const getSafeMillis = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
    if (typeof obj.toDate === 'function') {
      const dateObj = obj.toDate() as Date;
      return dateObj.getTime();
    }
  }
  return new Date(String(ts)).getTime();
};

interface FleetVehicle {
  id: string;
  name: string;
  licensePlate: string;
  vehicleType: string;
  driverName: string;
  driverId: string;
  status: string;
  stnkUrl?: string;
  kirUrl?: string;
}

interface FleetDriver {
  id: string;
  name: string;
}

interface DynamicVehicle {
  id: string;
  name: string;
  category: string;
  maxWeight: number;
}

export default function VehicleTab() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false); // State Portal
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<FleetDriver[]>([]);
  const [vehiclesConfig, setVehiclesConfig] = useState<DynamicVehicle[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Custom Dropdown States
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);

  const [vendorCompanyName, setVendorCompanyName] = useState("");
  const [toast, setToast] = useState<{type: "success"|"error", msg: string} | null>(null);

  // History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryVehicle, setSelectedHistoryVehicle] = useState<FleetVehicle | null>(null);
  const [vehicleHistoryOrders, setVehicleHistoryOrders] = useState<OrderDetail[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ vehicleType: "", licensePlate: "", driverId: "" });
  
  // File State
  const [files, setFiles] = useState<{ stnk: File|null, kir: File|null }>({ stnk: null, kir: null });
  const [oldUrls, setOldUrls] = useState<{ stnk: string, kir: string }>({ stnk: "", kir: "" });
  
  const refs = {
    stnk: useRef<HTMLInputElement>(null),
    kir: useRef<HTMLInputElement>(null),
  };

  // Mencegah Hydration Error
  useEffect(() => setMounted(true), []);

  const showToast = (msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 🔄 REAL-TIME LISTENER
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const initStaticData = async () => {
      try {
        const vendorSnap = await getDoc(doc(db, "users", user.uid));
        if (vendorSnap.exists()) setVendorCompanyName(vendorSnap.data().companyName || vendorSnap.data().displayName || "Vendor");

        const pricingSnap = await getDoc(doc(db, "settings", "pricing"));
        if (pricingSnap.exists() && pricingSnap.data().customVehicles) {
          setVehiclesConfig(pricingSnap.data().customVehicles.filter((v: DynamicVehicle) => v.category === "Truk"));
        }
      } catch (error) {
        console.error(error);
      }
    };

    initStaticData();

    const dQuery = query(collection(db, "driver_wallets"), where("partnerType", "==", "FleetDriver"), where("vendorId", "==", user.uid));
    const unsubDrivers = onSnapshot(dQuery, (snap) => {
      setAvailableDrivers(snap.docs.map(d => ({ id: d.id, name: d.data().name || "Tanpa Nama" })));
    });

    const vQuery = query(collection(db, "driver_wallets"), where("partnerType", "==", "FleetVehicle"), where("vendorId", "==", user.uid));
    const unsubVehicles = onSnapshot(vQuery, (snap) => {
      const vData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FleetVehicle[];
      setVehicles(vData);
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      showToast("Gagal menyinkronkan data truk.", "error");
      setIsLoading(false);
    });

    return () => {
      unsubDrivers();
      unsubVehicles();
    };
  }, [user]);

  const handleFileChange = (type: keyof typeof files, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleOpenAdd = () => {
    setModalMode("add");
    setEditingVehicleId(null);
    setFormData({ vehicleType: "", licensePlate: "", driverId: "" });
    setFiles({ stnk: null, kir: null });
    setOldUrls({ stnk: "", kir: "" });
    setIsTypeDropdownOpen(false);
    setIsDriverDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vehicle: FleetVehicle) => {
    setModalMode("edit");
    setEditingVehicleId(vehicle.id);
    setFormData({ 
      vehicleType: vehicle.vehicleType || "", 
      licensePlate: vehicle.licensePlate || "", 
      driverId: vehicle.driverId || "" 
    });
    setFiles({ stnk: null, kir: null });
    setOldUrls({ 
      stnk: vehicle.stnkUrl || "", 
      kir: vehicle.kirUrl || "" 
    });
    setIsTypeDropdownOpen(false);
    setIsDriverDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.vehicleType) return showToast("Harap pilih tipe klasifikasi truk.", "error");
    if (!formData.driverId) return showToast("Harap tugaskan truk ke salah satu sopir Anda.", "error");
    
    if (modalMode === "add" && (!files.stnk || !files.kir)) {
      return showToast("Foto STNK dan KIR wajib diunggah!", "error");
    }

    setIsSaving(true);
    try {
      const [stnkUrl, kirUrl] = await Promise.all([
        files.stnk ? uploadToCloudinary(files.stnk) : Promise.resolve(oldUrls.stnk),
        files.kir ? uploadToCloudinary(files.kir) : Promise.resolve(oldUrls.kir)
      ]);

      const docId = modalMode === "add" 
        ? `PRT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}` 
        : editingVehicleId!;

      const assignedDriver = availableDrivers.find(d => d.id === formData.driverId);
      const formattedLicensePlate = formData.licensePlate.toUpperCase();
      const vehicleName = `${formattedLicensePlate} (${formData.vehicleType})`;

      const payload = {
        id: docId, name: vehicleName, partnerType: "FleetVehicle", 
        status: "Pending", 
        isSuspended: false, balance: 0, vendorId: user.uid, vendorName: vendorCompanyName,
        driverId: formData.driverId, driverName: assignedDriver?.name || "Sopir Tidak Diketahui",
        vehicleType: formData.vehicleType, licensePlate: formattedLicensePlate, stnkUrl: stnkUrl, kirUrl: kirUrl
      };

      if (modalMode === "add") Object.assign(payload, { createdAt: serverTimestamp() });
      else Object.assign(payload, { updatedAt: serverTimestamp() });

      await setDoc(doc(db, "driver_wallets", docId), payload, { merge: true });

      showToast(modalMode === "add" ? "Armada truk berhasil didaftarkan!" : "Data armada diperbarui. Menunggu review Admin.");
      setIsModalOpen(false);

    } catch (error) {
      console.error(error);
      showToast("Gagal menyimpan data armada. Silakan coba lagi.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVehicle = async (id: string, plate: string) => {
    if (!confirm(`Yakin ingin menghapus Armada "${plate}" dari sistem?`)) return;
    try {
      await deleteDoc(doc(db, "driver_wallets", id));
      showToast(`Data armada ${plate} berhasil dihapus.`);
    } catch (error) {
      console.error(error);
      showToast("Gagal menghapus data. Periksa koneksi Anda.", "error");
    }
  };

  const handleOpenHistory = async (vehicle: FleetVehicle) => {
    setSelectedHistoryVehicle(vehicle);
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    setVehicleHistoryOrders([]);

    try {
      const q = query(collection(db, "orders"), where("vehicleName", "==", vehicle.name));
      const snap = await getDocs(q);
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail));
      orders.sort((a, b) => getSafeMillis(b.updatedAt || b.createdAt) - getSafeMillis(a.updatedAt || a.createdAt));
      setVehicleHistoryOrders(orders);
    } catch (error) {
      console.error("Gagal menarik riwayat armada", error);
      showToast("Gagal menarik riwayat armada.", "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 🚀 RENDER MODALS DI DALAM PORTAL (TUTUP BOTTOM BAR GLOBAL)
  const renderModals = () => {
    if (!mounted) return null;
    return createPortal(
      <>
        {/* ========================================================= */}
        {/* MODAL TAMBAH/EDIT TRUK (BOTTOM SHEET iOS)                 */}
        {/* ========================================================= */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[999999] flex items-end justify-center font-sans">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)} />
              
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-white/90 backdrop-blur-2xl border-t border-white rounded-t-[2.5rem] w-full max-w-md relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]"
              >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-12 h-1.5 bg-slate-300/80 rounded-full mb-2" />
                </div>

                <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Truck className="w-5 h-5 text-blue-600"/> 
                      {modalMode === "add" ? "Pendaftaran Truk PT" : "Edit Data Truk"}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Manajemen Fisik Armada</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors active:scale-90 tap-highlight-transparent"><X size={18} strokeWidth={2.5}/></button>
                </div>

                <div className="px-6 py-6 overflow-y-auto flex-1 no-scrollbar space-y-6">

                  {modalMode === "edit" && (
                    <div className="mb-2 bg-amber-50/80 backdrop-blur-md border border-amber-200 p-4 rounded-[1.25rem] flex gap-3 shadow-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                        Menyimpan perubahan akan mengembalikan status truk menjadi <b className="font-black">Pending</b> untuk ditinjau ulang oleh Admin.
                      </p>
                    </div>
                  )}

                  <form id="form-vehicle" onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* 🚀 CUSTOM DROPDOWN TIPE TRUK */}
                    <div className="space-y-1.5 relative">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipe Klasifikasi Truk</label>
                      <button 
                        type="button" 
                        onClick={() => { setIsTypeDropdownOpen(!isTypeDropdownOpen); setIsDriverDropdownOpen(false); }} 
                        className={cn(
                          "w-full px-5 py-3.5 bg-white backdrop-blur-md border rounded-[1.25rem] flex items-center justify-between shadow-sm active:scale-[0.98] transition-all",
                          isTypeDropdownOpen ? "border-blue-600 ring-2 ring-blue-600/20" : "border-slate-200"
                        )}
                      >
                        <span className={cn("text-sm font-black", formData.vehicleType ? "text-slate-900" : "text-slate-400")}>
                          {formData.vehicleType || "-- Pilih Tipe Armada --"}
                        </span>
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      </button>
                      
                      <AnimatePresence>
                        {isTypeDropdownOpen && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-[70px] left-0 right-0 z-50 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar">
                            {vehiclesConfig.length === 0 && <div className="p-4 text-center text-xs font-bold text-slate-500">Master Data Truk Kosong</div>}
                            {vehiclesConfig.map(v => (
                              <button key={v.id} type="button" onClick={() => { setFormData({ ...formData, vehicleType: v.name }); setIsTypeDropdownOpen(false); }} className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b border-slate-100 flex flex-col active:bg-slate-100 transition-colors">
                                <span className="font-black text-slate-800 tracking-tight">{v.name}</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Maks Muatan: {v.maxWeight} Kg</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Plat Nomor Kendaraan</label>
                      <Input required value={formData.licensePlate} onChange={e => setFormData({...formData, licensePlate: e.target.value})} placeholder="Cth: B 1234 CD" className="font-mono font-black border-slate-200 uppercase bg-white focus-visible:ring-blue-600/20 focus-visible:border-blue-600" />
                    </div>

                    {/* 🚀 CUSTOM DROPDOWN ASSIGN SOPIR */}
                    <div className="space-y-2 bg-blue-50/50 border border-blue-200 p-5 rounded-[1.5rem] shadow-inner relative">
                      <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                        <UserSquare2 className="w-4 h-4" /> Pilih Sopir Penanggung Jawab
                      </label>
                      
                      <button 
                        type="button" 
                        onClick={() => { setIsDriverDropdownOpen(!isDriverDropdownOpen); setIsTypeDropdownOpen(false); }} 
                        className={cn(
                          "w-full px-5 py-3.5 bg-white backdrop-blur-md border rounded-[1rem] flex items-center justify-between shadow-sm active:scale-[0.98] transition-all mt-2",
                          isDriverDropdownOpen ? "border-blue-600 ring-2 ring-blue-600/20" : "border-slate-200"
                        )}
                      >
                        <span className={cn("text-sm font-black truncate", formData.driverId ? "text-slate-900" : "text-slate-400")}>
                          {formData.driverId ? availableDrivers.find(d => d.id === formData.driverId)?.name : "-- Pilih Sopir PT Anda --"}
                        </span>
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      </button>
                      
                      <AnimatePresence>
                        {isDriverDropdownOpen && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-[85px] left-5 right-5 z-50 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto no-scrollbar">
                            {availableDrivers.length === 0 && <div className="p-4 text-center text-xs font-bold text-slate-500">Anda belum mendaftarkan sopir satupun.</div>}
                            {availableDrivers.map(d => (
                              <button key={d.id} type="button" onClick={() => { setFormData({ ...formData, driverId: d.id }); setIsDriverDropdownOpen(false); }} className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-3 active:bg-slate-100 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"><UserSquare2 className="w-4 h-4 text-slate-500"/></div>
                                <span className="font-black text-slate-800 tracking-tight truncate">{d.name}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Upload Dokumen Kendaraan</label>
                      <div className="grid grid-cols-2 gap-3">
                        <UploadBox label="STNK Truk Asli" isRequired={modalMode === "add"} isUploaded={!!oldUrls.stnk} file={files.stnk} onClick={() => refs.stnk.current?.click()} icon={<FileText className="w-5 h-5"/>} />
                        <UploadBox label="Buku KIR Aktif" isRequired={modalMode === "add"} isUploaded={!!oldUrls.kir} file={files.kir} onClick={() => refs.kir.current?.click()} icon={<ShieldAlert className="w-5 h-5"/>} />
                      </div>
                    </div>

                    {/* Hidden Inputs */}
                    <input type="file" accept="image/*" ref={refs.stnk} onChange={e => handleFileChange('stnk', e)} className="hidden" />
                    <input type="file" accept="image/*" ref={refs.kir} onChange={e => handleFileChange('kir', e)} className="hidden" />
                  </form>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white/90 backdrop-blur-md pb-safe shrink-0">
                  <Button 
                    type="submit" 
                    form="form-vehicle" 
                    disabled={isSaving} 
                    variant="primary"
                    size="lg"
                    className="w-full h-14 bg-gradient-to-b from-blue-600 to-blue-700 border-blue-800 shadow-blue-600/30 gap-2"
                  >
                    {isSaving ? "Memproses Data..." : <><CheckCircle2 className="w-5 h-5"/> Simpan Data Truk</>}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* MODAL RIWAYAT ORDER ARMADA (BOTTOM SHEET)                 */}
        {/* ========================================================= */}
        <AnimatePresence>
          {isHistoryOpen && selectedHistoryVehicle && (
            <div className="fixed inset-0 z-[999999] flex items-end justify-center font-sans">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)} />
              
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-white/90 backdrop-blur-2xl border-t border-white rounded-t-[2.5rem] w-full max-w-md relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] flex flex-col max-h-[85vh]"
              >
                <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-12 h-1.5 bg-slate-300/80 rounded-full mb-2" />
                </div>

                <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <History className="w-5 h-5 text-blue-600"/> Riwayat Armada
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{selectedHistoryVehicle.licensePlate} ({selectedHistoryVehicle.vehicleType})</p>
                  </div>
                  <button onClick={() => setIsHistoryOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors active:scale-90 tap-highlight-transparent"><X size={18} strokeWidth={2.5}/></button>
                </div>

                <div className="px-6 py-6 overflow-y-auto flex-1 no-scrollbar space-y-4">
                  {isLoadingHistory ? (
                    <div className="flex flex-col items-center justify-center h-40">
                      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-3 shadow-sm"></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat log perjalanan...</p>
                    </div>
                  ) : vehicleHistoryOrders.length === 0 ? (
                    <div className="glass-card bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-8 text-center flex flex-col items-center shadow-sm">
                      <div className="w-14 h-14 bg-white rounded-[1.25rem] flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                        <Package className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-black text-slate-800 tracking-tight">Belum Ada Riwayat Perjalanan</p>
                      <p className="text-xs font-medium text-slate-500 mt-1 max-w-[200px] leading-relaxed">Armada ini belum pernah menyelesaikan pengiriman apapun.</p>
                    </div>
                  ) : (
                    vehicleHistoryOrders.map(order => {
                      const destObj = order.destinations && order.destinations.length > 0 ? order.destinations[0] : null;
                      const destAddr = destObj?.address || order.destination || "Alamat tidak diketahui";
                      const earned = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
                      
                      const tsMillis = getSafeMillis(order.updatedAt || order.createdAt);
                      const dateStr = tsMillis > 0 ? new Date(tsMillis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";
                      const isDone = order.status === "Selesai";

                      return (
                        <div key={order.id} className="glass-card bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                          <div className="flex justify-between items-start mb-4">
                            <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm", isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200')}>
                              {order.status}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dateStr}</span>
                          </div>
                          
                          <div className="flex items-start gap-3 mb-4">
                            <div className="mt-0.5 bg-slate-50 shadow-sm p-1.5 rounded-full border border-slate-100 shrink-0">
                              <MapPin className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 leading-relaxed line-clamp-2">{destAddr}</p>
                          </div>

                          <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-5 px-5 pb-1">
                            <div>
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Resi AWB</p>
                              <p className="text-xs font-mono font-black text-slate-600">#{order.id.substring(0,8)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Omset Truk</p>
                              <p className="text-sm font-black text-emerald-600 tracking-tight">{formatRupiah(earned)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>,
      document.body
    );
  };

  return (
    <div className="space-y-4">
      {/* 🚀 TOAST GLOBAL (PORTAL READY) */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className={cn(
            "fixed top-4 left-4 right-4 z-[9999999] p-4 rounded-[1.25rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 backdrop-blur-md border",
            toast.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-red-500/90 border-red-400 text-white"
          )}>
            {toast.type === "success" ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            <p className="text-sm font-bold tracking-tight">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER MODAL DARI PORTAL */}
      {renderModals()}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600" /> Daftar Truk Fisik
        </h2>
        <button 
          onClick={handleOpenAdd} 
          className="bg-gradient-to-b from-blue-500 to-blue-600 text-white text-[10px] uppercase tracking-widest font-black px-4 py-2.5 rounded-full shadow-[0_4px_15px_rgba(37,99,235,0.3)] hover:shadow-blue-500/50 border border-blue-700 transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Plus size={14} strokeWidth={3} /> Tambah Truk
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin shadow-sm mb-3"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat Data Armada...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="glass-card bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 text-center shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-100 rounded-[1.25rem] flex items-center justify-center mb-4 border border-white shadow-sm">
            <Truck className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-sm font-black text-slate-800 tracking-tight">Belum Ada Truk Terdaftar</h3>
          <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed mb-6 max-w-[220px]">Daftarkan armada fisik Anda beserta kelengkapan dokumen STNK dan KIR.</p>
          <Button 
            variant="primary" 
            size="md"
            onClick={handleOpenAdd} 
            className="w-full bg-gradient-to-b from-blue-500 to-blue-600 border-blue-700 shadow-blue-500/30 text-xs font-bold shadow-lg"
          >
            <Plus size={16} className="mr-1" /> Daftarkan Truk Sekarang
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {vehicles.map(vehicle => (
              <motion.div 
                key={vehicle.id} 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }} 
                className="glass-card bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="w-14 h-14 bg-slate-50 rounded-[1.25rem] flex items-center justify-center border border-slate-200 shadow-inner shrink-0 text-slate-400">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-black text-slate-900 text-base tracking-tight truncate uppercase">{vehicle.licensePlate}</h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate mb-1.5">{vehicle.vehicleType}</p>
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md w-fit shadow-sm">
                      <UserSquare2 className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-bold text-blue-800 truncate max-w-[120px]">{vehicle.driverName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full pt-4 border-t border-slate-100">
                  {vehicle.status === "Active" ? (
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">Aktif Mengaspal</span>
                  ) : (
                    <span className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm animate-pulse">Menunggu Verifikasi</span>
                  )}
                  
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenHistory(vehicle)} className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm active:scale-90 tap-highlight-transparent" title="Riwayat Order Armada">
                      <History className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleOpenEdit(vehicle)} className="w-9 h-9 flex items-center justify-center bg-blue-50 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 shadow-sm active:scale-90 tap-highlight-transparent" title="Edit Data">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteVehicle(vehicle.id, vehicle.licensePlate)} className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-xl transition-colors border border-red-200 shadow-sm active:scale-90 tap-highlight-transparent" title="Hapus Armada">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// APPLE-STYLE UPLOAD BOX COMPONENT
// --------------------------------------------------------------------------
function UploadBox({ label, file, onClick, isRequired = false, isUploaded = false, icon }: { label: string, file: File | null, onClick: () => void, isRequired?: boolean, isUploaded?: boolean, icon: React.ReactNode }) {
  const showSuccess = file || isUploaded;
  return (
    <div onClick={onClick} className={cn(
      "cursor-pointer border-2 rounded-[1rem] p-3 flex flex-col items-center justify-center text-center transition-all h-28 group tap-highlight-transparent active:scale-95 shadow-sm",
      showSuccess ? "border-emerald-400 bg-emerald-50/50" : "border-slate-200 border-dashed bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
    )}>
      <div className={cn("mb-2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors border", showSuccess ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-white text-slate-400 border-slate-200 group-hover:text-blue-500 group-hover:border-blue-200 group-hover:shadow-sm")}>
        {showSuccess ? <CheckCircle2 className="w-4 h-4" /> : icon}
      </div>
      <p className={cn("text-[9px] font-black uppercase tracking-widest leading-tight", showSuccess ? "text-emerald-700" : "text-slate-600")}>
        {label} {isRequired && !showSuccess && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      {file && <p className="text-[8px] text-emerald-600 mt-1 truncate w-full px-1 font-bold">{file.name}</p>}
      {!file && isUploaded && <p className="text-[8px] text-emerald-600 mt-1 truncate w-full px-1 font-bold">Terunggah</p>}
    </div>
  );
}