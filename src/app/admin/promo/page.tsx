"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Ticket, Plus, Search, CheckCircle2, 
  AlertCircle, Trash2, Power, PowerOff, 
  CalendarClock, Percent, DollarSign, Activity,
  Globe2, Truck, User, ShieldAlert, X, Copy, Check, ArrowUpDown
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { Promo } from "@/types/finance";
import { FirebaseTimestamp } from "@/types/order";

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
const parsePromoDate = (ts: FirebaseTimestamp | Date | string | number | null | undefined): Date => {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'object' && ts !== null) {
    const objTs = ts as Extract<FirebaseTimestamp, object>;
    if (typeof objTs.toDate === 'function') return objTs.toDate();
    if (typeof objTs.seconds === 'number') return new Date(objTs.seconds * 1000);
  }
  return new Date(ts as string | number);
};

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Gold Accent)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(197,160,89,0.15)] transition-all duration-300 rounded-2xl";

export default function AdminPromoPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterService, setFilterService] = useState("all");
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [newPromo, setNewPromo] = useState<{
    code: string;
    type: "percentage" | "fixed";
    value: number | "";
    quota: number | "";
    expiresAt: string;
    targetService: "all" | "domestik" | "forwarding";
    targetUser: string;
  }>({
    code: "",
    type: "percentage",
    value: "",
    quota: "",
    expiresAt: "",
    targetService: "all",
    targetUser: "", // Kosong berarti untuk semua user
  });

  const fetchPromos = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "promos"));
      
      // KODE DIBERSIHKAN: Safe typing untuk data Firestore
      const promosList: Promo[] = snap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          ...data
        } as unknown as Promo;
      });
      
      promosList.sort((a, b) => Number(b.isActive) - Number(a.isActive));
      setPromos(promosList);
    } catch (error) {
      console.error("Gagal menarik data promo:", error);
      showToast("error", "Gagal memuat daftar promo dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    showToast("success", `Kode promo ${code} disalin ke clipboard.`);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  // HANDLER: Tambah Promo Baru
  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newPromo.code.trim().toUpperCase();
    
    if (!code || !newPromo.value || !newPromo.quota || !newPromo.expiresAt) {
      showToast("error", "Semua kolom utama wajib diisi.");
      return;
    }

    setIsProcessing(true);
    try {
      const promoRef = doc(db, "promos", code);
      await setDoc(promoRef, {
        code: code,
        type: newPromo.type,
        value: Number(newPromo.value),
        quota: Number(newPromo.quota),
        usedCount: 0,
        expiresAt: newPromo.expiresAt,
        isActive: true,
        targetService: newPromo.targetService,
        targetUser: newPromo.targetUser.trim().toLowerCase() || "all",
        createdAt: serverTimestamp()
      });

      showToast("success", `Kode promo ${code} berhasil diterbitkan!`);
      setShowAddModal(false);
      setNewPromo({ code: "", type: "percentage", value: "", quota: "", expiresAt: "", targetService: "all", targetUser: "" });
      fetchPromos();
    } catch (error) {
      console.error("Gagal membuat promo:", error);
      showToast("error", "Gagal menyimpan promo baru.");
    } finally {
      setIsProcessing(false);
    }
  };

  // HANDLER: Toggle Status (Aktif/Nonaktif)
  const handleTogglePromo = async (id: string, currentStatus: boolean | undefined) => {
    try {
      await updateDoc(doc(db, "promos", id), { isActive: !currentStatus });
      showToast("success", `Status promo ${id} diperbarui.`);
      fetchPromos();
    } catch (error) {
      console.error("Toggle error:", error);
      showToast("error", "Gagal mengubah status promo.");
    }
  };

  // HANDLER: Hapus Promo
  const handleDeletePromo = async (id: string) => {
    if (!confirm(`Anda yakin ingin menghapus promo ${id} secara permanen?`)) return;
    try {
      await deleteDoc(doc(db, "promos", id));
      showToast("success", `Promo ${id} dihapus dari sistem.`);
      fetchPromos();
    } catch (error) {
      console.error("Delete error:", error);
      showToast("error", "Gagal menghapus promo.");
    }
  };

  // LOGIKA FILTER CERDAS DENGAN FALLBACK UNTUK DATA LAMA (USEMEMO DITARIK KE ATAS)
  const processedPromos = useMemo(() => {
    let result = [...promos];
    if (searchQuery) {
      result = result.filter(p => p.id.includes(searchQuery.toUpperCase()));
    }
    if (filterService !== "all") {
      // Fallback ke "all" jika targetService undefined pada dokumen Firestore lama
      result = result.filter(p => (p.targetService || "all") === filterService);
    }
    return result;
  }, [promos, searchQuery, filterService]);

  const activePromoCount = promos.filter(p => p.isActive && parsePromoDate(p.expiresAt) >= new Date() && p.usedCount < p.quota).length;
  const expiredCount = promos.filter(p => parsePromoDate(p.expiresAt) < new Date() || p.usedCount >= p.quota).length;

  // RBAC GUARD (Hanya Superadmin & Finance)
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Master Promo ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-[#C5A059] animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menarik Data Voucher...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 font-sans max-w-7xl mx-auto">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER MODUL (Apple Glassmorphism) */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] rounded-full blur-[100px] opacity-20 pointer-events-none" />
        <div className="relative z-10">
          <AdminBadge variant="gold" className="mb-4">Marketing & Sales Panel</AdminBadge>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Ticket className="w-8 h-8 text-[#C5A059]" />
            Master Promo & Voucher
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl font-medium leading-relaxed">
            Buat kode diskon spesial untuk Klien Domestik, Kargo Global, atau Khusus Klien VIP tertentu untuk meningkatkan volume transaksi.
          </p>
        </div>
        <AdminButton 
          onClick={() => setShowAddModal(true)} 
          className="bg-gradient-to-r from-[#DFBE7B] to-[#C5A059] hover:brightness-110 text-white font-bold h-12 px-6 shrink-0 relative z-10 w-full md:w-auto shadow-lg shadow-[#C5A059]/30 border border-[#A68345]"
        >
          <Plus className="w-4 h-4 mr-2" /> Buat Promo Baru
        </AdminButton>
      </div>

      {/* STATS BENTO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 border-slate-200 flex flex-col justify-center`}>
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Voucher Terbit</span>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 shadow-sm flex items-center justify-center"><Ticket className="w-5 h-5 text-slate-500" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-4 relative z-10 tracking-tight">{promos.length} <span className="text-sm font-medium font-sans opacity-80 uppercase tracking-widest text-slate-400">Kode</span></p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-emerald-600 to-emerald-800 border border-emerald-900 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(16,185,129,0.4)] relative overflow-hidden group flex flex-col justify-center">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-[40px] opacity-50 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-emerald-100 text-[11px] font-bold uppercase tracking-widest">Promo Siap Pakai (Aktif)</span>
            <div className="w-10 h-10 rounded-full bg-emerald-500/30 border border-emerald-400 shadow-sm flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white" /></div>
          </div>
          <p className="text-3xl font-black text-white mt-4 relative z-10 tracking-tight font-mono">{activePromoCount}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 border-slate-200 flex flex-col justify-center`}>
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Promo Kadaluarsa / Habis</span>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 shadow-sm flex items-center justify-center"><AlertCircle className="w-5 h-5 text-slate-400" /></div>
          </div>
          <p className="text-3xl font-black text-slate-400 mt-4 relative z-10 tracking-tight">{expiredCount}</p>
        </motion.div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* TOOLBAR FILTER & SEARCH */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari kode voucher (Misal: FLASH)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-[#C5A059] focus:ring-[3px] focus:ring-[#C5A059]/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium uppercase"
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
              <select 
                value={filterService} 
                onChange={(e) => setFilterService(e.target.value)}
                className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-[#C5A059] focus:ring-[3px] focus:ring-[#C5A059]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]"
              >
                <option value="all">Semua Layanan Global</option>
                <option value="domestik">Khusus Kargo Domestik</option>
                <option value="forwarding">Khusus Global Forwarding</option>
              </select>
            </div>
          </div>
        </div>

        {/* LIST ROW DATA PROMO */}
        <div className="min-h-[500px]">
          {processedPromos.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <Ticket className="w-16 h-16 mb-4 opacity-20 text-[#C5A059]" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Voucher Kosong</h4>
              <p className="font-medium text-slate-500">Belum ada kode promo yang cocok atau didaftarkan.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {processedPromos.map((promo, idx) => {
                  const promoDate = parsePromoDate(promo.expiresAt);
                  const isExpired = promoDate < new Date();
                  const isExhausted = promo.usedCount >= promo.quota;
                  
                  const safeTargetService = promo.targetService || "all";
                  const safeTargetUser = promo.targetUser || "all";
                  
                  // Status Visual Logic
                  let statusVariant: "success" | "danger" | "warning" | "default" = "success";
                  if (!promo.isActive) statusVariant = "default";
                  else if (isExpired) statusVariant = "danger";
                  else if (isExhausted) statusVariant = "warning";

                  return (
                    <motion.div 
                      key={promo.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      transition={{ delay: idx * 0.02 }} 
                      className={`${glassRow} p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 group border border-white`}
                    >
                      {/* Kolom 1: Kode Voucher & Info */}
                      <div className="flex items-start xl:items-center gap-4 w-full xl:w-[35%]">
                        <button 
                          onClick={() => handleCopyCode(promo.id)}
                          title="Salin Kode"
                          className="px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-950 rounded-xl shadow-md flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-all cursor-pointer group/copy"
                        >
                          {copiedCode === promo.id ? (
                            <Check className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <span className="font-mono font-black text-white tracking-widest flex items-center gap-2">
                              {promo.id} <Copy className="w-3 h-3 text-slate-400 group-hover/copy:text-white" />
                            </span>
                          )}
                        </button>
                        <div className="overflow-hidden space-y-1.5 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <AdminBadge variant={statusVariant} className="shadow-sm">
                              {!promo.isActive ? "Nonaktif" : isExpired ? "Kadaluarsa" : isExhausted ? "Kuota Habis" : "Aktif"}
                            </AdminBadge>
                            {safeTargetUser !== "all" && (
                              <AdminBadge variant="gold" className="flex items-center gap-1"><User className="w-3 h-3"/> VIP Only</AdminBadge>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 truncate">
                            {safeTargetService === "domestik" ? <Truck className="w-3.5 h-3.5"/> : safeTargetService === "forwarding" ? <Globe2 className="w-3.5 h-3.5"/> : <Ticket className="w-3.5 h-3.5"/>}
                            Berlaku Untuk: {safeTargetService}
                          </p>
                        </div>
                      </div>

                      {/* Kolom 2: Nominal / Persentase */}
                      <div className="w-full xl:w-[20%] flex flex-col items-start xl:items-center gap-1 border-t border-slate-100 pt-4 xl:pt-0 xl:border-t-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nilai Diskon</p>
                        <div className="flex items-center gap-1.5 font-black text-slate-900 text-lg font-mono">
                          {promo.type === "percentage" ? <Percent className="w-4 h-4 text-[#C5A059]" /> : <DollarSign className="w-4 h-4 text-emerald-500" />}
                          {promo.type === "percentage" ? `${promo.value}%` : `${formatRupiah(Number(promo.value))}`}
                        </div>
                      </div>

                      {/* Kolom 3: Kuota ProgressBar */}
                      <div className="w-full xl:w-[25%] flex flex-col gap-1.5">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Klaim Kuota</span>
                          <span className="text-[10px] font-black text-slate-700">{promo.usedCount} / {promo.quota}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((promo.usedCount / promo.quota) * 100, 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={cn("h-2.5 rounded-full", isExhausted ? "bg-amber-500" : "bg-[#C5A059]")} 
                          />
                        </div>
                        <span className={`text-[10px] font-bold mt-1 flex items-center gap-1.5 ${isExpired ? 'text-red-500' : 'text-slate-500'}`}>
                          <CalendarClock className="w-3.5 h-3.5" /> Exp: {promoDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Kolom 4: Action Buttons */}
                      <div className="w-full xl:w-[15%] flex items-center justify-end gap-2 border-t border-slate-100 pt-4 xl:pt-0 xl:border-t-0">
                        <AdminButton 
                          size="icon" 
                          variant="outline" 
                          className={cn("h-10 w-10 shrink-0 rounded-xl shadow-sm transition-colors", promo.isActive ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 border-amber-200' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 border-emerald-200')}
                          onClick={(e) => { e.stopPropagation(); handleTogglePromo(promo.id, promo.isActive); }}
                          title={promo.isActive ? "Matikah Promo" : "Nyalakan Promo"}
                        >
                          {promo.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </AdminButton>
                        <AdminButton 
                          size="icon" 
                          variant="outline" 
                          className="h-10 w-10 shrink-0 text-red-400 hover:text-red-600 border-red-200 hover:bg-red-50 rounded-xl shadow-sm transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleDeletePromo(promo.id); }}
                          title="Hapus Promo Permanen"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* ================================================================= */}
      {/* MODAL TAMBAH PROMO (REDESIGN) */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowAddModal(false)}></motion.div>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] shadow-2xl w-full max-w-2xl relative z-10 max-h-[90vh] flex flex-col overflow-hidden"
            >
              
              <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-200 bg-white/50 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] shadow-lg shadow-[#C5A059]/30 text-white border border-[#A68345]">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Buat Voucher Baru</h2>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Konfigurasi Diskon & Kuota</p>
                  </div>
                </div>
                <button onClick={() => !isProcessing && setShowAddModal(false)} className="text-slate-400 hover:text-red-500 bg-white border border-slate-200 p-2.5 rounded-full hover:bg-red-50 transition-colors shadow-sm"><X className="w-5 h-5"/></button>
              </div>

              <div className="overflow-y-auto p-6 md:p-8 flex-1 custom-scrollbar">
                <form id="promoForm" onSubmit={handleAddPromo} className="space-y-6">
                  
                  {/* Kode Promo */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kode Voucher (Unik)</label>
                    <input 
                      type="text" required 
                      value={newPromo.code} 
                      onChange={(e) => setNewPromo({...newPromo, code: e.target.value.toUpperCase().replace(/\s/g, "")})} 
                      className="w-full h-14 bg-slate-50 border border-slate-200 focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10 rounded-xl px-5 font-mono font-black text-xl tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 text-slate-900 transition-all outline-none" 
                      placeholder="Misal: MERDEKA2024" 
                    />
                  </div>
                  
                  {/* Tipe & Nilai */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipe Diskon</label>
                      <div className="relative">
                        <ArrowUpDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select 
                          value={newPromo.type} 
                          onChange={(e) => setNewPromo({...newPromo, type: e.target.value as "percentage" | "fixed"})} 
                          className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-4 pr-10 text-slate-900 text-sm font-bold outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10 appearance-none shadow-sm transition-all"
                        >
                          <option value="percentage">Persentase (%)</option>
                          <option value="fixed">Nominal (Rp)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Besaran / Nilai Diskon</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">{newPromo.type === 'percentage' ? '%' : 'Rp'}</span>
                        <input 
                          type="number" required 
                          value={newPromo.value} 
                          onChange={(e) => setNewPromo({...newPromo, value: e.target.value === "" ? "" : Number(e.target.value)})} 
                          className="w-full h-12 bg-white border border-slate-200 focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10 rounded-xl pl-10 pr-4 font-mono font-black text-lg text-slate-900 transition-all outline-none shadow-sm" 
                          placeholder={newPromo.type === 'percentage' ? "Cth: 15" : "Cth: 20000"} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Target & Kuota */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Layanan</label>
                      <div className="relative">
                        <ArrowUpDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select 
                          value={newPromo.targetService} 
                          onChange={(e) => setNewPromo({...newPromo, targetService: e.target.value as "all" | "domestik" | "forwarding"})} 
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 text-slate-900 text-sm font-bold outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10 appearance-none transition-all"
                        >
                          <option value="all">Bebas Semua Layanan</option>
                          <option value="domestik">Khusus Kargo Domestik</option>
                          <option value="forwarding">Khusus Global Forwarding</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Batas Kuota Total</label>
                      <input 
                        type="number" required 
                        value={newPromo.quota} 
                        onChange={(e) => setNewPromo({...newPromo, quota: e.target.value === "" ? "" : Number(e.target.value)})} 
                        placeholder="Maksimal klaim. Cth: 100" 
                        className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10 rounded-xl px-4 font-bold text-slate-900 transition-all outline-none" 
                      />
                    </div>
                  </div>

                  {/* Email & Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                        <span>Email Klien (VIP)</span> <span className="text-amber-500">Opsional</span>
                      </label>
                      <input 
                        type="email" 
                        value={newPromo.targetUser} 
                        onChange={(e) => setNewPromo({...newPromo, targetUser: e.target.value})} 
                        placeholder="Biarkan kosong untuk publik" 
                        className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10 rounded-xl px-4 font-medium text-sm text-slate-900 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tanggal Kadaluarsa</label>
                      <input 
                        type="date" required 
                        value={newPromo.expiresAt} 
                        onChange={(e) => setNewPromo({...newPromo, expiresAt: e.target.value})} 
                        className="w-full h-12 bg-slate-50 border border-slate-200 focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10 rounded-xl px-4 font-bold text-slate-900 transition-all outline-none cursor-pointer uppercase" 
                      />
                    </div>
                  </div>

                </form>
              </div>
              
              <div className="p-6 md:p-8 border-t border-slate-200 bg-slate-50 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <AdminButton type="button" variant="outline" onClick={() => setShowAddModal(false)} className="h-12 px-6 w-full sm:w-auto bg-white border-slate-300 font-bold">Batal</AdminButton>
                <AdminButton form="promoForm" type="submit" disabled={isProcessing} className="h-12 px-8 w-full sm:w-auto bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] border-[#A68345] text-white shadow-lg shadow-[#C5A059]/30 hover:brightness-110 font-bold transition-all">
                  {isProcessing ? "Menyimpan Data..." : "Terbitkan Kode Promo"}
                </AdminButton>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}