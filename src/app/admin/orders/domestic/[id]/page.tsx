"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, MapPin, User, Phone, 
  Weight, Box, DollarSign, CheckCircle2, AlertCircle, Clock,
  Truck, Building2, UserPlus, X, Camera, Map, FileText
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs } from "firebase/firestore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// IMPORT GLOBAL TYPES
import { OrderDetail, LocationDetail } from "@/types/order";
import { DriverData } from "@/types/admin";

interface TrackingLog {
  id?: string;
  status?: string;
  date?: string;
  description?: string;
  location?: string;
  proofUrl?: string;
}

interface CargoItem {
  name?: string;
  dimType?: string;
  length?: number | string;
  width?: number | string;
  height?: number | string;
  weightType?: string;
  value?: number | string;
  [key: string]: unknown;
}

export default function DomesticOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [rawAllPartners, setRawAllPartners] = useState<DriverData[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Modals States
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  const [statusForm, setStatusForm] = useState({
    status: "", location: "Pusat Logistik Flash Global", description: "", timeMode: "auto", customDate: ""
  });

  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

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
        } else {
          showToast("error", "Data pesanan tidak ditemukan.");
          setTimeout(() => router.push("/admin/orders/domestic"), 2000);
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
      const newLog = { 
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

      const newLog = { 
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

  if (!order) return null;

  // =========================================================================
  // SAFE DATA EXTRACTION
  // =========================================================================
  const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
  const originAddr = String(originObj?.address || (typeof order.origin === 'string' ? order.origin : ""));
  const originName = String(originObj?.senderName || order.senderName || "Pengirim");
  const originPhone = String(originObj?.senderPhone || order.senderPhone || "-");

  const destObj = order.destinations?.[0] || null;
  const destAddr = String(destObj?.address || order.destination || "");
  const destName = String(destObj?.receiverName || order.receiverName || "Penerima");
  const destPhone = String(destObj?.receiverPhone || order.receiverPhone || "-");

  // Ekstraksi Item Barang (Mencari di dalam Array Destinations)
  const orderItems = destObj?.items && Array.isArray(destObj.items) ? destObj.items : [];

  const isPaymentVerified = order.paymentStatus === "Lunas" || order.isB2BApplied; 
  
  // PERBAIKAN DI SINI: DOUBLE CASTING (unknown -> Record)
  const bd = (order.breakdown as unknown as Record<string, unknown>) || {};
  const deliveryFee = Number(bd.deliveryFee || 0);
  const insuranceFee = Number(bd.insuranceFee || 0);
  const porterFee = Number(bd.porterFee || 0);
  const tollFee = Number(bd.tollFee || 0);
  const b2bDiscount = Number(bd.b2bDiscount || 0);
  
  const orderRecord = order as unknown as Record<string, unknown>;
  const discountPromoAmount = Number(orderRecord.discountPromoAmount || 0);
  const porterCount = Number(orderRecord.porterCount || 1);
  const grandTotal = Number(order.finalGrandTotal || bd.grandTotal || order.totalCost || 0);
  
  const receiptUrl = orderRecord.receiptUrl ? String(orderRecord.receiptUrl) : null;

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
            <p className="text-[10px] font-bold text-[#7A171D] uppercase tracking-widest">Resi: {order.resi || order.id}</p>
          </div>
        </div>
        <AdminBadge variant={order.status.includes("Selesai") ? "success" : "brand"} className="text-sm px-4 py-1.5 shadow-sm">
          {order.status}
        </AdminBadge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KIRI: INFORMASI RUTE & BARANG */}
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
                     {orderItems.map((rawItm: unknown, i: number) => {
                       const itm = rawItm as CargoItem;
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
                  {[...order.trackingHistory].reverse().map((item, idx: number) => {
                    const log = item as TrackingLog;
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
                                <Camera className="w-3.5 h-3.5 mr-2" /> Lihat Foto Bukti PoD
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
          
          {/* Status Pembayaran & Breakdown */}
          <div className={`${glassPanel} rounded-[2.5rem] p-8`}>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4"/> Rincian Biaya</h2>
            
            {/* Status Bayar */}
            <div className="flex items-center justify-between bg-white/60 p-3 rounded-xl border border-white mb-6 shadow-sm">
              <span className="text-xs font-bold text-slate-500">Status Pembayaran</span>
              <AdminBadge variant={isPaymentVerified ? "success" : "warning"} className="text-[9px]">{order.paymentStatus || "Belum Dibayar"}</AdminBadge>
            </div>

            {/* Breakdown Terformat Aman */}
            <div className="space-y-3 text-xs font-bold text-slate-600">
              <div className="flex justify-between"><span>Biaya Pengiriman</span><span>{formatRupiah(deliveryFee)}</span></div>
              {insuranceFee > 0 && <div className="flex justify-between text-emerald-600"><span>Asuransi Barang</span><span>+{formatRupiah(insuranceFee)}</span></div>}
              {porterFee > 0 && <div className="flex justify-between text-emerald-600"><span>Jasa Porter (x{porterCount})</span><span>+{formatRupiah(porterFee)}</span></div>}
              {tollFee > 0 && <div className="flex justify-between text-emerald-600"><span>Estimasi Tol</span><span>+{formatRupiah(tollFee)}</span></div>}
              {b2bDiscount > 0 && <div className="flex justify-between text-[#7A171D]"><span>Diskon Korporat B2B</span><span>-{formatRupiah(b2bDiscount)}</span></div>}
              {discountPromoAmount > 0 && <div className="flex justify-between text-[#7A171D]"><span>Diskon Promo</span><span>-{formatRupiah(discountPromoAmount)}</span></div>}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200/60">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">{formatRupiah(grandTotal)}</span>
              </div>
            </div>

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
                  disabled={!isPaymentVerified}
                >
                  {isPaymentVerified ? "Tugaskan Kurir Sekarang" : "Menunggu Pembayaran"}
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