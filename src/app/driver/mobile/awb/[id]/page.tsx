"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, MapPin, Truck, Scale, 
  CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Navigation, ShieldCheck, Focus,
  Camera, X, UploadCloud
} from "lucide-react";
import dynamic from "next/dynamic";

import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, onSnapshot, increment, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { OrderDetail, LocationDetail, DeliveryItem } from "@/types/order"; 
import { uploadToCloudinary } from "@/lib/cloudinary"; // 🚀 Tambahkan import ini untuk upload foto

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="h-48 w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-bold text-xs">Memuat Peta Navigasi...</div>
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

export default function DriverAWBExecutionPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { user } = useAuthStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<{type: "success"|"error", msg: string} | null>(null);

  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isGettingGPS, setIsGettingGPS] = useState(false);
  const [mapCenterTick, setMapCenterTick] = useState(0); 

  // 🚀 STATE BARU UNTUK PROOF OF DELIVERY (PoD)
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
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as OrderDetail);
      } else {
        showToast("Manifes pengiriman tidak ditemukan.", "error");
      }
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      setIsLoading(false);
    });

    return () => unsub();
  }, [orderId]);

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

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPodFile(file);
      setPodPreview(URL.createObjectURL(file));
    }
  };

  // =======================================================================
  // 🚀 MESIN TRANSAKSI & MUTASI SALDO
  // =======================================================================
  const handleUpdateStatusWithGeotag = async (nextStatus: string, customDesc: string, defaultLocationLabel: string, proofUrl?: string) => {
    if (!order || !user) return;
    setIsUpdating(true);
    setIsGettingGPS(true);

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

      // 🚀 INJEKSI FOTO BUKTI & CATATAN KE DALAM LOG TRACKING
      const trackingLog: Record<string, unknown> = {
        id: uniqueId,
        status: nextStatus,
        date: logDate,
        description: customDesc,
        location: finalLocationLabel
      };

      if (proofUrl) {
        trackingLog.proofUrl = proofUrl; // Simpan URL foto di database tracking
      }

      const payload: Record<string, unknown> = {
        status: nextStatus,
        trackingHistory: arrayUnion(trackingLog)
      };

      if (finalCoords) {
        payload.driverCoords = finalCoords;
      }

      // ==========================================================
      // 🚀 LOGIKA PEMOTONGAN/PENAMBAHAN DOMPET JIKA ORDER SELESAI
      // ==========================================================
      if (nextStatus === "Selesai") {
        payload.paymentStatus = "Lunas";

        const totalTagihan = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;

        let appCommissionPercent = 20; 
        try {
          const pricingSnap = await getDoc(doc(db, "settings", "pricing"));
          if (pricingSnap.exists()) {
            const config = pricingSnap.data();
            if (config.customVehicles && Array.isArray(config.customVehicles)) {
              const vehicleMatch = config.customVehicles.find((v: unknown) => {
                 if (typeof v === 'object' && v !== null && 'name' in v) {
                   return (v as {name: string}).name === order.vehicleName;
                 }
                 return false;
              });
              
              if (vehicleMatch && typeof vehicleMatch === 'object' && 'appCommission' in vehicleMatch) {
                const commission = (vehicleMatch as {appCommission?: number | string}).appCommission;
                if (commission !== undefined) {
                  appCommissionPercent = Number(commission);
                }
              }
            }
          }
        } catch (err) {
          console.warn("Gagal menarik config komisi, menggunakan default 20%", err);
        }

        const driverSharePercent = 100 - appCommissionPercent;
        const appShareNominal = (totalTagihan * appCommissionPercent) / 100;
        const driverShareNominal = (totalTagihan * driverSharePercent) / 100;

        let targetWalletId: string = String(user.uid);
        if (order.driverId) targetWalletId = String(order.driverId); 
        
        const walletRef = doc(db, "driver_wallets", targetWalletId);
        const isB2B = order.isB2B === true;
        let mutationAmount = 0;

        if (isB2B) {
          mutationAmount = driverShareNominal; 
        } else {
          mutationAmount = -Math.abs(appShareNominal);
        }

        if (mutationAmount !== 0) {
          await updateDoc(walletRef, {
            balance: increment(mutationAmount)
          });
        }
      }

      await updateDoc(orderRef, payload);
      showToast(`Status berhasil diperbarui ke: ${nextStatus}`);

      if (nextStatus === "Selesai") {
        setTimeout(() => {
          router.push("/driver/radar");
        }, 2000);
      }

    } catch (error) {
      console.error(error);
      showToast("Gagal memperbarui status pengiriman.", "error");
    } finally {
      setIsUpdating(false);
      setIsGettingGPS(false);
    }
  };

  // 🚀 FUNGSI KHUSUS UNTUK SUBMIT BUKTI PENGIRIMAN
  const submitProofOfDelivery = async (destAddr: string) => {
    if (!podFile || !podNote.trim()) {
      showToast("Foto bukti dan nama/catatan penerima wajib diisi!", "error");
      return;
    }

    setIsUpdating(true);
    try {
      // 1. Upload Foto ke Cloudinary
      const uploadedUrl = await uploadToCloudinary(podFile);
      
      // 2. Kirim update status Selesai berserta URL foto dan Catatan
      await handleUpdateStatusWithGeotag(
        "Selesai", 
        `Paket diterima oleh: ${podNote}`, // Masukkan catatan ke deskripsi tracking
        destAddr,
        uploadedUrl // Kirim URL foto
      );
    } catch (error) {
      showToast("Gagal mengunggah foto bukti.", "error");
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#7A171D] animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Memuat Manifes Pengiriman...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
        <h2 className="font-bold text-slate-800">Manifes Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500 mt-1 mb-5">Resi mungkin telah dihapus atau tidak valid.</p>
        <button onClick={() => router.push("/driver/radar")} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold">Kembali ke Radar</button>
      </div>
    );
  }

  const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
  const originAddr: string = originObj?.address || (typeof order.origin === 'string' ? order.origin : "-");
  
  const destObj = order.destinations && order.destinations.length > 0 ? order.destinations[0] : null;
  const destAddr: string = destObj?.address || (typeof order.destination === 'string' ? order.destination : "-");
  
  const receiverName = destObj?.receiverName || "Penerima";
  const receiverPhone = destObj?.receiverPhone || "-";

  const mapOrigin = originObj?.lat && originObj?.lng ? { lat: originObj.lat, lng: originObj.lng } : null;
  const mapDrops = destObj?.lat && destObj?.lng ? [{ id: "drop-1", address: destAddr, lat: destObj.lat, lng: destObj.lng }] : [];

  const currentMapLng = driverLocation?.lng || mapOrigin?.lng || mapDrops[0]?.lng || 116.116;
  const currentMapLat = driverLocation?.lat || mapOrigin?.lat || mapDrops[0]?.lat || -8.583;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans pb-28 flex flex-col relative">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-4 left-4 right-4 z-[99999] p-4 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md border ${toast.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-red-500/90 border-red-400 text-white"}`}>
            {toast.type === "success" ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            <p className="text-sm font-bold leading-tight">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-900 px-5 pt-8 pb-6 text-white rounded-b-3xl shadow-lg relative">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push("/driver/radar")} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="font-mono text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full uppercase">
            {order.status}
          </span>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nomor Resi AWB</p>
        <h1 className="text-xl font-black font-mono tracking-wider mt-0.5">#{order.id}</h1>
      </div>

      <main className="flex-1 p-5 space-y-4">
        
        {(mapOrigin || mapDrops.length > 0) && (
          <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-sm relative">
            <button 
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setMapCenterTick(prev => prev + 1); 
                    showToast("Peta dipusatkan ke lokasi Anda saat ini");
                  });
                }
              }}
              className="absolute top-4 right-4 z-10 bg-white p-2 rounded-xl shadow-lg border border-slate-200 text-[#7A171D] hover:bg-slate-50 transition-transform active:scale-95"
              title="Kembali ke Lokasi Saya"
            >
              <Focus className="w-5 h-5" />
            </button>

            <div className="w-full h-[300px] rounded-2xl overflow-hidden relative border border-slate-100 bg-slate-50">
              <MapBase 
                longitude={currentMapLng}
                latitude={currentMapLat}
                zoom={14}
                interactive={true} 
                originCoords={mapOrigin}
                drops={mapDrops}
                driverCoords={driverLocation}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Layanan & Armada</span>
            <span className="text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg uppercase">{order.serviceType || "Reguler"} • {order.vehicleName || order.vehicle}</span>
          </div>
          <div className="relative pl-3 my-2">
            <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-slate-200 border-dashed border-l-2 border-slate-300 z-0"></div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-white p-0.5 rounded-full"><MapPin className="w-4 h-4 text-slate-400" /></div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Titik Asal (Pickup)</p>
                  <p className="font-bold text-slate-800 text-xs">{originAddr}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-white p-0.5 rounded-full"><MapPin className="w-4 h-4 text-[#7A171D]" /></div>
                <div>
                  <p className="text-[9px] font-bold text-[#7A171D] uppercase tracking-wider mb-0.5">Titik Tujuan (Drop)</p>
                  <p className="font-bold text-slate-800 text-xs">{destAddr}</p>
                  <p className="text-[11px] text-slate-600 font-semibold mt-1">Penerima: <span className="text-slate-900 font-bold">{receiverName}</span> ({receiverPhone})</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Package className="w-4 h-4 text-[#7A171D]"/> Detail Muatan Kargo</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Total Berat</p>
              <p className="text-sm font-black text-slate-800 mt-0.5 flex items-center gap-1"><Scale className="w-3.5 h-3.5 text-slate-400"/> {order.totalWeight || order.weight || 0} Kg</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Estimasi Pendapatan</p>
              <p className="text-sm font-black text-emerald-600 mt-0.5">{formatRupiah(order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0)}</p>
            </div>
          </div>
          {destObj?.items && destObj.items.length > 0 && (
            <div className="pt-2 border-t border-slate-100 mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Item Barang:</p>
              <div className="space-y-1.5">
                {destObj.items.map((item: DeliveryItem, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700">{item.name || "-"}</span>
                    <span className="font-mono text-slate-500">Qty: {item.value || 1} ({item.weightType || 'Kecil'})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600"/> Update Status Logistik</h3>
          <div className="space-y-3">
            {order.status === "Menuju Lokasi Jemput" && (
              <button 
                onClick={() => handleUpdateStatusWithGeotag("Sedang Diproses", "Kurir telah tiba di lokasi jemput dan barang sedang dimuat ke armada.", originAddr)}
                disabled={isUpdating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-transform active:scale-95"
              >
                {isUpdating ? <><Loader2 className="w-4 h-4 animate-spin"/> {isGettingGPS ? 'Mengunci GPS...' : 'Memperbarui...'}</> : <><Navigation className="w-4 h-4" /> Tiba di Lokasi Jemput (Pickup)</>}
              </button>
            )}

            {(order.status === "Menuju Lokasi Jemput" || order.status === "Sedang Diproses") && (
              <button 
                onClick={() => handleUpdateStatusWithGeotag("Dikirim", "Paket telah dimuat dan sedang dalam perjalanan (In Transit) menuju alamat penerima.", "Dalam Perjalanan")}
                disabled={isUpdating}
                className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-transform active:scale-95"
              >
                {isUpdating ? <><Loader2 className="w-4 h-4 animate-spin"/> {isGettingGPS ? 'Mengunci GPS...' : 'Memperbarui...'}</> : <><Truck className="w-4 h-4" /> Mulai Pengiriman (In Transit)</>}
              </button>
            )}

            {/* 🚀 FORM PROOF OF DELIVERY (TAMPIL JIKA STATUS DIKIRIM) */}
            {order.status === "Dikirim" && !showPoDForm && (
              <button 
                onClick={() => setShowPoDForm(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-transform active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> Selesaikan Pesanan (Delivered)
              </button>
            )}

            {order.status === "Dikirim" && showPoDForm && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="text-sm font-black text-slate-800">Bukti Pengiriman (PoD)</h4>
                  <button onClick={() => setShowPoDForm(false)} className="text-slate-400 hover:text-red-500"><X size={18}/></button>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Nama Penerima / Catatan</label>
                  <input 
                    type="text" 
                    placeholder="Cth: Diterima oleh Pak Budi (Security)" 
                    value={podNote}
                    onChange={(e) => setPodNote(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Foto Barang / Lokasi</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" // 🚀 Minta HP langsung buka kamera belakang
                    ref={cameraInputRef} 
                    onChange={handlePhotoCapture} 
                    className="hidden" 
                  />
                  <div 
                    onClick={() => cameraInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden ${podPreview ? 'border-emerald-400' : 'border-slate-300 hover:border-emerald-400 bg-white'}`}
                  >
                    {podPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={podPreview} alt="Bukti" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-xs font-bold text-slate-600">Ambil Foto Bukti</p>
                      </>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => submitProofOfDelivery(destAddr)}
                  disabled={isUpdating || !podFile || !podNote.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 text-xs disabled:opacity-50 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  {isUpdating ? <><Loader2 className="w-4 h-4 animate-spin"/> Memproses...</> : <><UploadCloud className="w-4 h-4" /> Kirim Bukti & Selesai</>}
                </button>
              </motion.div>
            )}

            {order.status === "Selesai" && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-emerald-700">Pengiriman Ini Telah Selesai</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Transaksi telah dicatat ke dalam dompet.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}