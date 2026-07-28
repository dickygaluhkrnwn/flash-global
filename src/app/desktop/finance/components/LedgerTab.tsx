import { motion } from "framer-motion";
import { History, Activity, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { LedgerItem } from "../page";

interface Props {
  ledgerLogs: LedgerItem[];
  formatRupiah: (val: number) => string;
}

export default function LedgerTab({ ledgerLogs, formatRupiah }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card rounded-[2.5rem] overflow-hidden min-h-[500px]">
      <div className="p-8 border-b border-white bg-white/40">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
          <History className="w-6 h-6 text-slate-600" /> Buku Besar Transaksi (Ledger)
        </h2>
        <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest pl-9">Riwayat pergerakan finansial Anda</p>
      </div>

      <div className="overflow-x-auto client-scrollbar bg-white/20 backdrop-blur-md">
        {ledgerLogs.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-white/50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-white shadow-sm">
              <Activity className="w-10 h-10" />
            </div>
            <p className="text-slate-500 font-bold tracking-tight text-lg">Belum ada riwayat transaksi</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-10 border-b border-slate-200">
              <tr className="text-slate-400 uppercase font-black tracking-widest text-[10px]">
                <th className="p-6 pl-8">Tanggal & Waktu</th>
                <th className="p-6">Deskripsi Mutasi</th>
                <th className="p-6">Status</th>
                <th className="p-6 pr-8 text-right">Nominal (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50">
              {ledgerLogs.map((log) => {
                const isIncome = log.type.includes('topup') || log.type === 'deposit';
                
                return (
                  <tr key={log.id} className="hover:bg-white/60 transition-colors">
                    <td className="p-6 pl-8 align-top text-xs font-bold text-slate-600 whitespace-nowrap">
                      {log.dateStr}
                    </td>
                    <td className="p-6 align-top max-w-[250px]">
                      <p className="font-black text-slate-900 text-sm mb-1.5 capitalize flex items-center gap-2">
                        {isIncome ? <ArrowDownCircle className="w-4 h-4 text-emerald-500" /> : <ArrowUpCircle className="w-4 h-4 text-red-500" />}
                        {log.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed truncate">{log.note}</p>
                    </td>
                    <td className="p-6 align-top">
                      <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-1.5 shadow-sm ${
                        log.status === 'Success' ? 'bg-emerald-50/80 text-emerald-600 border-emerald-200' :
                        log.status === 'Pending' ? 'bg-amber-50/80 text-amber-600 border-amber-200' :
                        'bg-red-50/80 text-red-600 border-red-200'
                      }`}>
                        {log.status === 'Success' && <CheckCircle2 className="w-3 h-3" />}
                        {log.status === 'Pending' && <Clock className="w-3 h-3" />}
                        {log.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="p-6 pr-8 align-top text-right">
                      <span className={`text-lg font-black tracking-tight ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isIncome ? '+' : '-'}{formatRupiah(log.amount)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}