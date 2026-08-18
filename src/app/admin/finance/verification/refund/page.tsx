"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, XCircle, Eye, User, FileText, Banknote, 
  Undo2, Upload, X, Search, Filter, ArrowUpDown, 
  Activity, ShieldAlert, ArrowLeft, ArrowRight,
  AlertCircle
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, serverTimestamp, arrayUnion, writeBatch } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";
import { FirebaseTimestamp } from "@/types/order";

// KODE DIBERSIHKAN: Import langsung dari Single Source of Truth
import { RefundRequest } from "@/types/finance"; 

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getAdminUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
    return path.replace(/^\/admin/, '') || '/';
  }
  return path; 
};

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

// KODE DIPERBAIKI: Menambahkan dukungan native Date
const formatDate = (timestamp: FirebaseTimestamp | Date) => {
  const millis = getMillis(timestamp);
  if (!millis) return "-";
  return new Date(millis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Rose Accent)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(225,29,72,0.1)] transition-all duration-300 rounded-2xl";

export default function VerifyRefundPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Pending"); 
  const [sortOrder, setSortOrder] = useState("newest");
  
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Modal State
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refundProofFile, setRefundProofFile] = useState<File | null>(null);
  const [refundProofPreview, setRefundProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const qRefunds = query(collection(db, "refund_requests"), orderBy("createdAt", "desc"));
    const unsubRefunds = onSnapshot(qRefunds, 
      (snapshot) => {
        setRefunds(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RefundRequest)));
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching refunds:", error);
        showToast("error", "Gagal memuat daftar pengajuan refund.");
        setIsLoading(false);
      }
    );
    return () => unsubRefunds();
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const processedRefunds = useMemo(() => {
    let result = [...refunds];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => (r.clientName || "").toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.orderId.toLowerCase().includes(q));
    }
    
    if (filterStatus !== "All") result = result.filter(r => r.status === filterStatus);
    
    result.sort((a, b) => {
      const tA = getMillis(a.createdAt);
      const tB = getMillis(b.createdAt);
      const cA = a.nominal;
      const cB = b.nominal;
      if (sortOrder === "newest") return tB - tA;
      if (sortOrder === "oldest") return tA - tB;
      if (sortOrder === "highest_value") return cB - cA;
      return 0;
    });
    return result;
  }, [refunds, searchQuery, filterStatus, sortOrder]);

  const handleRefundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRefundProofFile(file);
      setRefundProofPreview(URL.createObjectURL(file));
    }
  };

  const handleVerifyRefund = async (reqId: string, action: "Approve" | "Reject") => {
    setIsProcessing(true);
    try {
      const targetReq = refunds.find(r => r.id === reqId);
      if (!targetReq) throw new Error("Data Refund tidak ditemukan");

      let finalProofUrl = "";

      if (action === "Approve") {
        if (!refundProofFile) {
          showToast("error", "Harap unggah bukti transfer pengembalian dana kepada klien.");
          setIsProcessing(false);
          return;
        }

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (cloudName && uploadPreset) {
          const imageFormData = new FormData();
          imageFormData.append("file", refundProofFile);
          imageFormData.append("upload_preset", uploadPreset);

          const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST", body: imageFormData,
          });

          const cloudData = await cloudinaryRes.json();
          if (cloudData.secure_url) {
            finalProofUrl = cloudData.secure_url;
          } else {
            throw new Error("Gagal mengunggah bukti refund.");
          }
        }
      }

      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();
      const batch = writeBatch(db);

      const orderRef = doc(db, "orders", targetReq.orderId);
      const refundRef = doc(db, "refund_requests", reqId);

      if (action === "Approve") {
        batch.update(refundRef, { status: "Approved", proofUrl: finalProofUrl, processedAt: serverTimestamp() });
        batch.update(orderRef, {
          paymentStatus: "Refund Selesai",
          trackingHistory: arrayUnion({
            id: uniqueId,
            status: "Refund Selesai",
            date: logDate,
            description: "Pengembalian dana (Refund) telah berhasil ditransfer ke rekening Anda oleh Tim Finance.",
            location: "Pusat Keuangan Flash Global"
          })
        });
        await batch.commit();
        showToast("success", "Refund disetujui! Bukti transfer telah terkirim ke Klien.");
      } else {
        batch.update(refundRef, { status: "Rejected", processedAt: serverTimestamp() });
        batch.update(orderRef, {
          paymentStatus: "Refund Ditolak",
          trackingHistory: arrayUnion({
            id: uniqueId,
            status: "Refund Ditolak",
            date: logDate,
            description: "Pengajuan Refund ditolak oleh Tim Finance. Harap hubungi Customer Service untuk info lanjut.",
            location: "Pusat Keuangan Flash Global"
          })
        });
        await batch.commit();
        showToast("error", "Pengajuan Refund telah ditolak.");
      }
    } catch (error) {
      console.error("Gagal verifikasi Refund:", error);
      showToast("error", "Terjadi kesalahan sistem saat memproses Refund.");
    } finally {
      setIsProcessing(false);
      setSelectedRefund(null);
      setRefundProofFile(null);
      setRefundProofPreview(null);
    }
  };

  const pendingCount = refunds.filter(r => r.status === "Pending").length;

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Validasi Keuangan ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
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
          <button onClick={() => router.push(getAdminUrl("/admin/finance/verification"))} className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
              Verifikasi Pengembalian Dana
            </h1>
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Klaim Asuransi / Batal (Refund)</p>
          </div>
        </div>
      </div>

      {/* STATS BENTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-rose-500 to-rose-700 border border-rose-800 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(225,29,72,0.3)] relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-[40px] opacity-50 transition-opacity" />
          <span className="text-rose-100 text-[11px] font-bold uppercase tracking-widest relative z-10 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5"/> Menunggu Transfer
          </span>
          <p className="text-4xl font-black text-white mt-3 relative z-10 tracking-tight">{pendingCount} <span className="text-sm font-medium opacity-80 uppercase tracking-widest">Tiket</span></p>
        </div>
        
        {/* Helper Banner */}
        <div className={`${glassPanel} rounded-2xl p-6 md:col-span-2 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
            <Undo2 className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">SOP Verifikasi Refund</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-lg">
              Setiap pengajuan refund wajib disertai pengunggahan bukti transfer balikan (<span className="font-bold text-slate-700">Struk Bank</span>) sebagai bukti otentik pengembalian dana telah dilakukan.
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
              placeholder="Cari ID Refund, AWB, atau nama Klien..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-rose-600 focus:ring-[3px] focus:ring-rose-600/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-rose-600 focus:ring-[3px] focus:ring-rose-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                <option value="All">Semua Status Refund</option>
                <option value="Pending">Antrean Transfer (Pending)</option>
                <option value="Approved">Selesai Ditransfer (Approved)</option>
                <option value="Rejected">Pengajuan Ditolak (Rejected)</option>
              </select>
            </div>
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-rose-600 focus:ring-[3px] focus:ring-rose-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                <option value="newest">Pengajuan Terbaru</option>
                <option value="oldest">Pengajuan Terlama</option>
                <option value="highest_value">Nominal Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        {/* DAFTAR REFUND (LIST / ROW LAYOUT) */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-rose-600 animate-pulse" />
              <p>Membaca Jurnal Keuangan...</p>
            </div>
          ) : processedRefunds.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <Undo2 className="w-16 h-16 mb-4 opacity-20 text-slate-500" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Semua Pengajuan Beres!</h4>
              <p className="font-medium text-slate-500">Tidak ada pengajuan refund yang membutuhkan eksekusi.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {processedRefunds.map((r, idx) => {
                  const isApproved = r.status === "Approved";
                  const isRejected = r.status === "Rejected";

                  return (
                    <motion.div 
                      key={r.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      transition={{ delay: idx * 0.03 }} 
                      className={`${glassRow} p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 group cursor-pointer`}
                      onClick={() => setSelectedRefund(r)}
                    >
                      
                      {/* KOLOM 1: Info Klien & ID */}
                      <div className="flex items-center gap-4 w-full md:w-1/3">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border", isApproved ? "bg-emerald-50 text-emerald-600 border-emerald-200" : isRejected ? "bg-red-50 text-red-600 border-red-200" : "bg-rose-50 text-rose-600 border-rose-200")}>
                          <Undo2 className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-0.5">#{r.id.substring(0,8)}</p>
                          <h2 className="text-sm font-black text-slate-900 truncate flex items-center gap-1.5" title={r.clientName}><User className="w-3.5 h-3.5 text-rose-500"/> {r.clientName || "Klien"}</h2>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">{formatDate(r.createdAt)}</p>
                        </div>
                      </div>

                      {/* KOLOM 2: Status & AWB (Tengah) */}
                      <div className="w-full md:w-1/3 flex flex-col items-start md:items-center gap-1.5 border-t border-slate-100 pt-4 md:pt-0 md:border-t-0">
                        <AdminBadge variant={isApproved ? "success" : isRejected ? "danger" : "warning"} className="text-[10px] whitespace-nowrap px-3 shadow-sm">
                          {r.status}
                        </AdminBadge>
                        <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-bold font-mono tracking-widest">
                          AWB: {r.orderId.substring(0,8).toUpperCase()}
                        </span>
                      </div>

                      {/* KOLOM 3: Nominal & Action */}
                      <div className="w-full md:w-1/3 flex items-center justify-between md:justify-end gap-5">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nominal Refund</p>
                          <p className="text-xl font-black text-rose-600 tracking-tight flex items-center justify-end gap-1.5"><Banknote className="w-4 h-4"/> {formatRupiah(r.nominal)}</p>
                        </div>
                        <AdminButton 
                          size="icon" 
                          variant="outline" 
                          className="h-10 w-10 shrink-0 text-slate-400 group-hover:text-rose-600 group-hover:border-rose-300 group-hover:bg-rose-50 rounded-xl"
                          onClick={(e) => { e.stopPropagation(); setSelectedRefund(r); }}
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

      {/* MODAL EKSEKUSI REFUND (FULLSCREEN LIGHBOX) */}
      <AnimatePresence>
        {selectedRefund && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !isProcessing && setSelectedRefund(null)}></motion.div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-5xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] overflow-hidden border border-white">
              
              <div className="bg-white/50 border-b border-white p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Undo2 className="w-6 h-6 text-rose-600" /> Detail Pengajuan Refund</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest font-bold">ID: #{selectedRefund.id}</p>
                </div>
                <button onClick={() => !isProcessing && setSelectedRefund(null)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors flex items-center justify-center shadow-sm"><X className="w-5 h-5" /></button>
              </div>

              <div className="overflow-y-auto p-6 md:p-8 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* KIRI: DETAIL */}
                  <div className="space-y-6">
                    <div className="bg-white/60 rounded-2xl p-6 border border-white shadow-sm space-y-5">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Klien Pengaju</p>
                          <p className="text-sm font-black text-slate-900 uppercase">{selectedRefund.clientName || "Klien"}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Alasan Pembatalan / Klaim</p>
                        <p className="font-medium text-slate-700 bg-rose-50/50 p-4 rounded-xl border border-rose-100 text-sm leading-relaxed shadow-sm">
                          {selectedRefund.alasan}
                        </p>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Rekening Tujuan Refund</p>
                        <p className="font-bold text-slate-900 text-base">{selectedRefund.rekeningTujuan}</p>
                      </div>
                    </div>

                    {/* Final Nominal Highlight */}
                    <div className="bg-gradient-to-br from-rose-600 to-rose-800 rounded-2xl p-6 border border-rose-900 shadow-lg text-white relative overflow-hidden text-center">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-[40px] pointer-events-none"></div>
                      <p className="text-[10px] font-black text-rose-200 uppercase tracking-widest mb-1">Nominal Harus Dikembalikan</p>
                      <p className="text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                        {formatRupiah(selectedRefund.nominal)}
                      </p>
                    </div>

                    {/* Tombol Action Approve/Reject */}
                    {selectedRefund.status === "Pending" && (
                      <div className="flex gap-3 pt-2">
                        <AdminButton onClick={() => { if(confirm("Tolak pengajuan refund ini?")) { handleVerifyRefund(selectedRefund.id, "Reject"); } }} disabled={isProcessing} variant="danger" className="w-14 shrink-0 shadow-lg" title="Tolak Pengajuan">
                          <XCircle className="w-5 h-5" />
                        </AdminButton>
                        <AdminButton onClick={() => handleVerifyRefund(selectedRefund.id, "Approve")} disabled={isProcessing || !refundProofFile} variant="success" className="flex-1 shadow-lg shadow-emerald-600/30 text-[13px]">
                          <CheckCircle2 className="w-5 h-5 mr-2" /> TRANSFER & SELESAIKAN REFUND
                        </AdminButton>
                      </div>
                    )}
                  </div>

                  {/* KANAN: UPLOAD BUKTI BAYAR */}
                  <div className="bg-white/60 rounded-2xl p-6 border border-white shadow-sm h-full flex flex-col min-h-[450px]">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4">
                      {selectedRefund.status === "Pending" ? <Upload className="w-4 h-4 text-emerald-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />} 
                      {selectedRefund.status === "Pending" ? "Unggah Bukti Transfer Balik" : "Bukti Pengembalian Dana"}
                    </h4>
                    
                    {selectedRefund.status === "Pending" ? (
                      <div className="flex-1 flex flex-col justify-center">
                        <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-emerald-50/50 h-[350px] relative overflow-hidden group shadow-sm hover:shadow-md">
                          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleRefundFileChange} className="hidden" />
                          
                          <AnimatePresence mode="wait">
                            {refundProofPreview ? (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-slate-900 p-2 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={refundProofPreview} alt="Bukti Refund" className="max-h-full rounded-xl object-contain shadow-lg" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                  <span className="bg-white/20 hover:bg-white text-white hover:text-slate-900 border border-white/40 font-bold px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 transform transition-all text-xs">
                                    <Upload className="w-4 h-4" /> Ganti Gambar Bukti
                                  </span>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 group-hover:border-emerald-200 transition-all duration-300">
                                  <Upload className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-700">Pilih atau Tarik Struk Kesini</p>
                                  <p className="text-[10px] text-slate-500 mt-1.5 font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                                    Format JPG/PNG. Wajib diunggah sebelum dapat menyelesaikan refund.
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </label>
                      </div>
                    ) : (
                      selectedRefund.proofUrl ? (
                        <div className="bg-slate-900 p-2 rounded-[1.5rem] border border-slate-800 flex items-center justify-center h-[350px] relative group overflow-hidden shadow-inner">
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img src={selectedRefund.proofUrl} alt="Bukti Transfer Refund" className="w-full h-full object-contain rounded-xl transition-transform duration-500 group-hover:scale-105" />
                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                              <a href={selectedRefund.proofUrl} target="_blank" rel="noopener noreferrer" className="bg-white/20 hover:bg-white text-white hover:text-slate-900 border border-white/40 px-5 py-3 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 transition-all">
                                <Eye className="w-4 h-4" /> Buka Full Screen
                              </a>
                           </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-10 rounded-[1.5rem] border border-dashed border-slate-300 text-center flex-1 flex flex-col justify-center">
                          <XCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-500">Tidak ada bukti setoran terlampir.</p>
                        </div>
                      )
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