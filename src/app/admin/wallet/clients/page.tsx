"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Search, ArrowUpCircle, 
  ArrowDownCircle, Building2, CheckCircle2, 
  AlertCircle, ShieldAlert, BarChart3, 
  ArrowUpDown, Activity, Wallet, History, Mail
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, serverTimestamp, increment, addDoc, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { cn } from "@/lib/utils";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// IMPORT GLOBAL TYPES
interface B2BWalletData {
  id: string;
  name: string;
  companyName: string;
  email: string;
  depositBalance: number;
}

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Blue Accent untuk B2B)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(59,130,246,0.15)] transition-all duration-300 rounded-2xl";

export default function AdminWalletClientsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [b2bClients, setB2bClients] = useState<B2BWalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"highest" | "lowest" | "name_asc">("highest");
  
  const [showMutasiModal, setShowMutasiModal] = useState(false);
  const [mutasiType, setMutasiType] = useState<"topup" | "withdraw">("topup");
  const [selectedEntity, setSelectedEntity] = useState<B2BWalletData | null>(null);
  const [mutasiAmount, setMutasiAmount] = useState<number | "">("");

  const [toast, setToast] = useState<{ type: "success" | "error", msg: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const b2bQ = query(collection(db, "users"), where("role", "==", "b2b"));
      const b2bSnap = await getDocs(b2bQ);
      
      const b2bList = b2bSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.picName || data.displayName || "PIC Tidak Diketahui",
          companyName: data.companyName || "Perusahaan Anonim",
          email: data.email || "-",
          depositBalance: data.depositBalance || 0 
        };
      });

      setB2bClients(b2bList);
    } catch (error) {
      console.error("Gagal menarik data dompet klien:", error);
      showToast("error", "Gagal memuat data dari database.");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || !mutasiAmount) return;

    const amount = Number(mutasiAmount);
    if (amount <= 0) {
      showToast("error", "Nominal harus lebih dari 0.");
      return;
    }

    const currentBalance = selectedEntity.depositBalance || 0;

    if (mutasiType === "withdraw" && amount > currentBalance) {
      showToast("error", "Saldo deposit klien tidak mencukupi untuk ditarik.");
      return;
    }

    setIsProcessing(true);
    try {
      const entityRef = doc(db, "users", selectedEntity.id);
      const valueChange = mutasiType === "topup" ? amount : -amount;
      
      await updateDoc(entityRef, {
        depositBalance: increment(valueChange),
        lastMutasi: serverTimestamp() 
      });

      await addDoc(collection(db, "wallet_logs"), {
        entityId: selectedEntity.id,
        entityName: selectedEntity.companyName,
        entityType: "B2B",
        type: mutasiType,
        amount: amount,
        timestamp: serverTimestamp(),
        adminNote: `Manual ${mutasiType} Deposit B2B by Admin`
      });

      showToast("success", `Berhasil ${mutasiType === 'topup' ? 'Setor Deposit' : 'Tarik Dana'} Rp ${amount.toLocaleString('id-ID')}`);
      setShowMutasiModal(false);
      setMutasiAmount("");
      fetchData(); 
    } catch (error) {
      console.error("Gagal mutasi:", error);
      showToast("error", "Transaksi gagal diproses.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processedData = useMemo(() => {
    let result = [...b2bClients];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.companyName || "").toLowerCase().includes(q) || 
        (item.email || "").toLowerCase().includes(q) || 
        (item.name || "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const balA = a.depositBalance || 0;
      const balB = b.depositBalance || 0;
      
      if (sortOrder === "highest") return balB - balA;
      if (sortOrder === "lowest") return balA - balB;
      return (a.companyName || "").localeCompare((b.companyName || ""));
    });

    return result;
  }, [b2bClients, searchQuery, sortOrder]);

  const totalBalance = processedData.reduce((sum, item) => sum + (item.depositBalance || 0), 0);
  const criticalLimit = 100000; // Limit kritis B2B 100rb
  const lowBalanceCount = processedData.filter(item => (item.depositBalance || 0) < criticalLimit).length;
  
  const topEntities = [...processedData].sort((a, b) => (b.depositBalance || 0) - (a.depositBalance || 0)).slice(0, 5);
  const maxChartValue = Math.max(...topEntities.map(e => e.depositBalance || 0), 10000);

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-blue-600 animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menghimpun Buku Kas Korporat...</p>
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

      {/* HEADER NAV */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin/wallet")} className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-white transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Buku Deposit B2B (Korporat)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 font-medium flex items-center gap-2">
              Manajemen saldo prabayar Klien B2B. <AdminBadge variant="brand" className="bg-blue-100 text-blue-700 border-blue-200">Corporate Finance</AdminBadge>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* KIRI: STATS & ENTERPRISE CHART (Sticky Column) */}
        <div className="xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(37,99,235,0.2)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400 rounded-full blur-[80px] opacity-30 pointer-events-none" />
            <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2 relative z-10 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Total Deposit Mengendap
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white font-mono mt-2 drop-shadow-md relative z-10">
              {formatRupiah(totalBalance)}
            </h2>
            <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center relative z-10">
              <div>
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Total Korporat</p>
                <p className="text-white font-black text-lg">{processedData.length}</p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Saldo Kritis (&lt;{criticalLimit/1000}k)</p>
                <p className="text-red-300 font-black text-lg">{lowBalanceCount}</p>
              </div>
            </div>
          </div>

          <div className={`${glassPanel} rounded-[2rem] p-6 border border-slate-200 shadow-sm`}>
            <h3 className="text-[11px] font-black text-slate-500 flex items-center gap-2 mb-6 uppercase tracking-widest border-b border-white/60 pb-3">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Top 5 Konsentrasi Deposit
            </h3>
            {topEntities.length === 0 ? (
              <div className="text-center text-xs text-slate-400 font-bold py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">Belum ada data deposit.</div>
            ) : (
              <div className="space-y-4">
                {topEntities.map((entity, i) => {
                  const val = entity.depositBalance || 0;
                  const name = entity.companyName || "Perusahaan";
                  const percent = Math.max((val / maxChartValue) * 100, 2); 
                  return (
                    <div key={i} className="space-y-1.5 group">
                      <div className="flex justify-between text-xs font-bold items-end">
                        <span className="text-slate-700 truncate pr-2 max-w-[150px]">{name}</span>
                        <span className="text-blue-600 font-mono tracking-tight">{formatRupiah(val)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                          className="h-full rounded-full bg-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* KANAN: TABEL UTAMA (ROW LAYOUT) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
            <div className="relative w-full lg:w-1/2">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <input 
                type="text" 
                placeholder="Cari nama PT atau email klien..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
              />
            </div>
            <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
              <div className="relative flex-1 lg:flex-none">
                <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value as "highest" | "lowest" | "name_asc")} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                  <option value="highest">Deposit Tertinggi</option>
                  <option value="lowest">Deposit Terendah</option>
                  <option value="name_asc">Urutkan Nama PT (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="min-h-[500px] flex flex-col gap-4">
            {processedData.length === 0 ? (
              <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
                <Building2 className="w-16 h-16 mb-4 opacity-20 text-blue-600" />
                <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Tidak Ada Data Klien B2B</h4>
                <p className="font-medium text-slate-500">Klien B2B yang diverifikasi akan muncul di sini.</p>
              </div>
            ) : (
              <AnimatePresence>
                {processedData.map((item, idx) => {
                  const balance = item.depositBalance || 0;
                  const isCritical = balance < criticalLimit;

                  return (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.03 }}
                      className={`${glassRow} p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group border border-white`}
                    >
                      <div className="flex items-center gap-4 w-full lg:w-[40%]">
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center border border-blue-100 shrink-0 shadow-sm">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className="overflow-hidden">
                          <h2 className="text-sm font-black text-slate-900 truncate tracking-tight" title={item.companyName}>{item.companyName}</h2>
                          <p className="text-[11px] font-bold text-slate-500 mt-0.5 truncate flex items-center gap-1.5"><Mail className="w-3 h-3"/> {item.email}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1.5">PIC: {item.name}</p>
                        </div>
                      </div>

                      <div className="w-full lg:w-[30%] flex flex-col items-start lg:items-end gap-1 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Deposit Tersedia</p>
                        <p className={cn("text-xl font-black tracking-tight font-mono", isCritical ? "text-red-600" : "text-blue-600")}>
                          {formatRupiah(balance)}
                        </p>
                        {isCritical && (
                          <span className="text-[9px] text-red-600 font-bold uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3"/> Menipis
                          </span>
                        )}
                      </div>

                      <div className="w-full lg:w-[30%] flex items-center justify-start lg:justify-end gap-2 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0">
                        <AdminButton 
                          size="sm" variant="outline" 
                          onClick={() => { setSelectedEntity(item); setMutasiType("topup"); setShowMutasiModal(true); }}
                          className="h-10 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm font-bold w-full lg:w-auto"
                        >
                          <ArrowUpCircle className="w-4 h-4 mr-1.5" /> Tambah Deposit
                        </AdminButton>
                        <AdminButton 
                          size="sm" variant="outline" 
                          onClick={() => { setSelectedEntity(item); setMutasiType("withdraw"); setShowMutasiModal(true); }}
                          className="h-10 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm font-bold w-full lg:w-auto"
                        >
                          <ArrowDownCircle className="w-4 h-4 mr-1.5" /> Tarik / Potong
                        </AdminButton>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MODAL: MUTASI SALDO MANUAL */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showMutasiModal && selectedEntity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowMutasiModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1.5 ${mutasiType === 'topup' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
              
              <div className="p-6 md:p-8 flex items-center gap-4 mb-2 border-b border-slate-200 bg-white/50">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${mutasiType === 'topup' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {mutasiType === 'topup' ? `Setor Deposit Klien` : 'Potong Deposit Manual'}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest truncate max-w-[200px]">
                    PT: {selectedEntity.companyName}
                  </p>
                </div>
              </div>

              <div className="p-6 md:p-8 pt-2">
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 mb-6 flex justify-between items-center shadow-inner">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sisa Deposit Saat Ini</span>
                  <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                    {formatRupiah(selectedEntity.depositBalance || 0)}
                  </span>
                </div>

                <form onSubmit={handleMutasi} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">Masukkan Nominal (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                      <input 
                        type="number" 
                        required min="1000"
                        value={mutasiAmount} 
                        onChange={(e) => setMutasiAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                        className={`w-full h-14 pl-12 pr-4 bg-white border-2 rounded-xl text-slate-900 text-xl font-black font-mono outline-none transition-all shadow-sm ${mutasiType === 'topup' ? 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50' : 'border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-50'}`} 
                        placeholder="0" 
                      />
                    </div>
                    {mutasiType === "topup" && (
                      <p className="text-[10px] text-blue-600 font-bold mt-2 text-center">Dana ini akan digunakan sebagai saldo Prabayar / Potongan Tagihan Otomatis.</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-slate-100">
                    <AdminButton type="button" variant="outline" onClick={() => setShowMutasiModal(false)} className="h-12 flex-1 border-slate-300 font-bold bg-slate-50">Batal</AdminButton>
                    <AdminButton type="submit" disabled={isProcessing} className={`h-12 flex-1 font-bold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50 ${mutasiType === 'topup' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30' : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'}`}>
                      {isProcessing ? "Memproses..." : "Konfirmasi Mutasi"}
                    </AdminButton>
                  </div>
                </form>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}