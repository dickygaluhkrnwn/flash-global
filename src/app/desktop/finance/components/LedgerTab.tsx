import { Activity, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { LedgerItem } from "../page";

interface Props {
  ledgerLogs: LedgerItem[];
  formatRupiah: (val: number) => string;
}

export default function LedgerTab({ ledgerLogs, formatRupiah }: Props) {
  return (
    // Dihilangkan motion.div dan class glass-card agar tidak card in card
    <div className="flex flex-col h-full">
      <div className="pb-6 border-b border-white/60 flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Buku Besar Transaksi</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Riwayat Pergerakan Finansial Anda</p>
        </div>
      </div>

      <div className="overflow-x-auto w-full pt-6">
        {ledgerLogs.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-100/50 text-slate-400 rounded-full flex items-center justify-center mb-4 border border-slate-200/60 shadow-sm">
              <Activity className="w-10 h-10" />
            </div>
            <p className="text-slate-500 font-bold tracking-tight text-lg">Belum ada riwayat transaksi</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-transparent border-b border-slate-200/60">
              <tr className="text-slate-400 uppercase font-black tracking-widest text-[10px]">
                <th className="py-4 px-2 whitespace-nowrap">Tanggal & Waktu</th>
                <th className="py-4 px-2">Deskripsi Mutasi</th>
                <th className="py-4 px-2">Status</th>
                <th className="py-4 px-2 text-right whitespace-nowrap">Nominal (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {ledgerLogs.map((log) => {
                const isIncome = log.type.includes('topup') || log.type === 'deposit';
                
                return (
                  <tr key={log.id} className="hover:bg-white/40 transition-colors group">
                    <td className="py-5 px-2 align-middle text-[11px] font-bold text-slate-600 whitespace-nowrap">
                      {log.dateStr}
                    </td>
                    <td className="py-5 px-2 align-middle max-w-[250px] sm:max-w-none">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${isIncome ? 'bg-emerald-50 border-emerald-200 text-emerald-500' : 'bg-red-50 border-red-200 text-red-500'}`}>
                          {isIncome ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-sm capitalize truncate">
                            {log.type.replace('_', ' ')}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate mt-0.5">{log.note}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-2 align-middle">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-1 shadow-sm ${
                        log.status === 'Success' || log.status === 'Disetujui' ? 'bg-emerald-50/80 text-emerald-600 border-emerald-200' :
                        log.status === 'Pending' || log.status === 'Menunggu Verifikasi' ? 'bg-amber-50/80 text-amber-600 border-amber-200' :
                        'bg-red-50/80 text-red-600 border-red-200'
                      }`}>
                        {(log.status === 'Success' || log.status === 'Disetujui') && <CheckCircle2 className="w-3 h-3" />}
                        {(log.status === 'Pending' || log.status === 'Menunggu Verifikasi') && <Clock className="w-3 h-3" />}
                        {(log.status === 'Rejected' || log.status === 'Ditolak') && <XCircle className="w-3 h-3" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-5 px-2 align-middle text-right">
                      <span className={`text-base font-black tracking-tight whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
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
    </div>
  );
}