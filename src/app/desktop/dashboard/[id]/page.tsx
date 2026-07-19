"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, MapPin, Package, Truck, ReceiptText, CalendarClock, User, Phone, 
  CheckCircle2, Clock, Ban, TicketPercent, Building, CreditCard, AlertCircle, 
  Navigation, ShieldCheck, Scale, MessageCircle, Copy, FileWarning, Printer, FileText, Banknote, XCircle, Eye
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

// Modul Cetak & Template
import { useReactToPrint } from "react-to-print";
import { ReceiptTemplate } from "@/components/shared/ReceiptTemplate";
import { InvoiceA4Template } from "@/components/shared/InvoiceA4Template";

// Komponen Modular
import OrderTimeline, { TimelineItem } from "./components/OrderTimeline";
import { ClaimModal, RefundModal } from "./components/OrderModals";

// Global Types
import { OrderDetail, FirebaseTimestamp, LocationDetail, DeliveryItem } from "@/types/order";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [refundRequestData, setRefundRequestData] = useState<any | null>(null);
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
            setRefundRequestData({ id: refundSnap.docs[0].id, ...refundSnap.docs[0].data() });
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

  // BUG FIX: Mengubah tipe kembalian fungsi menjadi TimelineItem[] yang tegas
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Menarik Rincian Manifes...</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans px-6 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-100"><AlertCircle className="w-10 h-10" /></div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Terjadi Kesalahan</h2>
        <p className="text-slate-500 font-medium mb-8">{errorMsg}</p>
        <Button onClick={() => router.push("/dashboard")} variant="outline" className="h-12 border-slate-300"><ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Dashboard</Button>
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
    <main className="min-h-screen bg-slate-50 py-10 px-4 md:px-8 relative overflow-hidden font-sans pb-24">
      {/* === UI TOAST NOTIFICATION === */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10 space-y-6">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-slate-600 hover:text-[#7A171D] font-bold text-sm transition-colors w-fit mb-2 bg-white px-5 py-2.5 rounded-2xl border border-slate-200/60 shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Pesanan Saya
        </button>

        {/* --- HEADER PESANAN ENTERPRISE --- */}
        <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm p-6 md:p-8 flex flex-col md:flex-row justify-between md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant={order.category === "internasional" ? "brand" : "gold"} className="uppercase text-[10px] px-3 py-1.5 shadow-sm rounded-lg">{order.serviceType || "Kargo Reguler"}</Badge>
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5"/> {formatFirebaseDate(order.createdAt)}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 font-mono uppercase">#{resiNumber}</h1>
              <button onClick={() => handleCopyResi(resiNumber)} className="text-slate-400 hover:text-[#C5A059] transition-colors p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200" title="Salin Resi">
                {copiedResi ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col md:items-end z-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status Pesanan</p>
            <div className={`px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider border flex items-center gap-2 shadow-sm ${
              order.status.includes("Selesai") ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
              order.status.includes("Batal") ? "bg-red-50 text-red-600 border-red-200" :
              order.status.includes("Menunggu") ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"
            }`}>
              {order.status.includes("Selesai") ? <CheckCircle2 className="w-4 h-4"/> : order.status.includes("Batal") ? <Ban className="w-4 h-4" /> : order.status === "Dikirim" ? <Navigation className="w-4 h-4" /> : <Clock className="w-4 h-4"/>}
              {order.status}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* KOLOM KIRI: Rute, Kurir & Timeline */}
          <div className="lg:col-span-7 space-y-6">
            {order.driverName && (
              <div className="bg-white p-5 rounded-[24px] border border-slate-200/60 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200 group-hover:bg-[#7A171D]/5 group-hover:border-[#7A171D]/20 transition-colors">
                    <Truck className="w-6 h-6 text-slate-400 group-hover:text-[#7A171D] transition-colors" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kurir Pengantar</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{order.driverName}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{order.vehicleName || order.vehicle || "Armada Ekspedisi"}</p>
                  </div>
                </div>
                <Button variant="outline" size="icon" className="rounded-full w-10 h-10 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm" onClick={() => window.open(`tel:${order.driverPhone}`)} title="Hubungi Kurir"><Phone className="w-4 h-4" /></Button>
              </div>
            )}

            <OrderTimeline timelineData={timelineData} orderStatus={order.status} />
          </div>

          {/* KOLOM KANAN: Alamat, Rincian Harga & Spesifikasi */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">Detail Rute</h3>
              <div className="relative pl-1">
                <div className="absolute left-[13px] top-6 bottom-6 w-0.5 bg-slate-100 border-dashed border-l-2 border-slate-200 z-0"></div>
                <div className="space-y-6 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-white p-1 rounded-full shrink-0"><MapPin className="w-4 h-4 text-slate-400" /></div>
                    <div className="w-full">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alamat Pengirim</p>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="font-bold text-slate-900 text-sm leading-relaxed">{originAddress || "-"}</p>
                        {originName && (
                          <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-600">
                            <span className="flex items-center gap-1.5 truncate pr-2"><User className="w-3.5 h-3.5 shrink-0"/> <span className="truncate">{originName}</span></span>
                            <span className="flex items-center gap-1.5 shrink-0"><Phone className="w-3.5 h-3.5"/> {originPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-white p-1 rounded-full shrink-0"><MapPin className="w-4 h-4 text-[#7A171D]" /></div>
                    <div className="w-full">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alamat Penerima</p>
                      {order.destinations ? order.destinations.map((dest: LocationDetail, idx: number) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-3 last:mb-0">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-bold text-slate-900 text-sm leading-relaxed pr-4">{dest.address}</p>
                            {order.destinations && order.destinations.length > 1 && <Badge className="shrink-0 text-[10px] bg-white">Drop {idx + 1}</Badge>}
                          </div>
                          {dest.receiverName && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                              <span className="flex items-center gap-1.5 truncate"><User className="w-3.5 h-3.5 shrink-0"/> <span className="truncate">{dest.receiverName}</span></span>
                              <span className="flex items-center gap-1.5 shrink-0"><Phone className="w-3.5 h-3.5"/> {dest.receiverPhone}</span>
                            </div>
                          )}
                        </div>
                      )) : (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                           <p className="font-bold text-slate-900 text-sm leading-relaxed">{order.destination || "-"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" /> Informasi Kargo</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Berat</p>
                  <p className="font-black text-slate-900 flex items-center gap-1.5 text-sm"><Scale className="w-3.5 h-3.5 text-slate-400"/> {order.totalWeight || order.weight || 0} Kg</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Armada</p>
                  <p className="font-black text-slate-900 flex items-center gap-1.5 text-sm truncate"><Truck className="w-3.5 h-3.5 text-slate-400 shrink-0"/> <span className="truncate">{order.vehicleName || order.vehicle || order.serviceType}</span></p>
                </div>
              </div>
            </div>

            {/* --- BILLING CARD ENTERPRISE --- */}
            <div className="bg-slate-900 text-white rounded-[24px] shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
              <div className="p-6 md:p-8">
                <h3 className="text-base font-black mb-6 flex items-center gap-3"><ReceiptText className="w-5 h-5 text-[#C5A059]" /> Rincian Pembayaran</h3>
                <div className="space-y-3 mb-6 text-sm font-medium">
                  {order.breakdown ? (
                    <>
                      <div className="flex justify-between items-center text-slate-400"><span>Subtotal Produk/Jarak</span><span className="text-white">{formatIDR(order.breakdown.deliveryFee)}</span></div>
                      {(order.breakdown.insuranceFee || 0) > 0 && <div className="flex justify-between items-center text-slate-400"><span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400"/> Asuransi Muatan</span><span className="text-white">{formatIDR(order.breakdown.insuranceFee)}</span></div>}
                      {(order.breakdown.porterFee || 0) > 0 && <div className="flex justify-between items-center text-slate-400"><span>Jasa Porter</span><span className="text-white">{formatIDR(order.breakdown.porterFee)}</span></div>}
                      {(order.breakdown.tollFee || 0) > 0 && <div className="flex justify-between items-center text-slate-400"><span>Deposit Tol/Parkir</span><span className="text-white">{formatIDR(order.breakdown.tollFee)}</span></div>}
                      {(order.breakdown.b2bDiscount || 0) > 0 && <div className="flex justify-between items-center text-emerald-400"><span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5"/> Diskon Korporat</span><span>- {formatIDR(order.breakdown.b2bDiscount)}</span></div>}
                      {order.appliedPromoCode && <div className="flex justify-between items-center text-pink-400 border-t border-slate-700/50 pt-3 mt-3"><span className="flex items-center gap-1.5"><TicketPercent className="w-3.5 h-3.5"/> Voucher ({order.appliedPromoCode})</span><span className="font-bold">- {formatIDR(order.discountPromoAmount)}</span></div>}
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-slate-400"><span>Harga Total (Subtotal)</span><span className="text-white">{formatIDR(order.totalCost || order.offeredPrice)}</span></div>
                  )}
                </div>
                <div className="pt-5 border-t border-dashed border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pesanan</p>
                  <p className="text-3xl font-black text-[#C5A059] tracking-tight">{formatIDR(order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || order.offeredPrice || 0)}</p>
                </div>
              </div>
            </div>

            {/* --- ACTION BUTTONS (REFACTOR FLUID LAYOUT) --- */}
            <div className="flex flex-col gap-3 pt-3">
              
              {/* Baris Pertama: Hubungi CS dan Bayar (Fluid/Flex) */}
              <div className="flex flex-col sm:flex-row w-full gap-3">
                <Button 
                  onClick={() => window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Tim CS Flash Global,\nSaya menanyakan pesanan saya:\nID: ${resiNumber}\nMohon dibantu.`)}`, "_blank")} 
                  variant="outline" 
                  className="flex-1 bg-white border-slate-200 text-slate-700 hover:text-[#7A171D] hover:bg-slate-50 h-12 shadow-sm font-bold text-sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Hubungi CS
                </Button>
                
                {order.status === "Menunggu Pembayaran" && (
                  <Button 
                    onClick={() => router.push("/pembayaran")} 
                    className="flex-1 bg-[#7A171D] hover:bg-[#5A0E13] text-white h-12 shadow-md shadow-[#7A171D]/20 font-bold text-sm"
                  >
                    <CreditCard className="w-4 h-4 mr-2" /> Bayar Sekarang
                  </Button>
                )}
              </div>

              {/* KLAIM ASURANSI */}
              {canClaimInsurance && (
                <Button onClick={() => setShowClaimModal(true)} className="w-full bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300 h-12 shadow-sm font-bold"><FileWarning className="w-4 h-4 mr-2" /> Ajukan Klaim Kerusakan</Button>
              )}
              {hasExistingClaim && <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2"><Clock className="w-4 h-4" /> Klaim asuransi sedang ditinjau.</div>}

              {/* BATALKAN & REFUND */}
              {(!hasExistingRefund && !order.paymentStatus?.includes("Refund")) && (
                <>
                  {showDirectCancel && (
                    <Button onClick={handleDirectCancel} variant="outline" className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm font-bold"><Ban className="w-4 h-4 mr-2" /> Batalkan Pesanan</Button>
                  )}
                  {showRefundButton && (
                    <Button onClick={() => setShowRefundModal(true)} variant="outline" className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm font-bold"><Banknote className="w-4 h-4 mr-2" /> Batalkan & Ajukan Refund</Button>
                  )}
                </>
              )}

              {/* TAMPILAN STATUS REFUND & BUKTI TRANSFER ADMIN */}
              {(hasExistingRefund || order.paymentStatus?.includes("Refund")) && (
                <div className={`border p-5 rounded-2xl shadow-sm mt-1 ${
                  (refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") ? "bg-emerald-50 border-emerald-200" :
                  (refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") ? "bg-red-50 border-red-200" :
                  "bg-amber-50 border-amber-200"
                }`}>
                  <div className={`flex items-center gap-2 font-black text-sm mb-1 ${
                    (refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") ? "text-emerald-700" :
                    (refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") ? "text-red-700" :
                    "text-amber-700"
                  }`}>
                    {(refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") ? <CheckCircle2 className="w-5 h-5" /> : 
                     (refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") ? <XCircle className="w-5 h-5" /> : 
                     <Clock className="w-5 h-5" />}
                    
                    {(refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") ? "Dana Berhasil Dikembalikan" : 
                     (refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") ? "Pengajuan Refund Ditolak" : 
                     "Refund Sedang Diproses Finance"}
                  </div>
                  
                  <p className={`text-xs font-semibold ${(!refundRequestData || refundRequestData?.status === "Pending" || order.paymentStatus === "Menunggu Refund") ? "text-amber-600" : "text-slate-500"}`}>
                    {(!refundRequestData || refundRequestData?.status === "Pending" || order.paymentStatus === "Menunggu Refund") 
                      ? "Mohon tunggu 1x24 jam kerja untuk proses verifikasi dan transfer dari tim Finance kami." 
                      : `Nominal: ${formatIDR(refundRequestData?.nominal || order.finalGrandTotal || order.totalCost)}`}
                  </p>

                  {/* BUKTI TRANSFER ADMIN */}
                  {(refundRequestData?.status === "Approved" || order.paymentStatus === "Refund Selesai") && refundRequestData?.proofUrl && (
                    <div className="mt-4 pt-4 border-t border-emerald-200/60">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Bukti Transfer (Dari Admin)
                      </p>
                      <div className="bg-white p-2 rounded-xl border border-emerald-100 relative group overflow-hidden flex justify-center shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={refundRequestData.proofUrl} alt="Bukti Refund" className="w-full h-auto max-h-48 object-contain rounded-lg" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a href={refundRequestData.proofUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-xs shadow-xl flex items-center gap-1.5 hover:bg-slate-100 transition-colors">
                            <Eye className="w-4 h-4" /> Buka Layar Penuh
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FALLBACK JIKA REFUND SELESAI TAPI ADMIN TIDAK UNGGAH BUKTI URL */}
                  {(order.paymentStatus === "Refund Selesai" && !refundRequestData?.proofUrl) && (
                    <div className="mt-3 pt-3 border-t border-emerald-200/60">
                       <p className="text-xs text-emerald-600 font-medium">Refund telah ditransfer. Silakan cek mutasi rekening Anda secara berkala.</p>
                    </div>
                  )}

                  {(refundRequestData?.status === "Rejected" || order.paymentStatus === "Refund Ditolak") && (
                    <p className="text-xs text-red-600 font-medium mt-3 bg-red-100/50 p-3 rounded-lg border border-red-100 leading-relaxed">
                      Harap hubungi Customer Service untuk informasi lebih lanjut mengenai alasan penolakan pengembalian dana (refund) Anda.
                    </p>
                  )}
                </div>
              )}

              {/* CETAK RESI & INVOICE */}
              {(order.paymentStatus === "Lunas" || order.paymentStatus === "Piutang B2B") && !order.status.includes("Batal") && (
                <div className="flex flex-col sm:flex-row w-full gap-3 mt-2 border-t border-slate-100 pt-4">
                  <Button onClick={handlePrintReceipt} variant="outline" className="flex-1 h-12 border-[#7A171D] text-[#7A171D] hover:bg-[#7A171D]/5 shadow-sm font-bold text-sm">
                    <Printer className="w-4 h-4 mr-2" /> Cetak Resi
                  </Button>
                  <Button onClick={handlePrintInvoice} variant="outline" className="flex-1 h-12 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm font-bold text-sm">
                    <FileText className="w-4 h-4 mr-2" /> Invoice A4
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'none' }}>
        {order && <ReceiptTemplate ref={receiptRef} resi={resiNumber} senderName={(originName as string) || user?.displayName || "-"} senderPhone={(originPhone as string) || "-"} originAddress={(originAddress as string) || "-"} receiverName={(order.destinations?.[0]?.receiverName as string) || (order.receiverName as string) || "-"} receiverPhone={(order.destinations?.[0]?.receiverPhone as string) || (order.receiverPhone as string) || "-"} destAddress={order.destinations && order.destinations.length > 1 ? `${order.destinations.length} Titik Tujuan` : ((order.destinations?.[0]?.address as string) || (order.destination as string) || "-")} weight={order.totalWeight || order.weight || 0} serviceType={order.serviceType || "Kargo"} vehicleName={order.vehicleName || order.vehicle || "Armada"} date={formatFirebaseDate(order.createdAt)} itemsDesc={((order.destinations?.[0]?.items as DeliveryItem[])?.[0]?.name) || "Paket Kargo"} />}
      </div>
      <div style={{ display: 'none' }}>
        {order && <InvoiceA4Template ref={invoiceRef} invoiceNumber={`INV-${resiNumber}`} issueDate={issueDateObj.toLocaleDateString('id-ID')} dueDate={dueDateObj.toLocaleDateString('id-ID')} clientName={user?.displayName || (originName as string) || "Klien Yth."} clientCompany={user?.companyName} clientAddress={(originAddress as string) || "-"} clientEmail={user?.email || order.email || "-"} clientPhone={(originPhone as string) || user?.phoneNumber || "-"} items={invoiceItems} subTotal={invoiceSubTotal} discountAmount={invoiceDiscount} taxAmount={0} grandTotal={invoiceGrandTotal} />}
      </div>

      <AnimatePresence>
        {showClaimModal && user && <ClaimModal order={order} user={user} maxClaimAllowed={maxClaimAllowed} onClose={() => setShowClaimModal(false)} onSuccess={() => setHasExistingClaim(true)} showToast={showToast} />}
        {showRefundModal && user && <RefundModal order={order} user={user} onClose={() => setShowRefundModal(false)} onSuccess={(updates) => { setHasExistingRefund(true); setOrder({ ...order, ...updates }); setShowRefundModal(false); }} showToast={showToast} />}
      </AnimatePresence>
    </main>
  );
}