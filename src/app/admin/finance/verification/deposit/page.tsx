"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, XCircle, Eye, Image as ImageIcon, 
  Wallet, Building2, Clock, PlusCircle, X, 
  Search, Filter, ArrowUpDown, Activity, ShieldAlert, ArrowLeft, ArrowRight,
  AlertCircle
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, writeBatch, collection, onSnapshot, query, orderBy, serverTimestamp, increment } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// KODE DIBERSIHKAN: Import murni dari order.ts tanpa mendefinisikan ulang
import { FirebaseTimestamp } from "@/types/order";

// KODE DIBERSIHKAN: Interface ini lebih cocok ditaruh di types/finance.ts, 
// tapi untuk sementara kita benahi dulu field-fieldnya agar aman.
export interface DepositRequest {
  id: string;
  userId: string;
  clientName: string;
  amount: number;
  proofUrl: string;
  status: string; // "Menunggu Verifikasi" | "Disetujui" | "Ditolak"
  createdAt: FirebaseTimestamp;
  reviewedAt?: FirebaseTimestamp;
  reviewedBy?: string;
}

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
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(16,185,129,0.1)] transition-all duration-300 rounded-2xl";

export default function VerifyDepositPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  // KODE DIBERSIHKAN: Sesuaikan dengan string di Firestore
  const [filterStatus, setFilterStatus] = useState("Menunggu Verifikasi"); 
  const [sortOrder, setSortOrder] = useState("newest");
  
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Modal State
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const qDeposits = query(collection(db, "deposit_requests"), orderBy("createdAt", "desc"));
    const unsubDeposits = onSnapshot(qDeposits, 
      (snapshot) => {
        setDeposits(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DepositRequest)));
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching deposits:", error);
        showToast("error", "Gagal memuat daftar deposit.");
        setIsLoading(false);
      }
    );
    return () => unsubDeposits();
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const processedDeposits = useMemo(() => {
    let result = [...deposits];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.clientName.toLowerCase().includes(q) || d.id.toLowerCase().includes(q));
    }
    
    if (filterStatus !== "All") result = result.filter(d => d.status === filterStatus);
    
    result.sort((a, b) => {
      const tA = getMillis(a.createdAt);
      const tB = getMillis(b.createdAt);
      const cA = a.amount;
      const cB = b.amount;
      if (sortOrder === "newest") return tB - tA;
      if (sortOrder === "oldest") return tA - tB;
      if (sortOrder === "highest_value") return cB - cA;
      return 0;
    });
    return result;
  }, [deposits, searchQuery, filterStatus, sortOrder]);

  const handleVerifyDeposit = async (reqId: string, action: "Disetujui" | "Ditolak") => {
    setIsProcessing(true);
    try {
      const targetReq = deposits.find(d => d.id === reqId);
      if (!targetReq) throw new Error("Data Top-Up tidak ditemukan");

      if (action === "Disetujui") {
        const batch = writeBatch(db);
        
        const reqRef = doc(db, "deposit_requests", reqId);
        batch.update(reqRef, { 
          status: "Disetujui", 
          reviewedAt: serverTimestamp(),
          reviewedBy: currentUser?.uid || "Admin" 
        });
        
        const userRef = doc(db, "users", targetReq.userId);
        batch.update(userRef, { depositBalance: increment(targetReq.amount) });
        
        const logRef = doc(collection(db, "wallet_logs"));
        batch.set(logRef, {
          entityId: targetReq.userId,
          entityName: targetReq.clientName,
          entityType: "B2B",
          type: "topup",
          amount: targetReq.amount,
          timestamp: serverTimestamp(),
          adminNote: "Setoran Deposit disetujui via Verifikasi Finance"
        });

        await batch.commit();
        showToast("success", "Top-Up disetujui! Saldo deposit klien berhasil ditambahkan.");
      } else {
        await updateDoc(doc(db, "deposit_requests", reqId), { 
          status: "Ditolak", 
          reviewedAt: serverTimestamp(),
          reviewedBy: currentUser?.uid || "Admin"
        });
        showToast("error", "Pengajuan Top-Up ditolak.");
      }
    } catch (error) {
      console.error("Gagal verifikasi Top-Up:", error);
      showToast("error", "Terjadi kesalahan sistem saat memproses Top-Up.");
    } finally {
      setIsProcessing(false);
      setSelectedDeposit(null);
    }
  };

  const pendingCount = deposits.filter(d => d.status === "Menunggu Verifikasi").length;

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
              Verifikasi Setoran Deposit
            </h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Client Corporate (B2B)</p>
          </div>
        </div>
      </div>

      {/* STATS BENTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-800 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(59,130,246,0.3)] relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-[40px] opacity-50 transition-opacity" />
          <span className="text-blue-100 text-[11px] font-bold uppercase tracking-widest relative z-10 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5"/> Menunggu Verifikasi
          </span>
          <p className="text-4xl font-black text-white mt-3 relative z-10 tracking-tight">{pendingCount} <span className="text-sm font-medium opacity-80 uppercase tracking-widest">Tiket</span></p>
        </div>
        
        {/* Helper Banner */}
        <div className={`${glassPanel} rounded-2xl p-6 md:col-span-2 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">SOP Verifikasi Deposit B2B</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-lg">
              Setoran yang diverifikasi akan otomatis menambahkan saldo ke dompet Prabayar (Deposit) entitas <span className="font-bold text-slate-700">Corporate B2B</span> terkait tanpa batasan minimum.
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
              placeholder="Cari ID Top-Up atau nama Entitas..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                <option value="All">Semua Status Deposit</option>
                <option value="Menunggu Verifikasi">Menunggu Cek Bank (Pending)</option>
                <option value="Disetujui">Saldo Masuk (Approved)</option>
                <option value="Ditolak">Setoran Ditolak (Rejected)</option>
              </select>
            </div>
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                <option value="newest">Pengajuan Terbaru</option>
                <option value="oldest">Pengajuan Terlama</option>
                <option value="highest_value">Nominal Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        {/* DAFTAR DEPOSIT (LIST / ROW LAYOUT) */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-blue-600 animate-pulse" />
              <p>Membaca Jurnal Keuangan...</p>
            </div>
          ) : processedDeposits.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <CheckCircle2 className="w-16 h-16 mb-4 opacity-20 text-emerald-500" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Semua Setoran Beres!</h4>
              <p className="font-medium text-slate-500">Tidak ada pengajuan deposit yang membutuhkan verifikasi.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {processedDeposits.map((d, idx) => {
                  const isApproved = d.status === "Disetujui";
                  const isRejected = d.status === "Ditolak";

                  return (
                    <motion.div 
                      key={d.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      transition={{ delay: idx * 0.03 }} 
                      className={`${glassRow} p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 group cursor-pointer`}
                      onClick={() => setSelectedDeposit(d)}
                    >
                      
                      {/* KOLOM 1: Info Klien & ID */}
                      <div className="flex items-center gap-4 w-full md:w-1/3">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border", isApproved ? "bg-emerald-50 text-emerald-600 border-emerald-200" : isRejected ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200")}>
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-0.5">#{d.id.substring(0,8)}</p>
                          <h2 className="text-sm font-black text-slate-900 truncate flex items-center gap-1.5" title={d.clientName}><Building2 className="w-3 h-3 text-blue-500"/> {d.clientName}</h2>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">{formatDate(d.createdAt)}</p>
                        </div>
                      </div>

                      {/* KOLOM 2: Status (Tengah) */}
                      <div className="w-full md:w-1/3 flex flex-col items-start md:items-center gap-1.5 border-t border-slate-100 pt-4 md:pt-0 md:border-t-0">
                        <AdminBadge variant={isApproved ? "success" : isRejected ? "danger" : "warning"} className="text-[10px] whitespace-nowrap px-3 shadow-sm">
                          {d.status}
                        </AdminBadge>
                      </div>

                      {/* KOLOM 3: Nominal & Action */}
                      <div className="w-full md:w-1/3 flex items-center justify-between md:justify-end gap-5">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Setoran Mutasi</p>
                          <p className="text-xl font-black text-emerald-600 tracking-tight flex items-center justify-end gap-1.5"><PlusCircle className="w-4 h-4"/> {formatRupiah(d.amount)}</p>
                        </div>
                        <AdminButton 
                          size="icon" 
                          variant="outline" 
                          className="h-10 w-10 shrink-0 text-slate-400 group-hover:text-blue-600 group-hover:border-blue-300 group-hover:bg-blue-50 rounded-xl"
                          onClick={(e) => { e.stopPropagation(); setSelectedDeposit(d); }}
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

      {/* MODAL VERIFIKASI DEPOSIT (FULLSCREEN LIGHBOX) */}
      <AnimatePresence>
        {selectedDeposit && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !isProcessing && setSelectedDeposit(null)}></motion.div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-4xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] overflow-hidden border border-white">
              
              <div className="bg-white/50 border-b border-white p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Wallet className="w-6 h-6 text-blue-600" /> Detail Top-Up Saldo</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest font-bold">ID: #{selectedDeposit.id}</p>
                </div>
                <button onClick={() => !isProcessing && setSelectedDeposit(null)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors flex items-center justify-center shadow-sm"><X className="w-5 h-5" /></button>
              </div>

              <div className="overflow-y-auto p-6 md:p-8 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* KIRI */}
                  <div className="space-y-6">
                    <div className="bg-white/60 rounded-2xl p-6 border border-white shadow-sm space-y-4">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Klien Korporat B2B</p>
                          <p className="text-sm font-black text-slate-900 uppercase">{selectedDeposit.clientName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Waktu Pengajuan</p>
                          <p className="text-sm font-black text-slate-900">{formatDate(selectedDeposit.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Final Nominal Highlight */}
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 border border-emerald-900 shadow-lg text-white relative overflow-hidden text-center">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-[40px] pointer-events-none"></div>
                      <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">Setoran Mutasi Bank</p>
                      <p className="text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                        <PlusCircle className="w-6 h-6 opacity-80"/> {formatRupiah(selectedDeposit.amount)}
                      </p>
                    </div>

                    {/* Tombol Action Approve/Reject */}
                    {selectedDeposit.status === "Menunggu Verifikasi" && (
                      <div className="flex gap-3 pt-2">
                        <AdminButton onClick={() => { if(confirm("Tolak bukti transfer Top-Up ini?")) { handleVerifyDeposit(selectedDeposit.id, "Ditolak"); } }} disabled={isProcessing} variant="danger" className="w-14 shrink-0 shadow-lg" title="Tolak Pengajuan">
                          <XCircle className="w-5 h-5" />
                        </AdminButton>
                        <AdminButton onClick={() => handleVerifyDeposit(selectedDeposit.id, "Disetujui")} disabled={isProcessing} variant="success" className="flex-1 shadow-lg shadow-emerald-600/30 text-[13px]">
                          <CheckCircle2 className="w-5 h-5 mr-2" /> TERIMA & TAMBAH SALDO
                        </AdminButton>
                      </div>
                    )}
                  </div>

                  {/* KANAN: BUKTI BAYAR */}
                  <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[2rem] p-6 border border-slate-800 shadow-xl text-white relative overflow-hidden group">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><ImageIcon className="w-4 h-4 text-emerald-400" /> Cek Bukti Transfer</h4>
                      {selectedDeposit.proofUrl ? (
                        <div className="bg-black/50 p-2 rounded-xl border border-white/10 flex items-center justify-center h-[350px] relative overflow-hidden">
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img src={selectedDeposit.proofUrl} alt="Bukti Transfer" className="w-full h-full object-contain rounded-lg transition-transform duration-500 group-hover:scale-105" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                              <a href={selectedDeposit.proofUrl} target="_blank" rel="noopener noreferrer" className="bg-white/20 hover:bg-white text-white hover:text-slate-900 border border-white/40 px-5 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 transition-all">
                                <Eye className="w-4 h-4" /> Buka Full Screen
                              </a>
                           </div>
                        </div>
                      ) : (
                        <div className="bg-white/5 h-[350px] rounded-xl border border-dashed border-white/20 text-center flex flex-col items-center justify-center">
                          <XCircle className="w-8 h-8 text-white/20 mx-auto mb-2" />
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">User Belum Unggah Bukti</p>
                        </div>
                      )}
                    </div>
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