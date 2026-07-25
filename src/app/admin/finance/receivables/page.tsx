"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, Search, ArrowUpDown, 
  AlertCircle, ShieldAlert, CheckCircle2, 
  TrendingUp, BarChart3, Wallet, Activity, ArrowRight, User
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

import { B2BClientDebt, UnpaidOrder } from "@/types/finance";
import { OrderDetail, LocationDetail } from "@/types/order";

interface ExtendedUnpaidOrder extends UnpaidOrder {
  weight: number;
  vehicle: string;
}

export interface ExtendedB2BClientDebt extends Omit<B2BClientDebt, 'orders'> {
  orders: ExtendedUnpaidOrder[];
}

const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(220,38,38,0.1)] transition-all duration-300 rounded-2xl";

export default function FinanceReceivablesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [b2bDebts, setB2bDebts] = useState<ExtendedB2BClientDebt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("highest_debt");
  
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        const b2bOrderQ = query(collection(db, "orders"), where("isB2BApplied", "==", true));
        const b2bOrderSnap = await getDocs(b2bOrderQ);
        
        const debtMap = new Map<string, ExtendedB2BClientDebt>();
        
        b2bOrderSnap.forEach(docObj => {
          const data = docObj.data() as OrderDetail;
          
          if (data.paymentStatus !== "Lunas") {
            const userId = data.userId;
            if (!userId) return; // Skip order yang tidak memiliki userId

            // PARSING AMAN (Menghindari Type '{}' is not assignable to string)
            const originObj = typeof data.origin === 'object' && data.origin !== null ? data.origin as LocationDetail : null;
            const originAddress = originObj?.address ? String(originObj.address) : (typeof data.origin === 'string' ? String(data.origin) : "-");
            const senderNameFallback = originObj?.senderName ? String(originObj.senderName) : (data.senderName ? String(data.senderName) : "");
            
            const clientName = senderNameFallback ? senderNameFallback : (data.name ? String(data.name) : "Corporate Client");
            const clientEmail = typeof data.email === 'string' ? data.email : "-";
            
            const amount = Number(data.finalGrandTotal || data.breakdown?.grandTotal || data.totalCost || 0);
            const weight = Number(data.totalWeight || data.weight || 0);
            const vehicle = data.vehicleName ? String(data.vehicleName) : (data.vehicle ? String(data.vehicle) : "Kargo Logistik");
            
            // Safe Date Parsing
            let dateObj = new Date();
            if (data.createdAt) {
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               const ts: any = data.createdAt;
               if (ts && typeof ts.toDate === 'function') {
                  dateObj = ts.toDate();
               } else if (ts && typeof ts === 'object' && ts.seconds) {
                  dateObj = new Date(ts.seconds * 1000);
               } else {
                  dateObj = new Date(ts);
               }
            }
            const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            
            let primaryDest = "Tujuan";
            if (typeof data.destination === 'string') {
                 primaryDest = String(data.destination);
            } else if (data.destinations && data.destinations.length > 0) {
                 primaryDest = data.destinations.length > 1 ? `${data.destinations.length} Titik Drop` : String(data.destinations[0].address || "Tujuan");
            }

            const orderDetail: ExtendedUnpaidOrder = {
              id: String(docObj.id),
              date: dateStr,
              originAddress: originAddress,
              destAddress: primaryDest,
              amount: amount,
              status: data.paymentStatus ? String(data.paymentStatus) : "Menunggu Pembayaran",
              weight: weight,
              vehicle: vehicle
            };
            
            // GROUPING BERDASARKAN USER_ID
            if (debtMap.has(userId)) {
              const existing = debtMap.get(userId)!;
              existing.unpaidCount += 1;
              existing.totalDebt += amount;
              existing.orders.push(orderDetail);
            } else {
              debtMap.set(userId, {
                id: String(userId), // ID klien asli dari Firebase Users
                name: clientName,
                email: clientEmail,
                unpaidCount: 1,
                totalDebt: amount,
                orders: [orderDetail]
              });
            }
          }
        });
        
        const finalDebts = Array.from(debtMap.values()).map(client => {
          client.orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return client;
        });

        setB2bDebts(finalDebts);
      } catch (err) {
        console.error("Gagal menarik data piutang:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDebts();
  }, []);

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  const processedData = useMemo(() => {
    let result = [...b2bDebts];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
    }
    
    result.sort((a, b) => {
      if (sortOrder === "highest_debt") return b.totalDebt - a.totalDebt;
      if (sortOrder === "highest_count") return b.unpaidCount - a.unpaidCount;
      if (sortOrder === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });
    return result;
  }, [b2bDebts, searchQuery, sortOrder]);

  const totalOutstanding = b2bDebts.reduce((acc, curr) => acc + curr.totalDebt, 0);
  const totalClients = b2bDebts.length;
  const avgDebt = totalClients > 0 ? totalOutstanding / totalClients : 0;

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  const topDebtors = [...b2bDebts].sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 5);

  return (
    <div className="space-y-6 font-sans pb-10 max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            <CheckCircle2 className="w-5 h-5" /> {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500 rounded-full blur-[100px] opacity-10 pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(59,130,246,0.3)] border border-blue-800">
              <Wallet className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            Piutang B2B (Net 30)
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium max-w-2xl">
            Manajemen penagihan invoice untuk klien korporat dengan sistem tempo pembayaran. Pantau total tagihan menggantung di sini.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 border-blue-200/50 flex-1 flex flex-col justify-center`}>
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-blue-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity" />
            <div className="flex justify-between items-start relative z-10">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-widest">Klien Menunggak</span>
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 shadow-sm flex items-center justify-center"><Building2 className="w-5 h-5 text-blue-600" /></div>
            </div>
            <p className="text-3xl font-black text-blue-700 mt-4 relative z-10 tracking-tight">{totalClients} <span className="text-sm font-medium font-sans opacity-80 uppercase tracking-widest">Korporat</span></p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-red-600 to-red-800 border border-red-900 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(220,38,38,0.4)] relative overflow-hidden group flex-1 flex flex-col justify-center">
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-[40px] opacity-50 transition-opacity" />
            <span className="text-red-100 text-[11px] font-bold uppercase tracking-widest relative z-10">Total Piutang Berjalan (Outstanding)</span>
            <div className="flex items-center justify-between mt-4 relative z-10">
              <p className="text-3xl font-black text-white tracking-tight font-mono">{formatRupiah(totalOutstanding)}</p>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className={`lg:col-span-8 ${glassPanel} rounded-[2rem] p-6 md:p-8 flex flex-col`}>
          <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-slate-400" /> Top 5 Konsentrasi Piutang Klien
          </h3>
          
          {topDebtors.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 font-bold bg-white/50 rounded-2xl border border-dashed border-slate-300 min-h-[200px]">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3 opacity-50"/>
              Bagus! Tidak ada piutang B2B yang sedang berjalan saat ini.
            </div>
          ) : (
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              {topDebtors.map((client, idx) => {
                const percentage = totalOutstanding > 0 ? (client.totalDebt / totalOutstanding) * 100 : 0;
                const barColor = idx === 0 ? "bg-red-500" : idx === 1 ? "bg-orange-500" : idx === 2 ? "bg-amber-500" : "bg-slate-400";
                const textColor = idx === 0 ? "text-red-600" : idx === 1 ? "text-orange-600" : idx === 2 ? "text-amber-600" : "text-slate-600";
                
                return (
                  <div key={idx} className="space-y-1.5 group">
                    <div className="flex justify-between text-xs font-bold items-end">
                      <span className="text-slate-700 truncate max-w-[200px] flex items-center gap-1.5"><Building2 className="w-3 h-3 text-slate-400"/> {client.name}</span>
                      <span className={cn("font-mono text-sm tracking-tight", textColor)}>{formatRupiah(client.totalDebt)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 }}
                        className={cn("h-2 rounded-full", barColor)} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <div className="flex flex-col gap-6">
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari nama perusahaan atau ID..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-red-600 focus:ring-[3px] focus:ring-red-600/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-red-600 focus:ring-[3px] focus:ring-red-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[220px]">
                <option value="highest_debt">Piutang Terbesar Teratas</option>
                <option value="highest_count">Tunggakan Terbanyak</option>
                <option value="name_asc">Nama Klien (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-red-600 animate-pulse" />
              <p>Menghitung Piutang Berjalan...</p>
            </div>
          ) : processedData.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <CheckCircle2 className="w-16 h-16 mb-4 opacity-20 text-emerald-500" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Piutang Bersih!</h4>
              <p className="font-medium text-slate-500">Bagus! Tidak ada piutang B2B yang sedang berjalan saat ini.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {processedData.map((debt, idx) => {
                  const isHeavyDebt = debt.totalDebt > 5000000; 
                  const isMediumDebt = debt.totalDebt > 1000000; 
                  
                  return (
                    <motion.div 
                      key={debt.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      transition={{ delay: idx * 0.02 }} 
                      className={`${glassRow} p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group cursor-pointer border border-white`}
                      onClick={() => router.push(`/admin/finance/receivables/${debt.id}`)}
                    >
                      <div className="flex items-center gap-4 w-full lg:w-[35%]">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border", isHeavyDebt ? "bg-red-50 text-red-600 border-red-200" : isMediumDebt ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200")}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <h2 className="text-sm font-black text-slate-900 truncate" title={debt.name}>{debt.name}</h2>
                          <p className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1.5 mt-0.5"><User className="w-3 h-3"/> {debt.email}</p>
                        </div>
                      </div>

                      <div className="w-full lg:w-[30%] flex flex-col items-start lg:items-center gap-2 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0">
                        <AdminBadge variant={isHeavyDebt ? "danger" : isMediumDebt ? "warning" : "info"} className="text-[10px] whitespace-nowrap px-3 shadow-sm flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> {debt.unpaidCount} Transaksi Menggantung
                        </AdminBadge>
                      </div>

                      <div className="w-full lg:w-[35%] flex items-center justify-between lg:justify-end gap-5">
                        <div className="text-left lg:text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Piutang Berjalan</p>
                          <p className={cn("text-xl font-black tracking-tight font-mono", isHeavyDebt ? "text-red-600" : isMediumDebt ? "text-amber-600" : "text-blue-600")}>
                            {formatRupiah(debt.totalDebt)}
                          </p>
                        </div>
                        <AdminButton 
                          size="icon" 
                          variant="outline" 
                          className="h-10 w-10 shrink-0 text-slate-400 group-hover:text-red-600 group-hover:border-red-300 group-hover:bg-red-50 rounded-xl"
                          onClick={(e) => { e.stopPropagation(); router.push(`/admin/finance/receivables/${debt.id}`); }}
                          title="Buka Detail Penagihan"
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

    </div>
  );
}