"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, MapPin, Truck, ReceiptText, CalendarClock, User, Phone, 
  CheckCircle2, Clock, Ban, TicketPercent, Building, CreditCard, AlertCircle, 
  Navigation, ShieldCheck, Scale, MessageCircle, Copy, FileWarning, Printer, 
  FileText, Banknote, XCircle, Eye, LifeBuoy, Map
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Modul Cetak & Template
import { useReactToPrint } from "react-to-print";
import { ReceiptTemplate } from "@/components/shared/ReceiptTemplate";
import { InvoiceA4Template } from "@/components/shared/InvoiceA4Template";

// Komponen Modular
import OrderTimeline, { TimelineItem } from "./components/OrderTimeline";
import { ClaimModal, RefundModal } from "./components/OrderModals";

// Global Types
import { OrderDetail, FirebaseTimestamp, LocationDetail, DeliveryItem } from "@/types/order";

// BUG FIX: Mengganti tipe 'any' menjadi interface yang terstruktur agar aman saat di-build
interface RefundData {
  id: string;
  status: string;
  nominal?: number;
  proofUrl?: string;
  [key: string]: unknown;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, isHydrated } = useAuthStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedResi, setCopiedResi] = useState(false);

  // === STATE UNTUK TOAST NOTIFICATION ===
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // States Claim
  const [hasExistingClaim, setHasExistingClaim] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  
  // States Refund & Detail Data
  const [hasExistingRefund, setHasExistingRefund] = useState(false);
  const [refundRequestData, setRefundRequestData] = useState<RefundData | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);

  // Print Refs
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrintReceipt = useReactToPrint({ contentRef: receiptRef, documentTitle: `Resi-${order?.resi || orderId}` });

  const invoiceRef = useRef<HTMLDivElement>(null);
  const handlePrintInvoice = useReactToPrint({ contentRef: invoiceRef, documentTitle: `Invoice-${order?.resi || orderId}` });

  useEffect(() => {
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!user?.uid || !orderId) return;
      setIsLoading(true);
      let fetchedOrderDocId = null;

      try {
        let docRef = doc(db, "orders", orderId);
        let docSnap = await getDoc(docRef);
        let category = "domestik";

        if (!docSnap.exists()) {
          docRef = doc(db, "quotes", orderId);
          docSnap = await getDoc(docRef);
          category = "internasional";
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userId && data.userId !== user.uid) {
            setErrorMsg("Akses Ditolak. Anda tidak memiliki izin untuk melihat pesanan ini.");
            setIsLoading(false);
            return;
          }
          fetchedOrderDocId = docSnap.id;
          setOrder({ id: docSnap.id, category, ...data } as OrderDetail);
        } else {
          setErrorMsg("Data pesanan tidak ditemukan di sistem.");
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Gagal menarik data pesanan:", error);
        setErrorMsg("Terjadi kesalahan sistem saat memuat data pesanan.");
        setIsLoading(false);
        return; 
      }

      if (fetchedOrderDocId) {
        try {
          const claimQ = query(collection(db, "insurance_claims"), where("orderId", "==", fetchedOrderDocId), where("userId", "==", user.uid));
          const refundQ = query(collection(db, "refund_requests"), where("orderId", "==", fetchedOrderDocId), where("userId", "==", user.uid));
          const [claimSnap, refundSnap] = await Promise.all([getDocs(claimQ), getDocs(refundQ)]);
          
          if (!claimSnap.empty) setHasExistingClaim(true);
          
          if (!refundSnap.empty) {
            setHasExistingRefund(true);
            setRefundRequestData({ id: refundSnap.docs[0].id, ...refundSnap.docs[0].data() } as RefundData);
          }
        } catch (err) { console.warn("Peringatan: Gagal mengecek status klaim/refund:", err); }
      }
      setIsLoading(false);
    };

    fetchOrderDetail();
  }, [orderId, user]);

  const formatIDR = (val?: number) => {
    if (!val) return "Rp 0";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  const formatFirebaseDate = (timestamp: FirebaseTimestamp) => {
    if (!timestamp) return "Baru Saja";
    const date = (typeof timestamp === "object" && "toDate" in timestamp && typeof timestamp.toDate === "function") 
      ? timestamp.toDate() 
      : new Date(timestamp as string | number);
    return date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const handleCopyResi = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedResi(true);
    setTimeout(() => setCopiedResi(false), 2000);
  };

  const handleDirectCancel = async () => {
    if (!order) return;
    if (confirm("Apakah Anda yakin ingin membatalkan pesanan ini? Tindakan ini tidak dapat dikembalikan.")) {
      setIsLoading(true);
      try {
        const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
        await updateDoc(doc(db, "orders", order.id), {
          status: "Dibatalkan",
          paymentStatus: "Dibatalkan",
          trackingHistory: arrayUnion({
            id: Date.now().toString(),
            status: "Dibatalkan",
            date: logDate,
            description: "Pesanan dibatalkan oleh Klien sebelum armada diberangkatkan.",
            location: "Sistem Web"
          })
        });
        setOrder({ ...order, status: "Dibatalkan", paymentStatus: "Dibatalkan" });
        showToast("success", "Pesanan berhasil dibatalkan.");
      } catch (error) {
        console.error("Gagal membatalkan pesanan:", error);
        showToast("error", "Terjadi kesalahan saat membatalkan pesanan.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderTimeline = (): TimelineItem[] => {
    if (!order) return [];
    if (order.trackingHistory && Array.isArray(order.trackingHistory) && order.trackingHistory.length > 0) {
      return [...order.trackingHistory].reverse().map((item, idx) => ({ 
        isCurrent: idx === 0,
        status: item.status,
        date: item.date,
        description: item.description || "Status diperbarui",
        location: item.location || "Sistem"
      }));
    }
    return [{
      status: order.status || "Menunggu Pembayaran",
      description: order.statusSub || order.paymentStatus || "Pesanan telah diterima oleh sistem dan menunggu proses.",
      location: "Sistem Logistik", 
      date: formatFirebaseDate(order.createdAt), 
      isCurrent: true
    }];
  };

  if (isLoading || !isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans bg-[#f8fafc] relative z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] bg-[#7A171D]/10 rounded-full blur-[120px] -z-10" />
        <div className="w-16 h-16 border-[5px] border-white border-t-[#7A171D] rounded-full animate-spin mb-6 shadow-sm"></div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Menyinkronkan Data</h2>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest animate-pulse mt-2">Menarik Rincian Manifes...</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans px-6 text-center bg-[#f8fafc] relative z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-red-500/5 rounded-full blur-[120px] -z-10" />
        <div className="glass-card p-10 md:p-12 rounded-[3rem] border border-white flex flex-col items-center max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
          <div className="w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 text-red-500 rounded-[2rem] flex items-center justify-center mb-8 border border-red-200 shadow-sm"><AlertCircle className="w-12 h-12 drop-shadow-sm" /></div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Terjadi Kesalahan</h2>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed max-w-md">{errorMsg}</p>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="h-14 w-full rounded-[1.25rem] font-black shadow-sm"><ArrowLeft className="w-5 h-5 mr-2" /> Kembali ke Dasbor</Button>
        </div>
      </div>
    );
  }

  const timelineData = renderTimeline();
  const resiNumber = order.resi || order.quoteId || order.id.slice(-12).toUpperCase();

  const originAddress = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail).address : order.origin;
  const originName = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail).senderName : order.senderName;
  const originPhone = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail).senderPhone : order.senderPhone;

  let destAddress = order.destination || "-";
  if (order.destinations && order.destinations.length > 0) {
    destAddress = order.destinations.length > 1 ? `${order.destinations.length} Titik Tujuan` : (order.destinations[0].address || "Tujuan");
  }

  // === LOGIKA KLAIM & REFUND ===
  const isMoneyInvolved = order.paymentStatus === "Lunas" || order.paymentStatus === "Menunggu Verifikasi Finance"; 
  const isEligibleForClaim = order.breakdown && order.breakdown.insuranceFee > 0; 
  const maxClaimAllowed = order.totalItemValue ? order.totalItemValue : (order.breakdown?.deliveryFee || 0) * 10;
  
  const canClaimInsurance = isEligibleForClaim && !hasExistingClaim && order.status === "Selesai";
  const canCancelOrder = ["Menunggu Pembayaran", "Menunggu Kurir", "Sedang Diproses", "Menuju Lokasi Jemput"].includes(order.status);
  const showDirectCancel = canCancelOrder && !isMoneyInvolved;
  const isCancelledWithMoney = order.status.includes("Batal") && isMoneyInvolved;
  const showRefundButton = (canCancelOrder && isMoneyInvolved) || isCancelledWithMoney;

  // Invoice Data Prep
  let issueDateObj = new Date();
  if (order.createdAt && typeof order.createdAt === "object" && "toDate" in order.createdAt && typeof order.createdAt.toDate === "function") {
    issueDateObj = order.createdAt.toDate();
  }
  const dueDateObj = new Date(issueDateObj);
  dueDateObj.setDate(dueDateObj.getDate() + (user?.role === 'b2b' ? 30 : 1));

  const invoiceItems = [];
  invoiceItems.push({ id: resiNumber, date: issueDateObj.toLocaleDateString('id-ID'), description: `Rute Pengiriman: ${originAddress?.substring(0,25)}... ➔ ${destAddress?.substring(0,25)}...`, service: `${order.serviceType} (${order.vehicleName || order.vehicle})`, weight: order.totalWeight || order.weight || 0, amount: order.breakdown?.deliveryFee || order.totalCost || 0 });
  if (order.breakdown?.insuranceFee) invoiceItems.push({ id: "INS-01", date: issueDateObj.toLocaleDateString('id-ID'), description: "Premi Asuransi Muatan", service: "Add-on", weight: 0, amount: order.breakdown.insuranceFee });
  if (order.breakdown?.porterFee) invoiceItems.push({ id: "PRT-01", date: issueDateObj.toLocaleDateString('id-ID'), description: `Jasa Porter / Helper (${order.porterCount || 1}x)`, service: "Add-on", weight: 0, amount: order.breakdown.porterFee });
  if (order.breakdown?.tollFee) invoiceItems.push({ id: "TOL-01", date: issueDateObj.toLocaleDateString('id-ID'), description: "Deposit Tol & Parkir", service: "Add-on", weight: 0, amount: order.breakdown.tollFee });

  const invoiceSubTotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const invoiceDiscount = (order.breakdown?.b2bDiscount || 0) + (order.discountPromoAmount || 0);
  const invoiceGrandTotal = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;

  return (
    <main className="min-h-screen bg-[#f8fafc] py-12 lg:py-20 px-6 relative overflow-hidden font-sans pb-32 z-0">
      
      {/* === AMBIENT GLOWING BACKGROUND === */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[50vh] rounded-full bg-[#7A171D]/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[50vh] rounded-full bg-[#C5A059]/15 blur-[120px]" />
      </div>

      {/* === UI TOAST NOTIFICATION === */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} 
            className={cn(
              "fixed top-10 right-10 z-[200] p-4 rounded-[1.25rem] font-bold text-sm border flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.1)] backdrop-blur-md",
              toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : 'bg-red-50/90 border-red-200 text-red-800'
            )}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1200px] mx-auto relative z-10 space-y-6">
        
        {/* === BACK BUTTON === */}
        <button onClick={() => router.push("/dashboard")} className="glass-card flex items-center gap-2 text-slate-600 hover:text-[#7A171D] hover:bg-white font-bold text-sm transition-all w-fit mb-4 px-5 py-3 rounded-[1.25rem] active:scale-95 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dasbor
        </button>

        {/* ==========================================
            HEADER PESANAN (GLASS BENTO STYLE)
            ========================================== */}
        <div className="glass-card p-6 md:p-10 rounded-[2.5rem] flex flex-col md:flex-row justify-between md:items-center gap-8 relative overflow-hidden border border-white shadow-[0_15px_40px_rgba(0,0,0,0.04)]">
          <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-slate-200/50 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge variant={order.category === "internasional" ? "brand" : "gold"} className="shadow-sm px-3.5 py-1.5 text-[10px] uppercase tracking-widest font-black">{order.serviceType || "Kargo Reguler"}</Badge>
              <span className="text-[10px] font-black text-slate-500 flex items-center gap-1.5 bg-white/60 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] uppercase tracking-widest">
                <CalendarClock className="w-3.5 h-3.5"/> {formatFirebaseDate(order.createdAt)}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-2 font-mono uppercase">#{resiNumber}</h1>
              <button onClick={() => handleCopyResi(resiNumber)} className="bg-white/60 backdrop-blur-md text-slate-500 hover:text-[#7A171D] hover:bg-white transition-all p-3 rounded-xl border border-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] active:scale-95" title="Salin Resi">
                {copiedResi ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 drop-shadow-sm" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:items-end z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status Pesanan</p>
            <div className={cn("px-6 py-3.5 rounded-[1.25rem] text-sm font-black uppercase tracking-widest border flex items-center gap-2.5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_10px_20px_rgba(0,0,0,0.05)] backdrop-blur-md", 
              order.status.includes("Selesai") ? "bg-emerald-50/80 text-emerald-700 border-emerald-200" :
              order.status.includes("Batal") ? "bg-red-50/80 text-red-700 border-red-200" :
              order.status.includes("Menunggu") ? "bg-amber-50/80 text-amber-700 border-amber-200" : "bg-blue-50/80 text-blue-700 border-blue-200"
            )}>
              {order.status.includes("Selesai") ? <CheckCircle2 className="w-5 h-5"/> : order.status.includes("Batal") ? <Ban className="w-5 h-5" /> : order.status === "Dikirim" ? <Navigation className="w-5 h-5" /> : <Clock className="w-5 h-5"/>}
              {order.status}
            </div>
          </div>
        </div>

        {/* ==========================================
            MAIN CONTENT GRID
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* --------------------------------------
              KOLOM KIRI: Rute, Informasi Kargo, Timeline
              -------------------------------------- */}
          <div className="lg:col-span-7 space-y-6 lg:space-y-8">
            
            {/* KARTU RUTE & DETAIL PAKET */}
            <div className="glass-card rounded-[2.5rem] p-6 md:p-8 space-y-8 border border-white shadow-[0_15px_40px_rgba(0,0,0,0.03)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/10 rounded-full blur-[80px] pointer-events-none z-0" />

              {/* Seksi Rute (Origin -> Destination) */}
              <div className="relative z-10">
                <h3 className="text-base font-black text-slate-900 mb-8 flex items-center gap-2.5 tracking-tight"><Map className="w-5 h-5 text-[#7A171D]" /> Peta Perjalanan Kargo</h3>
                
                <div className="relative pl-3">
                  <div className="absolute left-[19px] top-8 bottom-8 w-[3px] bg-gradient-to-b from-slate-200 via-slate-200 to-[#7A171D]/20 z-0 rounded-full"></div>
                  
                  <div className="space-y-8 relative z-10">
                    
                    {/* ORIGIN */}
                    <div className="flex items-start gap-5">
                      <div className="mt-1 bg-white border-[3px] border-slate-200 p-2 rounded-full shadow-sm shrink-0 z-10"><MapPin className="w-4 h-4 text-slate-500 drop-shadow-sm" /></div>
                      <div className="min-w-0 w-full">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lokasi Pengirim</p>
                        <div className="bg-white/60 backdrop-blur-md p-6 rounded-[1.5rem] border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]">
                          {/* BUG FIX DI SINI: line-clamp-2 & break-words */}
                          <p className="font-bold text-slate-900 text-sm leading-relaxed break-words line-clamp-2">{originAddress || "-"}</p>
                          {originName && (
                            <div className="mt-5 pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs font-black text-slate-500">
                              <span className="flex items-center gap-2 min-w-0"><User className="w-4 h-4 shrink-0 text-slate-400"/> <span className="truncate">{originName}</span></span>
                              <span className="flex items-center gap-2 shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm"><Phone className="w-3.5 h-3.5 text-slate-400"/> {originPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* DESTINATIONS */}
                    <div className="flex items-start gap-5">
                      <div className="mt-1 bg-white border-[3px] border-[#7A171D]/30 p-2 rounded-full shadow-[0_4px_10px_rgba(122,23,29,0.2)] shrink-0 z-10"><MapPin className="w-4 h-4 text-[#7A171D] drop-shadow-sm" /></div>
                      <div className="min-w-0 w-full">
                        <p className="text-[10px] font-black text-[#7A171D]/60 uppercase tracking-widest mb-2">Titik Tujuan Akhir</p>
                        {order.destinations ? order.destinations.map((dest: LocationDetail, idx: number) => (
                          <div key={idx} className="bg-white/60 backdrop-blur-md p-6 rounded-[1.5rem] border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] mb-4 last:mb-0 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#DFBE7B]/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-[#DFBE7B]/20 transition-colors" />
                            
                            <div className="flex justify-between items-start mb-2 relative z-10">
                              {/* BUG FIX DI SINI: line-clamp-2 & break-words */}
                              <p className="font-bold text-slate-900 text-sm leading-relaxed pr-4 break-words line-clamp-2">{dest.address}</p>
                              {order.destinations && order.destinations.length > 1 && <Badge variant="glass" className="shrink-0 shadow-sm px-3 py-1">Drop {idx + 1}</Badge>}
                            </div>
                            {dest.receiverName && (
                              <div className="mt-5 pt-4 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs font-black text-slate-500 relative z-10">
                                <span className="flex items-center gap-2 min-w-0"><User className="w-4 h-4 shrink-0 text-slate-400"/> <span className="truncate">{dest.receiverName}</span></span>
                                <span className="flex items-center gap-2 shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm"><Phone className="w-3.5 h-3.5 text-slate-400"/> {dest.receiverPhone}</span>
                              </div>
                            )}
                          </div>
                        )) : (
                          <div className="bg-white/60 backdrop-blur-md p-6 rounded-[1.5rem] border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] relative z-10">
                             {/* BUG FIX DI SINI: line-clamp-2 & break-words */}
                             <p className="font-bold text-slate-900 text-sm leading-relaxed break-words line-clamp-2">{order.destination || "-"}</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Seksi Spesifikasi Kargo & Driver */}
              <div className="pt-8 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                <div className="bg-white/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] flex items-center gap-5 hover:bg-white transition-colors group">
                  <div className="w-14 h-14 bg-white rounded-[1.25rem] flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300 shrink-0"><Scale className="w-6 h-6 text-slate-400 drop-shadow-sm" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Berat Kargo</p>
                    <p className="font-black text-slate-900 text-lg tracking-tight truncate">{order.totalWeight || order.weight || 0} Kg</p>
                  </div>
                </div>
                <div className="bg-white/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] flex items-center gap-5 hover:bg-white transition-colors group">
                  <div className="w-14 h-14 bg-white rounded-[1.25rem] flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300 shrink-0"><Truck className="w-6 h-6 text-slate-400 drop-shadow-sm" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipe Armada</p>
                    <p className="font-black text-slate-900 text-lg tracking-tight truncate">{order.vehicleName || order.vehicle || order.serviceType}</p>
                  </div>
                </div>
                
                {order.driverName && (
                  <div className="md:col-span-2 bg-gradient-to-r from-slate-800 to-slate-900 p-5 rounded-[1.5rem] border border-slate-700 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="w-14 h-14 bg-slate-700/50 rounded-[1.25rem] flex items-center justify-center border border-slate-600 shrink-0">
                        <User className="w-6 h-6 text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kurir Pengantar</p>
                        <p className="font-black text-white text-lg tracking-tight truncate">{order.driverName}</p>
                      </div>
                    </div>
                    <Button variant="glass" className="w-full sm:w-auto rounded-xl h-12 px-6 bg-white/10 border-white/20 text-white hover:bg-white hover:text-slate-900 shadow-sm transition-all" onClick={() => window.open(`tel:${order.driverPhone}`)} title="Hubungi Kurir">
                      <Phone className="w-4 h-4 mr-2" /> Hubungi Kurir
                    </Button>
                  </div>
                )}
              </div>

            </div>

            {/* KARTU TIMELINE */}
            <div className="glass-card rounded-[2.5rem] p-6 md:p-8 border border-white shadow-[0_15px_40px_rgba(0,0,0,0.03)]">
               <OrderTimeline timelineData={timelineData} orderStatus={order.status} />
            </div>
            
          </div>

          {/* --------------------------------------
              KOLOM KANAN: Billing, Actions & Support
              -------------------------------------- */}
          <div className="lg:col-span-5 space-y-6 lg:space-y-8 lg:sticky lg:top-10">
            
            {/* --- KARTU TAGIHAN (3D PREMIUM DARK BENTO) --- */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-[2.5rem] shadow-[0_24px_50px_rgba(15,23,42,0.4)] border border-slate-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] rounded-full blur-[100px] opacity-15 pointer-events-none group-hover:opacity-25 transition-opacity duration-700"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#7A171D] rounded-full blur-[100px] opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity duration-700"></div>
              
              <div className="p-8 md:p-10 relative z-10">
                <h3 className="text-xl font-black mb-8 flex items-center gap-3 tracking-tight drop-shadow-md"><ReceiptText className="w-6 h-6 text-[#C5A059]" /> Rincian Transaksi</h3>
                
                <div className="space-y-5 mb-10 text-sm font-semibold">
                  {order.breakdown ? (
                    <>
                      <div className="flex justify-between items-center text-slate-400"><span>Subtotal Tarif Dasar</span><span className="text-white">{formatIDR(order.breakdown.deliveryFee)}</span></div>
                      {(order.breakdown.insuranceFee || 0) > 0 && <div className="flex justify-between items-center text-slate-400"><span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400"/> Asuransi Muatan</span><span className="text-white">{formatIDR(order.breakdown.insuranceFee)}</span></div>}
                      {(order.breakdown.porterFee || 0) > 0 && <div className="flex justify-between items-center text-slate-400"><span>Jasa Porter / Helper</span><span className="text-white">{formatIDR(order.breakdown.porterFee)}</span></div>}
                      {(order.breakdown.tollFee || 0) > 0 && <div className="flex justify-between items-center text-slate-400"><span>Deposit Tol & Parkir</span><span className="text-white">{formatIDR(order.breakdown.tollFee)}</span></div>}
                      {(order.breakdown.b2bDiscount || 0) > 0 && <div className="flex justify-between items-center text-emerald-400"><span className="flex items-center gap-2"><Building className="w-4 h-4"/> Diskon Corporate</span><span>- {formatIDR(order.breakdown.b2bDiscount)}</span></div>}
                      {order.appliedPromoCode && <div className="flex justify-between items-center text-pink-400 border-t border-slate-700/50 pt-5 mt-5"><span className="flex items-center gap-2"><TicketPercent className="w-4 h-4"/> Kode Promo ({order.appliedPromoCode})</span><span className="font-bold">- {formatIDR(order.discountPromoAmount)}</span></div>}
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-slate-400"><span>Estimasi Total</span><span className="text-white">{formatIDR(order.totalCost || order.offeredPrice)}</span></div>
                  )}
                </div>
                
                <div className="pt-8 border-t border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Keseluruhan</p>
                  <p className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#DFBE7B] to-[#A68345] tracking-tighter drop-shadow-sm">{formatIDR(order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || order.offeredPrice || 0)}</p>
                </div>
              </div>

              {/* AREA AKSI FINANSIAL (Didalam Kartu Billing agar Kontekstual) */}
              <div className="px-8 md:px-10 py-8 bg-slate-900/60 border-t border-slate-800 backdrop-blur-md flex flex-col gap-4 relative z-10">
                 {order.status === "Menunggu Pembayaran" && (
                   <Button onClick={() => router.push("/pembayaran")} variant="primary" className="w-full h-14 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_10px_20px_rgba(122,23,29,0.3)] text-sm font-black active:scale-95">
                     <CreditCard className="w-5 h-5 mr-2" /> Selesaikan Pembayaran
                   </Button>
                 )}
                 {(order.paymentStatus === "Lunas" || order.paymentStatus === "Piutang B2B") && !order.status.includes("Batal") && (
                   <div className="flex flex-col sm:flex-row gap-4">
                     <Button onClick={handlePrintReceipt} variant="outline" className="flex-1 h-14 rounded-2xl border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:border-slate-500 font-bold active:scale-95 transition-all">
                       <Printer className="w-5 h-5 mr-2 text-slate-400" /> Cetak Resi
                     </Button>
                     <Button onClick={handlePrintInvoice} variant="outline" className="flex-1 h-14 rounded-2xl border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:border-slate-500 font-bold active:scale-95 transition-all">
                       <FileText className="w-5 h-5 mr-2 text-slate-400" /> Invoice A4
                     </Button>
                   </div>
                 )}
              </div>
            </div>

            {/* --- ACTION & SUPPORT CENTER (Glass Card Bento) --- */}
            <div className="glass-card rounded-[2.5rem] p-6 md:p-8 space-y-6 border border-white shadow-[0_15px_40px_rgba(0,0,0,0.03)]">
              <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2.5 tracking-tight"><LifeBuoy className="w-5 h-5 text-[#7A171D]" /> Pusat Bantuan & Tindakan</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <Button onClick={() => window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Tim CS Flash Global,\nSaya menanyakan pesanan saya:\nID: ${resiNumber}\nMohon dibantu.`)}`, "_blank")} variant="outline" className="w-full h-14 justify-start text-slate-600 bg-white/60 hover:bg-white border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] font-bold rounded-2xl transition-all">
                  <MessageCircle className="w-5 h-5 text-emerald-500 mr-2" /> Hubungi Layanan Pelanggan
                </Button>

                {/* KLAIM ASURANSI */}
                {canClaimInsurance && (
                  <Button onClick={() => setShowClaimModal(true)} variant="outline" className="w-full h-14 justify-start border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100 hover:border-amber-300 font-bold rounded-2xl transition-all">
                    <FileWarning className="w-5 h-5 mr-2" /> Ajukan Klaim Kerusakan
                  </Button>
                )}
                {hasExistingClaim && (
                  <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200 text-amber-700 p-5 rounded-2xl text-xs font-bold flex items-start gap-4 shadow-sm">
                    <Clock className="w-6 h-6 shrink-0 mt-0.5" /> 
                    <span className="leading-relaxed">Pengajuan klaim asuransi Anda sedang dalam peninjauan intensif oleh tim terkait.</span>
                  </div>
                )}

                {/* BATALKAN & REFUND */}
                {(!hasExistingRefund && !order.paymentStatus?.includes("Refund")) && (
                  <>
                    {showDirectCancel && (
                      <Button onClick={handleDirectCancel} variant="outline" className="w-full h-14 justify-start border-red-200 text-red-600 bg-red-50/50 hover:bg-red-100 hover:border-red-300 font-bold rounded-2xl transition-all shadow-sm">
                        <Ban className="w-5 h-5 mr-2" /> Batalkan Pesanan (Tanpa Biaya)
                      </Button>
                    )}
                    {showRefundButton && (
                      <Button onClick={() => setShowRefundModal(true)} variant="danger" className="w-full h-14 justify-start bg-red-600 hover:bg-red-700 shadow-[0_8px_16px_rgba(220,38,38,0.2)] font-bold rounded-2xl transition-all">
                        <Banknote className="w-5 h-5 mr-2" /> Ajukan Pembatalan & Refund Dana
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* TAMPILAN STATUS REFUND & BUKTI TRANSFER ADMIN */}
              {(hasExistingRefund || order.paymentStatus?.includes("Refund")) && (
                <div className={`p-6 md:p-8 rounded-[2rem] border shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] mt-6 ${
                  (refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") ? "bg-emerald-50/80 border-emerald-200 backdrop-blur-sm" :
                  (refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") ? "bg-red-50/80 border-red-200 backdrop-blur-sm" :
                  "bg-amber-50/80 border-amber-200 backdrop-blur-sm"
                }`}>
                  <div className={`flex items-center gap-2.5 font-black text-base mb-3 tracking-tight ${
                    (refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") ? "text-emerald-700" :
                    (refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") ? "text-red-700" :
                    "text-amber-700"
                  }`}>
                    {(refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") ? <CheckCircle2 className="w-6 h-6 drop-shadow-sm" /> : 
                     (refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") ? <XCircle className="w-6 h-6 drop-shadow-sm" /> : 
                     <Clock className="w-6 h-6 drop-shadow-sm" />}
                    
                    {(refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") ? "Dana Berhasil Dikembalikan" : 
                     (refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") ? "Pengajuan Refund Ditolak" : 
                     "Refund Diproses Finance"}
                  </div>
                  
                  <p className={`text-sm font-semibold leading-relaxed ${(!refundRequestData || refundRequestData?.status === "Pending" || order.paymentStatus === "Menunggu Refund") ? "text-amber-600" : "text-slate-600"}`}>
                    {(!refundRequestData || refundRequestData?.status === "Pending" || order.paymentStatus === "Menunggu Refund") 
                      ? "Mohon tunggu 1x24 jam kerja untuk proses verifikasi dan transfer manual dari tim Finance kami." 
                      : `Nominal Kembali: ${formatIDR(refundRequestData?.nominal || order.finalGrandTotal || order.totalCost)}`}
                  </p>

                  {/* BUKTI TRANSFER ADMIN */}
                  {(refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") && refundRequestData?.proofUrl && (
                    <div className="mt-6 pt-6 border-t border-emerald-200/60">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> Bukti Transfer Admin
                      </p>
                      <div className="bg-white p-2.5 rounded-[1.5rem] border border-emerald-100 relative group overflow-hidden flex justify-center shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={refundRequestData.proofUrl} alt="Bukti Refund" className="w-full h-auto max-h-56 object-cover rounded-xl" />
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <a href={refundRequestData.proofUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-xs shadow-xl flex items-center gap-2 hover:bg-slate-50 transition-colors active:scale-95">
                            <Eye className="w-4 h-4" /> Buka Layar Penuh
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* FALLBACK JIKA REFUND SELESAI TAPI ADMIN TIDAK UNGGAH BUKTI URL */}
                  {(order.paymentStatus === "Refund Selesai" && !refundRequestData?.proofUrl) && (
                    <div className="mt-6 pt-5 border-t border-emerald-200/60">
                       <p className="text-sm text-emerald-600 font-bold">Dana refund telah ditransfer ke rekening Anda. Silakan cek mutasi secara berkala.</p>
                    </div>
                  )}
                  {(refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") && (
                    <div className="mt-6 pt-5 border-t border-red-200/60">
                      <p className="text-sm text-red-600 font-bold leading-relaxed">
                        Harap hubungi Customer Service untuk informasi lebih lanjut mengenai alasan penolakan pengembalian dana Anda.
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* COMPONENT TERSEMBUNYI UNTUK CETAK */}
      <div style={{ display: 'none' }}>
        {order && <ReceiptTemplate ref={receiptRef} resi={resiNumber} senderName={(originName as string) || user?.displayName || "-"} senderPhone={(originPhone as string) || "-"} originAddress={(originAddress as string) || "-"} receiverName={(order.destinations?.[0]?.receiverName as string) || (order.receiverName as string) || "-"} receiverPhone={(order.destinations?.[0]?.receiverPhone as string) || (order.receiverPhone as string) || "-"} destAddress={order.destinations && order.destinations.length > 1 ? `${order.destinations.length} Titik Tujuan` : ((order.destinations?.[0]?.address as string) || (order.destination as string) || "-")} weight={order.totalWeight || order.weight || 0} serviceType={order.serviceType || "Kargo"} vehicleName={order.vehicleName || order.vehicle || "Armada"} date={formatFirebaseDate(order.createdAt)} itemsDesc={((order.destinations?.[0]?.items as DeliveryItem[])?.[0]?.name) || "Paket Kargo"} />}
      </div>
      <div style={{ display: 'none' }}>
        {order && <InvoiceA4Template ref={invoiceRef} invoiceNumber={`INV-${resiNumber}`} issueDate={issueDateObj.toLocaleDateString('id-ID')} dueDate={dueDateObj.toLocaleDateString('id-ID')} clientName={user?.displayName || (originName as string) || "Klien Yth."} clientCompany={user?.companyName} clientAddress={(originAddress as string) || "-"} clientEmail={user?.email || order.email || "-"} clientPhone={(originPhone as string) || user?.phoneNumber || "-"} items={invoiceItems} subTotal={invoiceSubTotal} discountAmount={invoiceDiscount} taxAmount={0} grandTotal={invoiceGrandTotal} />}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showClaimModal && user && <ClaimModal order={order} user={user} maxClaimAllowed={maxClaimAllowed} onClose={() => setShowClaimModal(false)} onSuccess={() => setHasExistingClaim(true)} showToast={showToast} />}
        {showRefundModal && user && <RefundModal order={order} user={user} onClose={() => setShowRefundModal(false)} onSuccess={(updates) => { setHasExistingRefund(true); setOrder({ ...order, ...updates }); setShowRefundModal(false); }} showToast={showToast} />}
      </AnimatePresence>
    </main>
  );
} 