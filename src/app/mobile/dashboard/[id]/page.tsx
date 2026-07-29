"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, ReceiptText, User, Phone, 
  CheckCircle2, Clock, Ban, CreditCard, AlertCircle, 
  Navigation, MessageCircle, Copy, FileWarning, Printer, 
  FileText, Banknote, XCircle, ChevronRight
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

import { useReactToPrint } from "react-to-print";
import { ReceiptTemplate } from "@/components/shared/ReceiptTemplate";
import { InvoiceA4Template } from "@/components/shared/InvoiceA4Template";

import OrderTimeline, { TimelineItem } from "./components/OrderTimeline";
import { ClaimModal, RefundModal } from "./components/OrderModals";

import { OrderDetail, FirebaseTimestamp, LocationDetail, DeliveryItem } from "@/types/order";

interface RefundData {
  id: string;
  status: string;
  nominal?: number;
  proofUrl?: string;
  [key: string]: unknown;
}

export default function MobileOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, isHydrated } = useAuthStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedResi, setCopiedResi] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [hasExistingClaim, setHasExistingClaim] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  
  const [hasExistingRefund, setHasExistingRefund] = useState(false);
  const [refundRequestData, setRefundRequestData] = useState<RefundData | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);

  // Print Refs
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrintReceipt = useReactToPrint({ contentRef: receiptRef, documentTitle: `Resi-${order?.resi || orderId}` });
  const invoiceRef = useRef<HTMLDivElement>(null);
  const handlePrintInvoice = useReactToPrint({ contentRef: invoiceRef, documentTitle: `Invoice-${order?.resi || orderId}` });

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

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
            setErrorMsg("Akses Ditolak.");
            setIsLoading(false); return;
          }
          fetchedOrderDocId = docSnap.id;
          setOrder({ id: docSnap.id, category, ...data } as OrderDetail);
        } else {
          setErrorMsg("Pesanan tidak ditemukan.");
          setIsLoading(false); return;
        }
      } catch (error) {
        console.error(error);
        setErrorMsg("Terjadi kesalahan sistem.");
        setIsLoading(false); return; 
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
        } catch (err) { console.warn(err); }
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
      ? timestamp.toDate() : new Date(timestamp as string | number);
    return date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const handleCopyResi = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedResi(true);
    setTimeout(() => setCopiedResi(false), 2000);
  };

  const handleDirectCancel = async () => {
    if (!order) return;
    if (confirm("Yakin batalkan pesanan ini?")) {
      setIsLoading(true);
      try {
        const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
        await updateDoc(doc(db, "orders", order.id), {
          status: "Dibatalkan", paymentStatus: "Dibatalkan",
          trackingHistory: arrayUnion({ id: Date.now().toString(), status: "Dibatalkan", date: logDate, description: "Pesanan dibatalkan oleh Klien.", location: "Sistem Web" })
        });
        setOrder({ ...order, status: "Dibatalkan", paymentStatus: "Dibatalkan" });
        showToast("success", "Pesanan dibatalkan.");
      } catch (error) {
        console.error(error); showToast("error", "Gagal membatalkan.");
      } finally { setIsLoading(false); }
    }
  };

  const renderTimeline = (): TimelineItem[] => {
    if (!order) return [];
    if (order.trackingHistory && Array.isArray(order.trackingHistory) && order.trackingHistory.length > 0) {
      return [...order.trackingHistory].reverse().map((item, idx) => ({ 
        isCurrent: idx === 0, status: item.status, date: item.date, description: item.description || "Status diperbarui", location: item.location || "Sistem"
      }));
    }
    return [{ status: order.status || "Menunggu", description: order.statusSub || order.paymentStatus || "Pesanan diterima.", location: "Sistem", date: formatFirebaseDate(order.createdAt), isCurrent: true }];
  };

  // --- STATE LOADING & ERROR DENGAN LAYOUT OVERLAY ---
  if (isLoading || !isHydrated) {
    return (
      <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Menyiapkan Manifes...</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-black text-slate-900 mb-2">{errorMsg || "Tidak ditemukan"}</h2>
        <button onClick={() => router.back()} className="mt-4 bg-white border border-slate-200 px-6 py-3 rounded-2xl font-bold text-sm shadow-sm active:scale-95">Kembali</button>
      </div>
    );
  }

  // --- DATA PREPARATION ---
  const timelineData = renderTimeline();
  const resiNumber = order.resi || order.quoteId || order.id.slice(-12).toUpperCase();

  const originAddress = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail).address : order.origin;
  const originName = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail).senderName : order.senderName;
  const originPhone = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail).senderPhone : order.senderPhone;

  let destAddress = order.destination || "-";
  if (order.destinations && order.destinations.length > 0) {
    destAddress = order.destinations.length > 1 ? `${order.destinations.length} Titik Tujuan` : (order.destinations[0].address || "Tujuan");
  }

  const isMoneyInvolved = order.paymentStatus === "Lunas" || order.paymentStatus === "Menunggu Verifikasi Finance"; 
  const isEligibleForClaim = order.breakdown && order.breakdown.insuranceFee > 0; 
  const maxClaimAllowed = order.totalItemValue ? order.totalItemValue : (order.breakdown?.deliveryFee || 0) * 10;
  
  const canClaimInsurance = isEligibleForClaim && !hasExistingClaim && order.status === "Selesai";
  const canCancelOrder = ["Menunggu Pembayaran", "Menunggu Kurir", "Sedang Diproses", "Menuju Lokasi Jemput"].includes(order.status);
  const showDirectCancel = canCancelOrder && !isMoneyInvolved;
  const isCancelledWithMoney = order.status.includes("Batal") && isMoneyInvolved;
  const showRefundButton = (canCancelOrder && isMoneyInvolved) || isCancelledWithMoney;

  let issueDateObj = new Date();
  if (order.createdAt && typeof order.createdAt === "object" && "toDate" in order.createdAt && typeof order.createdAt.toDate === "function") {
    issueDateObj = order.createdAt.toDate();
  }
  const dueDateObj = new Date(issueDateObj);
  dueDateObj.setDate(dueDateObj.getDate() + (user?.role === 'b2b' ? 30 : 1));

  const invoiceItems = [];
  invoiceItems.push({ id: resiNumber, date: issueDateObj.toLocaleDateString('id-ID'), description: `Rute: ${originAddress?.substring(0,15)}... ➔ ${destAddress?.substring(0,15)}...`, service: `${order.serviceType}`, weight: order.totalWeight || order.weight || 0, amount: order.breakdown?.deliveryFee || order.totalCost || 0 });
  if (order.breakdown?.insuranceFee) invoiceItems.push({ id: "INS", date: issueDateObj.toLocaleDateString('id-ID'), description: "Asuransi", service: "Add-on", weight: 0, amount: order.breakdown.insuranceFee });
  if (order.breakdown?.porterFee) invoiceItems.push({ id: "PRT", date: issueDateObj.toLocaleDateString('id-ID'), description: `Jasa Porter`, service: "Add-on", weight: 0, amount: order.breakdown.porterFee });
  if (order.breakdown?.tollFee) invoiceItems.push({ id: "TOL", date: issueDateObj.toLocaleDateString('id-ID'), description: "Deposit Tol", service: "Add-on", weight: 0, amount: order.breakdown.tollFee });

  const invoiceSubTotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const invoiceDiscount = (order.breakdown?.b2bDiscount || 0) + (order.discountPromoAmount || 0);
  const invoiceGrandTotal = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;

  // --- LOGIKA STICKY PRIMARY ACTION (Di bagian bawah layar) ---
  const isB2B = order.statusSub === "Piutang B2B";
  let PrimaryAction = null;

  if (order.status === "Menunggu Pembayaran" && !isB2B) {
    PrimaryAction = (
      <button onClick={() => router.push("/pembayaran")} className="w-full h-14 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white rounded-[1.25rem] font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 tap-highlight-transparent border border-[#5A0E13]">
        <CreditCard className="w-5 h-5" /> Selesaikan Pembayaran
      </button>
    );
  } else if (order.status === "Menunggu Kurir" || order.status === "Sedang Diproses" || order.status === "Menuju Lokasi Jemput" || order.status === "Dikirim" || order.status.includes("Transit")) {
    PrimaryAction = (
      <button onClick={() => router.push(`/tracking/${resiNumber}`)} className="w-full h-14 bg-blue-600 text-white rounded-[1.25rem] font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 tap-highlight-transparent border border-blue-700">
        <Navigation className="w-5 h-5" /> Lacak Live Radar
      </button>
    );
  } else {
    // Default action (Selesai / Batal)
    PrimaryAction = (
      <button onClick={() => window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo CS, tolong cek pesanan saya ID: ${resiNumber}`)}`, "_blank")} className="w-full h-14 bg-white border border-slate-200 text-slate-700 rounded-[1.25rem] font-bold shadow-sm flex items-center justify-center gap-2 active:scale-95 tap-highlight-transparent">
        <MessageCircle className="w-5 h-5 text-emerald-500" /> Hubungi CS Bantuan
      </button>
    );
  }

  // Helper Warna Status Bar
  const getStatusColor = () => {
    if (order.status.includes("Selesai")) return "bg-emerald-500 text-white";
    if (order.status.includes("Batal")) return "bg-red-500 text-white";
    if (order.status.includes("Dikirim") || order.status.includes("Transit")) return "bg-blue-500 text-white";
    return "bg-amber-500 text-white";
  };

  return (
    // =========================================================================
    // 🚀 NATIVE PUSH VIEW ARCHITECTURE
    // fixed inset-0 z-[150]: Mengambang di atas seluruh UI termasuk BottomNav
    // Flex-col h-[100dvh]: Mengambil alih kontrol tinggi layar sepenuhnya
    // =========================================================================
    <div className="fixed inset-0 z-[150] bg-slate-50 flex justify-center font-sans overflow-hidden">
      
      {/* Batasi Max Width agar tetap rapi di tablet */}
      <div className="w-full max-w-md relative flex flex-col h-[100dvh] bg-slate-50 shadow-2xl">
        
        {/* AMBIENT GLOW LOKAL */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-5%] left-[-10%] w-[60vw] h-[30vh] rounded-full bg-rose-200/40 blur-[100px]" />
          <div className="absolute bottom-[-5%] right-[-10%] w-[60vw] h-[30vh] rounded-full bg-amber-100/40 blur-[100px]" />
        </div>

        {/* TOAST NOTIFICATION */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} 
              className={cn("absolute top-20 left-4 right-4 z-[200] p-3 rounded-2xl font-bold text-xs border flex items-center gap-3 shadow-lg backdrop-blur-md", toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : 'bg-red-50/90 border-red-200 text-red-800')}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />} {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==============================================================
            1. APP BAR (HEADER NATIVE) - Posisinya Flex-None di Atas
            ============================================================== */}
        <div className="flex-none glass-panel border-b border-white shadow-sm flex items-center justify-between px-4 py-3 pt-safe relative z-20">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-slate-700 bg-white/50 rounded-full active:scale-90 tap-highlight-transparent border border-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-sm font-black text-slate-900 tracking-tight">Detail Pesanan</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{order.category}</p>
          </div>
          <button onClick={() => handleCopyResi(resiNumber)} className="w-10 h-10 flex items-center justify-center text-slate-700 bg-white/50 rounded-full active:scale-90 tap-highlight-transparent border border-white">
            {copiedResi ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        {/* ==============================================================
            2. SCROLLABLE MAIN CONTENT - Posisinya Flex-Grow di Tengah
            ============================================================== */}
        <main className="flex-grow overflow-y-auto px-4 pt-5 pb-[130px] space-y-4 relative z-10 no-scrollbar">
          
          {/* STATUS BANNER */}
          <div className={cn("rounded-3xl p-4 flex items-center gap-4 shadow-sm border border-white/20", getStatusColor())}>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              {order.status.includes("Selesai") ? <CheckCircle2 className="w-6 h-6"/> : order.status.includes("Batal") ? <Ban className="w-6 h-6" /> : order.status === "Dikirim" ? <Navigation className="w-6 h-6" /> : <Clock className="w-6 h-6"/>}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">{order.status}</h2>
              <p className="text-xs font-medium text-white/80">{order.statusSub || `Dibuat pada ${formatFirebaseDate(order.createdAt).split(",")[0]}`}</p>
            </div>
          </div>

          {/* RESI & VEHICLE QUICK INFO */}
          <div className="glass-card bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">No. Resi</p>
              <p className="font-mono font-black text-slate-900 text-sm tracking-tighter">{resiNumber}</p>
            </div>
            <div className="w-[1px] h-8 bg-slate-200 mx-2"></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Armada</p>
              <p className="font-black text-slate-900 text-sm tracking-tight truncate max-w-[100px]">{order.vehicleName || order.vehicle || order.serviceType}</p>
            </div>
            <div className="w-[1px] h-8 bg-slate-200 mx-2"></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Berat</p>
              <p className="font-black text-slate-900 text-sm tracking-tight">{order.totalWeight || order.weight || 0} Kg</p>
            </div>
          </div>

          {/* ROUTE CARD (Origin -> Dest) */}
          <div className="glass-card bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
            <div className="relative pl-3">
              <div className="absolute left-[7px] top-2 bottom-6 w-[2px] bg-slate-200 rounded-full"></div>
              
              {/* Origin */}
              <div className="flex gap-4 relative mb-6">
                <div className="w-4 h-4 bg-white border-[3px] border-slate-300 rounded-full absolute -left-[18px] top-1"></div>
                <div className="w-full min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pengirim</p>
                  <p className="text-sm font-bold text-slate-900 leading-snug">{originName}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-2">{originAddress}</p>
                </div>
              </div>

              {/* Destination */}
              <div className="flex gap-4 relative">
                <div className="w-4 h-4 bg-white border-[3px] border-[#7A171D] rounded-full absolute -left-[18px] top-1"></div>
                <div className="w-full min-w-0">
                  <p className="text-[10px] font-black text-[#7A171D] uppercase tracking-widest mb-1">Tujuan</p>
                  {order.destinations ? order.destinations.map((dest: LocationDetail, idx: number) => (
                    <div key={idx} className="mb-3 last:mb-0">
                      <p className="text-sm font-bold text-slate-900 leading-snug">{dest.receiverName} {order.destinations!.length > 1 && <span className="text-[#7A171D] text-[10px] bg-red-50 px-1.5 py-0.5 rounded ml-1">Drop {idx + 1}</span>}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-2">{dest.address}</p>
                    </div>
                  )) : (
                    <p className="text-xs font-medium text-slate-500 line-clamp-2">{order.destination || "-"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* DRIVER CARD (Jika Ada) */}
          {order.driverName && (
            <div className="glass-card bg-slate-900 text-white rounded-3xl p-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shrink-0"><User className="w-6 h-6 text-slate-400" /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kurir</p>
                  <p className="font-bold text-sm truncate max-w-[150px]">{order.driverName}</p>
                </div>
              </div>
              <button onClick={() => window.open(`tel:${order.driverPhone}`)} className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center active:scale-95 transition-transform tap-highlight-transparent">
                <Phone className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          {/* TIMELINE MODULE */}
          <OrderTimeline timelineData={timelineData} orderStatus={order.status} />

          {/* BILLING SUMMARY */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><ReceiptText className="w-4 h-4 text-slate-400"/> Rincian Pembayaran</h3>
            </div>
            <div className="p-5 space-y-3 text-sm font-medium text-slate-600">
              {order.breakdown ? (
                <>
                  <div className="flex justify-between"><span>Tarif Dasar</span><span className="font-bold text-slate-900">{formatIDR(order.breakdown.deliveryFee)}</span></div>
                  {(order.breakdown.insuranceFee || 0) > 0 && <div className="flex justify-between"><span>Asuransi Muatan</span><span className="font-bold text-slate-900">{formatIDR(order.breakdown.insuranceFee)}</span></div>}
                  {(order.breakdown.porterFee || 0) > 0 && <div className="flex justify-between"><span>Jasa Porter</span><span className="font-bold text-slate-900">{formatIDR(order.breakdown.porterFee)}</span></div>}
                  {(order.breakdown.tollFee || 0) > 0 && <div className="flex justify-between"><span>Deposit Tol</span><span className="font-bold text-slate-900">{formatIDR(order.breakdown.tollFee)}</span></div>}
                  {(order.breakdown.b2bDiscount || 0) > 0 && <div className="flex justify-between text-emerald-600"><span>Diskon B2B</span><span className="font-bold">- {formatIDR(order.breakdown.b2bDiscount)}</span></div>}
                  {order.appliedPromoCode && <div className="flex justify-between text-pink-600"><span>Promo ({order.appliedPromoCode})</span><span className="font-bold">- {formatIDR(order.discountPromoAmount)}</span></div>}
                </>
              ) : (
                <div className="flex justify-between"><span>Estimasi Total</span><span className="font-bold text-slate-900">{formatIDR(order.totalCost || order.offeredPrice)}</span></div>
              )}
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total</span>
              <span className="text-xl font-black text-[#7A171D]">{formatIDR(invoiceGrandTotal)}</span>
            </div>
          </div>

          {/* SECONDARY ACTIONS (Grouped List Style) */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Menu Bantuan & Cetak</h3>
            </div>
            <div className="divide-y divide-slate-100">
              
              {(order.paymentStatus === "Lunas" || order.paymentStatus === "Piutang B2B") && !order.status.includes("Batal") && (
                <>
                  <button onClick={handlePrintReceipt} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors tap-highlight-transparent">
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-700"><Printer className="w-5 h-5 text-slate-400"/> Cetak Resi/AWB</div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                  <button onClick={handlePrintInvoice} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors tap-highlight-transparent">
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-700"><FileText className="w-5 h-5 text-slate-400"/> Unduh Invoice</div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                </>
              )}

              {canClaimInsurance && (
                <button onClick={() => setShowClaimModal(true)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-amber-50 active:bg-amber-100 transition-colors tap-highlight-transparent">
                  <div className="flex items-center gap-3 text-sm font-bold text-amber-700"><FileWarning className="w-5 h-5 text-amber-500"/> Ajukan Klaim Asuransi</div>
                  <ChevronRight className="w-4 h-4 text-amber-300" />
                </button>
              )}

              {(!hasExistingRefund && !order.paymentStatus?.includes("Refund")) && showDirectCancel && (
                <button onClick={handleDirectCancel} className="w-full flex items-center justify-between p-4 bg-white hover:bg-red-50 active:bg-red-100 transition-colors tap-highlight-transparent">
                  <div className="flex items-center gap-3 text-sm font-bold text-red-600"><Ban className="w-5 h-5 text-red-400"/> Batalkan Pesanan</div>
                  <ChevronRight className="w-4 h-4 text-red-300" />
                </button>
              )}

              {(!hasExistingRefund && !order.paymentStatus?.includes("Refund")) && showRefundButton && (
                <button onClick={() => setShowRefundModal(true)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-red-50 active:bg-red-100 transition-colors tap-highlight-transparent">
                  <div className="flex items-center gap-3 text-sm font-bold text-red-600"><Banknote className="w-5 h-5 text-red-400"/> Ajukan Refund Dana</div>
                  <ChevronRight className="w-4 h-4 text-red-300" />
                </button>
              )}
            </div>
          </div>

          {/* STATUS REFUND TRACKER */}
          {(hasExistingRefund || order.paymentStatus?.includes("Refund")) && (
            <div className={cn("p-4 rounded-3xl border text-xs font-bold shadow-sm", 
              (refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
              (refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"
            )}>
              <div className="flex items-center gap-2 mb-1">
                {(refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") ? <CheckCircle2 className="w-5 h-5" /> : (refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                <span className="text-sm">Status Refund: {refundRequestData?.status || order.paymentStatus}</span>
              </div>
              <p className="mt-2 font-medium opacity-80 leading-relaxed">
                {(refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") 
                  ? "Dana telah dikembalikan ke rekening Anda." 
                  : "Pengajuan sedang diproses oleh Tim Keuangan maksimal 3x24 jam kerja."}
              </p>
            </div>
          )}
        </main>

        {/* ==============================================================
            3. ACTION BAR (FOOTER NATIVE) - Posisinya Absolute ke Bawah
            ============================================================== */}
        <div className="absolute bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/60 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          {PrimaryAction}
        </div>

      </div>

      {/* Komponen Print Hidden */}
      <div className="hidden">
        {order && <ReceiptTemplate ref={receiptRef} resi={resiNumber} senderName={(originName as string) || user?.displayName || "-"} senderPhone={(originPhone as string) || "-"} originAddress={(originAddress as string) || "-"} receiverName={(order.destinations?.[0]?.receiverName as string) || (order.receiverName as string) || "-"} receiverPhone={(order.destinations?.[0]?.receiverPhone as string) || (order.receiverPhone as string) || "-"} destAddress={order.destinations && order.destinations.length > 1 ? `${order.destinations.length} Tujuan` : ((order.destinations?.[0]?.address as string) || (order.destination as string) || "-")} weight={order.totalWeight || order.weight || 0} serviceType={order.serviceType || "Kargo"} vehicleName={order.vehicleName || order.vehicle || "Armada"} date={formatFirebaseDate(order.createdAt).split(",")[0]} itemsDesc={((order.destinations?.[0]?.items as DeliveryItem[])?.[0]?.name) || "Paket"} />}
        {order && <InvoiceA4Template ref={invoiceRef} invoiceNumber={`INV-${resiNumber}`} issueDate={issueDateObj.toLocaleDateString('id-ID')} dueDate={dueDateObj.toLocaleDateString('id-ID')} clientName={user?.displayName || (originName as string) || "Klien"} clientCompany={user?.companyName} clientAddress={(originAddress as string) || "-"} clientEmail={user?.email || order.email || "-"} clientPhone={(originPhone as string) || user?.phoneNumber || "-"} items={invoiceItems} subTotal={invoiceSubTotal} discountAmount={invoiceDiscount} taxAmount={0} grandTotal={invoiceGrandTotal} />}
      </div>

      {/* MODALS BOTTOM SHEETS */}
      <AnimatePresence>
        {showClaimModal && user && <ClaimModal order={order} user={user} maxClaimAllowed={maxClaimAllowed} onClose={() => setShowClaimModal(false)} onSuccess={() => setHasExistingClaim(true)} showToast={showToast} />}
        {showRefundModal && user && <RefundModal order={order} user={user} onClose={() => setShowRefundModal(false)} onSuccess={(updates) => { setHasExistingRefund(true); setOrder({ ...order, ...updates }); setShowRefundModal(false); }} showToast={showToast} />}
      </AnimatePresence>

    </div>
  );
}