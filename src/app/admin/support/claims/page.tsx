"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  FileWarning, Search, Filter, ArrowUpDown, 
  Clock, CheckCircle2, AlertCircle, Eye, XCircle, 
  CheckCircle, ChevronDown, Package, MapPin, ShieldAlert,
  Wallet
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, updateDoc, query, orderBy, getDoc, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// IMPORT DARI GLOBAL TYPES
import { InsuranceClaim } from "@/types/support";
import { OrderDetail, LocationDetail } from "@/types/order";

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

  // Safe Timestamp Parsers untuk lolos Strict Mode
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

  // Kalkulasi Statistik
  const totalPending = claims.filter(c => c.status === "Pending Review").length;
  const totalApproved = claims.filter(c => c.status === "Approved").length;
  const totalRejected = claims.filter(c => c.status === "Rejected").length;

  // =========================================================================
  // GUARDS: DITEMPATKAN DI BAWAH SEMUA HOOKS AGAR TIDAK MELANGGAR ATURAN REACT
  // =========================================================================

  // RBAC GUARD (Hanya Superadmin, Finance, & Operational)
  if (currentUser && !['superadmin', 'admin_finance', 'admin_operational'].includes(currentUser.role)) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Klaim Asuransi ini hanya dapat dikelola oleh Divisi Finance atau Operasional.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[100] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <FileWarning className="w-8 h-8 text-amber-500" /> Klaim Asuransi
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Verifikasi dan persetujuan klaim kerusakan kargo dari klien.</p>
        </div>
      </div>

      {/* METRIK STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-16 h-16 text-amber-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Menunggu Review</span>
          <p className="text-3xl font-black text-amber-600 mt-2">{totalPending} Tiket</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-16 h-16 text-emerald-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Klaim Disetujui</span>
          <p className="text-3xl font-black text-emerald-600 mt-2">{totalApproved} Tiket</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><XCircle className="w-16 h-16 text-red-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Klaim Ditolak</span>
          <p className="text-3xl font-black text-red-600 mt-2">{totalRejected} Tiket</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col lg:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="relative w-full lg:w-96 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari Resi/AWB atau nama klien..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-900 outline-none text-xs font-semibold focus:border-amber-500 focus:ring-4 focus:ring-amber-50 transition-all shadow-sm" />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
          <div className="relative shrink-0 flex-1 sm:flex-none">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl pl-9 pr-8 py-2.5 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 appearance-none shadow-sm cursor-pointer">
              <option value="All">Semua Status</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <button onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")} className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm">
            <ArrowUpDown className="w-4 h-4 text-slate-400" /> {sortOrder === "desc" ? "Terbaru" : "Terlama"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-amber-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-widest">Mensinkronkan Klaim...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm border-b border-slate-200">
                <tr className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">
                  <th className="p-5 pl-6 w-12"></th>
                  <th className="p-5">Klien & ID Manifest</th>
                  <th className="p-5 w-1/4">Nilai Klaim & Alasan</th>
                  <th className="p-5">Bukti Fisik</th>
                  <th className="p-5 pr-6 text-right">Keputusan (Finance)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <AnimatePresence>
                  {processedClaims.length === 0 ? (
                    <tr><td colSpan={5} className="p-16 text-center text-slate-400 font-medium">Tidak ada klaim asuransi yang sesuai filter.</td></tr>
                  ) : processedClaims.map(c => (
                    <ExpandableClaimRow 
                      key={c.id} 
                      claim={c} 
                      formatTime={formatTime} 
                      formatRupiah={formatRupiah} 
                      setShowImageModal={setShowImageModal} 
                      showToast={showToast} 
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowImageModal(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative z-10 w-full max-w-3xl max-h-full flex flex-col shadow-2xl rounded-[2rem] overflow-hidden border border-slate-200 bg-white">
              <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white">
                <h3 className="font-black text-slate-900 flex items-center gap-2 text-lg"><Eye className="w-5 h-5 text-blue-600"/> Bukti Foto Asuransi</h3>
                <button onClick={() => setShowImageModal(null)} className="text-slate-500 hover:text-red-500 transition-colors bg-slate-100 hover:bg-red-50 p-2 rounded-full"><XCircle className="w-5 h-5"/></button>
              </div>
              <div className="bg-slate-50 p-6 flex items-center justify-center min-h-[400px] overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={showImageModal} alt="Bukti Klaim" className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md border border-slate-200" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// === KOMPONEN BARIS EXPANDABLE ===
interface ExpandableClaimRowProps {
  claim: InsuranceClaim;
  formatTime: (ts?: unknown) => string;
  formatRupiah: (val: number) => string;
  setShowImageModal: (url: string) => void;
  showToast: (type: "success" | "error", msg: string) => void;
}

function ExpandableClaimRow({ claim, formatTime, formatRupiah, setShowImageModal, showToast }: ExpandableClaimRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [orderData, setOrderData] = useState<OrderDetail | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
      // onSnapshot di parent akan memperbarui UI otomatis
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memproses klaim.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <motion.tr 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn("hover:bg-slate-50 transition-colors group relative", isExpanded && "bg-slate-50")}
      >
        {/* Status Indikator Samping */}
        <td className="p-0 absolute top-0 left-0 bottom-0 w-1.5 z-10">
          <div className={`h-full w-full ${claim.status === 'Approved' ? 'bg-emerald-400' : claim.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400'}`} />
        </td>

        <td className="p-5 pl-8 align-top">
          <button onClick={toggleExpand} className="p-1.5 rounded-full hover:bg-white border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-slate-700 hover:shadow-sm">
            <ChevronDown className={cn("w-5 h-5 transition-transform", isExpanded && "rotate-180")} />
          </button>
        </td>
        <td className="p-5 align-top">
          <p className="font-mono font-black text-amber-600 text-sm mb-1 uppercase bg-amber-50 px-2 py-0.5 rounded w-fit border border-amber-200">AWB: #{claim.orderId.substring(0,8)}</p>
          <p className="text-[11px] text-slate-800 font-bold mb-1">{claim.clientName}</p>
          <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1"><Clock className="w-3 h-3"/> {formatTime(claim.createdAt)}</p>
        </td>
        <td className="p-5 align-top">
          <p className="text-base font-black text-slate-900 mb-1.5">{formatRupiah(claim.claimedAmount)}</p>
          <p className="text-[11px] text-slate-500 max-w-[250px] leading-relaxed bg-white p-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-red-500 font-bold uppercase tracking-widest text-[9px] block mb-0.5">Alasan:</span> {claim.reason}</p>
        </td>
        <td className="p-5 align-top">
          {claim.proofUrl ? (
             <button onClick={() => setShowImageModal(claim.proofUrl!)} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-xl border border-blue-200 transition-colors font-bold text-[10px] uppercase tracking-widest shadow-sm">
               <Eye className="w-4 h-4" /> Lihat Foto
             </button>
          ) : (
            <span className="text-slate-400 text-xs italic bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">Tanpa Foto</span>
          )}
        </td>
        <td className="p-5 pr-6 align-top flex flex-col items-end gap-2">
          {claim.status === "Pending Review" ? (
            <div className="flex gap-2">
              <button disabled={isProcessing} onClick={() => handleProcessClaim("Rejected")} className="bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 px-3 py-2 rounded-xl text-[10px] font-bold transition-all disabled:opacity-50 shadow-sm">Tolak</button>
              <button disabled={isProcessing} onClick={() => handleProcessClaim("Approved")} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 px-4 py-2 rounded-xl text-[10px] font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Setujui</button>
            </div>
          ) : (
            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${claim.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              {claim.status}
            </span>
          )}
        </td>
      </motion.tr>

      {/* RENDER EXPANDED DETAIL ORDER */}
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={6} className="p-0 border-b border-slate-200 bg-slate-50">
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="p-6 pl-16 border-t border-slate-200/60 shadow-inner">
                  {isLoadingOrder ? (
                    <div className="flex items-center gap-3 text-slate-400 font-bold text-xs"><div className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" /> Menarik Rincian Order...</div>
                  ) : orderData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Kolom 1: Info Kargo */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2"><Package className="w-3.5 h-3.5"/> Spesifikasi Kargo</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                             <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Armada</p>
                             <p className="text-xs font-black text-slate-900">{orderData.vehicleName || orderData.serviceType}</p>
                           </div>
                           <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                             <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Total Berat</p>
                             <p className="text-xs font-black text-slate-900">{orderData.totalWeight || orderData.weight} Kg</p>
                           </div>
                           <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                             <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Ongkos Kirim</p>
                             <p className="text-xs font-black text-slate-900">{formatRupiah(orderData.breakdown?.deliveryFee || 0)}</p>
                           </div>
                           <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-sm">
                             <p className="text-[9px] text-emerald-600 font-bold uppercase mb-1">Premi Asuransi Dibayar</p>
                             <p className="text-xs font-black text-emerald-700">{formatRupiah(orderData.breakdown?.insuranceFee || 0)}</p>
                           </div>
                        </div>
                      </div>

                      {/* Kolom 2: Rute */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2"><MapPin className="w-3.5 h-3.5"/> Lokasi Pengiriman</h4>
                        <div className="space-y-3">
                           <div className="flex gap-3 items-start">
                             <div className="mt-1 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-slate-100 shrink-0" />
                             <div>
                               <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Asal</p>
                               <p className="text-xs font-bold text-slate-900">{typeof orderData.origin === 'object' && orderData.origin !== null ? (orderData.origin as LocationDetail).address : (orderData.origin || "-")}</p>
                             </div>
                           </div>
                           <div className="border-l-2 border-dashed border-slate-200 ml-[3px] pl-5 py-2">
                             <p className="text-[10px] font-bold text-slate-400">Jarak Tempuh: <span className="text-slate-900">{orderData.totalDistance || 0} Km</span></p>
                           </div>
                           <div className="flex gap-3 items-start">
                             <div className="mt-1 w-2 h-2 rounded-full bg-[#7A171D] ring-4 ring-red-50 shrink-0" />
                             <div>
                               <p className="text-[9px] text-[#7A171D] font-bold uppercase mb-0.5">Tujuan Akhir</p>
                               <p className="text-xs font-bold text-slate-900">{orderData.destinations && orderData.destinations.length > 0 ? orderData.destinations[orderData.destinations.length - 1].address : (orderData.destination || "-")}</p>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-500 font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Data order referensi hilang atau terhapus.</div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}