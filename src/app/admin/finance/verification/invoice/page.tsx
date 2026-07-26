"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, XCircle, Eye, Image as ImageIcon, 
  FileText, User, MapPin, Package, Truck, Scale, 
  TicketPercent, X, Search, Filter, ArrowUpDown, 
  Activity, ShieldAlert, ArrowLeft, Receipt, ArrowRight,
  AlertCircle
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, arrayUnion, increment } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// IMPORT GLOBAL TYPES
import { OrderDetail, FirebaseTimestamp, LocationDetail } from "@/types/order";

// =========================================================================
// UTILS LOKAL
// =========================================================================
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);
const getMillis = (ts: FirebaseTimestamp) => {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null) {
    const objTs = ts as Record<string, unknown>;
    if (typeof objTs.toMillis === 'function') return objTs.toMillis() as number;
    if (typeof objTs.seconds === 'number') return objTs.seconds * 1000;
  }
  return new Date(ts as string | number).getTime();
};
const formatDate = (timestamp: FirebaseTimestamp) => {
  if (!timestamp) return "-";
  return new Date(getMillis(timestamp)).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Emerald/Finance Accent)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(16,185,129,0.1)] transition-all duration-300 rounded-2xl";

export default function VerifyInvoicePage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Menunggu Verifikasi Finance"); 
  const [sortOrder, setSortOrder] = useState("newest");
  
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Modal State
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(qOrders, 
      (snapshot) => {
        setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail)));
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching invoices:", error);
        showToast("error", "Gagal memuat daftar tagihan.");
        setIsLoading(false);
      }
    );
    return () => unsubOrders();
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const processedOrders = useMemo(() => {
    let result = orders.filter(o => o.paymentMethod === "Transfer Bank Manual" || o.paymentStatus === "Menunggu Verifikasi Finance" || o.paymentStatus === "Lunas" || o.paymentStatus === "Ditolak");
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => {
        const originName = typeof o.origin === 'object' && o.origin !== null ? (o.origin as LocationDetail).senderName : "";
        return o.id.toLowerCase().includes(q) || (o.email || "").toLowerCase().includes(q) || (originName || "").toLowerCase().includes(q);
      });
    }
    
    if (filterStatus !== "All") result = result.filter(o => o.paymentStatus === filterStatus);
    
    result.sort((a, b) => {
      const cA = a.breakdown?.grandTotal || a.finalGrandTotal || a.totalCost || 0; 
      const cB = b.breakdown?.grandTotal || b.finalGrandTotal || b.totalCost || 0;
      const tA = getMillis(a.createdAt);
      const tB = getMillis(b.createdAt);
      if (sortOrder === "newest") return tB - tA;
      if (sortOrder === "oldest") return tA - tB;
      if (sortOrder === "highest_value") return cB - cA;
      return 0;
    });
    return result;
  }, [orders, searchQuery, filterStatus, sortOrder]);

  const handleVerifyPayment = async (orderId: string, action: "Approve" | "Reject") => {
    setIsProcessing(true);
    try {
      const targetOrder = orders.find(o => o.id === orderId); 
      const orderRef = doc(db, "orders", orderId);
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

        if (targetOrder && targetOrder.appliedPromoCode) {
          const promoRef = doc(db, "promos", targetOrder.appliedPromoCode);
          await updateDoc(promoRef, { usedCount: increment(1) });
        }
        showToast("success", "Pembayaran disetujui! Status Tagihan Lunas.");
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
        showToast("error", "Pembayaran ditolak. Klien akan diminta mengunggah ulang bukti transfer.");
      }
    } catch (error) {
      console.error("Gagal verifikasi pembayaran:", error);
      showToast("error", "Terjadi kesalahan saat memproses verifikasi.");
    } finally {
      setIsProcessing(false);
      setSelectedOrderDetail(null);
    }
  };

  const pendingCount = orders.filter(o => o.paymentStatus === "Menunggu Verifikasi Finance").length;

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Validasi Keuangan ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans max-w-7xl mx-auto">
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toastMessage.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER NAV */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin/finance/verification")} className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
              Verifikasi Tagihan (Invoice)
            </h1>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Client Reguler (B2C)</p>
          </div>
        </div>
      </div>

      {/* STATS BENTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 border border-emerald-900 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-[40px] opacity-50 transition-opacity" />
          <span className="text-emerald-100 text-[11px] font-bold uppercase tracking-widest relative z-10 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5"/> Menunggu Verifikasi
          </span>
          <p className="text-4xl font-black text-white mt-3 relative z-10 tracking-tight">{pendingCount} <span className="text-sm font-medium opacity-80 uppercase tracking-widest">Tiket</span></p>
        </div>
        
        {/* Helper Banner */}
        <div className={`${glassPanel} rounded-2xl p-6 md:col-span-2 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
            <Receipt className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">SOP Verifikasi Invoice</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-lg">
              Pastikan nominal yang dikirim klien (User) sama persis dengan angka <span className="font-bold text-slate-700">Total Tagihan Akhir</span>. Jika berbeda atau bukti palsu, segera tolak pesanan.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* TOOLBAR FILTER & SEARCH */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari ID Manifes atau email klien..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                <option value="All">Semua Status Invoice</option>
                <option value="Menunggu Verifikasi Finance">Menunggu Verifikasi (Pending)</option>
                <option value="Lunas">Diterima Lunas (Approved)</option>
                <option value="Ditolak">Bukti Ditolak (Rejected)</option>
              </select>
            </div>
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                <option value="newest">Invoice Terbaru</option>
                <option value="oldest">Invoice Terlama</option>
                <option value="highest_value">Nominal Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        {/* DAFTAR INVOICE (LIST / ROW LAYOUT) */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-emerald-600 animate-pulse" />
              <p>Membaca Jurnal Keuangan...</p>
            </div>
          ) : processedOrders.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <CheckCircle2 className="w-16 h-16 mb-4 opacity-20 text-emerald-500" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Semua Tagihan Beres!</h4>
              <p className="font-medium text-slate-500">Tidak ada antrean invoice yang membutuhkan verifikasi.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {processedOrders.map((v, idx) => {
                  const finalNominal = v.finalGrandTotal || v.breakdown?.grandTotal || v.totalCost || 0;
                  const isLunas = v.paymentStatus === "Lunas";
                  const isDitolak = v.paymentStatus === "Ditolak";

                  return (
                    <motion.div 
                      key={v.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      transition={{ delay: idx * 0.03 }} 
                      className={`${glassRow} p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 group cursor-pointer`}
                      onClick={() => setSelectedOrderDetail(v)}
                    >
                      
                      {/* KOLOM 1: Info Klien & ID */}
                      <div className="flex items-center gap-4 w-full md:w-1/3">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border", isLunas ? "bg-emerald-50 text-emerald-600 border-emerald-200" : isDitolak ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200")}>
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-0.5">#{v.id}</p>
                          <h2 className="text-sm font-black text-slate-900 truncate" title={v.email || "Klien Reguler"}>{v.email || "Klien Reguler"}</h2>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">{formatDate(v.createdAt)}</p>
                        </div>
                      </div>

                      {/* KOLOM 2: Status & Promo (Tengah) */}
                      <div className="w-full md:w-1/3 flex flex-col items-start md:items-center gap-1.5 border-t border-slate-100 pt-4 md:pt-0 md:border-t-0">
                        <AdminBadge variant={isLunas ? "success" : isDitolak ? "danger" : "warning"} className="text-[10px] whitespace-nowrap px-3 shadow-sm">
                          {v.paymentStatus}
                        </AdminBadge>
                        {v.appliedPromoCode && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                            <TicketPercent className="w-3 h-3"/> Diskon Promo
                          </span>
                        )}
                      </div>

                      {/* KOLOM 3: Nominal & Action */}
                      <div className="w-full md:w-1/3 flex items-center justify-between md:justify-end gap-5">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Tagihan Final</p>
                          <p className="text-xl font-black text-emerald-600 tracking-tight">{formatRupiah(finalNominal)}</p>
                        </div>
                        <AdminButton 
                          size="icon" 
                          variant="outline" 
                          className="h-10 w-10 shrink-0 text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-300 group-hover:bg-emerald-50 rounded-xl"
                          onClick={(e) => { e.stopPropagation(); setSelectedOrderDetail(v); }}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </AdminButton>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* MODAL VERIFIKASI (FULLSCREEN LIGHBOX) */}
      <AnimatePresence>
        {selectedOrderDetail && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !isProcessing && setSelectedOrderDetail(null)}></motion.div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-5xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] overflow-hidden border border-white">
              
              <div className="bg-white/50 border-b border-white p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><FileText className="w-6 h-6 text-emerald-600" /> Detail Tagihan Manifes</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest font-bold">ID: #{selectedOrderDetail.id}</p>
                </div>
                <button onClick={() => !isProcessing && setSelectedOrderDetail(null)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors flex items-center justify-center shadow-sm"><X className="w-5 h-5" /></button>
              </div>

              <div className="overflow-y-auto p-6 md:p-8 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* KIRI: DETAIL ORDER */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* Profil Klien */}
                    <div className="bg-white/60 rounded-2xl p-6 border border-white shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Akun Pemesan (B2C)</p>
                        <p className="text-sm font-black text-slate-900">{selectedOrderDetail.email || "Klien Guest"}</p>
                      </div>
                    </div>

                    {/* Rute Perjalanan */}
                    <div className="bg-white/60 rounded-2xl p-6 border border-white shadow-sm relative">
                      <div className="absolute left-[39px] top-10 bottom-8 w-0.5 bg-slate-200 border-dashed border-l-2 border-slate-300 z-0"></div>
                      <div className="space-y-6 relative z-10">
                        <div className="flex items-start gap-4">
                          <div className="mt-1 bg-white p-2 rounded-full border border-slate-200 shadow-sm"><MapPin className="w-4 h-4 text-slate-400" /></div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Titik Penjemputan (Asal)</p>
                            <p className="font-bold text-slate-800 text-sm leading-relaxed">{typeof selectedOrderDetail.origin === 'object' && selectedOrderDetail.origin !== null ? (selectedOrderDetail.origin as LocationDetail).address : selectedOrderDetail.origin}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="mt-1 bg-emerald-50 p-2 rounded-full border border-emerald-200 shadow-sm"><MapPin className="w-4 h-4 text-emerald-600" /></div>
                          <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Titik Pengiriman (Tujuan)</p>
                            {selectedOrderDetail.destinations ? selectedOrderDetail.destinations.map((dest: LocationDetail, idx: number) => (
                              <p key={idx} className="font-bold text-slate-800 text-sm mb-2 leading-relaxed">{dest.address}</p>
                            )) : (
                              <p className="font-bold text-slate-800 text-sm leading-relaxed">{selectedOrderDetail.destination || "-"}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Spesifikasi Kargo */}
                    <div className="bg-white/60 rounded-2xl p-6 border border-white shadow-sm space-y-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-slate-400" /> Spesifikasi Kargo</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Berat Aktual</p>
                          <p className="text-xl font-black text-slate-900 flex items-center gap-2"><Scale className="w-5 h-5 text-emerald-500"/> {selectedOrderDetail.totalWeight || selectedOrderDetail.weight || 0} Kg</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pilihan Armada</p>
                          <p className="text-sm font-black text-slate-900 flex items-center gap-2 mt-1 truncate"><Truck className="w-4 h-4 text-blue-500"/> {selectedOrderDetail.vehicleName || selectedOrderDetail.vehicle || "Armada"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KANAN: BUKTI BAYAR & ACTION */}
                  <div className="lg:col-span-5 space-y-6">
                    
                    {/* Tampilan Bukti Transfer Lighbox */}
                    <div className="bg-slate-900 rounded-[2rem] p-6 border border-slate-800 shadow-xl text-white relative overflow-hidden group">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><ImageIcon className="w-4 h-4 text-emerald-400" /> Cek Bukti Transfer</h4>
                      {selectedOrderDetail.receiptUrl ? (
                        <div className="bg-black/50 p-2 rounded-xl border border-white/10 flex items-center justify-center h-[300px] relative overflow-hidden">
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img src={selectedOrderDetail.receiptUrl} alt="Bukti Transfer" className="w-full h-full object-contain rounded-lg transition-transform duration-500 group-hover:scale-105" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                              <a href={selectedOrderDetail.receiptUrl} target="_blank" rel="noopener noreferrer" className="bg-white/20 hover:bg-white text-white hover:text-slate-900 border border-white/40 px-5 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 transition-all">
                                <Eye className="w-4 h-4" /> Buka Full Screen
                              </a>
                           </div>
                        </div>
                      ) : (
                        <div className="bg-white/5 h-[300px] rounded-xl border border-dashed border-white/20 text-center flex flex-col items-center justify-center">
                          <XCircle className="w-8 h-8 text-white/20 mx-auto mb-2" />
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">User Belum Unggah Bukti</p>
                        </div>
                      )}
                    </div>

                    {/* Final Nominal Highlight */}
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 border border-emerald-900 shadow-lg text-white relative overflow-hidden text-center">
                      <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">Tagihan Dibayarkan</p>
                      <p className="text-4xl font-black text-white tracking-tight">
                        {formatRupiah(selectedOrderDetail.finalGrandTotal || selectedOrderDetail.breakdown?.grandTotal || selectedOrderDetail.totalCost || selectedOrderDetail.offeredPrice || 0)}
                      </p>
                    </div>

                    {/* Tombol Action Approve/Reject */}
                    {selectedOrderDetail.paymentStatus === "Menunggu Verifikasi Finance" && (
                      <div className="flex gap-3 pt-2">
                        <AdminButton onClick={() => { if(confirm("Tolak bukti pembayaran ini? Klien harus mengunggah ulang.")) { handleVerifyPayment(selectedOrderDetail.id, "Reject"); } }} disabled={isProcessing} variant="danger" className="w-14 shrink-0 shadow-lg" title="Tolak Pembayaran">
                          <XCircle className="w-5 h-5" />
                        </AdminButton>
                        <AdminButton onClick={() => handleVerifyPayment(selectedOrderDetail.id, "Approve")} disabled={isProcessing} variant="success" className="flex-1 shadow-lg shadow-emerald-600/30 text-[13px]">
                          <CheckCircle2 className="w-5 h-5 mr-2" /> TERIMA LUNAS
                        </AdminButton>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}