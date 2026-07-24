"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Wallet, Search, ArrowUpCircle, 
  ArrowDownCircle, UserCircle, CheckCircle2, 
  AlertCircle, History, ShieldAlert, BarChart3, 
  Building2, ArrowUpDown, Activity, CreditCard, Banknote,
  Eye, Check, X
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, serverTimestamp, increment, addDoc, query, where, writeBatch } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";

// IMPORT GLOBAL TYPES
import { DriverData } from "@/types/admin";

interface B2BWalletData {
  id: string;
  name: string;
  companyName: string;
  email: string;
  depositBalance: number;
}

interface WithdrawalRequest {
  id: string;
  driverId: string;
  amount: number;
  status: "Pending" | "Disetujui" | "Ditolak";
  timestamp: unknown; 
  driverName?: string; 
  driverPhone?: string;
  partnerType?: string;
}

interface TopupRequest {
  id: string;
  userId: string;
  clientName: string;
  amount: number;
  proofUrl: string;
  status: "Pending" | "Disetujui" | "Ditolak";
  createdAt: unknown; 
  userType?: "Driver" | "B2B";
}

// 🚀 FUNGSI HELPER PENJINAK UNKNOWN TIMESTAMP
function parseUnknownDate(val: unknown): Date {
  if (!val) return new Date();
  
  // Jika val adalah objek Firestore Timestamp (memiliki fungsi toDate)
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as any).toDate === 'function') {
    return (val as any).toDate();
  }
  
  // Jika val adalah Date, Number, atau String
  if (val instanceof Date) return val;
  if (typeof val === 'number' || typeof val === 'string') return new Date(val);
  
  return new Date();
}

export default function AdminWalletPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [b2bClients, setB2bClients] = useState<B2BWalletData[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [topups, setTopups] = useState<TopupRequest[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"driver" | "client" | "withdraw" | "topup">("driver");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"highest" | "lowest" | "name_asc">("highest");
  
  const [showMutasiModal, setShowMutasiModal] = useState(false);
  const [mutasiType, setMutasiType] = useState<"topup" | "withdraw">("topup");
  const [selectedEntity, setSelectedEntity] = useState<DriverData | B2BWalletData | null>(null);
  const [mutasiAmount, setMutasiAmount] = useState<number | "">("");

  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error", msg: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const driverSnap = await getDocs(collection(db, "driver_wallets"));
      const allWallets = driverSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DriverData[];
      
      const driversList = allWallets.filter(d => d.partnerType !== "FleetVehicle" && d.partnerType !== "FleetDriver");

      const b2bQ = query(collection(db, "users"), where("role", "==", "b2b"));
      const b2bSnap = await getDocs(b2bQ);
      const b2bList = b2bSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.picName || data.displayName || "Klien B2B",
          companyName: data.companyName || "Perusahaan",
          email: data.email || "-",
          depositBalance: data.depositBalance || 0 
        };
      });

      const withdrawQ = query(collection(db, "withdrawal_requests"), where("status", "==", "Pending"));
      const withdrawSnap = await getDocs(withdrawQ);
      const withdrawList = withdrawSnap.docs.map(d => {
        const data = d.data();
        const driverInfo = allWallets.find(driver => driver.id === data.driverId);
        return {
          id: d.id,
          ...data,
          driverName: driverInfo?.name || "Nama Tidak Ditemukan",
          driverPhone: driverInfo?.phone || "-",
          partnerType: driverInfo?.partnerType || "Individual"
        } as WithdrawalRequest;
      });

      const topupQ = query(collection(db, "deposit_requests"), where("status", "==", "Pending"));
      const topupSnap = await getDocs(topupQ);
      const topupList = topupSnap.docs.map(d => {
        const data = d.data();
        const isDriver = allWallets.some(driver => driver.id === data.userId);
        return {
          id: d.id,
          ...data,
          userType: isDriver ? "Driver" : "B2B"
        } as TopupRequest;
      });

      setDrivers(driversList);
      setB2bClients(b2bList);
      setWithdrawals(withdrawList); 
      setTopups(topupList);
    } catch (error) {
      console.error("Gagal menarik data dompet:", error);
      showToast("error", "Gagal memuat data dari database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleReviewTopup = async (req: TopupRequest, action: "Disetujui" | "Ditolak") => {
    if (!confirm(`Yakin ingin menandai Top-Up sejumlah ${formatRupiah(req.amount)} ini sebagai ${action}?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);

      const reqRef = doc(db, "deposit_requests", req.id);
      batch.update(reqRef, { 
        status: action, 
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.uid || "Admin"
      });

      if (action === "Disetujui") {
        const collectionName = req.userType === "Driver" ? "driver_wallets" : "users";
        const balanceField = req.userType === "Driver" ? "balance" : "depositBalance";
        const entityRef = doc(db, collectionName, req.userId);

        batch.update(entityRef, {
          [balanceField]: increment(req.amount),
          lastMutasi: serverTimestamp()
        });

        const logRef = doc(collection(db, "wallet_logs"));
        batch.set(logRef, {
          entityId: req.userId,
          entityName: req.clientName,
          entityType: req.userType,
          type: "topup",
          amount: req.amount,
          timestamp: serverTimestamp(),
          adminNote: `Persetujuan Top-Up Online`
        });
      }

      await batch.commit();

      showToast("success", `Top-Up berhasil ${action}!`);
      setTopups(prev => prev.filter(t => t.id !== req.id)); 
      fetchData(); 

    } catch (error) {
      console.error("Gagal review topup:", error);
      showToast("error", "Terjadi kesalahan saat menyetujui Top-Up.");
    } finally {
      setIsProcessing(false);
      setProofModalUrl(null); 
    }
  };

  const handleReviewWithdrawal = async (reqId: string, driverId: string, amount: number, action: "Disetujui" | "Ditolak") => {
    if (!confirm(`Yakin ingin menandai pengajuan penarikan ini sebagai ${action}? \n\nPastikan Anda sudah men-transfer dana ke rekening tujuan jika Disetujui.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);

      const reqRef = doc(db, "withdrawal_requests", reqId);
      batch.update(reqRef, { 
        status: action, 
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.uid || "Admin"
      });

      if (action === "Disetujui") {
        const walletRef = doc(db, "driver_wallets", driverId);
        
        const wSnap = await getDocs(query(collection(db, "driver_wallets")));
        const currentDriver = wSnap.docs.find(d => d.id === driverId)?.data();
        
        if (!currentDriver || (currentDriver.balance || 0) < amount) {
           showToast("error", "Saldo sopir tidak mencukupi untuk pemotongan ini. Hubungi Kurir.");
           setIsProcessing(false);
           return;
        }

        batch.update(walletRef, {
          balance: increment(-Math.abs(amount)),
          lastMutasi: serverTimestamp()
        });

        const logRef = doc(collection(db, "wallet_logs"));
        batch.set(logRef, {
          entityId: driverId,
          entityName: currentDriver.name || "Sopir",
          entityType: "Driver",
          type: "withdraw",
          amount: amount,
          timestamp: serverTimestamp(),
          adminNote: `Pencairan Dana (Disetujui) oleh Admin`
        });
      }

      await batch.commit();

      showToast("success", `Pengajuan berhasil ${action}!`);
      setWithdrawals(prev => prev.filter(w => w.id !== reqId));
      fetchData();

    } catch (error) {
      console.error("Gagal review withdrawal:", error);
      showToast("error", "Terjadi kesalahan saat menyetujui pengajuan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || !mutasiAmount) return;

    const amount = Number(mutasiAmount);
    if (amount <= 0) {
      showToast("error", "Nominal harus lebih dari 0.");
      return;
    }

    const isDriver = activeTab === "driver";
    const currentBalance = isDriver ? (selectedEntity as DriverData).balance || 0 : (selectedEntity as B2BWalletData).depositBalance || 0;

    if (mutasiType === "withdraw" && amount > currentBalance) {
      showToast("error", `Saldo ${isDriver ? 'sopir' : 'deposit klien'} tidak mencukupi untuk ditarik.`);
      return;
    }

    setIsProcessing(true);
    try {
      const collectionName = isDriver ? "driver_wallets" : "users";
      const balanceField = isDriver ? "balance" : "depositBalance";
      const entityRef = doc(db, collectionName, selectedEntity.id);
      
      const valueChange = mutasiType === "topup" ? amount : -amount;
      
      await updateDoc(entityRef, {
        [balanceField]: increment(valueChange),
        lastMutasi: serverTimestamp() 
      });

      await addDoc(collection(db, "wallet_logs"), {
        entityId: selectedEntity.id,
        entityName: isDriver ? (selectedEntity as DriverData).name : (selectedEntity as B2BWalletData).companyName,
        entityType: isDriver ? "Driver" : "B2B",
        type: mutasiType,
        amount: amount,
        timestamp: serverTimestamp(),
        adminNote: `Manual ${mutasiType} by Admin`
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

  const processedData = useMemo(() => {
    if (activeTab === "withdraw" || activeTab === "topup") return []; 

    let result: (DriverData | B2BWalletData)[] = activeTab === "driver" ? [...drivers] : [...b2bClients];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => {
        if (activeTab === "driver") {
          return ((item as DriverData).name || "").toLowerCase().includes(q) || ((item as DriverData).phone || "").includes(q);
        } else {
          return ((item as B2BWalletData).companyName || "").toLowerCase().includes(q) || ((item as B2BWalletData).email || "").toLowerCase().includes(q);
        }
      });
    }

    result.sort((a, b) => {
      const balA = activeTab === "driver" ? ((a as DriverData).balance || 0) : ((a as B2BWalletData).depositBalance || 0);
      const balB = activeTab === "driver" ? ((b as DriverData).balance || 0) : ((b as B2BWalletData).depositBalance || 0);
      
      if (sortOrder === "highest") return balB - balA;
      if (sortOrder === "lowest") return balA - balB;
      
      const nameA = activeTab === "driver" ? ((a as DriverData).name || "") : ((a as B2BWalletData).companyName || "");
      const nameB = activeTab === "driver" ? ((b as DriverData).name || "") : ((b as B2BWalletData).companyName || "");
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [drivers, b2bClients, activeTab, searchQuery, sortOrder]);

  const totalBalance = processedData.reduce((sum, item) => sum + (activeTab === "driver" ? ((item as DriverData).balance || 0) : ((item as B2BWalletData).depositBalance || 0)), 0);
  const criticalLimit = activeTab === "driver" ? 15000 : 100000;
  const lowBalanceCount = processedData.filter(item => (activeTab === "driver" ? ((item as DriverData).balance || 0) : ((item as B2BWalletData).depositBalance || 0)) < criticalLimit).length;
  
  const topEntities = [...processedData].sort((a, b) => {
    const balA = activeTab === "driver" ? ((a as DriverData).balance || 0) : ((a as B2BWalletData).depositBalance || 0);
    const balB = activeTab === "driver" ? ((b as DriverData).balance || 0) : ((b as B2BWalletData).depositBalance || 0);
    return balB - balA;
  }).slice(0, 5);
  const maxChartValue = Math.max(...topEntities.map(e => activeTab === "driver" ? ((e as DriverData).balance || 0) : ((e as B2BWalletData).depositBalance || 0)), 10000);

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Dompet & Kas ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 font-sans">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 MODAL PREVIEW BUKTI TRANSFER (FULLSCREEN) */}
      <AnimatePresence>
        {proofModalUrl && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setProofModalUrl(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 max-w-2xl w-full flex flex-col items-center">
              <button onClick={() => setProofModalUrl(null)} className="absolute -top-12 right-0 bg-white/20 text-white rounded-full p-2 hover:bg-white/40 transition-colors">
                <X className="w-6 h-6" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proofModalUrl} alt="Bukti Transfer Top Up" className="rounded-2xl max-h-[85vh] w-auto shadow-2xl border border-white/20" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Wallet className="w-8 h-8 text-emerald-600" /> Manajemen Kas & Deposit
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium max-w-2xl">Kelola e-wallet closed-loop untuk pemotongan komisi mitra armada, saldo prabayar klien B2B, dan pengajuan dana.</p>
        </div>
      </div>

      {/* 🚀 TABS NAVIGATION (JADI 4 TABS) */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-full max-w-4xl relative overflow-x-auto custom-scrollbar">
        <button onClick={() => { setActiveTab("driver"); setSearchQuery(""); }} className={`flex-1 min-w-[140px] py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "driver" ? "text-white" : "text-slate-500 hover:text-slate-700"}`}>
          Dompet Mitra
        </button>
        <button onClick={() => { setActiveTab("client"); setSearchQuery(""); }} className={`flex-1 min-w-[140px] py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "client" ? "text-white" : "text-slate-500 hover:text-slate-700"}`}>
          Deposit Klien B2B
        </button>
        <button onClick={() => { setActiveTab("topup"); setSearchQuery(""); }} className={`flex-1 min-w-[160px] py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "topup" ? "text-white" : "text-slate-500 hover:text-slate-700"}`}>
          <ArrowUpCircle className="w-4 h-4" /> Pengajuan Top-Up
          {topups.length > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1 animate-pulse">{topups.length}</span>
          )}
        </button>
        <button onClick={() => { setActiveTab("withdraw"); setSearchQuery(""); }} className={`flex-1 min-w-[160px] py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "withdraw" ? "text-white" : "text-slate-500 hover:text-slate-700"}`}>
          <Banknote className="w-4 h-4" /> Pengajuan Cair
          {withdrawals.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1 animate-pulse">{withdrawals.length}</span>
          )}
        </button>
        
        <div className={`absolute top-1.5 bottom-1.5 bg-slate-900 rounded-xl shadow-sm transition-all duration-300 ease-out`} 
             style={{ 
               width: `calc(25% - 3px)`, 
               left: activeTab === "driver" ? "6px" : activeTab === "client" ? "calc(25% + 4px)" : activeTab === "topup" ? "calc(50% + 2px)" : "calc(75% + 0px)" 
             }}>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* KIRI: STATS & ENTERPRISE CHART (HANYA TAB DRIVER & CLIENT) */}
        {(activeTab === "driver" || activeTab === "client") && (
          <div className="xl:col-span-4 space-y-6">
            <div className={`rounded-[2rem] p-6 md:p-8 shadow-xl relative overflow-hidden transition-colors duration-500 ${activeTab === "driver" ? "bg-gradient-to-br from-slate-900 to-slate-800" : "bg-gradient-to-br from-[#7A171D] to-[#4A0A10]"}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[80px] opacity-20 pointer-events-none ${activeTab === "driver" ? "bg-emerald-500" : "bg-[#C5A059]"}`} />
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Total Dana Mengendap</p>
              <h2 className={`text-3xl md:text-4xl font-black tracking-tight relative z-10 ${activeTab === "driver" ? "text-emerald-400" : "text-[#DFBE7B]"}`}>
                Rp {(totalBalance / 1000000).toFixed(1)} Juta
              </h2>
              <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center relative z-10">
                <div>
                  <p className="text-white/50 text-[10px] font-bold uppercase">{activeTab === "driver" ? "Mitra Aktif" : "Korporat Aktif"}</p>
                  <p className="text-white font-black text-lg">{processedData.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-[10px] font-bold uppercase">Saldo Kritis (&lt;{criticalLimit/1000}k)</p>
                  <p className="text-red-400 font-black text-lg">{lowBalanceCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-6 uppercase tracking-widest">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Top 5 Konsentrasi Saldo
              </h3>
              {topEntities.length === 0 ? (
                <div className="text-center text-xs text-slate-400 font-bold py-10 bg-slate-50 rounded-xl border border-slate-100">Belum ada data saldo.</div>
              ) : (
                <div className="space-y-4">
                  {topEntities.map((entity, i) => {
                    const val = activeTab === "driver" ? (entity as DriverData).balance || 0 : (entity as B2BWalletData).depositBalance || 0;
                    const name = activeTab === "driver" ? (entity as DriverData).name : (entity as B2BWalletData).companyName;
                    const percent = Math.max((val / maxChartValue) * 100, 2); 
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-700 truncate pr-2">{name}</span>
                          <span className={activeTab === "driver" ? "text-emerald-600" : "text-[#7A171D]"}>{formatRupiah(val)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                            className={`h-full rounded-full ${activeTab === "driver" ? "bg-emerald-500" : "bg-[#C5A059]"}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* KANAN: TABEL UTAMA */}
        <div className={`bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-full min-h-[500px] ${(activeTab === "withdraw" || activeTab === "topup") ? "xl:col-span-12" : "xl:col-span-8"}`}>
          
          {(activeTab === "driver" || activeTab === "client") && (
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:flex-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={activeTab === "driver" ? "Cari nama vendor / sopir..." : "Cari nama PT atau email..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100 text-sm font-medium shadow-sm transition-all"
                />
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <select value={sortOrder} onChange={e => setSortOrder(e.target.value as "highest" | "lowest" | "name_asc")} className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-slate-500 shadow-sm appearance-none font-semibold text-slate-700 min-w-[160px]">
                    <option value="highest">Saldo Tertinggi</option>
                    <option value="lowest">Saldo Terendah</option>
                    <option value="name_asc">Nama (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto flex-1 custom-scrollbar">
            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center text-center">
                <Activity className="w-10 h-10 text-slate-300 animate-spin mb-4"/>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Menyelaraskan data dompet...</p>
              </div>
            ) : activeTab === "withdraw" ? (
              withdrawals.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-16 h-16 text-red-200 mb-4 opacity-50"/>
                  <h3 className="text-lg font-black text-slate-800">Tidak ada pengajuan!</h3>
                  <p className="text-slate-500 font-medium mt-1">Tidak ada antrean penarikan dana dari sopir maupun vendor saat ini.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                      <th className="p-5 pl-6">Detail Pemohon</th>
                      <th className="p-5">Waktu Pengajuan</th>
                      <th className="p-5">Nominal Penarikan</th>
                      <th className="p-5 pr-6 text-right">Tindakan Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {withdrawals.map((req) => {
                      // 🚀 KUNCI PERBAIKAN: Gunakan fungsi penjinak unknown
                      const ts = parseUnknownDate(req.timestamp);
                      const dateStr = ts.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

                      return (
                        <tr key={req.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="p-5 pl-6 align-top">
                            <p className="text-sm font-black text-slate-900">{req.driverName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{req.driverPhone}</p>
                            <span className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${req.partnerType === 'FleetDriver' ? 'bg-purple-50 text-purple-600 border-purple-200' : req.partnerType === 'Vendor' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                              {req.partnerType === 'FleetDriver' ? 'Sopir Vendor' : req.partnerType === 'Vendor' ? 'Perusahaan Vendor' : 'Sopir Mandiri'}
                            </span>
                          </td>
                          <td className="p-5 align-top">
                            <p className="text-xs font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg w-fit">
                              {dateStr}
                            </p>
                          </td>
                          <td className="p-5 align-top">
                            <p className="text-base font-black text-red-600">{formatRupiah(req.amount)}</p>
                          </td>
                          <td className="p-5 pr-6 align-top">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleReviewWithdrawal(req.id, req.driverId, req.amount, "Disetujui")}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" /> Transfer & Setuju
                              </button>
                              <button 
                                onClick={() => handleReviewWithdrawal(req.id, req.driverId, req.amount, "Ditolak")}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
                              >
                                <X className="w-4 h-4" /> Tolak
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : activeTab === "topup" ? (
              topups.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-200 mb-4 opacity-50"/>
                  <h3 className="text-lg font-black text-slate-800">Semua Beres!</h3>
                  <p className="text-slate-500 font-medium mt-1">Tidak ada antrean top-up saldo dari Driver maupun Klien B2B.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                      <th className="p-5 pl-6">Penyetor (Asal Dana)</th>
                      <th className="p-5">Bukti Transfer</th>
                      <th className="p-5">Nominal Pengajuan</th>
                      <th className="p-5 pr-6 text-right">Tindakan Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topups.map((req) => {
                      // 🚀 KUNCI PERBAIKAN: Gunakan fungsi penjinak unknown
                      const ts = parseUnknownDate(req.createdAt);
                      const dateStr = ts.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

                      return (
                        <tr key={req.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="p-5 pl-6 align-top">
                            <p className="text-sm font-black text-slate-900">{req.clientName}</p>
                            <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${req.userType === 'B2B' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                              {req.userType === 'B2B' ? 'Klien Korporat' : 'Dompet Mitra'}
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono mt-1.5">{dateStr}</p>
                          </td>
                          <td className="p-5 align-top">
                            {req.proofUrl ? (
                              <button 
                                onClick={() => setProofModalUrl(req.proofUrl)}
                                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Eye className="w-4 h-4" /> Lihat Bukti TF
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Tanpa Lampiran</span>
                            )}
                          </td>
                          <td className="p-5 align-top">
                            <p className="text-base font-black text-emerald-600">{formatRupiah(req.amount)}</p>
                          </td>
                          <td className="p-5 pr-6 align-top">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleReviewTopup(req, "Disetujui")}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" /> Verifikasi & Tambah Saldo
                              </button>
                              <button 
                                onClick={() => handleReviewTopup(req, "Ditolak")}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
                              >
                                <X className="w-4 h-4" /> Tolak
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : processedData.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mb-3"/>
                <p className="text-slate-500 font-medium">Tidak ada data dompet ditemukan.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                    <th className="p-5 pl-6">{activeTab === "driver" ? "Identitas Kemitraan" : "Identitas Korporat"}</th>
                    <th className="p-5">Saldo Tersedia</th>
                    <th className="p-5 pr-6 text-right">Aksi Mutasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedData.map((item) => {
                    const balance = activeTab === "driver" ? (item as DriverData).balance || 0 : (item as B2BWalletData).depositBalance || 0;
                    const name = activeTab === "driver" ? (item as DriverData).name : (item as B2BWalletData).companyName;
                    const subText = activeTab === "driver" ? (item as DriverData).phone || "-" : (item as B2BWalletData).email || "-";
                    const partnerTypeLabel = activeTab === "driver" ? (item as DriverData).partnerType : null;
                    const isCritical = balance < criticalLimit;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-5 pl-6 align-top">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 ${activeTab === "driver" ? "bg-slate-100 border-slate-200 text-slate-400" : "bg-[#C5A059]/10 border-[#C5A059]/20 text-[#A68345]"}`}>
                              {activeTab === "driver" ? <UserCircle className="w-6 h-6" /> : <Building2 className="w-5 h-5" />}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-black text-slate-900 truncate">{name}</p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{subText}</p>
                              {activeTab === "driver" && partnerTypeLabel && (
                                <span className={`inline-block mt-1 text-[8px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-600 uppercase tracking-widest`}>
                                  {partnerTypeLabel === "Vendor" ? "Vendor / Fleet Manager" : "Sopir Mandiri"}
                                </span>
                              )}
                              {activeTab === "client" && <span className="text-[9px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold mt-1.5 inline-block text-slate-600 uppercase tracking-widest">PIC: {(item as B2BWalletData).name}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="p-5 align-top">
                          <span className={`text-base font-black ${isCritical ? 'text-red-600' : 'text-slate-900'}`}>
                            {formatRupiah(balance)}
                          </span>
                          {isCritical && <p className="text-[9px] text-red-600 mt-1.5 font-bold uppercase tracking-widest bg-red-50 px-2 py-1 rounded-md w-fit border border-red-100 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Saldo Kritis</p>}
                        </td>
                        <td className="p-5 pr-6 align-top">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => { setSelectedEntity(item); setMutasiType("topup"); setShowMutasiModal(true); }}
                              className="p-2.5 rounded-xl bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors shadow-sm flex items-center gap-1.5 text-xs font-bold"
                              title="Top Up Saldo"
                            >
                              <ArrowUpCircle className="w-4 h-4" /> Top-Up
                            </button>
                            <button 
                              onClick={() => { setSelectedEntity(item); setMutasiType("withdraw"); setShowMutasiModal(true); }}
                              className="p-2.5 rounded-xl bg-white border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm flex items-center gap-1.5 text-xs font-bold"
                              title="Tarik Saldo Manual"
                            >
                              <ArrowDownCircle className="w-4 h-4" /> Tarik Manual
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: MUTASI SALDO MANUAL UNIVERSAL */}
      <AnimatePresence>
        {showMutasiModal && selectedEntity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowMutasiModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1.5 ${mutasiType === 'topup' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-5">
                <div className={`p-2.5 rounded-xl ${mutasiType === 'topup' ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-red-50 border border-red-100 text-red-600'}`}>
                  {activeTab === "driver" ? <History className="w-5 h-5" /> : <CreditCard className="w-5 h-5"/>}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {mutasiType === 'topup' ? `Setor Deposit ${activeTab === 'driver' ? 'Kemitraan' : 'Klien'}` : 'Tarik Saldo Manual'}
                  </h2>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    {activeTab === "driver" ? (selectedEntity as DriverData).name : (selectedEntity as B2BWalletData).companyName}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6 flex justify-between items-center shadow-inner">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Saldo Tersedia</span>
                <span className="text-xl font-black text-slate-900">
                  Rp {(activeTab === "driver" ? (selectedEntity as DriverData).balance || 0 : (selectedEntity as B2BWalletData).depositBalance || 0).toLocaleString('id-ID')}
                </span>
              </div>

              <form onSubmit={handleMutasi} className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">Masukkan Nominal (Rp)</label>
                  <input 
                    type="number" 
                    required 
                    min="1000"
                    value={mutasiAmount} 
                    onChange={(e) => setMutasiAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                    className={`w-full bg-white border-2 rounded-xl px-4 py-4 text-slate-900 text-2xl font-black outline-none transition-all text-center shadow-sm ${mutasiType === 'topup' ? 'border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50' : 'border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-50'}`} 
                    placeholder="0" 
                  />
                  {activeTab === "client" && mutasiType === "topup" && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-2 text-center">Dana ini akan digunakan sebagai saldo Prabayar / Potongan Tagihan Otomatis.</p>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowMutasiModal(false)} className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm transition-colors shadow-sm">Batal</button>
                  <button type="submit" disabled={isProcessing} className={`flex-1 py-3.5 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center shadow-md active:scale-95 ${mutasiType === 'topup' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'}`}>
                    {isProcessing ? "Memproses..." : "Konfirmasi"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}