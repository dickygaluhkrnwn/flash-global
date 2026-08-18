/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, MapPin, User, Phone, 
  Weight, Box, DollarSign, CheckCircle2, AlertCircle, Clock,
  Truck, Building2, UserPlus, X, Camera, Map, FileText, PieChart, Focus
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// IMPORT GLOBAL TYPES
import { OrderDetail, LocationDetail, TrackingHistoryItem, DeliveryItem } from "@/types/order";
import { DriverData } from "@/types/admin";

const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getAdminUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
    return path.replace(/^\/admin/, '') || '/';
  }
  return path; 
};

export default function DomesticOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  // 🚀 PERBAIKAN: Deklarasi currentUser agar Auth Guard berfungsi
  const { user: currentUser } = useAuthStore();
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [rawAllPartners, setRawAllPartners] = useState<DriverData[]>([]);
  
  // 🚀 STATE BARU UNTUK FASE 2: PROFIT SHARING
  const [appCommissionPercent, setAppCommissionPercent] = useState(20);

  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Modals States
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  const [statusForm, setStatusForm] = useState({
    status: "", location: "Pusat Logistik Flash Global", description: "", timeMode: "auto", customDate: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, "orders", params.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as OrderDetail;
          setOrder(data);
          
          const nextStatus = data.status === "Menunggu Kurir" ? "Menuju Lokasi Jemput" : 
                             data.status === "Menuju Lokasi Jemput" ? "Sedang Diproses" : 
                             data.status === "Sedang Diproses" ? "Dikirim" : "Selesai";
          setStatusForm(prev => ({ ...prev, status: nextStatus }));

          const vehicleName = data.vehicleName || data.vehicle;
          try {
            const pricingRef = doc(db, "settings", "pricing");
            const pricingSnap = await getDoc(pricingRef);
            if (pricingSnap.exists()) {
              const pData = pricingSnap.data() as Record<string, unknown>;
              if (pData.customVehicles && Array.isArray(pData.customVehicles)) {
                const match = pData.customVehicles.find((v: Record<string, unknown>) => {
                  return (typeof v === 'object' && v !== null && v.name === vehicleName);
                });
                if (match && typeof match === 'object' && 'appCommission' in match) {
                  setAppCommissionPercent(Number(match.appCommission) || 20);
                }
              }
            }
          } catch (pricingError) {
            console.warn("Gagal menarik config komisi", pricingError);
          }

        } else {
          showToast("error", "Data pesanan tidak ditemukan.");
          setTimeout(() => router.push(getAdminUrl("/admin/orders/domestic")), 2000);
          return;
        }

        const snap = await getDocs(collection(db, "driver_wallets"));
        const rawPartners = snap.docs.map(d => ({ id: d.id, ...d.data() } as DriverData));
        setRawAllPartners(rawPartners);
        const assignableDrivers = rawPartners.filter(d => 
          (d.partnerType === "Individual" || d.partnerType === "FleetDriver") && !d.isSuspended
        );
        setDrivers(assignableDrivers);

      } catch (error) {
        console.error("Gagal menarik data:", error);
        showToast("error", "Koneksi database bermasalah.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id, router]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  const handleConfirmStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    
    try {
      let finalLogDate = "";
      if (statusForm.timeMode === "auto") {
        finalLogDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      } else {
        finalLogDate = new Date(statusForm.customDate).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      }

      let finalDesc = statusForm.description;
      if (!finalDesc) {
        if (statusForm.status === "Menuju Lokasi Jemput") finalDesc = "Kurir sedang dalam perjalanan menuju lokasi pengirim.";
        else if (statusForm.status === "Sedang Diproses") finalDesc = "Paket telah tiba di gudang sortir / hub dan sedang diproses.";
        else if (statusForm.status === "Dikirim") finalDesc = "Paket sedang dalam perjalanan menuju alamat penerima (In Transit).";
        else if (statusForm.status === "Selesai") finalDesc = "Paket logistik sukses diserahterimakan kepada penerima.";
        else finalDesc = "Status manifes diperbarui oleh Operasional.";
      }

      const uniqueId = Date.now().toString();
      const newLog: TrackingHistoryItem = { 
        id: uniqueId, 
        status: statusForm.status, 
        date: finalLogDate, 
        description: finalDesc, 
        location: statusForm.location 
      };

      await updateDoc(doc(db, "orders", order.id), {
        status: statusForm.status,
        trackingHistory: arrayUnion(newLog)
      });

      setOrder(prev => {
        if (!prev) return prev;
        const newHistory = [...(prev.trackingHistory || []), newLog];
        return { ...prev, status: statusForm.status, trackingHistory: newHistory };
      });

      showToast("success", "Status & log riwayat berhasil diperbarui!");
      setShowStatusModal(false);
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memperbarui status order.");
    }
  };

  const handleAssignDriver = async (driver: DriverData) => {
    if (!order) return;
    try {
      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();
      
      const safeDriverName = String(driver.name || "Mitra Kurir");
      let vehicleText = driver.vehicleType || "Armada Pribadi";
      let logDesc = `Sopir ${safeDriverName} ditugaskan untuk menjemput barang.`;

      if (driver.partnerType === "FleetDriver") {
        const tiedVehicle = rawAllPartners.find(p => p.partnerType === "FleetVehicle" && p.driverId === driver.id);
        if (tiedVehicle) {
          vehicleText = tiedVehicle.name || tiedVehicle.vehicleType || "Truk Vendor";
          logDesc = `Sopir ${safeDriverName} ditugaskan menjemput barang dengan armada ${vehicleText}.`;
        } else {
          logDesc = `Sopir ${safeDriverName} dari PT ${driver.vendorName || "Vendor"} ditugaskan untuk menjemput barang.`;
        }
      }

      const newLog: TrackingHistoryItem = { 
        id: uniqueId,
        status: "Menuju Lokasi Jemput", 
        date: logDate, 
        description: logDesc, 
        location: "Pusat Distribusi Flash" 
      };

      await updateDoc(doc(db, "orders", order.id), {
        driverId: driver.id, 
        driverName: safeDriverName, 
        vehicleName: vehicleText,
        status: "Menuju Lokasi Jemput",
        trackingHistory: arrayUnion(newLog)
      });

      setOrder(prev => {
        if (!prev) return prev;
        const newHistory = [...(prev.trackingHistory || []), newLog];
        return { ...prev, driverId: driver.id, driverName: safeDriverName, vehicleName: vehicleText, status: "Menuju Lokasi Jemput", trackingHistory: newHistory };
      });

      showToast("success", `Sopir ${safeDriverName} berhasil ditugaskan!`);
      setShowDriverModal(false);
    } catch (error) { 
      console.error(error);
      showToast("error", "Gagal menugaskan sopir."); 
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
        <p className="text-[#7A171D] text-xs font-bold uppercase tracking-widest animate-pulse">Menarik Data Pesanan...</p>
      </div>
    );
  }

  // 🚀 Auth Guard sekarang mengenali currentUser
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <AlertCircle className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Dispatch & Order ini hanya dapat dikelola oleh Superadmin atau Divisi Operasional.</p>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (!order) return null;

  const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
  const originAddr = String(originObj?.address || (typeof order.origin === 'string' ? order.origin : ""));
  const originName = String(originObj?.senderName || order.senderName || "Pengirim");
  const originPhone = String(originObj?.senderPhone || order.senderPhone || "-");

  const destObj = order.destinations?.[0] || null;
  const destAddr = String(destObj?.address || order.destination || "");
  const destName = String(destObj?.receiverName || order.receiverName || "Penerima");
  const destPhone = String(destObj?.receiverPhone || order.receiverPhone || "-");

  const orderItems = destObj?.items && Array.isArray(destObj.items) ? destObj.items : [];

  const bd = order.breakdown || { deliveryFee: 0, insuranceFee: 0, porterFee: 0, tollFee: 0, b2bDiscount: 0, grandTotal: 0 };
  const deliveryFee = Number(bd.deliveryFee || 0);
  const insuranceFee = Number(bd.insuranceFee || 0);
  const porterFee = Number(bd.porterFee || 0);
  const tollFee = Number(bd.tollFee || 0);
  const b2bDiscount = Number(bd.b2bDiscount || 0);
  
  const discountPromoAmount = Number(order.discountPromoAmount || 0);
  const porterCount = Number(order.porterCount || 1);
  const grandTotal = Number(order.finalGrandTotal || bd.grandTotal || order.totalCost || 0);
  const receiptUrl = order.receiptUrl ? String(order.receiptUrl) : null;

  const paymentMethodStr = String(order.paymentMethod || "Transfer Bank");
  const isCOD = paymentMethodStr.toLowerCase().includes("tunai") || paymentMethodStr.toLowerCase().includes("cod");
  const methodLabel = isCOD ? "Tunai (COD)" : "Non-Tunai (Transfer/QRIS/B2B)";
  const isPaymentVerified = order.paymentStatus === "Lunas" || order.isB2BApplied; 

  const driverSharePercent = Math.max(0, 100 - appCommissionPercent);
  const appShareNominal = (grandTotal * appCommissionPercent) / 100;
  const driverShareNominal = (grandTotal * driverSharePercent) / 100;

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto">
      {/* GLOBAL TOAST & IMAGE MODAL */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
        {proofModalUrl && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setProofModalUrl(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 max-w-2xl w-full flex flex-col items-center">
              <button onClick={() => setProofModalUrl(null)} className="absolute -top-14 right-0 bg-white/10 text-white rounded-full p-2 hover:bg-white/30 hover:scale-110 transition-all border border-white/20 backdrop-blur-md">
                <X className="w-6 h-6" />
              </button>
              <img src={proofModalUrl} alt="Bukti File" className="rounded-3xl max-h-[85vh] w-auto shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/20" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. TOP NAV & BREADCRUMB */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-[#7A171D] hover:bg-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              Detail Manifes Domestik
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-[#7A171D] uppercase tracking-widest px-2 py-0.5 bg-[#7A171D]/10 rounded border border-[#7A171D]/20">
                RESI
              </span>
              <p className="text-sm font-mono font-black text-slate-700 select-all tracking-tight">{order.resi || order.id}</p>
            </div>
          </div>
        </div>
        <AdminBadge variant={order.status.includes("Selesai") ? "success" : "brand"} className="text-sm px-4 py-1.5 shadow-sm">
          {order.status}
        </AdminBadge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KIRI: INFORMASI RUTE, BARANG, & BUKTI OPERASIONAL */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card 1: Rute Perjalanan */}
          <div className={`${glassPanel} rounded-[2rem] p-8 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#7A171D] rounded-full blur-[80px] opacity-10 pointer-events-none" />
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Map className="w-4 h-4"/> Detail Titik Jemput & Antar</h2>
            
            <div className="relative pl-6 space-y-8">
              <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-slate-200 border-dashed border-l border-slate-300"></div>
              
              {/* Origin */}
              <div className="flex items-start gap-4 relative">
                <span className="absolute -left-[31px] mt-1 w-4 h-4 bg-slate-300 rounded-full border-4 border-white shadow-sm"></span>
                <div className="w-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Titik Jemput (Origin)</p>
                  <div className="bg-white/60 p-4 rounded-xl border border-white shadow-sm">
                    <p className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2"><User className="w-4 h-4 text-slate-400"/> {originName}</p>
                    <p className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400"/> {originPhone}</p>
                    <p className="text-xs font-medium text-slate-500 flex items-start gap-2"><MapPin className="w-4 h-4 text-slate-400 shrink-0"/> {originAddr}</p>
                  </div>
                </div>
              </div>
              
              {/* Destination */}
              <div className="flex items-start gap-4 relative">
                <span className="absolute -left-[31px] mt-1 w-4 h-4 bg-gradient-to-br from-[#9A242B] to-[#7A171D] rounded-full border-4 border-white shadow-[0_0_8px_rgba(122,23,29,0.5)]"></span>
                <div className="w-full">
                  <p className="text-[10px] font-bold text-[#7A171D] uppercase tracking-widest mb-1">Titik Antar (Destination)</p>
                  <div className="bg-white/60 p-4 rounded-xl border border-white shadow-sm">
                    <p className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2"><User className="w-4 h-4 text-[#7A171D]"/> {destName}</p>
                    <p className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-2"><Phone className="w-4 h-4 text-[#7A171D]"/> {destPhone}</p>
                    <p className="text-xs font-medium text-slate-500 flex items-start gap-2"><MapPin className="w-4 h-4 text-[#7A171D] shrink-0"/> {destAddr}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 🚀 FASE 4: SECTION BUKTI OPERASIONAL (PROOF OF WORK) */}
          {(order.pickupProofUrl || order.deliveryProofUrl) && (
            <div className={`${glassPanel} rounded-[2rem] p-8`}>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Focus className="w-4 h-4"/> Bukti Operasional (Proof of Work)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Bukti Pickup */}
                {order.pickupProofUrl ? (
                  <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-[1.5rem] flex flex-col gap-3 shadow-inner">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-blue-600 rotate-45" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Penjemputan</p>
                        <p className="text-xs font-black text-blue-900 leading-none mt-0.5">Proof of Pickup (PoP)</p>
                      </div>
                    </div>
                    <div className="w-full h-32 rounded-xl overflow-hidden border-2 border-white shadow-sm cursor-pointer group relative bg-slate-200" onClick={() => setProofModalUrl(order.pickupProofUrl as string)}>
                      <img src={order.pickupProofUrl} alt="Bukti Pickup" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Catatan Kurir</p>
                      <p className="text-xs font-bold text-slate-700 italic">&quot;{order.pickupNote || "Tidak ada catatan."}&quot;</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 border-dashed p-6 rounded-[1.5rem] flex flex-col items-center justify-center text-center">
                    <Camera className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proof of Pickup</p>
                    <p className="text-xs font-medium text-slate-500">Belum ada foto.</p>
                  </div>
                )}

                {/* Bukti Delivery */}
                {order.deliveryProofUrl ? (
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-[1.5rem] flex flex-col gap-3 shadow-inner">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-emerald-600 -rotate-135" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Pengiriman Selesai</p>
                        <p className="text-xs font-black text-emerald-900 leading-none mt-0.5">Proof of Delivery (PoD)</p>
                      </div>
                    </div>
                    <div className="w-full h-32 rounded-xl overflow-hidden border-2 border-white shadow-sm cursor-pointer group relative bg-slate-200" onClick={() => setProofModalUrl(order.deliveryProofUrl as string)}>
                      <img src={order.deliveryProofUrl} alt="Bukti Delivery" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-emerald-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Penerima & Catatan</p>
                      <p className="text-xs font-bold text-slate-700 italic">&quot;{order.deliveryNote || "Tidak ada catatan."}&quot;</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 border-dashed p-6 rounded-[1.5rem] flex flex-col items-center justify-center text-center">
                    <Camera className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proof of Delivery</p>
                    <p className="text-xs font-medium text-slate-500">Belum ada foto.</p>
                  </div>
                )}
                
              </div>
            </div>
          )}

          {/* Card 2: List Items & Spesifikasi */}
          <div className={`${glassPanel} rounded-[2rem] p-8`}>
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Box className="w-4 h-4"/> Spesifikasi Kargo & Item</h2>
               <div className="flex items-center gap-3">
                  <AdminBadge variant="gold">{order.serviceType} - {order.vehicleName || order.vehicle}</AdminBadge>
                  <AdminBadge variant="outline"><Weight className="w-3 h-3 mr-1"/> {order.totalWeight || order.weight} Kg</AdminBadge>
               </div>
             </div>
             
             <div className="bg-white/50 border border-white rounded-2xl overflow-hidden shadow-sm">
               {orderItems.length === 0 ? (
                 <p className="p-6 text-center text-sm font-medium text-slate-500">Tidak ada rincian item tercatat.</p>
               ) : (
                 <table className="w-full text-left text-xs">
                   <thead className="bg-slate-100/50 border-b border-white text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                     <tr>
                       <th className="p-4 pl-6">Nama Barang</th>
                       <th className="p-4">Dimensi / Tipe</th>
                       <th className="p-4 text-right pr-6">Nilai Asuransi</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/60">
                     {orderItems.map((itm: DeliveryItem, i: number) => {
                       return (
                         <tr key={i} className="hover:bg-white/40 transition-colors">
                           <td className="p-4 pl-6 font-black text-slate-800">{itm.name || "Barang"}</td>
                           <td className="p-4 font-semibold text-slate-600">
                             {itm.dimType === "S" && itm.length ? `${itm.length}x${itm.width}x${itm.height} cm` : (itm.weightType || "-")}
                           </td>
                           <td className="p-4 pr-6 text-right font-black text-emerald-600">{formatRupiah(Number(itm.value || 0))}</td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               )}
             </div>
          </div>

          {/* Card 3: Timeline Riwayat Tracking Inline */}
          <div className={`${glassPanel} rounded-[2rem] p-8`}>
            <div className="flex justify-between items-center mb-6 border-b border-white/60 pb-4 shrink-0">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4"/> Timeline Log Operasional</h2>
              <AdminButton size="sm" onClick={() => setShowStatusModal(true)} variant="outline" className="h-8 text-[10px] bg-white border-slate-200 hover:text-[#7A171D]">
                + Tambah Log Status
              </AdminButton>
            </div>
            
            <div className="overflow-y-auto max-h-[40vh] pr-2 admin-scrollbar">
              {(!order.trackingHistory || order.trackingHistory.length === 0) ? (
                 <div className="flex flex-col items-center justify-center py-6 opacity-50">
                   <Clock className="w-10 h-10 mb-3 text-slate-400" />
                   <p className="text-center text-sm text-slate-500 font-bold">Belum ada riwayat pelacakan.</p>
                 </div>
              ) : (
                <div className="space-y-6 pt-2">
                  {[...order.trackingHistory].reverse().map((log: TrackingHistoryItem, idx: number) => {
                    return (
                      <div key={log.id || String(idx)} className="relative pl-6 border-l-2 border-slate-200 last:border-transparent pb-2">
                        <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${idx === 0 ? 'bg-gradient-to-br from-[#9A242B] to-[#7A171D]' : 'bg-slate-300'}`}>
                          {idx === 0 && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                        </div>
                        
                        <div className="bg-white/60 backdrop-blur-md border border-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow -mt-1.5">
                          <p className="text-[10px] font-bold text-slate-400 mb-1 tracking-wider">{log.date}</p>
                          <h4 className="text-sm font-black text-slate-900">{log.status}</h4>
                          <p className="text-xs text-slate-600 mt-1.5 font-medium leading-relaxed">{log.description}</p>
                          
                          {log.location && (
                            <p className="text-[10px] font-bold text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1.5 rounded-lg border border-slate-200 w-fit"><MapPin className="w-3.5 h-3.5 text-slate-400"/> {log.location}</p>
                          )}

                          {log.proofUrl && (
                            <div className="mt-4">
                              <AdminButton onClick={() => setProofModalUrl(log.proofUrl as string)} variant="outline" size="sm" className="h-9 text-[10px] bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm">
                                <Camera className="w-3.5 h-3.5 mr-2" /> Lihat Foto Bukti
                              </AdminButton>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KANAN: FINANCIAL & DRIVER (ACTION PANEL) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card Keuangan & Profit Sharing */}
          <div className={`${glassPanel} rounded-[2.5rem] p-8`}>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4"/> Keuangan & Profit Sharing
            </h2>
            
            {/* Status & Method */}
            <div className="flex flex-col gap-2 bg-white/60 p-4 rounded-[1.25rem] border border-white mb-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metode Bayar</span>
                <AdminBadge variant={isCOD ? "warning" : "info"} className="text-[9px] shadow-sm">{methodLabel}</AdminBadge>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status Pelunasan</span>
                <AdminBadge variant={isPaymentVerified ? "success" : "danger"} className="text-[9px] shadow-sm">{order.paymentStatus || "Belum Dibayar"}</AdminBadge>
              </div>
            </div>

            {/* Breakdown Terformat Aman */}
            <div className="space-y-3 text-xs font-bold text-slate-600 mb-4">
              <div className="flex justify-between"><span>Biaya Pengiriman</span><span>{formatRupiah(deliveryFee)}</span></div>
              {insuranceFee > 0 && <div className="flex justify-between text-emerald-600"><span>Asuransi Barang</span><span>+{formatRupiah(insuranceFee)}</span></div>}
              {porterFee > 0 && <div className="flex justify-between text-emerald-600"><span>Jasa Porter (x{porterCount})</span><span>+{formatRupiah(porterFee)}</span></div>}
              {tollFee > 0 && <div className="flex justify-between text-emerald-600"><span>Estimasi Tol</span><span>+{formatRupiah(tollFee)}</span></div>}
              {b2bDiscount > 0 && <div className="flex justify-between text-[#7A171D]"><span>Diskon Korporat B2B</span><span>-{formatRupiah(b2bDiscount)}</span></div>}
              {discountPromoAmount > 0 && <div className="flex justify-between text-[#7A171D]"><span>Diskon Promo</span><span>-{formatRupiah(discountPromoAmount)}</span></div>}
            </div>

            <div className="py-4 border-y border-slate-200/60 mb-5">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Ongkos Kirim</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            {/* Profit Sharing Visual */}
            <div className="bg-slate-50 p-4 rounded-[1.25rem] border border-slate-100 mb-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><PieChart className="w-3.5 h-3.5"/> Skema Bagi Hasil</h3>
              
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Porsi Sopir ({driverSharePercent}%)</p>
                  <p className="text-sm font-black text-emerald-600 leading-none">{formatRupiah(driverShareNominal)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-[#7A171D] uppercase tracking-widest mb-0.5">Komisi App ({appCommissionPercent}%)</p>
                  <p className="text-sm font-black text-[#7A171D] leading-none">{formatRupiah(appShareNominal)}</p>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200 shadow-inner">
                <div className="h-full bg-emerald-500" style={{ width: `${driverSharePercent}%` }}></div>
                <div className="h-full bg-[#7A171D]" style={{ width: `${appCommissionPercent}%` }}></div>
              </div>
            </div>

            {/* Status Settlement Logic */}
            {order.status === "Selesai" ? (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3 shadow-inner">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-emerald-800 tracking-tight">Settle Otomatis Berhasil</p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-0.5 leading-relaxed">
                    {isCOD
                      ? `Saldo deposit sopir telah DIPOTONG sebesar komisi aplikasi (${formatRupiah(appShareNominal)}).`
                      : `Saldo deposit sopir telah DITAMBAH sebesar hak sopir (${formatRupiah(driverShareNominal)}).`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-inner">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-amber-800 tracking-tight">Menunggu Penyelesaian Order</p>
                  <p className="text-[10px] font-bold text-amber-700 mt-0.5 leading-relaxed">
                    Sistem akan mengeksekusi pembagian hasil ke saldo dompet saat status order menjadi &quot;Selesai&quot;.
                  </p>
                </div>
              </div>
            )}

            {receiptUrl && (
              <AdminButton onClick={() => setProofModalUrl(receiptUrl)} variant="outline" className="w-full mt-6 text-[10px] bg-white border-slate-200 shadow-sm hover:text-[#7A171D]">
                <FileText className="w-3.5 h-3.5 mr-2" /> Lihat Bukti Transfer Klien
              </AdminButton>
            )}
          </div>

          {/* Penugasan Kurir */}
          <div className={`${glassPanel} rounded-[2.5rem] p-8`}>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Truck className="w-4 h-4"/> Mitra Pengemudi</h2>
            
            {order.driverId ? (
              <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold mb-3">
                  {order.driverName?.[0] || "D"}
                </div>
                <h3 className="text-sm font-black text-slate-900">{order.driverName}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 bg-slate-100 px-2 py-0.5 rounded">{order.vehicleName || "Armada Pribadi"}</p>
                <AdminBadge variant="success" className="mt-4 w-full justify-center">Sopir Ditugaskan</AdminBadge>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-100">
                  <UserPlus className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-sm font-black text-slate-800 mb-1">Belum Ada Kurir</p>
                <p className="text-xs text-slate-500 font-medium mb-6">Pilih mitra kurir atau vendor truk yang sedang aktif untuk pesanan ini.</p>
                
                <AdminButton 
                  onClick={() => setShowDriverModal(true)} 
                  variant="primary" 
                  className="w-full shadow-[0_8px_20px_rgba(122,23,29,0.2)]"
                  disabled={!isPaymentVerified && !isCOD} 
                >
                  {isPaymentVerified || isCOD ? "Tugaskan Kurir Sekarang" : "Menunggu Pembayaran"}
                </AdminButton>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 🚀 MODAL UPDATE STATUS */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowStatusModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className={`${glassPanel} rounded-[2rem] p-8 w-full max-w-lg relative z-10 flex flex-col max-h-[95vh] overflow-hidden`}>
              <div className="flex justify-between items-center mb-6 border-b border-white/60 pb-4 shrink-0">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Clock className="w-5 h-5 text-[#7A171D]"/> Update Status & Log</h2>
                <button type="button" onClick={() => setShowStatusModal(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="overflow-y-auto admin-scrollbar pr-2 pb-4">
                <form onSubmit={handleConfirmStatusUpdate} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status Baku Operasional</label>
                    <select value={statusForm.status} onChange={(e) => setStatusForm({...statusForm, status: e.target.value})} className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-[#7A171D] focus:ring-[3px] focus:ring-[#7A171D]/15 shadow-sm text-slate-900 appearance-none">
                      <option value="Menunggu Kurir">Menunggu Kurir / Belum Dijemput</option>
                      <option value="Menuju Lokasi Jemput">Sopir Menuju Lokasi Jemput</option>
                      <option value="Sedang Diproses">Paket Tiba di Gudang Sortir (Diproses)</option>
                      <option value="Dikirim">Paket Dikirim ke Penerima (In Transit)</option>
                      <option value="Selesai">Pesanan Selesai (Delivered)</option>
                      <option value="Retur / Gagal Kirim">Retur / Pengiriman Gagal</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lokasi / Checkpoint Saat Ini</label>
                    <AdminInput type="text" value={statusForm.location} onChange={(e) => setStatusForm({...statusForm, location: e.target.value})} placeholder="Cth: Gudang Sortir Lombok Tengah" required />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deskripsi Kustom (Opsional)</label>
                    <AdminInput type="text" value={statusForm.description} onChange={(e) => setStatusForm({...statusForm, description: e.target.value})} placeholder="Kosongkan untuk auto-generate" />
                  </div>
                  
                  <div className="space-y-3 border-t border-white/60 pt-5 mt-4">
                    <label className="text-[10px] font-bold text-[#7A171D] uppercase tracking-widest block">Metode Pencatatan Waktu</label>
                    <div className="flex gap-4 mb-2">
                      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-700"><input type="radio" name="timeMode" checked={statusForm.timeMode === "auto"} onChange={() => setStatusForm({...statusForm, timeMode: "auto"})} className="w-4 h-4 accent-[#7A171D]" /> Real-time Otomatis</label>
                      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-700"><input type="radio" name="timeMode" checked={statusForm.timeMode === "custom"} onChange={() => setStatusForm({...statusForm, timeMode: "custom"})} className="w-4 h-4 accent-[#7A171D]" /> Manual (Backdate)</label>
                    </div>
                    {statusForm.timeMode === "custom" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                        <AdminInput type="datetime-local" required value={statusForm.customDate} onChange={(e) => setStatusForm({...statusForm, customDate: e.target.value})} />
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-6 mt-6">
                    <AdminButton type="button" variant="outline" onClick={() => setShowStatusModal(false)} className="flex-1 bg-white border-slate-200">Batalkan</AdminButton>
                    <AdminButton type="submit" variant="primary" className="flex-1">Simpan Log Update</AdminButton>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 MODAL PENUGASAN KURIR */}
      <AnimatePresence>
        {showDriverModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDriverModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className={`${glassPanel} rounded-[2rem] p-8 w-full max-w-lg relative z-10 flex flex-col max-h-[90vh]`}>
              <div className="shrink-0 mb-6 border-b border-white/60 pb-4">
                <h2 className="text-xl font-black text-slate-900 mb-2">Penugasan Kurir Operasional</h2>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">Pilih mitra kurir yang siap (idle) untuk mengeksekusi manifes pengiriman ini secara manual.</p>
              </div>
              
              <div className="space-y-3 overflow-y-auto pr-2 admin-scrollbar flex-1">
                {drivers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <AlertCircle className="w-10 h-10 mb-3 text-slate-400" />
                    <p className="text-xs text-center text-slate-500 font-bold">Tidak ada mitra kurir yang aktif di sistem.</p>
                  </div>
                ) : (
                  drivers.map(driver => (
                    <button key={driver.id} type="button" onClick={() => handleAssignDriver(driver)} className="w-full text-left p-4 bg-white/60 backdrop-blur-md border border-white rounded-2xl hover:border-[#C5A059] hover:bg-white hover:shadow-md transition-all flex justify-between items-center group">
                      <div>
                        <p className="text-sm font-black text-slate-900 group-hover:text-[#7A171D] transition-colors flex items-center gap-2">
                          {String(driver.name || "Mitra Kurir")}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1 shadow-sm"><Truck className="w-3 h-3"/> {String(driver.vehicleType || "Personal")}</span>
                           <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border flex items-center gap-1 shadow-sm ${
                             driver.partnerType === 'FleetDriver' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                           }`}>
                             {driver.partnerType === 'FleetDriver' ? <Building2 className="w-3 h-3"/> : <User className="w-3 h-3"/>}
                             {driver.partnerType === 'Individual' ? 'Individu' : 'Sopir Vendor'}
                           </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 group-hover:bg-[#7A171D] group-hover:border-[#7A171D] flex items-center justify-center transition-colors shrink-0 shadow-sm">
                        <UserPlus className="w-5 h-5 text-slate-400 group-hover:text-white" />
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="pt-6 shrink-0 mt-4 border-t border-white/60">
                <AdminButton type="button" variant="outline" onClick={() => setShowDriverModal(false)} className="w-full bg-white border-slate-200">Tutup & Batalkan Penugasan</AdminButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}