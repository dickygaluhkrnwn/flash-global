"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, MapPin, Package, Truck, 
  ReceiptText, CalendarClock, User, Phone, 
  CheckCircle2, Clock, MapPinned,
  TicketPercent, Building, CreditCard, AlertCircle, Navigation, ShieldCheck, Scale, MessageCircle, Copy, FileWarning, XCircle
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

// IMPORT GLOBAL TYPES
import { OrderDetail, FirebaseTimestamp, LocationDetail } from "@/types/order";

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, isHydrated } = useAuthStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedResi, setCopiedResi] = useState(false);

  // === STATE UNTUK KLAIM ASURANSI ===
  const [hasExistingClaim, setHasExistingClaim] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimData, setClaimData] = useState({
    claimedAmount: "",
    reason: "",
    proofUrl: ""
  });

  // Proteksi Route
  useEffect(() => {
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!user?.uid || !orderId) return;
      setIsLoading(true);

      let fetchedOrderDocId = null;

      // BLOK 1: TARIK DATA PESANAN UTAMA
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
        return; // Hentikan eksekusi jika pesanan utama gagal ditarik
      }

      // BLOK 2: CEK KLAIM ASURANSI SECARA TERPISAH (KEBAL CRASH)
      if (fetchedOrderDocId) {
        try {
          // Tambahkan where userId agar Firebase Security Rules mengizinkan klien membaca data mereka sendiri
          const claimQ = query(
            collection(db, "insurance_claims"), 
            where("orderId", "==", fetchedOrderDocId),
            where("userId", "==", user.uid)
          );
          const claimSnap = await getDocs(claimQ);
          if (!claimSnap.empty) {
            setHasExistingClaim(true);
          }
        } catch (claimError) {
          // Jika gagal ngecek asuransi (misal karena rules), jangan crash-kan aplikasi!
          // Log saja errornya, tapi biarkan pesanan utama tetap tampil.
          console.warn("Peringatan: Gagal mengecek status klaim asuransi (Abaikan jika bukan error kritikal):", claimError);
        }
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

  // === HANDLER SUBMIT KLAIM ASURANSI ===
  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !order) return;
    setIsSubmittingClaim(true);

    try {
      await addDoc(collection(db, "insurance_claims"), {
        userId: user.uid,
        orderId: order.id,
        clientName: user.displayName || "Klien", // FIXED BUG: MENGGUNAKAN displayName
        clientEmail: user.email || "",
        claimedAmount: Number(claimData.claimedAmount),
        reason: claimData.reason,
        proofUrl: claimData.proofUrl,
        status: "Pending Review",
        createdAt: serverTimestamp()
      });

      setHasExistingClaim(true);
      setShowClaimModal(false);
      alert("Klaim Asuransi berhasil diajukan. Tim kami akan segera meninjaunya.");
    } catch (error) {
      console.error("Gagal mengajukan klaim:", error);
      alert("Terjadi kesalahan sistem saat mengajukan klaim.");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Rendering Log Timeline
  const renderTimeline = () => {
    if (!order) return [];

    if (order.trackingHistory && Array.isArray(order.trackingHistory) && order.trackingHistory.length > 0) {
      return [...order.trackingHistory].reverse().map((item, idx) => ({
        ...item,
        isCurrent: idx === 0, 
      }));
    }

    return [{
      id: "def-1",
      status: order.status || "Menunggu Pembayaran",
      description: order.statusSub || order.paymentStatus || "Pesanan telah diterima oleh sistem dan menunggu proses lebih lanjut.",
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
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-100">
           <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Terjadi Kesalahan</h2>
        <p className="text-slate-500 font-medium mb-8">{errorMsg}</p>
        <Button onClick={() => router.push("/desktop/dashboard")} variant="outline" className="h-12 border-slate-300">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  const timelineData = renderTimeline();
  const isLunas = order.paymentStatus === "Lunas";
  const resiNumber = order.resi || order.quoteId || order.id.slice(-12).toUpperCase();

  const originAddress = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail).address : order.origin;
  const originName = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail).senderName : order.senderName;
  const originPhone = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail).senderPhone : order.senderPhone;

  // === CEK KELAYAKAN ASURANSI (DILONGGARKAN UNTUK TESTING) ===
  const hasInsurance = order.breakdown && order.breakdown.insuranceFee > 0;
  
  // NOTE: Diubah untuk Testing -> Tombol akan muncul pada status apapun selama bayar asuransi.
  const isEligibleForClaim = hasInsurance; 
  
  // Hitung Nilai Maksimal Klaim yang lebih aman
  const calculateMaxClaim = () => {
    if (!order.breakdown) return 0;
    if (order.totalItemValue) return order.totalItemValue; 
    return (order.breakdown.deliveryFee || 0) * 10;
  };
  const maxClaimAllowed = calculateMaxClaim();

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 md:px-8 relative overflow-hidden font-sans pb-24">
      {/* Background Ornamen */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10 space-y-6">
        
        {/* Navigation Back */}
        <button onClick={() => router.push("/desktop/dashboard")} className="flex items-center gap-2 text-slate-500 hover:text-[#7A171D] font-bold text-sm transition-colors w-fit mb-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Pesanan Saya
        </button>

        {/* TOP HEADER BANNER */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col md:flex-row justify-between md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant={order.category === "internasional" ? "brand" : "gold"} className="uppercase text-[10px] px-3 py-1 shadow-sm">
                {order.serviceType || "Kargo Reguler"}
              </Badge>
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5"/> {formatFirebaseDate(order.createdAt)}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 font-mono uppercase">
                #{resiNumber}
              </h1>
              <button 
                onClick={() => handleCopyResi(resiNumber)} 
                className="text-slate-400 hover:text-[#C5A059] transition-colors p-1.5 rounded-lg hover:bg-slate-50"
                title="Salin Resi"
              >
                {copiedResi ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:items-end z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status Pesanan</p>
            <div className={`px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider border flex items-center gap-2 shadow-sm ${
              order.status.includes("Selesai") ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
              order.status.includes("Menunggu") ? "bg-amber-50 text-amber-600 border-amber-200" :
              "bg-blue-50 text-blue-600 border-blue-200"
            }`}>
              {order.status.includes("Selesai") ? <CheckCircle2 className="w-4 h-4"/> : order.status === "Dikirim" ? <Navigation className="w-4 h-4" /> : <Clock className="w-4 h-4"/>}
              {order.status}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* KOLOM KIRI (7 Kolom): Rute, Kurir & Timeline */}
          <div className="lg:col-span-7 space-y-6">
            
            {order.driverName && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200 group-hover:bg-[#7A171D]/5 group-hover:border-[#7A171D]/20 transition-colors">
                    <Truck className="w-6 h-6 text-slate-400 group-hover:text-[#7A171D] transition-colors" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kurir Pengantar</p>
                    <p className="text-sm font-black text-slate-900">{order.driverName}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{order.vehicleName || order.vehicle || "Armada Ekspedisi"}</p>
                  </div>
                </div>
                <Button variant="outline" size="icon" className="rounded-full w-10 h-10 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm" onClick={() => window.open(`tel:${order.driverPhone}`)} title="Hubungi Kurir">
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Timeline Progress */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none"><MapPinned className="w-40 h-40" /></div>
              
              <h3 className="text-base font-black text-slate-900 mb-8 flex items-center gap-2 relative z-10">
                <Truck className="w-5 h-5 text-[#7A171D]" /> Status Pengiriman
              </h3>
              
              <div className="relative pl-3 md:pl-4 z-10">
                <div className="absolute top-3 bottom-6 left-[19px] md:left-[23px] w-0.5 bg-slate-100"></div>
                <div className="space-y-6 relative">
                  {timelineData.map((item, idx) => (
                    <div key={idx} className="flex gap-4 md:gap-5 items-start group">
                      <div className={`w-3.5 h-3.5 rounded-full mt-1.5 shrink-0 z-10 border-2 transition-all ${
                        item.isCurrent ? "bg-[#7A171D] border-white ring-4 ring-[#7A171D]/20 scale-125" : "bg-slate-300 border-white"
                      }`} />
                      <div className={cn("flex-1", item.isCurrent ? "opacity-100" : "opacity-60 group-hover:opacity-100 transition-opacity")}>
                        <h4 className={`text-sm font-black ${item.isCurrent ? "text-[#7A171D]" : "text-slate-700"}`}>{item.status}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 mb-1.5">{item.date}</p>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-md">{item.description}</p>
                        {item.location && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 mt-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                            <MapPin className="w-3 h-3"/> {item.location}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* KOLOM KANAN (5 Kolom): Alamat, Rincian Harga & Spesifikasi */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Info Rute & Destinasi */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">
                <MapPinned className="w-4 h-4 text-[#C5A059]" /> Detail Rute
              </h3>

              <div className="relative pl-1">
                <div className="absolute left-[13px] top-6 bottom-6 w-0.5 bg-slate-100 border-dashed border-l-2 border-slate-200 z-0"></div>
                <div className="space-y-6 relative z-10">
                  
                  {/* Origin */}
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

                  {/* Destinations */}
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

            {/* Spesifikasi Paket */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" /> Informasi Kargo
              </h3>
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

            {/* Billing Receipt */}
            <div className="bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
              
              <div className="p-6 md:p-8">
                <h3 className="text-base font-black mb-6 flex items-center gap-3">
                  <ReceiptText className="w-5 h-5 text-[#C5A059]" /> Rincian Pembayaran
                </h3>
                
                <div className="space-y-3 mb-6 text-sm font-medium">
                  {order.breakdown ? (
                    <>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Subtotal Produk/Jarak</span>
                        <span className="text-white">{formatIDR(order.breakdown.deliveryFee)}</span>
                      </div>
                      {(order.breakdown.insuranceFee || 0) > 0 && (
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400"/> Asuransi Muatan</span>
                          <span className="text-white">{formatIDR(order.breakdown.insuranceFee)}</span>
                        </div>
                      )}
                      {(order.breakdown.porterFee || 0) > 0 && (
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Jasa Porter</span>
                          <span className="text-white">{formatIDR(order.breakdown.porterFee)}</span>
                        </div>
                      )}
                      {(order.breakdown.tollFee || 0) > 0 && (
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Deposit Tol/Parkir</span>
                          <span className="text-white">{formatIDR(order.breakdown.tollFee)}</span>
                        </div>
                      )}
                      {(order.breakdown.b2bDiscount || 0) > 0 && (
                        <div className="flex justify-between items-center text-emerald-400">
                          <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5"/> Diskon Korporat</span>
                          <span>- {formatIDR(order.breakdown.b2bDiscount)}</span>
                        </div>
                      )}
                      
                      {/* Promo Code Info */}
                      {order.appliedPromoCode && (
                        <div className="flex justify-between items-center text-pink-400 border-t border-slate-700/50 pt-3 mt-3">
                          <span className="flex items-center gap-1.5"><TicketPercent className="w-3.5 h-3.5"/> Voucher ({order.appliedPromoCode})</span>
                          <span className="font-bold">- {formatIDR(order.discountPromoAmount)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Harga Total (Subtotal)</span>
                      <span className="text-white">{formatIDR(order.totalCost || order.offeredPrice)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-5 border-t border-dashed border-slate-700">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pesanan</p>
                      <p className="text-3xl font-black text-[#C5A059] tracking-tight">
                        {formatIDR(order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || order.offeredPrice || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="h-3 w-full bg-[radial-gradient(circle,transparent_4px,#0f172a_5px)] bg-[length:10px_10px] -mb-1 opacity-50"></div>
            </div>

            {/* ACTION BUTTONS (TERMASUK KLAIM ASURANSI) */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  onClick={() => {
                    const adminWhatsApp = "6281234567890"; 
                    const message = `Halo Tim CS Flash Global,\n\nSaya ingin menanyakan pesanan saya:\n🧾 *ID:* ${resiNumber}\nMohon dibantu.`;
                    window.open(`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`, "_blank");
                  }} 
                  variant="outline" className="w-full bg-white border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 h-12 shadow-sm font-bold"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Hubungi CS
                </Button>
                
                {order.status === "Menunggu Pembayaran" ? (
                  <Button onClick={() => router.push("/desktop/pembayaran")} className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white h-12 shadow-md font-bold">
                    <CreditCard className="w-4 h-4 mr-2" /> Bayar Sekarang
                  </Button>
                ) : (
                  <div className="flex items-center justify-center bg-slate-100 text-slate-500 rounded-xl h-12 font-bold text-sm border border-slate-200">
                    <ShieldCheck className="w-4 h-4 mr-2" /> {isLunas ? "Pembayaran Lunas" : "Sedang Diproses"}
                  </div>
                )}
              </div>

              {/* TOMBOL KLAIM ASURANSI (MUNCUL JIKA MEMENUHI SYARAT) */}
              {isEligibleForClaim && !hasExistingClaim && (
                <Button 
                  onClick={() => setShowClaimModal(true)}
                  className="w-full bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300 h-12 shadow-sm font-bold mt-2"
                >
                  <FileWarning className="w-4 h-4 mr-2" /> Ajukan Klaim Asuransi Kerusakan
                </Button>
              )}

              {/* JIKA SUDAH PERNAH KLAIM */}
              {hasExistingClaim && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-xs font-bold text-center mt-2 flex items-center justify-center gap-2">
                   <Clock className="w-4 h-4" /> Pengajuan klaim asuransi sedang ditinjau.
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ================================================= */}
      {/* MODAL PENGAJUAN KLAIM ASURANSI                    */}
      {/* ================================================= */}
      <AnimatePresence>
        {showClaimModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowClaimModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100">
              
              <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <FileWarning className="w-6 h-6 text-amber-500" /> Formulir Klaim Asuransi
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Nominal maksimal yang dapat diajukan: <strong className="text-slate-900">{formatIDR(maxClaimAllowed)}</strong></p>
                </div>
                <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-red-500"><XCircle className="w-6 h-6"/></button>
              </div>

              <form onSubmit={handleSubmitClaim} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nominal Kerugian (Rp)</label>
                  <Input 
                    type="number" 
                    max={maxClaimAllowed}
                    value={claimData.claimedAmount}
                    onChange={(e) => setClaimData({...claimData, claimedAmount: e.target.value})}
                    placeholder="Contoh: 1500000"
                    required
                    className="font-bold border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alasan / Kronologi Kerusakan</label>
                  <textarea 
                    value={claimData.reason}
                    onChange={(e) => setClaimData({...claimData, reason: e.target.value})}
                    placeholder="Jelaskan secara detail barang yang rusak..."
                    required
                    rows={3}
                    className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:border-amber-500 focus-visible:ring-amber-500/10 resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tautan Bukti Foto (Google Drive / Imgur)</label>
                  <Input 
                    type="url" 
                    value={claimData.proofUrl}
                    onChange={(e) => setClaimData({...claimData, proofUrl: e.target.value})}
                    placeholder="https://..."
                    required
                    className="border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/10"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <Button type="button" onClick={() => setShowClaimModal(false)} variant="outline" className="w-full text-xs border-slate-200">Batal</Button>
                  <Button type="submit" disabled={isSubmittingClaim} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 border-none">
                    {isSubmittingClaim ? "Mengirim..." : "Kirim Pengajuan"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}