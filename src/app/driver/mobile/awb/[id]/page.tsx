"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom"; 
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, MapPin, Truck, Scale, 
  CheckCircle2, AlertTriangle, ArrowLeft, Navigation, ShieldCheck, Focus,
  Camera, X, UploadCloud, ChevronUp, ChevronDown
} from "lucide-react";
import dynamic from "next/dynamic";

import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, onSnapshot, increment, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { OrderDetail, LocationDetail, DeliveryItem } from "@/types/order"; 
import { uploadToCloudinary } from "@/lib/cloudinary"; 
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => (
    <div className="h-full w-full bg-slate-100 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-[var(--brand-maroon)] rounded-full animate-spin mb-3 shadow-sm"></div>
      <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Menyiapkan Satelit...</span>
    </div>
  )
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

export default function DriverAWBExecutionPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { user } = useAuthStore();

  const [mounted, setMounted] = useState(false); 
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<{type: "success"|"error", msg: string} | null>(null);

  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapCenterTick, setMapCenterTick] = useState(0); 

  const [isSheetExpanded, setIsSheetExpanded] = useState(true);

  // 🚀 FASE 2: STATE PROOF OF PICKUP (POP)
  const [showPoPForm, setShowPoPForm] = useState(false);
  const [popNote, setPopNote] = useState("");
  const [popFile, setPopFile] = useState<File | null>(null);
  const [popPreview, setPopPreview] = useState<string | null>(null);
  const cameraPickupRef = useRef<HTMLInputElement>(null);

  // 🚀 FASE 2: STATE PROOF OF DELIVERY (POD)
  const [showPoDForm, setShowPoDForm] = useState(false);
  const [podNote, setPodNote] = useState("");
  const [podFile, setPodFile] = useState<File | null>(null);
  const [podPreview, setPodPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as OrderDetail);
      } else {
        showToast("Manifes pengiriman tidak ditemukan.", "error");
        setTimeout(() => router.push(getDriverUrl("/driver/radar")), 2000); // FIX: Arahkan ke radar, bukan ke admin/staff
      }
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      setIsLoading(false);
    });

    return () => unsub();
  }, [orderId, router]);

  useEffect(() => {
    let watchId: number;

    if (order?.status === "Dikirim" && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setDriverLocation({ lat: latitude, lng: longitude });

          try {
            await updateDoc(doc(db, "orders", orderId), {
              driverCoords: { lat: latitude, lng: longitude }
            });
          } catch (error) {
            console.warn("Gagal update live location ke Firebase", error);
          }
        },
        (error) => console.warn("GPS tracking error:", error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [order?.status, orderId]);

  // HANDLER KAMERA PICKUP
  const handlePickupPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPopFile(file);
      setPopPreview(URL.createObjectURL(file));
    }
  };

  // HANDLER KAMERA DELIVERY
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPodFile(file);
      setPodPreview(URL.createObjectURL(file));
    }
  };

  // 🚀 FASE 2: UPDATE FUNGSI GEOTAG UNTUK MENERIMA TIPE PROOF
  const handleUpdateStatusWithGeotag = async (
    nextStatus: string, 
    customDesc: string, 
    defaultLocationLabel: string, 
    proofUrl?: string,
    proofType?: "pickup" | "delivery"
  ) => {
    if (!order || !user) return;
    setIsUpdating(true);

    try {
      let finalLocationLabel = defaultLocationLabel;
      let finalCoords = driverLocation;

      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
        }).catch(() => null);

        if (pos) {
          const { latitude, longitude } = pos.coords;
          finalCoords = { lat: latitude, lng: longitude };
          setDriverLocation(finalCoords);

          try {
            const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`);
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const address = data.features[0].place_name || data.features[0].text;
              finalLocationLabel = `${address} (Geotagged)`;
            }
          } catch (error) {
            console.warn("Geocoding failed", error);
          }
        }
      }

      const orderRef = doc(db, "orders", orderId);
      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();

      const trackingLog: Record<string, unknown> = {
        id: uniqueId,
        status: nextStatus,
        date: logDate,
        description: customDesc,
        location: finalLocationLabel
      };

      // Simpan di tracking history timeline
      if (proofUrl) trackingLog.proofUrl = proofUrl;
      if (proofType === "pickup") trackingLog.note = popNote;
      if (proofType === "delivery") trackingLog.note = podNote;

      const payload: Record<string, unknown> = {
        status: nextStatus,
        trackingHistory: arrayUnion(trackingLog)
      };

      // 🚀 FASE 2: Simpan juga ke Root Document Order biar Admin gampang nyari
      if (proofType === "pickup") {
        payload.pickupProofUrl = proofUrl;
        payload.pickupNote = popNote;
      } else if (proofType === "delivery") {
        payload.deliveryProofUrl = proofUrl;
        payload.deliveryNote = podNote;
      }

      if (finalCoords) payload.driverCoords = finalCoords;

      if (nextStatus === "Selesai") {
        if (order.paymentStatus === "Piutang B2B" || order.paymentStatus === "Menunggu Verifikasi Finance") {
          // JANGAN UBAH
        } else {
          payload.paymentStatus = "Lunas";
        }

        const totalTagihan = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
        let appCommissionPercent = 20; 
        
        try {
          const pricingSnap = await getDoc(doc(db, "settings", "pricing"));
          if (pricingSnap.exists()) {
            const config = pricingSnap.data();
            if (config.customVehicles && Array.isArray(config.customVehicles)) {
              const vehicleMatch = config.customVehicles.find((v: unknown) => {
                 if (typeof v === 'object' && v !== null && 'name' in v) return (v as {name: string}).name === order.vehicleName;
                 return false;
              });
              if (vehicleMatch && typeof vehicleMatch === 'object' && 'appCommission' in vehicleMatch) {
                const commission = (vehicleMatch as {appCommission?: number | string}).appCommission;
                if (commission !== undefined) appCommissionPercent = Number(commission);
              }
            }
          }
        } catch (err) {
          console.warn("Gagal menarik config komisi", err);
        }

        const driverSharePercent = 100 - appCommissionPercent;
        const appShareNominal = (totalTagihan * appCommissionPercent) / 100;
        const driverShareNominal = (totalTagihan * driverSharePercent) / 100;

        let targetWalletId: string = String(user.uid);
        if (order.driverId) targetWalletId = String(order.driverId); 
        
        const paymentMethodStr = String(order.paymentMethod || "Transfer Bank");
        const isCOD = paymentMethodStr.toLowerCase().includes("tunai") || paymentMethodStr.toLowerCase().includes("cod");
        
        let mutationAmount = 0;
        let logDescription = "";
        let logType: "deposit" | "deduction" = "deposit";

        if (isCOD) {
          mutationAmount = -Math.abs(appShareNominal);
          logDescription = `Potongan Komisi Order #${order.resi || order.id.substring(0,8)} (Tunai/COD)`;
          logType = "deduction";
        } else {
          mutationAmount = Math.abs(driverShareNominal);
          logDescription = `Pendapatan Order #${order.resi || order.id.substring(0,8)} (${order.paymentMethod})`;
          logType = "deposit";
        }

        if (mutationAmount !== 0) {
          const walletRef = doc(db, "driver_wallets", targetWalletId);
          await updateDoc(walletRef, { 
            balance: increment(mutationAmount),
            lastMutasi: serverTimestamp() 
          });

          await addDoc(collection(db, "wallet_logs"), {
            userId: targetWalletId,
            amount: Math.abs(mutationAmount), 
            type: logType,
            description: logDescription,
            recordedBy: "System Auto-Settle",
            createdAt: serverTimestamp()
          });
        }
      }

      await updateDoc(orderRef, payload);
      showToast(`Status diperbarui: ${nextStatus}`);

      if (nextStatus === "Selesai") {
        setTimeout(() => router.push(getDriverUrl("/driver/radar")), 2500); // FIX: Dinamis Routing
      }

    } catch (error) {
      console.error(error);
      showToast("Gagal memperbarui status pengiriman.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // 🚀 FASE 2: FUNGSI SUBMIT PICKUP
  const submitProofOfPickup = async (originAddr: string) => {
    if (!popFile || !popNote.trim()) return showToast("Foto bukti dan catatan wajib diisi!", "error");
    setIsUpdating(true);
    try {
      const uploadedUrl = await uploadToCloudinary(popFile);
      await handleUpdateStatusWithGeotag("Sedang Diproses", `Barang telah di-pickup: ${popNote}`, originAddr, uploadedUrl, "pickup");
      setShowPoPForm(false);
    } catch (error) {
      console.error("Gagal PoP:", error);
      showToast("Gagal mengunggah foto bukti pickup.", "error");
      setIsUpdating(false);
    }
  };

  // FUNGSI SUBMIT DELIVERY
  const submitProofOfDelivery = async (destAddr: string) => {
    if (!podFile || !podNote.trim()) return showToast("Foto bukti dan catatan wajib diisi!", "error");
    setIsUpdating(true);
    try {
      const uploadedUrl = await uploadToCloudinary(podFile);
      await handleUpdateStatusWithGeotag("Selesai", `Paket diterima oleh: ${podNote}`, destAddr, uploadedUrl, "delivery");
    } catch (error) {
      console.error("Gagal PoD:", error);
      showToast("Gagal mengunggah foto bukti.", "error");
      setIsUpdating(false);
    }
  };

  if (!mounted) return null;

  if (isLoading) {
    return createPortal(
      <div className="fixed inset-0 z-[999999] bg-[var(--background)] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[var(--brand-maroon)] rounded-full animate-spin shadow-sm"></div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Memuat Manifes AWB...</p>
      </div>,
      document.body
    );
  }

  // FIX: Auth Guard. Izinkan driver masuk. (Bug sebelumnya mencegah driver mengakses halamannya sendiri)
  if (user && !['superadmin', 'admin_operational', 'admin_finance', 'driver'].includes(user.role)) {
    return createPortal(
      <div className="fixed inset-0 z-[999999] bg-[var(--background)] p-6 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-sm font-medium text-slate-500 mt-2 mb-6 max-w-[250px]">Halaman ini khusus untuk Mitra Kurir dan Operasional.</p>
        <Button variant="secondary" onClick={() => router.push(getDriverUrl("/driver/dashboard"))}>Kembali ke Beranda</Button>
      </div>,
      document.body
    );
  }

  if (!order) {
    return createPortal(
      <div className="fixed inset-0 z-[999999] bg-[var(--background)] p-6 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manifes Tidak Valid</h2>
        <p className="text-sm font-medium text-slate-500 mt-2 mb-6 max-w-[250px]">Resi mungkin telah dihapus oleh Admin atau sistem.</p>
        <Button variant="secondary" onClick={() => router.push(getDriverUrl("/driver/radar"))}>Kembali ke Radar</Button>
      </div>,
      document.body
    );
  }

  const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
  const originAddr: string = originObj?.address || (typeof order.origin === 'string' ? order.origin : "-");
  
  const destObj = order.destinations && order.destinations.length > 0 ? order.destinations[0] : null;
  const destAddr: string = destObj?.address || (typeof order.destination === 'string' ? order.destination : "-");
  
  const receiverName = destObj?.receiverName || "Penerima";
  const receiverPhone = destObj?.receiverPhone || "-";

  const mapOrigin = originObj?.lat && originObj?.lng ? { lat: originObj.lat, lng: originObj.lng } : undefined;
  const mapDrops = destObj?.lat && destObj?.lng 
    ? [{ id: "drop-1", address: destAddr, lat: destObj.lat, lng: destObj.lng, detail: destObj.detail || "", receiverName, receiverPhone, receiverEmail: destObj.receiverEmail || "", items: destObj.items || [] }] 
    : [];

  const currentMapLng = driverLocation?.lng || mapOrigin?.lng || mapDrops[0]?.lng || 116.116;
  const currentMapLat = driverLocation?.lat || mapOrigin?.lat || mapDrops[0]?.lat || -8.583;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex justify-center bg-[var(--background)] sm:bg-slate-900/50 sm:backdrop-blur-sm transition-all duration-300">
      
      <main className="w-full max-w-md h-full bg-slate-100 relative flex flex-col overflow-hidden font-sans tap-highlight-transparent shadow-2xl sm:rounded-[2.5rem] sm:h-[90vh] sm:my-auto">
        
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className={cn(
              "absolute top-safe mt-4 left-4 right-4 z-[100000] p-4 rounded-[1.25rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 backdrop-blur-md border",
              toast.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-red-500/90 border-red-400 text-white"
            )}>
              {toast.type === "success" ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              <p className="text-sm font-bold leading-tight tracking-tight">{toast.msg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 z-0">
          <MapBase 
            key={`map-${mapCenterTick}`}
            longitude={currentMapLng}
            latitude={currentMapLat}
            zoom={14}
            interactive={true} 
            originCoords={mapOrigin}
            drops={mapDrops}
            driverCoords={driverLocation || undefined} 
          />
        </div>

        <div className="absolute top-0 left-0 right-0 z-20 pt-safe px-4 mt-4 flex items-center justify-between pointer-events-none">
          <button 
            onClick={() => router.push(getDriverUrl("/driver/radar"))} 
            className="w-12 h-12 flex items-center justify-center bg-white/80 backdrop-blur-md border border-white rounded-[1.25rem] shadow-[0_4px_20px_rgba(0,0,0,0.1)] text-slate-800 pointer-events-auto active:scale-90 transition-transform"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>

          <div className="bg-white/80 backdrop-blur-md border border-white px-4 py-2 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] pointer-events-auto flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span className="font-black text-slate-800 text-xs uppercase tracking-widest">{order.status}</span>
          </div>
        </div>

        <div className="absolute top-24 right-4 z-20 pointer-events-none flex flex-col gap-3">
          <button 
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  setMapCenterTick(prev => prev + 1); 
                  showToast("Peta difokuskan ke posisi Anda", "success");
                });
              }
            }}
            className="w-12 h-12 flex items-center justify-center bg-white/90 backdrop-blur-md border border-slate-100 rounded-2xl shadow-lg text-[var(--brand-maroon)] pointer-events-auto active:scale-90 transition-transform"
          >
            <Focus className="w-6 h-6" />
          </button>
        </div>

        <motion.div 
          animate={{ y: isSheetExpanded ? 0 : "65%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-3xl rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.15)] border-t border-white flex flex-col"
          style={{ maxHeight: "85%" }}
        >
          <div onClick={() => setIsSheetExpanded(!isSheetExpanded)} className="w-full py-4 flex justify-center cursor-pointer shrink-0">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mb-2" />
          </div>
          
          <button onClick={() => setIsSheetExpanded(!isSheetExpanded)} className="absolute top-4 right-5 p-1.5 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
            {isSheetExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>

          <div className="px-6 pb-4 border-b border-slate-100 shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resi Pengiriman (AWB)</p>
            <div className="flex justify-between items-end mt-0.5">
              <h1 className="text-2xl font-black font-mono tracking-tight text-slate-900">#{order.id.substring(0,10)}</h1>
              <p className="text-xl font-black text-emerald-600 tracking-tighter drop-shadow-sm">{formatRupiah(order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0)}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-8">
            
            <div className="relative pl-4">
              <div className="absolute left-[19px] top-3 bottom-3 w-[3px] bg-slate-100 rounded-full z-0"></div>
              <div className="absolute left-[19px] top-3 h-1/2 w-[3px] bg-gradient-to-b from-slate-300 to-transparent rounded-full z-0"></div>
              
              <div className="space-y-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 bg-white shadow-sm p-1.5 rounded-full border border-slate-200 z-10">
                    <MapPin className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Penjemputan (Pickup)</p>
                    <p className="font-bold text-slate-800 text-sm leading-snug">{originAddr}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 bg-white shadow-sm p-1.5 rounded-full border border-slate-200 z-10">
                    <MapPin className="w-4 h-4 text-[var(--brand-maroon)]" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[var(--brand-maroon)] uppercase tracking-widest mb-1">Tujuan (Drop)</p>
                    <p className="font-bold text-slate-800 text-sm leading-snug">{destAddr}</p>
                    <div className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-xs font-black text-slate-500 uppercase">{receiverName.substring(0,2)}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Penerima</p>
                        <p className="text-xs font-black text-slate-800">{receiverName} <span className="font-medium text-slate-500">({receiverPhone})</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-500"/> Detail Kargo & Muatan
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/60 p-3 rounded-[1.25rem] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_10px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center">
                  <Scale className="w-5 h-5 text-slate-400 mb-1" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Berat</p>
                  <p className="text-lg font-black text-slate-800 tracking-tight">{order.totalWeight || order.weight || 0} Kg</p>
                </div>
                <div className="bg-white/60 p-3 rounded-[1.25rem] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_10px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center">
                  <Truck className="w-5 h-5 text-slate-400 mb-1" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Armada / Layanan</p>
                  <p className="text-sm font-black text-slate-800 tracking-tight line-clamp-1">{order.vehicleName || order.vehicle}</p>
                </div>
              </div>

              {destObj?.items && destObj.items.length > 0 && (
                <div className="space-y-2">
                  {destObj.items.map((item: DeliveryItem, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-slate-50/80 px-4 py-3 rounded-2xl border border-slate-100">
                      <span className="font-bold text-slate-700">{item.name || "-"}</span>
                      <span className="font-mono text-slate-500 font-bold bg-white px-2 py-0.5 rounded-lg border shadow-sm">x{item.value || 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🚀 FASE 2: AREA FORM PROOF OF PICKUP (PoP) */}
            <AnimatePresence>
              {showPoPForm && order.status === "Menuju Lokasi Jemput" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-blue-50/80 p-5 rounded-[1.5rem] border border-blue-200/50 space-y-4 mb-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-blue-900 tracking-tight">Bukti Penjemputan (Pickup)</h4>
                      <button onClick={() => setShowPoPForm(false)} className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-slate-400 shadow-sm"><X size={14}/></button>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5 block">Catatan Kondisi Barang</label>
                      <Input 
                        type="text" 
                        placeholder="Cth: Barang aman, packing kayu" 
                        value={popNote}
                        onChange={(e) => setPopNote(e.target.value)}
                        className="bg-white border-blue-200 focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5 block">Ambil Foto Pickup (Live Camera)</label>
                      {/* 🚀 SIHIR LIVE CAMERA (capture="environment") */}
                      <input type="file" accept="image/*" capture="environment" ref={cameraPickupRef} onChange={handlePickupPhotoCapture} className="hidden" />
                      <div 
                        onClick={() => cameraPickupRef.current?.click()}
                        className={cn(
                          "border-2 border-dashed rounded-2xl h-32 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.98] tap-highlight-transparent overflow-hidden",
                          popPreview ? 'border-blue-500' : 'border-blue-300 hover:border-blue-500 bg-white/60'
                        )}
                      >
                        {popPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={popPreview} alt="Bukti Pickup" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera className="w-8 h-8 text-blue-600 mb-2 opacity-50" />
                            <p className="text-xs font-black text-blue-800">Buka Kamera</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AREA FORM PROOF OF DELIVERY (PoD) */}
            <AnimatePresence>
              {showPoDForm && order.status === "Dikirim" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-emerald-50/80 p-5 rounded-[1.5rem] border border-emerald-200/50 space-y-4 mb-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-emerald-900 tracking-tight">Bukti Pengiriman (PoD)</h4>
                      <button onClick={() => setShowPoDForm(false)} className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-slate-400 shadow-sm"><X size={14}/></button>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1.5 block">Siapa yang menerima?</label>
                      <Input 
                        type="text" 
                        placeholder="Cth: Diterima Security (Pak Budi)" 
                        value={podNote}
                        onChange={(e) => setPodNote(e.target.value)}
                        className="bg-white border-emerald-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1.5 block">Foto Drop & Penerima (Live Camera)</label>
                      {/* 🚀 SIHIR LIVE CAMERA (capture="environment") */}
                      <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handlePhotoCapture} className="hidden" />
                      <div 
                        onClick={() => cameraInputRef.current?.click()}
                        className={cn(
                          "border-2 border-dashed rounded-2xl h-32 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.98] tap-highlight-transparent overflow-hidden",
                          podPreview ? 'border-emerald-500' : 'border-emerald-300 hover:border-emerald-500 bg-white/60'
                        )}
                      >
                        {podPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={podPreview} alt="Bukti" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera className="w-8 h-8 text-emerald-600 mb-2 opacity-50" />
                            <p className="text-xs font-black text-emerald-800">Buka Kamera</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {order.status === "Selesai" && (
              <div className="bg-emerald-50/80 border border-emerald-200/50 p-6 rounded-[1.5rem] text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-black text-emerald-900 tracking-tight">Pengiriman Sukses & Selesai</p>
                <p className="text-[10px] font-bold text-emerald-700 mt-1 uppercase tracking-widest">Transaksi telah dicatat ke dalam dompet.</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-white/90 backdrop-blur-md border-t border-slate-100 pb-safe shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
            
            {/* 🚀 FASE 2: TOMBOL PICKUP -> BUKA FORM PICKUP DULU */}
            {order.status === "Menuju Lokasi Jemput" && !showPoPForm && (
              <Button 
                size="lg"
                variant="secondary"
                onClick={() => setShowPoPForm(true)}
                className="w-full flex items-center justify-center gap-2 border-slate-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
              >
                <Navigation className="w-5 h-5 text-blue-400" /> Tiba di Lokasi Jemput (Pickup)
              </Button>
            )}

            {/* 🚀 FASE 2: TOMBOL SUBMIT PICKUP JIKA FORM TERBUKA */}
            {order.status === "Menuju Lokasi Jemput" && showPoPForm && (
              <Button 
                size="lg"
                variant="primary"
                onClick={() => submitProofOfPickup(originAddr)}
                disabled={isUpdating || !popFile || !popNote.trim()}
                isLoading={isUpdating}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-blue-500 to-blue-600 border-blue-700 shadow-blue-600/30"
              >
                {!isUpdating && <><UploadCloud className="w-5 h-5" /> Unggah & Lanjutkan</>}
              </Button>
            )}

            {(order.status === "Sedang Diproses") && (
              <Button 
                size="lg"
                variant="primary"
                onClick={() => handleUpdateStatusWithGeotag("Dikirim", "Paket telah dimuat dan sedang dalam perjalanan (In Transit) menuju alamat penerima.", "Dalam Perjalanan")}
                disabled={isUpdating}
                isLoading={isUpdating}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[var(--brand-maroon-light)] to-[var(--brand-maroon)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]"
              >
                {!isUpdating && <><Truck className="w-5 h-5 text-amber-300" /> Mulai Pengiriman (In Transit)</>}
              </Button>
            )}

            {order.status === "Dikirim" && !showPoDForm && (
              <Button 
                size="lg"
                variant="primary"
                onClick={() => setShowPoDForm(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-700 shadow-emerald-600/30"
              >
                <ShieldCheck className="w-5 h-5" /> Selesaikan Pengiriman
              </Button>
            )}

            {order.status === "Dikirim" && showPoDForm && (
              <Button 
                size="lg"
                variant="primary"
                onClick={() => submitProofOfDelivery(destAddr)}
                disabled={isUpdating || !podFile || !podNote.trim()}
                isLoading={isUpdating}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-700 shadow-emerald-600/30"
              >
                {!isUpdating && <><UploadCloud className="w-5 h-5" /> Kirim Bukti & Selesai</>}
              </Button>
            )}
            
            {order.status === "Selesai" && (
              <Button 
                size="lg"
                variant="outline"
                onClick={() => router.push(getDriverUrl("/driver/radar"))}
                className="w-full flex items-center justify-center gap-2 bg-white"
              >
                Kembali ke Bursa Radar
              </Button>
            )}
          </div>
        </motion.div>
      </main>
    </div>,
    document.body 
  );
}