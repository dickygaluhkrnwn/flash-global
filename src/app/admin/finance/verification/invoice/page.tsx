"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, Search, Filter, ArrowUpDown, 
  Activity, ShieldAlert, ArrowLeft, Receipt, ArrowRight,
  AlertCircle, CalendarClock, User, Building
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, getDocs } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// IMPORT GLOBAL TYPES
import { OrderDetail, FirebaseTimestamp, LocationDetail } from "@/types/order";

// =========================================================================
// UTILS LOKAL (Type-Safe Timestamp Extractor)
// =========================================================================
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

const getMillis = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined) => {
  if (!timestamp) return 0;
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp === 'object' && timestamp !== null) {
    const ts = timestamp as Extract<FirebaseTimestamp, object>;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  }
  return new Date(timestamp as string | number).getTime();
};

const formatDate = (timestamp: FirebaseTimestamp) => {
  const millis = getMillis(timestamp);
  if (!millis) return "-";
  return new Date(millis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Emerald/Finance Accent)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassCard = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(16,185,129,0.1)] transition-all duration-300 rounded-[1.5rem]";

// Tipe kustom lokal untuk menambah clientName & clientEmail hasil mapping
type EnrichedOrder = OrderDetail & { clientName: string; clientEmail: string };

export default function VerifyInvoicePage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Menunggu Verifikasi Finance"); 
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    let isMounted = true;
    let unsubOrders: () => void = () => {};

    const fetchData = async () => {
      try {
        // 1. TARIK DATA USERS DULU (Buat Mapping Nama & Email)
        const userMap: Record<string, { name: string; email: string }> = {};
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach(u => {
          const ud = u.data();
          userMap[u.id] = {
            name: ud.displayName || ud.name || "",
            email: ud.email || ""
          };
        });

        // 2. LISTEN KE KOLEKSI ORDERS
        const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        unsubOrders = onSnapshot(qOrders, 
          (snapshot) => {
            if (!isMounted) return;
            
            const enrichedOrders = snapshot.docs.map(d => {
              const rawData = d.data();
              // 🚀 SOLUSI ERROR TS: Karena id aslinya d.id, kita destructure aja
              // tanpa mendeklarasikan ulang _discardedId biar linter ngga ngamuk
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { id, ...cleanData } = rawData; 
              
              const originObj = typeof cleanData.origin === 'object' && cleanData.origin !== null ? cleanData.origin as LocationDetail : null;
              const senderNameFallback = originObj?.senderName || cleanData.senderName;
              
              let finalClientName = String(senderNameFallback || cleanData.name || "");
              let finalClientEmail = String(cleanData.email || cleanData.senderEmail || "");

              if (cleanData.userId && userMap[String(cleanData.userId)]) {
                if (!finalClientName || finalClientName === "undefined") finalClientName = userMap[String(cleanData.userId)].name;
                if (!finalClientEmail || finalClientEmail === "undefined") finalClientEmail = userMap[String(cleanData.userId)].email;
              }

              return {
                id: d.id, // Menjamin ID berasal dari doc id
                ...cleanData,
                clientName: finalClientName || "Klien Guest",
                clientEmail: finalClientEmail || "Tidak ada email",
              } as EnrichedOrder;
            });

            setOrders(enrichedOrders);
            setIsLoading(false);
          },
          (error) => {
            console.error("Error fetching invoices:", error);
            if (isMounted) setIsLoading(false);
          }
        );

      } catch (error) {
        console.error("Fatal error fetching initial verification data:", error);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      unsubOrders();
    };
  }, []);

  const processedOrders = useMemo(() => {
    let result = orders.filter(o => o.paymentMethod === "Transfer Bank Manual" || o.paymentStatus === "Menunggu Verifikasi Finance" || o.paymentStatus === "Lunas" || o.paymentStatus === "Ditolak");
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => {
        return o.id.toLowerCase().includes(q) || 
               o.clientEmail.toLowerCase().includes(q) || 
               o.clientName.toLowerCase().includes(q);
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

  const pendingCount = orders.filter(o => o.paymentStatus === "Menunggu Verifikasi Finance").length;

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans h-screen">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Validasi Keuangan ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8 border-slate-300">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans max-w-7xl mx-auto px-4 sm:px-0">
      
      {/* 🚀 1. HERO SECTION (GABUNGAN HEADER & STATS BENTO) */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-950 p-8 sm:p-10 rounded-[2.5rem] border border-emerald-600/50 shadow-[0_30px_60px_rgba(6,78,59,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] text-white relative overflow-hidden mt-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        
        {/* Header Title */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6 mb-10 border-b border-emerald-600/50 pb-8">
          <div className="flex items-center gap-5">
            <button onClick={() => router.push("/admin/finance/verification")} className="w-12 h-12 rounded-[1.25rem] bg-white/10 backdrop-blur-md border border-white/20 shadow-sm flex items-center justify-center text-emerald-100 hover:text-white hover:bg-white/20 transition-all active:scale-90">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3 tracking-tight drop-shadow-md">
                <Receipt className="w-8 h-8 text-emerald-300 hidden sm:block" />
                Verifikasi Invoice
              </h1>
              <p className="text-emerald-200 text-xs sm:text-sm mt-1.5 uppercase tracking-widest font-bold">
                Client Reguler (B2C)
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid inside Hero */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
          {/* Main Stat: Menunggu Verifikasi */}
          <div className="md:col-span-4 border-r-0 md:border-r border-emerald-600/50 pr-0 md:pr-8 flex flex-col justify-center">
            <span className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
              <AlertCircle className="w-3.5 h-3.5" /> Antrean Validasi Bukti Transfer
            </span>
            <p className="text-4xl sm:text-6xl font-black text-white tracking-tighter font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              {pendingCount} <span className="text-sm font-sans font-bold opacity-70 uppercase tracking-widest ml-1">Tiket</span>
            </p>
          </div>

          {/* SOP Banner */}
          <div className="md:col-span-8 flex flex-col justify-center">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> SOP Verifikasi Keuangan</h3>
            <p className="text-sm text-emerald-100 font-medium leading-relaxed max-w-3xl">
              Pastikan nominal yang dikirim klien (User) ke rekening perusahaan <span className="text-white font-bold">sama persis</span> dengan angka <span className="text-emerald-900 font-bold bg-white/90 px-2 py-0.5 rounded border border-white/20">Total Tagihan Akhir</span>. Jika berbeda atau terindikasi bukti palsu, segera tolak pesanan agar klien dapat mengunggah ulang.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* 2. TOOLBAR FILTER & SEARCH */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari ID Manifes atau email klien..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
            <div className="relative w-full sm:w-auto">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full sm:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[220px]">
                <option value="All">Semua Status Invoice</option>
                <option value="Menunggu Verifikasi Finance">Menunggu Verifikasi (Pending)</option>
                <option value="Lunas">Diterima Lunas (Approved)</option>
                <option value="Ditolak">Bukti Ditolak (Rejected)</option>
              </select>
            </div>
            <div className="relative w-full sm:w-auto">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full sm:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                <option value="newest">Invoice Terbaru</option>
                <option value="oldest">Invoice Terlama</option>
                <option value="highest_value">Nominal Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. DAFTAR INVOICE (MODERN BENTO LIST) */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-emerald-600 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Membaca Jurnal Keuangan...</p>
            </div>
          ) : processedOrders.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <CheckCircle2 className="w-16 h-16 mb-4 opacity-20 text-emerald-500" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Semua Tagihan Beres!</h4>
              <p className="font-medium text-slate-500">Tidak ada antrean invoice yang membutuhkan verifikasi.</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Header Kolom (Desktop Only) */}
              <div className="hidden lg:grid grid-cols-12 gap-6 px-8 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className="col-span-4">ID Transaksi & Info Klien</div>
                <div className="col-span-3">Metode Bayar & Layanan</div>
                <div className="col-span-3">Status Verifikasi</div>
                <div className="col-span-2 text-right">Tagihan Final</div>
              </div>

              <AnimatePresence>
                {processedOrders.map((v, idx) => {
                  const finalNominal = v.finalGrandTotal || v.breakdown?.grandTotal || v.totalCost || 0;
                  const isLunas = v.paymentStatus === "Lunas";
                  const isDitolak = v.paymentStatus === "Ditolak";
                  const isPending = v.paymentStatus === "Menunggu Verifikasi Finance";

                  return (
                    <motion.div 
                      key={v.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      transition={{ delay: idx * 0.02 }} 
                      // 🚀 REDIRECT KE HALAMAN DETAIL
                      onClick={() => router.push(`/admin/finance/verification/invoice/${v.id}`)}
                      className={`${glassCard} p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center cursor-pointer group`}
                    >
                      
                      {/* KOLOM 1: Info Klien & ID */}
                      <div className="lg:col-span-4 flex items-center gap-4">
                        <div className={cn("w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-sm border", isLunas ? "bg-emerald-50 text-emerald-600 border-emerald-200" : isDitolak ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200")}>
                          <User className="w-6 h-6" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2 mb-1">
                            <AdminBadge variant="brand" className="text-[9px] px-2 py-0.5 shadow-sm">#{v.id.substring(0,8)}</AdminBadge>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><CalendarClock className="w-3 h-3"/> {formatDate(v.createdAt)}</span>
                          </div>
                          <h2 className="text-sm font-black text-slate-900 truncate" title={v.clientName}>{v.clientName}</h2>
                          <p className="text-[11px] font-medium text-slate-500 truncate">{v.clientEmail}</p>
                        </div>
                      </div>

                      {/* KOLOM 2: Layanan & Metode */}
                      <div className="lg:col-span-3 flex flex-col items-start gap-2 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0 pl-0 lg:pl-4">
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm w-fit">
                          <Building className="w-3.5 h-3.5"/> Transfer Bank
                        </span>
                      </div>

                      {/* KOLOM 3: Status Verification */}
                      <div className="lg:col-span-3 flex flex-col items-start gap-2">
                        <AdminBadge variant={isLunas ? "success" : isDitolak ? "danger" : "warning"} className="text-[10px] px-4 py-1.5 shadow-sm">
                          {isPending ? "Pending Review" : v.paymentStatus}
                        </AdminBadge>
                      </div>

                      {/* KOLOM 4: Nominal & Action */}
                      <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-5">
                        <div className="text-left lg:text-right">
                          <p className="text-sm sm:text-base font-black tracking-tight font-mono text-emerald-600">{formatRupiah(finalNominal)}</p>
                        </div>
                        <div className="h-10 w-10 shrink-0 bg-white border border-slate-200 text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-300 group-hover:bg-emerald-50 rounded-xl flex items-center justify-center transition-all shadow-sm">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}