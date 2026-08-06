"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, FileText, User, Phone,
  MapPin, Package, Receipt, 
  Activity, ShieldAlert,
  CheckCircle2, XCircle, Eye, ImageIcon, X, AlertCircle, Weight
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion, increment } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

import { OrderDetail, LocationDetail, DeliveryItem } from "@/types/order";

// 🚀 ENHANCED APPLE GLASSMORPHISM VARIABLES
const glassCard = "bg-white/60 backdrop-blur-[40px] saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,1)] transition-all duration-300 rounded-[2rem]";

export default function InvoiceDetailVerificationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [clientEmail, setClientEmail] = useState<string>("Tidak ada email");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const docRef = doc(db, "orders", params.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as OrderDetail;
          setOrder(data);
          
          let finalClientEmail: string = String(data.email || data.senderEmail || "");
          if (!finalClientEmail && data.userId) {
            try {
              const userSnap = await getDoc(doc(db, "users", data.userId));
              if (userSnap.exists()) {
                const userData = userSnap.data() as Record<string, unknown>;
                if (userData.email) finalClientEmail = String(userData.email);
              }
            } catch {
              console.warn("Gagal narik user email");
            }
          }
          setClientEmail(finalClientEmail || "Tidak ada email terdaftar");
        }
      } catch (error) {
        console.error("Gagal menarik data pesanan:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [params.id]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleVerifyPayment = async (action: "Approve" | "Reject") => {
    if (!order) return;
    setIsProcessing(true);
    try {
      const orderRef = doc(db, "orders", order.id);
      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();

      if (action === "Approve") {
        await updateDoc(orderRef, {
          paymentStatus: "Lunas",
          status: "Menunggu Kurir", 
          verifiedAt: serverTimestamp(),
          trackingHistory: arrayUnion({
            id: uniqueId,
            status: "Pembayaran Divalidasi",
            date: logDate,
            description: "Pembayaran telah berhasil divalidasi oleh Tim Finance. Sistem operasional sedang mencari kurir untuk pickup.",
            location: "Pusat Keuangan Flash Global"
          })
        });

        if (order.appliedPromoCode) {
          try {
            const promoRef = doc(db, "promos", order.appliedPromoCode);
            await updateDoc(promoRef, { usedCount: increment(1) });
          } catch { 
            console.warn("Promo gagal diincrement") 
          }
        }

        showToast("success", "Pembayaran disetujui! Mengalihkan...");
        setOrder(prev => prev ? { ...prev, paymentStatus: "Lunas", status: "Menunggu Kurir" } : null);
        setTimeout(() => router.push("/admin/finance/verification/invoice"), 2000);

      } else {
        await updateDoc(orderRef, {
          paymentStatus: "Ditolak",
          status: "Menunggu Pembayaran",
          receiptUrl: null, 
          trackingHistory: arrayUnion({
            id: uniqueId,
            status: "Verifikasi Ditolak",
            date: logDate,
            description: "Bukti transfer ditolak/tidak sah oleh Tim Finance. Harap periksa nominal dan unggah ulang bukti yang benar.",
            location: "Pusat Keuangan Flash Global"
          })
        });
        showToast("error", "Pembayaran ditolak. Mengalihkan...");
        setOrder(prev => prev ? { ...prev, paymentStatus: "Ditolak", status: "Menunggu Pembayaran", receiptUrl: undefined } : null);
        setTimeout(() => router.push("/admin/finance/verification/invoice"), 2000);
      }
    } catch (error) {
      console.error("Gagal verifikasi pembayaran:", error);
      showToast("error", "Terjadi kesalahan saat memproses verifikasi.");
      setIsProcessing(false);
    }
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans h-screen">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Akses Ditolak</h2>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8 border-slate-300">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-emerald-600 animate-pulse mb-6" />
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Menarik Berkas Invoice...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans h-[80vh]">
        <FileText className="w-24 h-24 text-slate-300 mb-6" />
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Invoice Tidak Ditemukan</h2>
        <AdminButton onClick={() => router.back()} variant="outline" className="mt-8 border-slate-300 shadow-sm">Kembali</AdminButton>
      </div>
    );
  }

  const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
  const originAddr = String(originObj?.address || (typeof order.origin === 'string' ? order.origin : "-"));
  const clientName = String(originObj?.senderName || order.senderName || order.name || "Klien Reguler");
  const originPhone = String(originObj?.senderPhone || order.senderPhone || "-");

  const destObj = order.destinations && order.destinations.length > 0 ? order.destinations[0] : null;
  const destAddr = String(destObj?.address || order.destination || "-");
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
  
  const finalNominal = order.finalGrandTotal || bd.grandTotal || order.totalCost || order.offeredPrice || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8 pb-16 font-sans max-w-6xl mx-auto px-4 sm:px-0"
    >
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toastMessage.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toastMessage.text}
          </motion.div>
        )}
        
        {/* Fullscreen Proof Image Viewer */}
        {proofModalUrl && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setProofModalUrl(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 max-w-4xl w-full flex flex-col items-center">
              <button onClick={() => setProofModalUrl(null)} className="absolute -top-14 right-0 bg-white/10 text-white rounded-full p-2 hover:bg-white/30 hover:scale-110 transition-all border border-white/20 backdrop-blur-md">
                <X className="w-6 h-6" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proofModalUrl} alt="Bukti File" className="rounded-3xl max-h-[85vh] w-full object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/20" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOP NAV & BREADCRUMB */}
      <div className="flex items-center justify-between mb-4 pt-6">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => router.push('/admin/finance/verification/invoice')} 
            className="w-12 h-12 rounded-[1.25rem] bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-white transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
              Verifikasi Invoice
            </h1>
            <p className="text-[10px] sm:text-xs font-black text-emerald-600 uppercase tracking-widest mt-1">Order ID: #{order.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* ========================================================= */}
        {/* BARIS 1: INFO KLIEN & RUTE vs FAKTUR BIAYA & ACTION */}
        {/* ========================================================= */}

        {/* KIRI: Detail Order & Rute */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-7 flex flex-col h-full"
        >
          <div className={`${glassCard} w-full p-6 sm:p-8 flex flex-col h-full`}>
            {/* Header User */}
            <div className="flex items-center gap-5 border-b border-slate-200/60 pb-6 shrink-0">
              <div className="w-16 h-16 bg-slate-100 rounded-[1.5rem] border border-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-slate-400" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Akun Pemesan (B2C)</p>
                <p className="text-lg font-black text-slate-900 uppercase truncate" title={clientName}>{clientName}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 shadow-sm"><Phone className="w-3 h-3 inline mr-1" />{originPhone}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 shadow-sm truncate max-w-[200px]">{clientEmail}</span>
                </div>
              </div>
            </div>

            {/* Rute Tracker */}
            <div className="relative pl-4 mt-8 flex-1 flex flex-col justify-center">
              <div className="absolute left-[31px] top-6 bottom-6 w-1 bg-gradient-to-b from-slate-200 via-emerald-200 to-emerald-500 rounded-full z-0"></div>
              
              <div className="space-y-8 relative z-10">
                <div className="flex items-start gap-5">
                  <div className="mt-1 bg-white p-2.5 rounded-full border-2 border-slate-200 shadow-sm z-10"><MapPin className="w-5 h-5 text-slate-400" /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Titik Penjemputan (Asal)</p>
                    <p className="font-bold text-slate-800 text-sm leading-relaxed">{originAddr}</p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="mt-1 bg-emerald-50 p-2.5 rounded-full border-2 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10"><MapPin className="w-5 h-5 text-emerald-600" /></div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Titik Pengiriman (Tujuan)</p>
                    <p className="font-bold text-slate-800 text-sm leading-relaxed">{destAddr}</p>
                    <div className="mt-3 bg-white/60 p-3 rounded-xl border border-white flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-xs font-black text-slate-500 uppercase">{destName.substring(0,2)}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Penerima</p>
                        <p className="text-xs font-black text-slate-800">{destName} <span className="font-medium text-slate-500">({destPhone})</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KANAN: Faktur Pembayaran & Tombol Aksi */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-5 flex flex-col h-full"
        >
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-[2.5rem] p-8 sm:p-10 border border-slate-700 shadow-[0_30px_60px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] text-white relative overflow-hidden w-full flex flex-col h-full">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-6 text-slate-400 shrink-0"><Receipt className="w-4 h-4 text-emerald-400" /> Rincian Tagihan Manifes</h4>
            
            {/* Rincian Biaya Inline */}
            <div className="flex-1 space-y-4 mb-6 text-sm font-medium font-mono border-b border-slate-700/80 pb-6">
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans">Biaya Kirim Jarak</span><span className="text-white font-bold">{formatRupiah(deliveryFee)}</span>
              </div>
              {insuranceFee > 0 && <div className="flex justify-between items-center text-slate-300"><span className="font-sans">Asuransi Keamanan</span><span className="text-emerald-400 font-bold">+{formatRupiah(insuranceFee)}</span></div>}
              {porterFee > 0 && <div className="flex justify-between items-center text-slate-300"><span className="font-sans">Jasa Porter</span><span className="text-emerald-400 font-bold">+{formatRupiah(porterFee)}</span></div>}
              {tollFee > 0 && <div className="flex justify-between items-center text-slate-300"><span className="font-sans">Estimasi Tol/Parkir</span><span className="text-emerald-400 font-bold">+{formatRupiah(tollFee)}</span></div>}
              {b2bDiscount > 0 && <div className="flex justify-between items-center text-amber-300"><span className="font-sans">Diskon Langganan B2B</span><span className="font-bold">-{formatRupiah(b2bDiscount)}</span></div>}
              {discountPromoAmount > 0 && <div className="flex justify-between items-center text-pink-300 border-t border-slate-700/50 pt-4 mt-4"><span className="font-sans">Voucher Promo</span><span className="font-bold">-{formatRupiah(discountPromoAmount)}</span></div>}
            </div>

            {/* Final Nominal & Action Button */}
            <div className="shrink-0 space-y-6">
              <div className="flex justify-between items-end">
                 <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1.5 font-sans">Total Nilai Tagihan</p>
                 <p className="text-4xl font-black text-white tracking-tighter font-mono drop-shadow-md">
                   {formatRupiah(finalNominal)}
                 </p>
              </div>

              {order.paymentStatus === "Menunggu Verifikasi Finance" ? (
                <div className="flex gap-4 pt-2 relative z-10">
                  <AdminButton 
                    onClick={() => { if(confirm("Tolak bukti pembayaran ini? Klien harus mengunggah ulang.")) { handleVerifyPayment("Reject"); } }} 
                    disabled={isProcessing} 
                    variant="danger" 
                    className="w-16 h-14 shrink-0 shadow-[0_10px_25px_rgba(220,38,38,0.3)] rounded-2xl" 
                    title="Tolak Pembayaran"
                  >
                    <XCircle className="w-6 h-6" />
                  </AdminButton>
                  <AdminButton 
                    onClick={() => handleVerifyPayment("Approve")} 
                    disabled={isProcessing} 
                    variant="success" 
                    className="flex-1 h-14 shadow-[0_10px_25px_rgba(16,185,129,0.3)] bg-emerald-500 hover:bg-emerald-600 text-sm rounded-2xl"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" /> TERIMA LUNAS
                  </AdminButton>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border text-center font-black uppercase tracking-widest text-xs shadow-inner mt-2 ${order.paymentStatus === 'Lunas' ? 'bg-emerald-900/50 border-emerald-800 text-emerald-400' : 'bg-red-900/50 border-red-800 text-red-400'}`}>
                  Status Pembayaran: {order.paymentStatus}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ========================================================= */}
        {/* BARIS 2: SPESIFIKASI KARGO (Full Width Grid) */}
        {/* ========================================================= */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-12"
        >
          <div className={`${glassCard} p-6 sm:p-8`}>
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Package className="w-4 h-4"/> Spesifikasi Kargo & Operasional Armada</h2>
               <div className="flex items-center gap-3">
                  <AdminBadge variant="gold" className="shadow-sm">{order.serviceType} - {order.vehicleName || order.vehicle}</AdminBadge>
                  <AdminBadge variant="outline" className="shadow-sm bg-white"><Weight className="w-3 h-3 mr-1 text-slate-400"/> {order.totalWeight || order.weight} Kg</AdminBadge>
               </div>
             </div>
             
             <div className="bg-white/50 border border-white rounded-2xl overflow-hidden shadow-sm">
               {orderItems.length === 0 ? (
                 <div className="h-full flex items-center justify-center p-8 text-sm font-bold text-slate-400 min-h-[100px] border border-dashed border-slate-300 m-4 rounded-xl">Tidak ada rincian item logistik tercatat.</div>
               ) : (
                 <table className="w-full text-left text-xs">
                   <thead className="bg-slate-100/50 border-b border-white text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                     <tr>
                       <th className="p-4 pl-6">Nama / Jenis Barang</th>
                       <th className="p-4">Dimensi (P L T) / Tipe</th>
                       <th className="p-4 text-right pr-6">Deklarasi Nilai Barang</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/60">
                     {orderItems.map((itm: DeliveryItem, i: number) => (
                       <tr key={i} className="hover:bg-white/40 transition-colors">
                         <td className="p-4 pl-6 font-black text-slate-800">{itm.name || "Barang Reguler"}</td>
                         <td className="p-4 font-bold text-slate-600 font-mono">
                           {itm.dimType === "S" && itm.length ? `${itm.length}x${itm.width}x${itm.height} cm` : (itm.weightType || "-")}
                         </td>
                         <td className="p-4 pr-6 text-right font-black text-emerald-600">{formatRupiah(Number(itm.value || 0))}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
             </div>
          </div>
        </motion.div>

        {/* ========================================================= */}
        {/* BARIS 3: CEK BUKTI TRANSFER (Full Width Grid & Gede) */}
        {/* ========================================================= */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-12"
        >
          <div className="bg-slate-950 rounded-[2.5rem] p-6 sm:p-8 border border-slate-800 shadow-[0_30px_60px_rgba(0,0,0,0.5)] text-white relative overflow-hidden flex flex-col h-full min-h-[500px]">
            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-6 text-slate-400 shrink-0"><ImageIcon className="w-4 h-4 text-emerald-400" /> Galeri Bukti Pembayaran</h4>
            
            <div className="flex-1 bg-black/60 rounded-[2rem] border border-white/10 flex items-center justify-center relative overflow-hidden group shadow-inner">
              {order.receiptUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.receiptUrl} alt="Bukti Transfer" className="w-full h-full object-contain rounded-[2rem] transition-transform duration-700 group-hover:scale-[1.02]" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <button onClick={() => setProofModalUrl(order.receiptUrl as string)} className="bg-white/10 hover:bg-white text-white hover:text-slate-900 border border-white/30 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105">
                      <Eye className="w-5 h-5" /> Buka Full Screen
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-10 flex flex-col items-center justify-center h-full w-full">
                  <XCircle className="w-16 h-16 text-slate-700 mb-4" />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Klien Belum Mengunggah Bukti Pembayaran</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}