"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Search, Activity, History, CalendarDays, Building2, Smartphone } from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

import { DriverData } from "@/types/admin";
import { WithdrawalRequest } from "@/types/finance";
import { FirebaseTimestamp } from "@/types/order";

const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

const getMillis = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined) => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'object' && timestamp !== null && 'toMillis' in timestamp && typeof (timestamp as { toMillis: () => number }).toMillis === 'function') {
    return (timestamp as { toMillis: () => number }).toMillis();
  }
  return new Date(timestamp as string | number).getTime();
};

const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white transition-all duration-300 rounded-2xl";

export default function HistoryWithdrawalsTab() {
  const [historyLogs, setHistoryLogs] = useState<WithdrawalRequest[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const driverSnap = await getDocs(collection(db, "driver_wallets"));
      const allWallets: DriverData[] = driverSnap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as unknown as DriverData));

      const q = query(collection(db, "withdrawal_requests"), where("status", "in", ["Disetujui", "Ditolak"]));
      const snap = await getDocs(q);
      
      const list: WithdrawalRequest[] = snap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        const driverInfo = allWallets.find(driver => driver.id === data.driverId);
        return {
          id: d.id, ...data,
          driverName: driverInfo?.name || "Sopir Tidak Diketahui",
          method: data.method || "Manual_Bank"
        } as unknown as WithdrawalRequest;
      });

      list.sort((a, b) => getMillis(b.timestamp) - getMillis(a.timestamp)); 
      setHistoryLogs(list);
    } catch (error) { 
      console.error("Gagal menarik data:", error); 
    } finally { 
      setIsLoading(false); 
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const processedData = historyLogs.filter(item => 
    (item.driverName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.accountNumber || item.bankName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="p-10 text-center"><Activity className="w-8 h-8 mx-auto text-slate-400 animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-6 relative z-10 max-w-4xl mx-auto">
      <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 justify-between items-center`}>
        <div className="relative w-full md:w-1/2">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
          <input type="text" placeholder="Cari nama sopir atau bank..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/60 border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-slate-500 shadow-sm font-bold text-slate-700 transition-all hover:bg-white" />
        </div>
      </div>

      <div className="min-h-[500px] flex flex-col gap-4">
        {processedData.length === 0 ? (
          <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
            <History className="w-16 h-16 mb-4 opacity-30 text-slate-400" />
            <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Belum Ada Riwayat</h4>
          </div>
        ) : (
          processedData.map((req, idx) => {
            const isApproved = req.status === "Disetujui";
            const ts = getMillis(req.timestamp) ? new Date(getMillis(req.timestamp)) : new Date();

            return (
              <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={`${glassRow} p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-white shadow-sm relative overflow-hidden`}>
                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", isApproved ? "bg-emerald-500" : "bg-red-500")}></div>
                
                <div className="flex items-start gap-4 pl-2 w-full sm:w-auto">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm", isApproved ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100")}>
                    {isApproved ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 tracking-tight">{req.driverName}</h2>
                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                      {req.method === "Manual_Bank" ? <Building2 className="w-3 h-3 text-slate-400"/> : <Smartphone className="w-3 h-3 text-blue-500"/>}
                      {req.method === "Manual_Bank" ? `${req.bankName} - ${req.accountNumber}` : `DANA - ${req.accountNumber || req.driverPhone}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end w-full sm:w-auto pl-16 sm:pl-0">
                  <p className={cn("text-lg font-black tracking-tight font-mono", isApproved ? "text-emerald-600" : "text-red-600 line-through opacity-70")}>
                    {formatRupiah(req.amount)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <AdminBadge variant={isApproved ? "success" : "danger"} className="text-[8px] uppercase tracking-widest">{isApproved ? "BERHASIL CAIR" : "DITOLAK (REFUND)"}</AdminBadge>
                    <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><CalendarDays className="w-3 h-3"/> {ts.toLocaleDateString("id-ID")}</span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}