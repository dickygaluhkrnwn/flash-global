"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Radar, MapPin, Package, Weight, Clock, 
  CheckCircle2, AlertTriangle, Truck, UserPlus, X, Loader2, ArrowRight
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderRadar } from "@/hooks/useOrderRadar";
import { OrderDetail, LocationDetail } from "@/types/order";

// UTILS LOKAL
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

interface FleetDriver {
  id: string;
  name: string;
}

export default function MobileRadarPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  
  // 🚀 TAHAP 4: HOOK RADAR CERDAS (Geofencing Aktif)
  // Menambahkan user?.city agar orderan yang tampil HANYA yang sekota dengan driver
  const { orders, isLoading: radarLoading, error } = useOrderRadar(
    user?.partnerType || "", 
    user?.city || ""
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{type: "success"|"error", msg: string} | null>(null);

  // VENDOR MODAL STATE
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedOrderForVendor, setSelectedOrderForVendor] = useState<OrderDetail | null>(null);
  const [vendorDrivers, setVendorDrivers] = useState<FleetDriver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  const showToast = (msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // FETCH SOPIR VENDOR (Hanya dipanggil jika rolenya Vendor)
  useEffect(() => {
    if (user?.partnerType === "Vendor") {
      const fetchDrivers = async () => {
        try {
          const q = query(collection(db, "driver_wallets"), where("vendorId", "==", user.uid), where("partnerType", "==", "FleetDriver"));
          const snap = await getDocs(q);
          setVendorDrivers(snap.docs.map(d => ({ id: d.id, name: d.data().name || "Tanpa Nama" })));
        } catch (error) {
          console.error("Gagal menarik data sopir:", error);
        }
      };
      fetchDrivers();
    }
  }, [user]);

  // =======================================================================
  // LOGIKA PENERIMAAN ORDER (INDIVIDU & VENDOR)
  // =======================================================================
  const handleAcceptOrder = async (order: OrderDetail, assignedDriverId?: string, assignedDriverName?: string) => {
    setIsProcessing(true);
    try {
      const orderRef = doc(db, "orders", order.id);
      
      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();

      // Penentuan identitas kurir yang mengambil
      const finalDriverId = assignedDriverId || user?.uid;
      const finalDriverName = assignedDriverName || user?.displayName || "Mitra Kurir";

      // LOGIKA KETAT: Sesuaikan dengan standar History Tracking Admin
      const trackingLog = {
        id: uniqueId,
        status: "Menuju Lokasi Jemput",
        date: logDate,
        description: `Sopir ${finalDriverName} telah menerima pesanan dan sedang menuju lokasi penjemputan.`,
        location: "Titik Kurir Berangkat"
      };

      await updateDoc(orderRef, {
        status: "Menuju Lokasi Jemput",
        driverId: finalDriverId,
        driverName: finalDriverName,
        trackingHistory: arrayUnion(trackingLog)
      });

      showToast(`Berhasil mengambil pesanan #${order.id.substring(0,8)}!`);
      setShowVendorModal(false);
      
      // Arahkan ke Layar Eksekusi (Resi / AWB)
      setTimeout(() => {
        router.push(`/driver/awb/${order.id}`);
      }, 1500);

    } catch (error) {
      console.error(error);
      showToast("Gagal mengambil order. Mungkin sudah diambil kurir lain.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const onVendorClickAccept = (order: OrderDetail) => {
    setSelectedOrderForVendor(order);
    setSelectedDriverId("");
    setShowVendorModal(true);
  };

  if (!isHydrated) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans pb-24 flex flex-col relative overflow-hidden">
      
      {/* GLOBAL TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-4 left-4 right-4 z-[99999] p-4 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md border ${toast.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-red-500/90 border-red-400 text-white"}`}>
            {toast.type === "success" ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            <p className="text-sm font-bold leading-tight">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STICKY HEADER */}
      <div className="sticky top-0 z-40 w-full bg-slate-900 px-5 pt-8 pb-5 shadow-lg rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Radar className="w-6 h-6 text-emerald-400 animate-pulse" /> Radar Bursa
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mencari Pesanan di Sekitar...</p>
          </div>
          <div className="bg-emerald-500/20 border border-emerald-500/50 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Online</span>
          </div>
        </div>
      </div>

      <main className="flex-1 relative z-10 p-5">
        
        {/* ANIMASI RADAR BACKGROUND */}
        {radarLoading || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} className="w-32 h-32 border-4 border-emerald-500 rounded-full absolute" />
              <motion.div animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.6 }} className="w-32 h-32 border-4 border-emerald-400 rounded-full absolute" />
              <motion.div animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1.2 }} className="w-32 h-32 border-4 border-[#7A171D] rounded-full absolute" />
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.2)] z-10">
                <Radar className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            
            <div className="relative z-20 mt-40 text-center">
              {error ? (
                <p className="text-red-500 font-bold text-sm bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>
              ) : radarLoading ? (
                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Memindai Frekuensi...</p>
              ) : (
                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Belum ada order masuk.</p>
              )}
            </div>
          </div>
        ) : (
          /* LIST ORDER CARDS */
          <div className="space-y-4">
            <AnimatePresence>
              {orders.map(order => {
                const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
                const originAddr = originObj?.address || (typeof order.origin === 'string' ? order.origin : "Lokasi Tidak Diketahui");
                const destAddr = order.destinations && order.destinations.length > 0 ? order.destinations[0].address : (order.destination || "Tujuan Tidak Diketahui");
                const totalIncome = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;

                return (
                  <motion.div 
                    key={order.id} 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} 
                    className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden relative"
                  >
                    {/* Ribbon Tag */}
                    <div className="absolute top-0 right-0 bg-[#7A171D] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-bl-xl shadow-sm z-10">
                      Baru Masuk
                    </div>

                    <div className="p-5">
                      {/* Informasi Harga & Layanan */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{order.serviceType || "Reguler"} • {order.vehicleName || order.vehicle}</p>
                          <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatRupiah(totalIncome)}</p>
                        </div>
                      </div>

                      {/* Rute Perjalanan */}
                      <div className="relative pl-3 mb-5 mt-2">
                        <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-slate-200 border-dashed border-l-2 border-slate-300 z-0"></div>
                        <div className="space-y-4 relative z-10">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 bg-white p-0.5 rounded-full"><MapPin className="w-4 h-4 text-slate-400" /></div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Penjemputan</p>
                              <p className="font-bold text-slate-800 text-xs line-clamp-2">{originAddr}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 bg-white p-0.5 rounded-full"><MapPin className="w-4 h-4 text-[#7A171D]" /></div>
                            <div>
                              <p className="text-[9px] font-bold text-[#7A171D] uppercase tracking-wider mb-0.5">Pengantaran</p>
                              <p className="font-bold text-slate-800 text-xs line-clamp-2">{destAddr}</p>
                              {order.destinations && order.destinations.length > 1 && (
                                <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">+{order.destinations.length - 1} Titik Drop</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Spesifikasi Ringkas */}
                      <div className="flex gap-2 mb-5">
                        <div className="bg-slate-50 flex-1 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                          <Weight className="w-4 h-4 text-slate-400 mb-1" />
                          <p className="text-[10px] font-black text-slate-700">{order.totalWeight || order.weight || 0} Kg</p>
                        </div>
                        <div className="bg-slate-50 flex-1 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                          <Package className="w-4 h-4 text-slate-400 mb-1" />
                          <p className="text-[10px] font-black text-slate-700 uppercase">{order.vehicleName || order.vehicle}</p>
                        </div>
                        <div className="bg-slate-50 flex-1 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                          <Clock className="w-4 h-4 text-slate-400 mb-1" />
                          <p className="text-[10px] font-black text-slate-700">Instan</p>
                        </div>
                      </div>

                      {/* Tombol Eksekusi Berdasarkan Role */}
                      {user?.partnerType === "Vendor" ? (
                        <button 
                          onClick={() => onVendorClickAccept(order)}
                          disabled={isProcessing}
                          className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-900/20 flex justify-center items-center gap-2 text-sm transition-transform active:scale-95"
                        >
                          Tarik Order & Tugaskan Sopir <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAcceptOrder(order)}
                          disabled={isProcessing}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 flex justify-center items-center gap-2 text-sm transition-transform active:scale-95"
                        >
                          {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin"/> Menerima...</> : <><CheckCircle2 className="w-4 h-4" /> Terima Order Sekarang</>}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* MODAL PENUGASAN KHUSUS VENDOR */}
      <AnimatePresence>
        {showVendorModal && selectedOrderForVendor && (
          <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowVendorModal(false)} />
            
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Truck className="w-5 h-5 text-[#7A171D]"/> Tugaskan Sopir PT</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">AWB #{selectedOrderForVendor.id.substring(0,8)}</p>
                </div>
                <button onClick={() => setShowVendorModal(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-slate-200 shadow-sm"><X size={18} /></button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
                <p className="text-sm font-bold text-slate-600 mb-4 leading-relaxed">
                  Pesanan <span className="text-[#7A171D]">Heavy Cargo</span> ini telah dikunci untuk PT Anda. Silakan pilih sopir yang akan mengeksekusi order ini:
                </p>

                <div className="space-y-3">
                  {vendorDrivers.length === 0 ? (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                      <p className="text-xs font-bold text-red-600">Anda belum mendaftarkan sopir satupun.</p>
                      <p className="text-[10px] text-red-500 mt-1">Buka menu Armada untuk menambah Karyawan.</p>
                    </div>
                  ) : (
                    vendorDrivers.map(driver => (
                      <label key={driver.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedDriverId === driver.id ? 'border-[#7A171D] bg-[#7A171D]/5' : 'border-slate-200 bg-white hover:border-[#7A171D]/30'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedDriverId === driver.id ? 'bg-[#7A171D] text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <div>
                            <p className={`text-sm font-black ${selectedDriverId === driver.id ? 'text-[#7A171D]' : 'text-slate-800'}`}>{driver.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {driver.id.substring(0,6)}</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedDriverId === driver.id ? 'border-[#7A171D]' : 'border-slate-300'}`}>
                          {selectedDriverId === driver.id && <div className="w-3 h-3 bg-[#7A171D] rounded-full" />}
                        </div>
                        {/* Hidden Radio Input */}
                        <input type="radio" name="driverAssign" value={driver.id} checked={selectedDriverId === driver.id} onChange={() => setSelectedDriverId(driver.id)} className="hidden" />
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 bg-white shrink-0 pb-10 sm:pb-5">
                <button 
                  onClick={() => {
                    const selectedD = vendorDrivers.find(d => d.id === selectedDriverId);
                    if (selectedD) handleAcceptOrder(selectedOrderForVendor, selectedD.id, selectedD.name);
                  }} 
                  disabled={isProcessing || !selectedDriverId} 
                  className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-[#7A171D]/20 flex justify-center items-center gap-2 disabled:opacity-70 disabled:grayscale"
                >
                  {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin"/> Memproses...</> : <><CheckCircle2 className="w-5 h-5"/> Konfirmasi Penugasan</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}