"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Radar, MapPin, Package, Weight, Clock, 
  CheckCircle2, AlertTriangle, UserPlus, X, ArrowRight
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderRadar } from "@/hooks/useOrderRadar";
import { OrderDetail, LocationDetail } from "@/types/order";
import { cn } from "@/lib/utils";

// IMPORT PREMIUM COMPONENTS
import { Button } from "@/components/ui/Button";

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getDriverUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('driver.flashglobalslogistik.com')) {
    let cleanPath = path.replace(/^\/driver\/mobile/, '');
    cleanPath = cleanPath.replace(/^\/driver/, '');
    return cleanPath || '/';
  }
  if (path.startsWith('/driver') && !path.startsWith('/driver/mobile')) {
    return path.replace('/driver', '/driver/mobile');
  }
  return path;
};

// UTILS LOKAL
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

interface FleetDriver {
  id: string;
  name: string;
}

export default function MobileRadarPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  
  // HOOK RADAR CERDAS (Geofencing Aktif)
  const { orders, isLoading: radarLoading, error } = useOrderRadar(
    user?.partnerType || "", 
    user?.city || ""
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{type: "success"|"error", msg: string} | null>(null);

  // VENDOR MODAL STATE (Bottom Sheet)
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedOrderForVendor, setSelectedOrderForVendor] = useState<OrderDetail | null>(null);
  const [vendorDrivers, setVendorDrivers] = useState<FleetDriver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  const showToast = (msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // FETCH SOPIR VENDOR
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

  // LOGIKA PENERIMAAN ORDER
  const handleAcceptOrder = async (order: OrderDetail, assignedDriverId?: string, assignedDriverName?: string) => {
    setIsProcessing(true);
    try {
      const orderRef = doc(db, "orders", order.id);
      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();

      const finalDriverId = assignedDriverId || user?.uid;
      const finalDriverName = assignedDriverName || user?.displayName || "Mitra Kurir";

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
      
      // Arahkan ke Layar Eksekusi (Resi / AWB) - DINAMIS ROUTING
      setTimeout(() => {
        router.push(getDriverUrl(`/driver/awb/${order.id}`));
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
    // FULLSCREEN IMMERSIVE CONTAINER
    <div className="min-h-screen bg-[var(--background)] font-sans flex flex-col relative overflow-hidden tap-highlight-transparent">
      
      {/* 🚀 BACKGROUND RADAR ANIMATION (Selalu jalan di belakang layaknya peta) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[80px]" />
        
        <motion.div animate={{ scale: [1, 3], opacity: [0.3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }} className="w-40 h-40 border-[3px] border-emerald-400 rounded-full absolute" />
        <motion.div animate={{ scale: [1, 3], opacity: [0.3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1 }} className="w-40 h-40 border-[3px] border-emerald-500 rounded-full absolute" />
        <motion.div animate={{ scale: [1, 3], opacity: [0.3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 2 }} className="w-40 h-40 border-[3px] border-[var(--brand-maroon)] rounded-full absolute" />
        
        <div className="w-20 h-20 bg-slate-900/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)] border border-white/10 z-10">
          <Radar className="w-10 h-10 text-emerald-400" />
        </div>
      </div>

      {/* GLOBAL TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -50, scale: 0.95 }} className={cn(
            "fixed top-4 left-4 right-4 z-[99999] p-4 rounded-[1.25rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 backdrop-blur-xl border",
            toast.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-red-500/90 border-red-400 text-white"
          )}>
            {toast.type === "success" ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            <p className="text-sm font-bold leading-tight">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 FLOATING HEADER (GLASSMORPHISM) */}
      <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-6 pb-2 pointer-events-none">
        <div className="glass-panel px-5 py-4 rounded-[2rem] flex items-center justify-between shadow-lg pointer-events-auto border border-white/60">
          <div>
            <h1 className="text-lg font-black text-slate-800 flex items-center gap-2 tracking-tight">
              <Radar className="w-5 h-5 text-emerald-500 animate-pulse" /> Radar Bursa
            </h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Memindai Area: {user?.city || "Pusat"}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,1)]">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping absolute"></span>
            <span className="w-2 h-2 bg-emerald-500 rounded-full relative z-10"></span>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Online</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative z-10 px-4 pt-32 pb-32 overflow-y-auto no-scrollbar">
        
        {radarLoading || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            {error ? (
              <div className="glass-card bg-red-50/80 border border-red-200 p-4 rounded-2xl max-w-[80%]">
                <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 font-bold text-xs">{error}</p>
              </div>
            ) : radarLoading ? (
              <p className="text-slate-600 font-black text-sm uppercase tracking-widest bg-white/60 backdrop-blur-md px-6 py-3 rounded-full border border-white shadow-sm mt-32">Memindai Frekuensi...</p>
            ) : (
              <p className="text-slate-500 font-black text-xs uppercase tracking-widest bg-white/60 backdrop-blur-md px-6 py-3 rounded-full border border-white shadow-sm mt-32">Area Bersih. Belum Ada Order.</p>
            )}
          </div>
        ) : (
          /* 🚀 LIST ORDER CARDS (GLASS BENTO) */
          <div className="space-y-5">
            <AnimatePresence>
              {orders.map(order => {
                const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
                const originAddr = originObj?.address || (typeof order.origin === 'string' ? order.origin : "Lokasi Tidak Diketahui");
                const destAddr = order.destinations && order.destinations.length > 0 ? order.destinations[0].address : (order.destination || "Tujuan Tidak Diketahui");
                const totalIncome = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;

                return (
                  <motion.div 
                    key={order.id} 
                    initial={{ opacity: 0, y: 30, scale: 0.95 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.9, filter: "blur(5px)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="glass-card rounded-[2rem] border border-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden relative"
                  >
                    {/* Ribbon Tag Premium */}
                    <div className="absolute top-0 right-0 bg-gradient-to-bl from-[#9A242B] to-[#7A171D] text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-[1.25rem] shadow-sm z-10 border-l border-b border-[#5A0E13]/30">
                      Baru Masuk
                    </div>

                    <div className="p-6">
                      {/* Informasi Harga & Layanan */}
                      <div className="flex justify-between items-start mb-5">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-[#C5A059] rounded-full"></span>
                            {order.serviceType || "Reguler"} • {order.vehicleName || order.vehicle}
                          </p>
                          <p className="text-3xl font-black text-emerald-600 font-mono tracking-tighter drop-shadow-sm">{formatRupiah(totalIncome)}</p>
                        </div>
                      </div>

                      {/* Rute Perjalanan */}
                      <div className="relative pl-4 mb-6 mt-2">
                        <div className="absolute left-[19px] top-3 bottom-3 w-[3px] bg-slate-100 rounded-full z-0"></div>
                        <div className="absolute left-[19px] top-3 h-1/2 w-[3px] bg-gradient-to-b from-slate-300 to-transparent rounded-full z-0"></div>
                        
                        <div className="space-y-5 relative z-10">
                          <div className="flex items-start gap-4">
                            <div className="mt-0.5 bg-white shadow-sm p-1 rounded-full border border-slate-200 z-10">
                              <MapPin className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Penjemputan</p>
                              <p className="font-black text-slate-800 text-sm line-clamp-2 leading-snug">{originAddr}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="mt-0.5 bg-white shadow-sm p-1 rounded-full border border-slate-200 z-10">
                              <MapPin className="w-4 h-4 text-[var(--brand-maroon)]" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-[var(--brand-maroon)] uppercase tracking-widest mb-0.5">Pengantaran</p>
                              <p className="font-black text-slate-800 text-sm line-clamp-2 leading-snug">{destAddr}</p>
                              {order.destinations && order.destinations.length > 1 && (
                                <span className="inline-block mt-1.5 text-[9px] font-black uppercase tracking-widest text-[#A68345] bg-[#C5A059]/10 border border-[#C5A059]/20 px-2 py-1 rounded-lg">
                                  +{order.destinations.length - 1} Titik Drop Tambahan
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Spesifikasi Ringkas (Bento Mini) */}
                      <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="bg-white/60 backdrop-blur-md p-2.5 rounded-[1.25rem] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1)] flex flex-col items-center justify-center">
                          <Weight className="w-4 h-4 text-slate-400 mb-1" />
                          <p className="text-[10px] font-black text-slate-700">{order.totalWeight || order.weight || 0} Kg</p>
                        </div>
                        <div className="bg-white/60 backdrop-blur-md p-2.5 rounded-[1.25rem] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1)] flex flex-col items-center justify-center">
                          <Package className="w-4 h-4 text-slate-400 mb-1" />
                          <p className="text-[10px] font-black text-slate-700 uppercase line-clamp-1 text-center w-full">{order.vehicleName || order.vehicle}</p>
                        </div>
                        <div className="bg-white/60 backdrop-blur-md p-2.5 rounded-[1.25rem] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1)] flex flex-col items-center justify-center">
                          <Clock className="w-4 h-4 text-slate-400 mb-1" />
                          <p className="text-[10px] font-black text-slate-700 uppercase">Instan</p>
                        </div>
                      </div>

                      {/* Tombol Eksekusi Premium */}
                      {user?.partnerType === "Vendor" ? (
                        <Button 
                          variant="secondary"
                          size="lg"
                          onClick={() => onVendorClickAccept(order)}
                          disabled={isProcessing}
                          className="w-full flex items-center justify-center gap-2"
                        >
                          Tarik Order & Tugaskan Sopir <ArrowRight className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button 
                          variant="primary"
                          size="lg"
                          onClick={() => handleAcceptOrder(order)}
                          disabled={isProcessing}
                          isLoading={isProcessing}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-700 shadow-emerald-600/30"
                        >
                          {!isProcessing && <><CheckCircle2 className="w-5 h-5" /> Terima Order Sekarang</>}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* 🚀 BOTTOM SHEET: MODAL PENUGASAN KHUSUS VENDOR (iOS STYLE) */}
      <AnimatePresence>
        {showVendorModal && selectedOrderForVendor && (
          <div className="fixed inset-0 z-[999] flex items-end justify-center">
            {/* Backdrop Blur */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => !isProcessing && setShowVendorModal(false)} 
            />
            
            {/* Sheet Container */}
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-t-[2.5rem] shadow-[0_-20px_40px_rgba(0,0,0,0.2)] relative z-10 flex flex-col max-h-[85vh] border-t border-white"
            >
              {/* iOS Drag Handle */}
              <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-12 h-1.5 bg-slate-300/80 rounded-full" />
              </div>

              <div className="px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Tugaskan Sopir</h2>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">AWB #{selectedOrderForVendor.id.substring(0,8)}</p>
                </div>
                <button onClick={() => setShowVendorModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors active:scale-90 tap-highlight-transparent"><X size={18} strokeWidth={2.5}/></button>
              </div>

              <div className="px-6 pb-2 overflow-y-auto flex-1 no-scrollbar">
                <p className="text-xs font-bold text-slate-500 mb-5 leading-relaxed">
                  Pilih karyawan / sopir armada PT Anda yang akan mengeksekusi pengiriman <span className="text-blue-600 font-black">{selectedOrderForVendor.vehicleName || selectedOrderForVendor.vehicle}</span> ini.
                </p>

                <div className="space-y-3 pb-6">
                  {vendorDrivers.length === 0 ? (
                    <div className="bg-red-50/80 backdrop-blur-md border border-red-100 p-5 rounded-[1.5rem] text-center">
                      <p className="text-sm font-black text-red-600">Armada Kosong</p>
                      <p className="text-xs font-medium text-red-500 mt-1">Anda belum mendaftarkan sopir satupun di menu Manajemen Armada.</p>
                    </div>
                  ) : (
                    vendorDrivers.map(driver => (
                      <label key={driver.id} className={cn(
                        "flex items-center justify-between p-4 rounded-[1.5rem] border-2 cursor-pointer transition-all active:scale-[0.98] tap-highlight-transparent",
                        selectedDriverId === driver.id ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-blue-200'
                      )}>
                        <div className="flex items-center gap-3.5">
                          <div className={cn(
                            "w-12 h-12 rounded-[1rem] flex items-center justify-center border transition-colors",
                            selectedDriverId === driver.id ? 'bg-blue-600 text-white border-blue-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]' : 'bg-slate-50 text-slate-400 border-slate-200'
                          )}>
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <div>
                            <p className={cn("text-sm font-black tracking-tight", selectedDriverId === driver.id ? 'text-blue-900' : 'text-slate-800')}>{driver.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {driver.id.substring(0,6)}</p>
                          </div>
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                          selectedDriverId === driver.id ? 'border-blue-600' : 'border-slate-200 bg-slate-50'
                        )}>
                          {selectedDriverId === driver.id && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                        </div>
                        {/* Hidden Radio Input */}
                        <input type="radio" name="driverAssign" value={driver.id} checked={selectedDriverId === driver.id} onChange={() => setSelectedDriverId(driver.id)} className="hidden" />
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Pinned Bottom Action */}
              <div className="p-6 bg-white/90 backdrop-blur-md border-t border-slate-100 pb-safe shrink-0">
                <Button 
                  onClick={() => {
                    const selectedD = vendorDrivers.find(d => d.id === selectedDriverId);
                    if (selectedD) handleAcceptOrder(selectedOrderForVendor, selectedD.id, selectedD.name);
                  }} 
                  disabled={isProcessing || !selectedDriverId} 
                  isLoading={isProcessing}
                  variant="primary"
                  size="lg"
                  className={cn("w-full flex items-center justify-center gap-2", "bg-gradient-to-b from-blue-600 to-blue-700 border-blue-800 shadow-blue-600/30")}
                >
                  {!isProcessing && <><CheckCircle2 className="w-5 h-5"/> Konfirmasi Penugasan</>}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}