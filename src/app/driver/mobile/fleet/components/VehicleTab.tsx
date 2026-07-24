"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Truck, Plus, X, CheckCircle, Loader2, 
  UserSquare2, FileText, ShieldAlert, AlertTriangle, Trash2, Edit2,
  History, MapPin, Package
} from "lucide-react";
import { collection, query, where, setDoc, doc, serverTimestamp, getDoc, onSnapshot, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Input } from "@/components/ui/Input";
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
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<FleetDriver[]>([]);
  const [vehiclesConfig, setVehiclesConfig] = useState<DynamicVehicle[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  const [vendorCompanyName, setVendorCompanyName] = useState("");
  const [toast, setToast] = useState<{type: "success"|"error", msg: string} | null>(null);

  // 🚀 History Modal State
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

  const showToast = (msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 🔄 REAL-TIME LISTENER MENGGUNAKAN onSnapshot
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

    // Listener Real-time Sopir (Buat ngisi dropdown di form tambah truk)
    const dQuery = query(collection(db, "driver_wallets"), where("partnerType", "==", "FleetDriver"), where("vendorId", "==", user.uid));
    const unsubDrivers = onSnapshot(dQuery, (snap) => {
      setAvailableDrivers(snap.docs.map(d => ({ id: d.id, name: d.data().name || "Tanpa Nama" })));
    });

    // Listener Real-time Truk (Buat ngisi List View)
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
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validasi di mode ADD
    if (modalMode === "add" && (!files.stnk || !files.kir)) {
      return showToast("Foto STNK dan KIR wajib diunggah!", "error");
    }
    if (!formData.driverId) {
      return showToast("Harap tugaskan truk ke salah satu sopir Anda.", "error");
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

  // 🚀 FITUR BARU: TARIK RIWAYAT ORDER PER TRUK
  const handleOpenHistory = async (vehicle: FleetVehicle) => {
    setSelectedHistoryVehicle(vehicle);
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    setVehicleHistoryOrders([]);

    try {
      // Cari orderan yang menggunakan Truk ini berdasarkan plat/nama armada
      const q = query(
        collection(db, "orders"),
        where("vehicleName", "==", vehicle.name)
      );
      const snap = await getDocs(q);
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail));

      // Sorting paling baru ke lama
      orders.sort((a, b) => getSafeMillis(b.updatedAt || b.createdAt) - getSafeMillis(a.updatedAt || a.createdAt));

      setVehicleHistoryOrders(orders);
    } catch (error) {
      console.error("Gagal menarik riwayat armada", error);
      showToast("Gagal menarik riwayat armada.", "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-4 left-4 right-4 z-[99999] p-4 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md border ${toast.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-red-500/90 border-red-400 text-white"}`}>
            {toast.type === "success" ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            <p className="text-sm font-bold leading-tight">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600" /> Daftar Truk Fisik
        </h2>
        <button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-colors flex items-center gap-1.5">
          <Plus size={16} /> Tambah
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : vehicles.length === 0 ? (
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
          <Truck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800">Belum Ada Truk Terdaftar</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed mb-5">Daftarkan armada fisik Anda beserta kelengkapan dokumen STNK dan KIR.</p>
          <button onClick={handleOpenAdd} className="bg-white border border-slate-300 text-slate-700 text-xs font-bold px-5 py-3 rounded-xl shadow-sm hover:bg-slate-50 transition-colors inline-flex items-center gap-2">
            <Plus size={16} /> Daftarkan Truk Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {vehicles.map(vehicle => (
              <motion.div key={vehicle.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 relative">
                
                <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
                  <div className="w-12 h-12 bg-[#7A171D]/10 text-[#7A171D] rounded-xl flex items-center justify-center border border-[#7A171D]/20 shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-black text-slate-900 text-sm truncate">{vehicle.licensePlate}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate mb-1">{vehicle.vehicleType}</p>
                    <div className="flex items-center gap-1.5 mt-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md w-fit">
                      <UserSquare2 className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{vehicle.driverName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto gap-2 pt-3 mt-3 sm:pt-0 sm:mt-0 border-t sm:border-0 border-slate-100">
                  {vehicle.status === "Active" ? (
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">Aktif</span>
                  ) : (
                    <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider animate-pulse">Menunggu Review</span>
                  )}
                  
                  <div className="flex gap-1.5 ml-2">
                    {/* TOMBOL RIWAYAT BARU */}
                    <button onClick={() => handleOpenHistory(vehicle)} className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition-colors border border-slate-200" title="Riwayat Order Armada">
                      <History className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleOpenEdit(vehicle)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-xl transition-colors border border-blue-200" title="Edit Data">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteVehicle(vehicle.id, vehicle.licensePlate)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-xl transition-colors border border-red-200" title="Hapus Armada">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL RIWAYAT ORDER ARMADA (HISTORY) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isHistoryOpen && selectedHistoryVehicle && (
          <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)} />
            
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 flex flex-col h-[85vh] sm:h-[80vh]"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-600"/> Riwayat Armada
                  </h2>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">{selectedHistoryVehicle.licensePlate} ({selectedHistoryVehicle.vehicleType})</p>
                </div>
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-slate-200 shadow-sm"><X size={18} /></button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center h-40">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-xs font-bold text-slate-500">Memuat log perjalanan...</p>
                  </div>
                ) : vehicleHistoryOrders.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-6 text-center">
                    <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-600">Belum Ada Riwayat Perjalanan</p>
                    <p className="text-[10px] text-slate-400 mt-1">Armada ini belum pernah menyelesaikan pengiriman apapun.</p>
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
                      <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                            {order.status}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">{dateStr}</span>
                        </div>
                        
                        <div className="flex items-start gap-2 mb-3">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <p className="text-xs font-bold text-slate-700 leading-relaxed line-clamp-2">{destAddr}</p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Resi AWB</p>
                            <p className="text-xs font-mono font-bold text-slate-600">#{order.id.substring(0,8)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Omset Truk</p>
                            <p className="text-sm font-black text-slate-800">{formatRupiah(earned)}</p>
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

      {/* ========================================================= */}
      {/* MODAL TAMBAH/EDIT TRUK */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)} />
            
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600"/> 
                  {modalMode === "add" ? "Pendaftaran Truk PT" : "Edit Data Truk"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-slate-200 shadow-sm"><X size={18} /></button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">

                {modalMode === "edit" && (
                  <div className="mb-5 bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-800 font-medium">Menyimpan perubahan akan mengembalikan status truk menjadi <b>Pending</b> untuk ditinjau ulang oleh Admin.</p>
                  </div>
                )}

                <form id="form-vehicle" onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* DROPDOWN KATEGORI TRUK DARI ADMIN */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipe Klasifikasi Truk</label>
                    <select 
                      required 
                      value={formData.vehicleType} 
                      onChange={(e) => setFormData({...formData, vehicleType: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Tipe Armada --</option>
                      {vehiclesConfig.length === 0 && <option value="" disabled>Master Data Truk Kosong</option>}
                      {vehiclesConfig.map(v => (
                        <option key={v.id} value={v.name}>{v.name} (Maks {v.maxWeight}Kg)</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plat Nomor Kendaraan</label>
                    <Input required value={formData.licensePlate} onChange={e => setFormData({...formData, licensePlate: e.target.value})} placeholder="Cth: B 1234 CD" className="font-mono font-bold border-slate-200 uppercase" />
                  </div>

                  {/* ASSIGN SOPIR */}
                  <div className="space-y-1.5 bg-blue-50 border border-blue-200 p-4 rounded-xl">
                    <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                      <UserSquare2 className="w-3.5 h-3.5" /> Pilih Sopir Penanggung Jawab
                    </label>
                    <select 
                      required 
                      value={formData.driverId} 
                      onChange={(e) => setFormData({...formData, driverId: e.target.value})} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm font-bold outline-none focus:border-blue-500 shadow-sm appearance-none cursor-pointer mt-2"
                    >
                      <option value="" disabled>-- Pilih Sopir PT Anda --</option>
                      {availableDrivers.length === 0 && <option value="" disabled>Anda belum mendaftarkan sopir satupun.</option>}
                      {availableDrivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t border-dashed border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Upload Dokumen Kendaraan</label>
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

              <div className="p-5 border-t border-slate-100 bg-white shrink-0 pb-10 sm:pb-5">
                <button type="submit" form="form-vehicle" disabled={isSaving} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-slate-800/20 flex justify-center items-center gap-2 disabled:opacity-70">
                  {isSaving ? <><Loader2 className="w-5 h-5 animate-spin"/> Memproses Data...</> : <><CheckCircle className="w-5 h-5"/> Simpan Data</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadBox({ label, file, onClick, isRequired = false, isUploaded = false, icon }: { label: string, file: File | null, onClick: () => void, isRequired?: boolean, isUploaded?: boolean, icon: React.ReactNode }) {
  const showSuccess = file || isUploaded;
  return (
    <div onClick={onClick} className={`cursor-pointer border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center transition-all h-24 group ${showSuccess ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:border-blue-400"}`}>
      <div className={`mb-1.5 ${showSuccess ? "text-emerald-500" : "text-slate-400 group-hover:text-blue-500"}`}>
        {showSuccess ? <CheckCircle className="w-5 h-5" /> : icon}
      </div>
      <p className={`text-[9px] font-black uppercase tracking-widest leading-tight ${showSuccess ? "text-emerald-700" : "text-slate-600"}`}>
        {label} {isRequired && !showSuccess && <span className="text-red-500">*</span>}
      </p>
      {file && <p className="text-[8px] text-emerald-600 mt-1 truncate w-full px-1">{file.name}</p>}
      {!file && isUploaded && <p className="text-[8px] text-emerald-600 mt-1 truncate w-full px-1">Tersimpan (Klik Ubah)</p>}
    </div>
  );
}