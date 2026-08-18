"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, ArrowUpCircle, ArrowDownCircle, UserCircle, 
  AlertCircle, BarChart3, ArrowUpDown, Activity, 
  Wallet, History, Lock, Unlock, FileText, Check
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, serverTimestamp, increment, addDoc, query, where, or } from "firebase/firestore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";
 
import { DriverData } from "@/types/admin";
import { WalletLog } from "@/types/finance"; 
import { FirebaseTimestamp } from "@/types/order";

const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(16,185,129,0.15)] transition-all duration-300 rounded-2xl";

const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

const getMillis = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined) => {
  if (!timestamp) return 0;
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp === 'object' && timestamp !== null) {
    const ts = timestamp as Extract<FirebaseTimestamp, object>;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    if (typeof ts.toDate === 'function') {
      const dateObj = ts.toDate() as Date;
      return dateObj.getTime();
    }
  }
  return new Date(timestamp as string | number).getTime();
};

interface DriverBalancesTabProps {
  currentUser: { uid?: string; role?: string; [key: string]: unknown } | null;
  showToast: (type: "success" | "error", msg: string) => void;
}

export default function DriverBalancesTab({ currentUser, showToast }: DriverBalancesTabProps) {
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"highest" | "lowest" | "name_asc">("highest");
  
  // MODAL MUTASI STATE
  const [showMutasiModal, setShowMutasiModal] = useState(false);
  const [mutasiType, setMutasiType] = useState<"topup" | "withdraw">("topup");
  const [selectedEntity, setSelectedEntity] = useState<DriverData | null>(null);
  const [mutasiAmount, setMutasiAmount] = useState<number | "">("");

  // MODAL LOGS STATE (RIWAYAT BUKU KAS)
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [driverLogs, setDriverLogs] = useState<WalletLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const driverSnap = await getDocs(collection(db, "driver_wallets"));
      const allWallets: DriverData[] = driverSnap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        return { id: d.id, ...data } as unknown as DriverData;
      });
      
      const driversList = allWallets.filter(d => d.partnerType !== "FleetVehicle" && d.partnerType !== "FleetDriver");
      setDrivers(driversList);
    } catch (error) {
      console.error("Gagal menarik data dompet:", error);
      showToast("error", "Gagal memuat data dari database.");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // HANDLER: MUTASI MANUAL
  const handleMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || !mutasiAmount) return;

    const amount = Number(mutasiAmount);
    if (amount <= 0) {
      showToast("error", "Nominal harus lebih dari 0.");
      return;
    }

    const currentBalance = selectedEntity.balance || 0;

    if (mutasiType === "withdraw" && amount > currentBalance) {
      showToast("error", "Saldo sopir tidak mencukupi untuk ditarik.");
      return;
    }

    setIsProcessing(true);
    try {
      const entityRef = doc(db, "driver_wallets", selectedEntity.id);
      const valueChange = mutasiType === "topup" ? amount : -amount;
      
      await updateDoc(entityRef, {
        balance: increment(valueChange),
        lastMutasi: serverTimestamp() 
      });

      await addDoc(collection(db, "wallet_logs"), {
        userId: selectedEntity.id,
        amount: amount,
        type: mutasiType === "topup" ? "deposit" : "deduction",
        description: `Manual ${mutasiType === "topup" ? "Top-Up" : "Penarikan"} oleh Admin`,
        recordedBy: currentUser?.uid || "Admin",
        createdAt: serverTimestamp()
      });

      showToast("success", `Berhasil ${mutasiType === 'topup' ? 'Top-Up' : 'Tarik'} Rp ${amount.toLocaleString('id-ID')}`);
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

  // HANDLER: LIHAT RIWAYAT BUKU KAS
  const handleViewLogs = async (driver: DriverData) => {
    setSelectedEntity(driver);
    setShowLogsModal(true);
    setIsLoadingLogs(true);
    setDriverLogs([]);

    try {
      const q = query(
        collection(db, "wallet_logs"), 
        or(
          where("userId", "==", driver.id),
          where("entityId", "==", driver.id)
        )
      );
      const snap = await getDocs(q);
      
      // 🚀 PERBAIKAN TS (Mencegah casting dari Record<string, unknown> ke WalletLog)
      const logs: WalletLog[] = snap.docs.map(d => {
        const raw = d.data();
        return {
          id: d.id,
          userId: String(raw.userId || raw.entityId || ""),
          amount: Number(raw.amount || 0),
          type: (raw.type as 'deposit' | 'deduction' | 'credit_payment' | 'refund') || 'deposit',
          description: String(raw.description || raw.adminNote || ""),
          recordedBy: raw.recordedBy ? String(raw.recordedBy) : undefined,
          createdAt: raw.createdAt || raw.timestamp
        };
      });
      
      logs.sort((a, b) => {
        const timeA = getMillis(a.createdAt);
        const timeB = getMillis(b.createdAt);
        return timeB - timeA;
      });

      setDriverLogs(logs);
    } catch (error) {
      console.error("Gagal memuat log mutasi:", error);
      showToast("error", "Gagal menarik riwayat transaksi.");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // HANDLER: SUSPEND / BLOKIR SOPIR
  const handleToggleSuspend = async (driver: DriverData) => {
    const isSuspended = (driver as unknown as Record<string, unknown>).isSuspended || false;
    const actionText = isSuspended ? "membuka blokir" : "memblokir";
    
    if (!confirm(`Yakin ingin ${actionText} sopir ${driver.name}?`)) return;

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, "driver_wallets", driver.id), {
        isSuspended: !isSuspended
      });
      showToast("success", `Sopir berhasil di-${isSuspended ? 'buka blokir' : 'blokir'}.`);
      fetchData();
    } catch (error) {
      console.error("Gagal suspend:", error);
      showToast("error", "Gagal merubah status sopir.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processedData = useMemo(() => {
    let result = [...drivers];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.name || "").toLowerCase().includes(q) || (item.phone || "").includes(q)
      );
    }

    result.sort((a, b) => {
      const balA = a.balance || 0;
      const balB = b.balance || 0;
      
      if (sortOrder === "highest") return balB - balA;
      if (sortOrder === "lowest") return balA - balB;
      return (a.name || "").localeCompare((b.name || ""));
    });

    return result;
  }, [drivers, searchQuery, sortOrder]);

  const totalBalance = processedData.reduce((sum, item) => sum + (item.balance || 0), 0);
  const criticalLimit = 15000;
  const lowBalanceCount = processedData.filter(item => (item.balance || 0) < criticalLimit).length;
  
  const topEntities = [...processedData].sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 5);
  const maxChartValue = Math.max(...topEntities.map(e => e.balance || 0), 10000);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-emerald-600 animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menghimpun Buku Kas Mitra...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* KIRI: STATS & ENTERPRISE CHART */}
        <div className="xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2 relative z-10 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Total Deposit Sopir Aktif
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white font-mono mt-2 drop-shadow-md relative z-10">
              {formatRupiah(totalBalance)}
            </h2>
            <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center relative z-10">
              <div>
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Total Mitra</p>
                <p className="text-white font-black text-lg">{processedData.length}</p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Saldo Kritis (&lt;{criticalLimit/1000}k)</p>
                <p className="text-red-400 font-black text-lg">{lowBalanceCount}</p>
              </div>
            </div>
          </div>

          <div className={`${glassPanel} rounded-[2rem] p-6 border border-slate-200 shadow-sm`}>
            <h3 className="text-[11px] font-black text-slate-500 flex items-center gap-2 mb-6 uppercase tracking-widest border-b border-white/60 pb-3">
              <BarChart3 className="w-4 h-4 text-emerald-600" /> Top 5 Konsentrasi Kas Mitra
            </h3>
            {topEntities.length === 0 ? (
              <div className="text-center text-xs text-slate-400 font-bold py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">Belum ada data saldo.</div>
            ) : (
              <div className="space-y-4">
                {topEntities.map((entity, i) => {
                  const val = entity.balance || 0;
                  const name = entity.name || "Sopir";
                  const percent = Math.max((val / maxChartValue) * 100, 2); 
                  return (
                    <div key={i} className="space-y-1.5 group">
                      <div className="flex justify-between text-xs font-bold items-end">
                        <span className="text-slate-700 truncate pr-2 max-w-[150px]">{name}</span>
                        <span className="text-emerald-600 font-mono tracking-tight">{formatRupiah(val)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                          className="h-full rounded-full bg-emerald-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* KANAN: TABEL UTAMA */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
            <div className="relative w-full lg:w-1/2">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <input 
                type="text" 
                placeholder="Cari nama sopir atau No. HP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-[3px] focus:ring-emerald-500/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
              />
            </div>
            <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
              <div className="relative flex-1 lg:flex-none">
                <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value as "highest" | "lowest" | "name_asc")} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-[3px] focus:ring-emerald-500/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                  <option value="highest">Saldo Tertinggi Teratas</option>
                  <option value="lowest">Saldo Terendah / Minus</option>
                  <option value="name_asc">Urutkan Nama (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="min-h-[500px] flex flex-col gap-4">
            {processedData.length === 0 ? (
              <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
                <UserCircle className="w-16 h-16 mb-4 opacity-20 text-emerald-600" />
                <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Tidak Ada Data Mitra</h4>
                <p className="font-medium text-slate-500">Sesuaikan filter atau hubungi divisi operasional.</p>
              </div>
            ) : (
              <AnimatePresence>
                {processedData.map((item, idx) => {
                  const balance = item.balance || 0;
                  const isCritical = balance < criticalLimit;
                  const isSuspended = (item as unknown as Record<string, unknown>).isSuspended || false;

                  return (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.03 }}
                      className={`${glassRow} p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group border border-white`}
                    >
                      <div className="flex items-center gap-4 w-full lg:w-[35%]">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 shadow-sm ${isSuspended ? 'bg-red-50 border-red-200 text-red-500' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                          {isSuspended ? <Lock className="w-6 h-6" /> : <UserCircle className="w-6 h-6" />}
                        </div>
                        <div className="overflow-hidden">
                          <h2 className={`text-sm font-black truncate tracking-tight ${isSuspended ? 'text-red-700 line-through opacity-70' : 'text-slate-900'}`}>{item.name}</h2>
                          <p className="text-[11px] font-bold text-slate-500 mt-0.5 font-mono">{item.phone}</p>
                          <div className="flex gap-2 items-center flex-wrap mt-1.5">
                            <AdminBadge variant={item.partnerType === "Vendor" ? "warning" : "info"} className="shadow-sm text-[8px] tracking-widest">
                              {item.partnerType === "Vendor" ? "Vendor / Fleet" : "Sopir Mandiri"}
                            </AdminBadge>
                            {isSuspended && (
                              <AdminBadge variant="danger" className="shadow-sm text-[8px] tracking-widest">
                                DIBLOKIR
                              </AdminBadge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full lg:w-[25%] flex flex-col items-start lg:items-end gap-1 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Saldo Prabayar</p>
                        <p className={cn("text-xl font-black tracking-tight font-mono", isCritical ? "text-red-600" : "text-emerald-600")}>
                          {formatRupiah(balance)}
                        </p>
                        {isCritical && !isSuspended && (
                          <span className="text-[9px] text-red-600 font-bold uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3"/> Kritis
                          </span>
                        )}
                      </div>

                      <div className="w-full lg:w-[40%] flex items-center justify-start lg:justify-end gap-2 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0">
                        <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200">
                          <button onClick={() => { setSelectedEntity(item); setMutasiType("topup"); setShowMutasiModal(true); }} className="px-3 h-8 rounded-lg font-bold text-[10px] uppercase tracking-widest text-emerald-700 hover:bg-white hover:shadow-sm transition-all flex items-center gap-1.5" title="Setor Dana">
                            <ArrowUpCircle className="w-3.5 h-3.5" /> Setor
                          </button>
                          <div className="w-px bg-slate-300 mx-1 my-1"></div>
                          <button onClick={() => { setSelectedEntity(item); setMutasiType("withdraw"); setShowMutasiModal(true); }} className="px-3 h-8 rounded-lg font-bold text-[10px] uppercase tracking-widest text-red-700 hover:bg-white hover:shadow-sm transition-all flex items-center gap-1.5" title="Tarik Saldo">
                            <ArrowDownCircle className="w-3.5 h-3.5" /> Tarik
                          </button>
                        </div>
                        
                        <AdminButton 
                          size="icon" variant="outline" 
                          onClick={() => handleViewLogs(item)}
                          className="h-10 w-10 shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm rounded-xl"
                          title="Lihat Riwayat & Komisi"
                        >
                          <History className="w-4 h-4" />
                        </AdminButton>

                        <AdminButton 
                          size="icon" variant="outline" 
                          onClick={() => handleToggleSuspend(item)}
                          disabled={isProcessing}
                          className={cn("h-10 w-10 shrink-0 shadow-sm rounded-xl transition-all", isSuspended ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" : "bg-white border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200")}
                          title={isSuspended ? "Buka Blokir Supir" : "Blokir Supir Sementara"}
                        >
                          {isSuspended ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
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
      {/* MODAL: RIWAYAT BUKU KAS (WALLET LOGS) */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showLogsModal && selectedEntity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLogsModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] shadow-2xl w-full max-w-2xl relative z-10 flex flex-col overflow-hidden max-h-[85vh]">
              
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-200 bg-white/50 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner bg-blue-50 border-blue-100 text-blue-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Riwayat Buku Kas</h2>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">{selectedEntity.name}</p>
                  </div>
                </div>
                <div className="text-right border-l pl-4 border-slate-200 hidden sm:block">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Saldo Aktif</p>
                  <p className="text-lg font-mono font-black text-slate-800">{formatRupiah(selectedEntity.balance || 0)}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
                {isLoadingLogs ? (
                  <div className="h-40 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Menarik Rekam Jejak...</p>
                  </div>
                ) : driverLogs.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center">
                    <History className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-500">Belum ada riwayat transaksi.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {driverLogs.map((log) => {
                      const rawType = String(log.type);
                      const isDeposit = rawType === "deposit" || rawType === "refund" || rawType === "topup";
                      
                      const millis = getMillis(log.createdAt);
                      const dateObj = millis ? new Date(millis) : new Date();
                      const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                      const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-blue-200 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", isDeposit ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600")}>
                              {isDeposit ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 tracking-tight leading-tight">{log.description}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{dateStr} • {timeStr}</p>
                            </div>
                          </div>
                          <div className={cn("text-lg font-black font-mono tracking-tight sm:text-right w-full sm:w-auto pl-13 sm:pl-0 border-t border-slate-100 pt-2 sm:pt-0 sm:border-t-0", isDeposit ? "text-emerald-600" : "text-red-600")}>
                            {isDeposit ? '+' : '-'}{formatRupiah(log.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 md:p-6 border-t border-slate-200 bg-white shrink-0 flex justify-between items-center">
                <div className="block sm:hidden">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Saldo Aktif</p>
                  <p className="text-sm font-mono font-black text-slate-800">{formatRupiah(selectedEntity.balance || 0)}</p>
                </div>
                <AdminButton variant="outline" onClick={() => setShowLogsModal(false)} className="w-full sm:w-auto h-11 border-slate-300 font-bold bg-slate-50 text-slate-700 px-8">
                  <Check className="w-4 h-4 mr-2" /> Tutup Riwayat
                </AdminButton>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* MODAL: MUTASI SALDO MANUAL */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showMutasiModal && selectedEntity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowMutasiModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1.5 ${mutasiType === 'topup' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              
              <div className="p-6 md:p-8 flex items-center gap-4 mb-2 border-b border-slate-200 bg-white/50">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${mutasiType === 'topup' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {mutasiType === 'topup' ? `Setor Kas (Top-Up)` : 'Tarik Saldo Manual'}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">
                    Mitra: {selectedEntity.name}
                  </p>
                </div>
              </div>

              <div className="p-6 md:p-8 pt-2">
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 mb-6 flex justify-between items-center shadow-inner">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sisa Saldo Kas</span>
                  <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                    {formatRupiah(selectedEntity.balance || 0)}
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
                        className={`w-full h-14 pl-12 pr-4 bg-white border-2 rounded-xl text-slate-900 text-xl font-black font-mono outline-none transition-all shadow-sm ${mutasiType === 'topup' ? 'border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50' : 'border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-50'}`} 
                        placeholder="0" 
                      />
                    </div>
                    {mutasiType === "topup" && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-2 text-center">Dana ini akan digunakan sebagai saldo Prabayar / Potongan Tagihan Otomatis.</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-slate-100">
                    <AdminButton type="button" variant="outline" onClick={() => setShowMutasiModal(false)} className="h-12 flex-1 border-slate-300 font-bold bg-slate-50 text-slate-700">Batal</AdminButton>
                    <AdminButton type="submit" disabled={isProcessing} className={`h-12 flex-1 font-bold text-white shadow-lg active:scale-95 transition-all disabled:opacity-50 ${mutasiType === 'topup' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'}`}>
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