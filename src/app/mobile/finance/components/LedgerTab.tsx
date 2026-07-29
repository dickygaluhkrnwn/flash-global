import { motion } from "framer-motion";
import { History, Activity, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { LedgerItem } from "../page";
import { cn } from "@/lib/utils";

interface Props {
  ledgerLogs: LedgerItem[];
  formatRupiah: (val: number) => string;
}

export default function LedgerTab({ ledgerLogs, formatRupiah }: Props) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card rounded-[2rem] overflow-hidden min-h-[400px] border border-slate-200">
      <div className="p-5 border-b border-slate-100 bg-white">
        <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" /> Riwayat Transaksi
        </h2>
      </div>

      <div className="bg-slate-50/50">
        {ledgerLogs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-white text-slate-300 rounded-full flex items-center justify-center mb-3 border border-slate-200 shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <p className="text-slate-500 font-bold text-xs tracking-tight">Belum ada riwayat</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {ledgerLogs.map((log) => {
              const isIncome = log.type.includes('topup') || log.type === 'deposit';
              
              return (
                <div key={log.id} className="p-4 bg-white flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1">
                      {isIncome ? <ArrowDownCircle className="w-5 h-5 text-emerald-500" /> : <ArrowUpCircle className="w-5 h-5 text-red-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 capitalize truncate">{log.type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{log.note}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{log.dateStr}</span>
                        <span className={cn("px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm",
                          log.status === 'Success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          log.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-red-50 text-red-600 border-red-100'
                        )}>
                          {log.status === 'Success' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {log.status === 'Pending' && <Clock className="w-2.5 h-2.5" />}
                          {log.status === 'Rejected' && <XCircle className="w-2.5 h-2.5" />}
                          {log.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-black tracking-tight", isIncome ? 'text-emerald-600' : 'text-slate-900')}>
                      {isIncome ? '+' : '-'}{formatRupiah(log.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}