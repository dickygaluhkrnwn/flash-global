"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Search, Filter, ArrowUpDown, 
  Clock, CheckCircle2, AlertCircle, XCircle, 
  ChevronDown, Package, ShieldAlert,
  Wallet, MessageSquareWarning, Image as ImageIcon, Send, Activity
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, doc, updateDoc, query, orderBy, getDoc, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// IMPORT DARI GLOBAL TYPES
import { InsuranceClaim } from "@/types/support";
import { OrderDetail, LocationDetail } from "@/types/order";

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Amber/Support Theme)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

export default function AdminClaimsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  
  const [showImageModal, setShowImageModal] = useState<string | null>(null);

  // REAL-TIME LISTENER
  useEffect(() => { 
    setIsLoading(true);
    const q = query(collection(db, "insurance_claims"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClaims(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InsuranceClaim)));
      setIsLoading(false);
    }, (error) => {
      console.error("Gagal menarik klaim secara real-time:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  // Safe Timestamp Parsers
  const getMillis = (ts: unknown) => {
    if (!ts) return 0;
    const t = ts as { toMillis?: () => number, seconds?: number };
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (typeof t.seconds === 'number') return t.seconds * 1000;
    return new Date(ts as string | number).getTime();
  };

  const formatTime = (ts?: unknown) => {
    if (!ts) return "Unknown";
    const t = ts as { toDate?: () => Date };
    const d = typeof t.toDate === 'function' ? t.toDate() : new Date(ts as string | number);
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const processedClaims = useMemo(() => {
    let res = [...claims];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      res = res.filter(c => 
        (c.clientName || "").toLowerCase().includes(q) || 
        (c.orderId || "").toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "All") res = res.filter(c => c.status === filterStatus);
    res.sort((a, b) => {
      const timeA = getMillis(a.createdAt);
      const timeB = getMillis(b.createdAt);
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });
    return res;
  }, [claims, searchQuery, filterStatus, sortOrder]);

  const totalPending = claims.filter(c => c.status === "Pending Review").length;
  const totalApproved = claims.filter(c => c.status === "Approved").length;
  const totalRejected = claims.filter(c => c.status === "Rejected").length;

  if (currentUser && !['superadmin', 'admin_finance', 'admin_operational'].includes(currentUser.role)) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Klaim Asuransi ini hanya dapat dikelola oleh Divisi Finance atau Operasional.</p>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 font-sans max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER ZENDESK-STYLE */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        <div className="relative z-10 flex-1">
          <AdminBadge variant="warning" className="mb-4 bg-amber-100 text-amber-700 border-amber-200">Customer Support</AdminBadge>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <MessageSquareWarning className="w-8 h-8 text-amber-600" />
            Tiket Klaim Asuransi
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl font-medium leading-relaxed">
            Pusat penanganan resolusi sengketa dan klaim asuransi (barang hilang/rusak). Setiap klaim harus diinvestigasi sebelum dana dicairkan.
          </p>
        </div>
      </div>

      {/* METRIK STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glassPanel} rounded-[2rem] p-6 flex flex-col justify-center relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><Clock className="w-20 h-20 text-amber-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-widest relative z-10">Menunggu Review</span>
          <p className="text-4xl font-black text-amber-600 mt-2 tracking-tight relative z-10 flex items-center gap-2">
            {totalPending} <span className="text-sm font-bold text-amber-600/50 uppercase tracking-widest mt-2">Tiket Aktif</span>
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glassPanel} rounded-[2rem] p-6 flex flex-col justify-center relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><Wallet className="w-20 h-20 text-emerald-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-widest relative z-10">Klaim Disetujui</span>
          <p className="text-4xl font-black text-emerald-600 mt-2 tracking-tight relative z-10 flex items-center gap-2">
            {totalApproved} <span className="text-sm font-bold text-emerald-600/50 uppercase tracking-widest mt-2">Selesai</span>
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassPanel} rounded-[2rem] p-6 flex flex-col justify-center relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><XCircle className="w-20 h-20 text-red-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-widest relative z-10">Klaim Ditolak</span>
          <p className="text-4xl font-black text-red-600 mt-2 tracking-tight relative z-10 flex items-center gap-2">
            {totalRejected} <span className="text-sm font-bold text-red-600/50 uppercase tracking-widest mt-2">Selesai</span>
          </p>
        </motion.div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* TOOLBAR FILTER */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari Resi/AWB atau nama klien..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-[3px] focus:ring-amber-500/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium" 
            />
          </div>

          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)} 
                className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-[3px] focus:ring-amber-500/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[180px]"
              >
                <option value="All">Semua Status Tiket</option>
                <option value="Pending Review">Menunggu Review</option>
                <option value="Approved">Klaim Disetujui</option>
                <option value="Rejected">Klaim Ditolak</option>
              </select>
            </div>
            <button 
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")} 
              className="w-full sm:w-auto bg-white/60 hover:bg-white backdrop-blur-md border border-white text-slate-700 text-sm font-bold rounded-xl px-5 py-2.5 flex items-center justify-center gap-2 transition-all shadow-sm shrink-0 outline-none focus:ring-[3px] focus:ring-amber-500/15"
            >
              <ArrowUpDown className="w-4 h-4 text-slate-400" /> {sortOrder === "desc" ? "Terbaru" : "Terlama"}
            </button>
          </div>
        </div>

        {/* FEED KLAIM ZENDESK STYLE (NO TABLES) */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-amber-500 animate-pulse" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Menarik Data Tiket Klaim...</p>
            </div>
          ) : processedClaims.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <CheckCircle2 className="w-16 h-16 mb-4 opacity-30 text-emerald-500" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Zero Inbox!</h4>
              <p className="font-medium text-slate-500">Tidak ada tiket klaim asuransi yang perlu ditangani saat ini.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {processedClaims.map((c, idx) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}>
                    <TicketCard 
                      claim={c} 
                      formatTime={formatTime} 
                      formatRupiah={formatRupiah} 
                      setShowImageModal={setShowImageModal} 
                      showToast={showToast} 
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN IMAGE LIGHTBOX */}
      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowImageModal(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 w-full max-w-4xl max-h-full flex flex-col items-center justify-center">
              <button onClick={() => setShowImageModal(null)} className="absolute -top-14 right-0 bg-white/10 hover:bg-white/30 text-white p-2 rounded-full transition-colors border border-white/20">
                <XCircle className="w-6 h-6"/>
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={showImageModal} alt="Bukti Klaim" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================================
// KOMPONEN: TICKET CARD (ZENDESK CHAT STYLE)
// =========================================================================
interface TicketCardProps {
  claim: InsuranceClaim;
  formatTime: (ts?: unknown) => string;
  formatRupiah: (val: number) => string;
  setShowImageModal: (url: string) => void;
  showToast: (type: "success" | "error", msg: string) => void;
}

function TicketCard({ claim, formatTime, formatRupiah, setShowImageModal, showToast }: TicketCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [orderData, setOrderData] = useState<OrderDetail | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isPending = claim.status === "Pending Review";
  const isApproved = claim.status === "Approved";
  
  // Status Bar Indicator
  const statusBarColor = isPending ? "bg-amber-500" : isApproved ? "bg-emerald-500" : "bg-red-500";
  const bgCardColor = isPending ? "hover:shadow-[0_8px_25px_rgba(245,158,11,0.15)]" : isApproved ? "hover:shadow-[0_8px_25px_rgba(16,185,129,0.15)]" : "hover:shadow-[0_8px_25px_rgba(220,38,38,0.15)]";

  const toggleExpand = async () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && !orderData && claim.orderId) {
      setIsLoadingOrder(true);
      try {
        let docRef = doc(db, "orders", claim.orderId);
        let docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          docRef = doc(db, "quotes", claim.orderId);
          docSnap = await getDoc(docRef);
        }
        if (docSnap.exists()) {
          setOrderData({ id: docSnap.id, category: "domestik", status: "Unknown", ...docSnap.data() } as OrderDetail);
        }
      } catch (e) {
        console.error("Gagal menarik detail order:", e);
      } finally {
        setIsLoadingOrder(false);
      }
    }
  };

  const handleProcessClaim = async (newStatus: "Approved" | "Rejected") => {
    if (!confirm(`Yakin ingin merubah status klaim menjadi ${newStatus}?`)) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, "insurance_claims", claim.id), { status: newStatus });
      showToast("success", `Klaim berhasil diproses (${newStatus})`);
      setIsExpanded(false);
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memproses klaim.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn("bg-white/80 backdrop-blur-xl border shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] transition-all duration-300 relative overflow-hidden flex flex-col group", isExpanded ? "border-slate-300 rounded-[2rem] shadow-md" : `border-white rounded-[2rem] ${bgCardColor}`)}>
      
      {/* STATUS INDICATOR (Vertical Bar) */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 z-10 transition-colors", statusBarColor)} />

      {/* HEADER / SUMMARY AREA */}
      <div className="p-6 md:p-8 pl-8 flex flex-col lg:flex-row justify-between gap-6 relative z-10 cursor-pointer" onClick={toggleExpand}>
        
        <div className="flex items-start gap-4 w-full lg:w-[45%]">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
            <MessageSquareWarning className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-black text-slate-900 tracking-tight truncate">{claim.clientName || "Corporate Client"}</h2>
              {isPending && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono font-black text-slate-500 mb-1.5">AWB: #{(claim.orderId || "UNKNOWN").substring(0,8).toUpperCase()}</p>
            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5"><Clock className="w-3 h-3"/> {formatTime(claim.createdAt)}</p>
          </div>
        </div>

        <div className="w-full lg:w-[35%] flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Kerugian / Klaim</p>
          <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">{formatRupiah(claim.claimedAmount || 0)}</p>
        </div>

        <div className="w-full lg:w-[20%] flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3">
          <AdminBadge variant={isPending ? "warning" : isApproved ? "success" : "danger"} className="shadow-sm py-1">
            {claim.status}
          </AdminBadge>
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border transition-all shadow-sm", isExpanded ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-200 group-hover:border-slate-300 group-hover:text-slate-600")}>
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} />
          </div>
        </div>
      </div>

      {/* EXPANDED CONTENT (CHAT STYLE) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
          >
            <div className="p-6 md:p-8 pl-8 flex flex-col gap-8">
              
              {/* Pesan Klien */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300">
                  <span className="text-[10px] font-black text-slate-500 uppercase">{(claim.clientName || "CS").substring(0,2)}</span>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="bg-white p-5 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm relative inline-block max-w-3xl">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5"/> Pesan Keluhan Klien</p>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{claim.reason}</p>
                  </div>
                  
                  {/* Lampiran */}
                  {claim.proofUrl && (
                    <div 
                      onClick={(e) => { e.stopPropagation(); setShowImageModal(claim.proofUrl!); }}
                      className="w-48 h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative cursor-pointer group shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={claim.proofUrl} alt="Lampiran" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <ImageIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Internal Order */}
              <div className="ml-12 border-l-2 border-dashed border-slate-200 pl-6 py-2">
                {isLoadingOrder ? (
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs"><Activity className="w-4 h-4 animate-pulse" /> Menarik Rincian Order Sistem...</div>
                ) : orderData ? (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Package className="w-32 h-32"/></div>
                    
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Package className="w-3.5 h-3.5"/> Data Sistem Referensi</h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Armada/Layanan</p>
                        <p className="text-xs font-black text-slate-900">{orderData.vehicleName || orderData.serviceType}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Berat</p>
                        <p className="text-xs font-black text-slate-900">{orderData.totalWeight || orderData.weight} Kg</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ongkos Kirim</p>
                        <p className="text-xs font-black text-slate-900">{formatRupiah(orderData.breakdown?.deliveryFee || 0)}</p>
                      </div>
                      <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                        <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Premi Asuransi</p>
                        <p className="text-xs font-black text-emerald-700">{formatRupiah(orderData.breakdown?.insuranceFee || 0)}</p>
                      </div>
                    </div>

                    <div className="space-y-3 relative z-10 border-t border-slate-100 pt-4">
                      <div className="flex gap-3 items-start">
                        <div className="mt-1 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-slate-100 shrink-0" />
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Asal</p>
                          <p className="text-xs font-bold text-slate-900">{typeof orderData.origin === 'object' && orderData.origin !== null ? (orderData.origin as LocationDetail).address : (orderData.origin || "-")}</p>
                        </div>
                      </div>
                      <div className="border-l-2 border-dashed border-slate-200 ml-[3px] pl-5 py-1">
                        <p className="text-[10px] font-bold text-slate-400">Jarak: <span className="text-slate-900">{orderData.totalDistance || 0} Km</span></p>
                      </div>
                      <div className="flex gap-3 items-start">
                        <div className="mt-1 w-2 h-2 rounded-full bg-red-600 ring-4 ring-red-50 shrink-0" />
                        <div>
                          <p className="text-[9px] text-red-600 font-bold uppercase tracking-wider mb-0.5">Tujuan Akhir</p>
                          <p className="text-xs font-bold text-slate-900">{orderData.destinations && orderData.destinations.length > 0 ? orderData.destinations[orderData.destinations.length - 1].address : (orderData.destination || "-")}</p>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-sm text-red-500 font-bold flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-100"><AlertCircle className="w-4 h-4"/> Data order referensi hilang atau terhapus dari server.</div>
                )}
              </div>

              {/* Action Buttons (Admin Response) */}
              {isPending && (
                <div className="flex gap-4 items-end mt-4">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0 border border-slate-700 shadow-sm text-white">
                    <span className="text-[10px] font-black uppercase">CS</span>
                  </div>
                  <div className="flex-1 bg-white p-5 rounded-2xl rounded-bl-none border border-blue-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tindakan Penyelesaian:</p>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <AdminButton disabled={isProcessing} onClick={() => handleProcessClaim("Rejected")} variant="outline" className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold h-10 shadow-sm">
                        Tolak Klaim
                      </AdminButton>
                      <AdminButton disabled={isProcessing} onClick={() => handleProcessClaim("Approved")} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-md shadow-blue-600/20 font-bold h-10">
                        <Send className="w-4 h-4 mr-2" /> Setujui & Cairkan
                      </AdminButton>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}