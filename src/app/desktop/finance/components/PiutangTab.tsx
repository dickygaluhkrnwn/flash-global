import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Receipt, FileSpreadsheet, CheckCircle2, Building2, CreditCard, Copy, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OrderDetail, LocationDetail } from "@/types/order";
import { PaymentConfig } from "../page";
import { cn } from "@/lib/utils";

interface Props {
  b2bLimit: number;
  totalDebt: number;
  unpaidOrders: OrderDetail[];
  paymentConfig: PaymentConfig | null;
  receiptFile: File | null;
  setReceiptFile: (file: File | null) => void;
  receiptPreview: string | null;
  setReceiptPreview: (preview: string | null) => void;
  handleBulkPayment: () => void;
  isUploadingBulk: boolean;
  showToast: (type: "success" | "error", msg: string) => void;
  formatRupiah: (val: number) => string;
}

export default function PiutangTab(props: Props) {
  const { b2bLimit, totalDebt, unpaidOrders, paymentConfig, receiptFile, setReceiptFile, receiptPreview, setReceiptPreview, handleBulkPayment, isUploadingBulk, showToast, formatRupiah } = props;
  
  const limitUsedPercent = b2bLimit > 0 ? Math.min((totalDebt / b2bLimit) * 100, 100) : 0;
  const isLimitWarning = limitUsedPercent > 80; 

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
      
      {/* METRIK KEUANGAN & LIMIT KREDIT (3D PREMIUM DARK & GLASS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-8 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-[0_20px_40px_rgba(15,23,42,0.4)] relative overflow-hidden md:col-span-2 flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Penggunaan Plafon Kredit
                </p>
                <span className="text-xs font-black text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{limitUsedPercent.toFixed(1)}% Terpakai</span>
              </div>
              <div className="w-full h-5 bg-slate-900 rounded-full overflow-hidden mb-6 border border-slate-800 shadow-inner">
                <motion.div initial={{ width: 0 }} animate={{ width: `${limitUsedPercent}%` }} transition={{ duration: 1, ease: "easeOut" }} className={cn("h-full rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]", isLimitWarning ? "bg-gradient-to-r from-red-500 to-rose-400" : "bg-gradient-to-r from-indigo-600 to-blue-400")} />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Total Limit (Net 30)</p>
                  <p className="text-2xl font-black text-slate-200 tracking-tight">{formatRupiah(b2bLimit)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Sisa Limit Tersedia</p>
                  <p className={cn("text-3xl md:text-4xl font-black tracking-tight", isLimitWarning ? "text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-300" : "text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-300")}>
                    {formatRupiah(b2bLimit - totalDebt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-red-500/20 transition-colors" />
          <div className="relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-red-50 to-red-100 text-red-600 rounded-[1.25rem] flex items-center justify-center border border-red-200 shadow-sm mb-6">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Piutang Berjalan</p>
            <h3 className="text-3xl md:text-4xl font-black text-red-600 tracking-tight">{formatRupiah(totalDebt)}</h3>
            <p className="text-xs text-slate-500 mt-2 font-bold bg-white/60 inline-block px-3 py-1 rounded-md border border-white shadow-sm">Dari {unpaidOrders.length} manifes tertunda</p>
          </div>
        </div>
      </div>

      {/* TABEL PIUTANG & UPLOAD BULK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Kolom Tabel (Kiri) */}
        <div className="lg:col-span-8 glass-card rounded-[2.5rem] overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="p-6 md:p-8 border-b border-white bg-white/40 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Rincian Tagihan Tertunda
            </h2>
          </div>
          <div className="overflow-x-auto flex-1 client-scrollbar bg-white/20 backdrop-blur-md">
            {unpaidOrders.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 bg-emerald-50/80 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-200 shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tagihan Bersih</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium max-w-sm leading-relaxed">Anda telah melunasi semua invoice. Limit kredit Anda kembali maksimal.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-10 border-b border-slate-200">
                  <tr className="text-slate-500 uppercase font-black tracking-widest text-[10px]">
                    <th className="p-5 pl-8">No. Resi AWB</th>
                    <th className="p-5">Rute Distribusi</th>
                    <th className="p-5 pr-8 text-right">Nominal Tagihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/50">
                  {unpaidOrders.map(order => {
                    const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
                    const originAddress = originObj?.address || (typeof order.origin === 'string' ? order.origin : "-");
                    let destAddress = order.destination || "-";
                    if (order.destinations && order.destinations.length > 0) destAddress = order.destinations.length > 1 ? `${order.destinations.length} Titik Tujuan` : (order.destinations[0].address || "Tujuan");
                    const amount = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;

                    return (
                      <tr key={order.id} className="hover:bg-white/60 transition-colors">
                        <td className="p-5 pl-8 align-top">
                          <span className="font-mono font-black text-indigo-700 bg-white shadow-sm px-3 py-1.5 rounded-lg border border-indigo-100">{order.resi || order.id.substring(0,8)}</span>
                        </td>
                        <td className="p-5 align-top max-w-[200px]">
                          <div className="space-y-2 text-xs font-bold text-slate-600">
                            <p className="truncate flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400 shrink-0"/> {originAddress}</p>
                            <p className="truncate flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-600 shrink-0"/> {destAddress}</p>
                          </div>
                        </td>
                        <td className="p-5 pr-8 align-top text-right">
                          <span className="text-base font-black text-slate-900 tracking-tight">{formatRupiah(amount)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Kolom Aksi Pembayaran (Kanan - Sticky) */}
        <div className="lg:col-span-4 glass-card rounded-[2.5rem] p-6 md:p-8 lg:sticky lg:top-28 space-y-6">
          <div className="border-b border-white pb-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-600" /> Pelunasan Massal</h3>
            <p className="text-[11px] text-slate-500 font-bold mt-1.5 leading-relaxed uppercase tracking-widest">Satu bukti transfer untuk semua.</p>
          </div>
          
          <div className="space-y-4 mb-6 border-b border-white pb-6">
            {paymentConfig?.transferBank && paymentConfig.transferBank.length > 0 && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">Transfer ke Rekening</label>
                {paymentConfig.transferBank.map((bank, idx) => (
                  <div key={idx} className="bg-white/60 backdrop-blur-sm border border-white rounded-[1.25rem] p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div>
                        <p className="text-xs font-black text-slate-900 mb-0.5">{bank.bankName}</p>
                        <p className="text-sm font-mono font-black text-indigo-700">{bank.accountNumber}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">A.N: {bank.accountName}</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { navigator.clipboard.writeText(bank.accountNumber); showToast("success", "Nomor rekening disalin!"); }}
                      className="p-2.5 bg-white text-slate-500 rounded-xl hover:text-indigo-600 transition-colors border border-slate-100 shadow-sm active:scale-95"
                      title="Salin Rekening"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-[1.5rem] border border-red-200 flex flex-col items-center text-center shadow-sm">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Total Harus Dibayar</span>
            <span className="text-3xl font-black text-red-600 tracking-tight">{formatRupiah(totalDebt)}</span>
          </div>

          <label className={cn("border-2 border-dashed rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center transition-all min-h-[180px] relative overflow-hidden group", unpaidOrders.length === 0 ? "border-slate-200 bg-white/40 opacity-50 cursor-not-allowed" : "border-indigo-300 hover:border-indigo-500 bg-white/60 cursor-pointer hover:bg-indigo-50/50")}>
            <input type="file" accept="image/*" disabled={unpaidOrders.length === 0} onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setReceiptFile(e.target.files[0]);
                setReceiptPreview(URL.createObjectURL(e.target.files[0]));
              }
            }} className="hidden" />
            
            <AnimatePresence mode="wait">
              {receiptPreview ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-slate-900 p-2 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={receiptPreview} alt="Pratinjau" className="max-w-full max-h-full object-contain rounded-xl" />
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5 text-indigo-500" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pilih Bukti Transfer<br/>(Maks 5MB)</p>
                </motion.div>
              )}
            </AnimatePresence>
          </label>

          <Button onClick={handleBulkPayment} disabled={isUploadingBulk || unpaidOrders.length === 0 || !receiptFile} variant="primary" size="lg" className="w-full text-sm">
            {isUploadingBulk ? "Memproses Data..." : "Konfirmasi Pembayaran"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
} 