import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Receipt, Building2, Copy, Upload } from "lucide-react";
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      
      {/* METRIK KEUANGAN & LIMIT KREDIT (DARK BENTO) */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-center">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
        
        <div className="relative z-10 w-full">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Plafon Kredit
            </p>
            <span className="text-[9px] font-black text-slate-300 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">{limitUsedPercent.toFixed(1)}%</span>
          </div>
          
          <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden mb-5 border border-slate-800 shadow-inner">
            <motion.div initial={{ width: 0 }} animate={{ width: `${limitUsedPercent}%` }} transition={{ duration: 1, ease: "easeOut" }} className={cn("h-full rounded-full", isLimitWarning ? "bg-gradient-to-r from-red-500 to-rose-400" : "bg-gradient-to-r from-indigo-600 to-blue-400")} />
          </div>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Sisa Limit</p>
              <p className={cn("text-xl font-black tracking-tight", isLimitWarning ? "text-red-400" : "text-indigo-400")}>
                {formatRupiah(b2bLimit - totalDebt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Total Limit</p>
              <p className="text-base font-bold text-slate-300 tracking-tight">{formatRupiah(b2bLimit)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 rounded-[2rem] flex flex-col justify-center relative overflow-hidden group border border-slate-200">
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Piutang Berjalan</p>
            <h3 className="text-2xl font-black text-red-600 tracking-tight mb-1">{formatRupiah(totalDebt)}</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{unpaidOrders.length} Tagihan Tertunda</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-red-100 text-red-600 rounded-[1.25rem] flex items-center justify-center border border-red-200 shadow-sm shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* RINCIAN TAGIHAN (CARD LIST) */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-slate-900 px-1">Rincian Tagihan</h3>
        {unpaidOrders.length === 0 ? (
          <div className="glass-card p-8 rounded-[2rem] text-center border border-slate-100 flex flex-col items-center">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mb-3" />
            <h3 className="text-base font-black text-slate-900 tracking-tight">Tagihan Bersih</h3>
            <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">Limit kredit maksimal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unpaidOrders.map(order => {
              const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
              const originAddress = originObj?.address || (typeof order.origin === 'string' ? order.origin : "-");
              let destAddress = order.destination || "-";
              if (order.destinations && order.destinations.length > 0) destAddress = order.destinations.length > 1 ? `${order.destinations.length} Tujuan` : (order.destinations[0].address || "Tujuan");
              const amount = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;

              return (
                <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <span className="font-mono font-black text-indigo-700 text-xs bg-indigo-50 px-2.5 py-1 rounded-md">{order.resi || order.id.substring(0,8)}</span>
                    <span className="text-sm font-black text-slate-900">{formatRupiah(amount)}</span>
                  </div>
                  <div className="space-y-1.5 text-[10px] font-bold text-slate-500">
                    <p className="truncate flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 shrink-0"/> {originAddress}</p>
                    <p className="truncate flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0"/> {destAddress}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PELUNASAN MASSAL */}
      {unpaidOrders.length > 0 && (
        <div className="glass-card rounded-[2rem] p-5 space-y-5 border border-slate-200 mt-6">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">Pelunasan Massal</h3>
          
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-400 block uppercase tracking-widest pl-1">Transfer ke Rekening</label>
            {paymentConfig?.transferBank && paymentConfig.transferBank.map((bank, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-[1rem] p-3 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-black text-slate-900 mb-0.5">{bank.bankName}</p>
                  <p className="text-xs font-mono font-black text-indigo-700">{bank.accountNumber}</p>
                </div>
                <button type="button" onClick={() => { navigator.clipboard.writeText(bank.accountNumber); showToast("success", "Rekening disalin!"); }} className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:text-indigo-600 transition-colors border border-slate-100 active:scale-90 tap-highlight-transparent">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <label className={cn("border-2 border-dashed rounded-[1.25rem] p-5 flex flex-col items-center justify-center text-center transition-all min-h-[140px] relative overflow-hidden group tap-highlight-transparent", !receiptFile ? "border-indigo-300 bg-indigo-50/50" : "border-emerald-300 bg-emerald-50/50")}>
            <input type="file" accept="image/*" onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setReceiptFile(e.target.files[0]);
                setReceiptPreview(URL.createObjectURL(e.target.files[0]));
              }
            }} className="hidden" />
            
            <AnimatePresence mode="wait">
              {receiptPreview ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={receiptPreview} alt="Pratinjau" className="w-full h-full object-cover rounded-xl opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center"><span className="bg-white text-xs font-black px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">Ganti Bukti</span></div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  <Upload className="w-6 h-6 text-indigo-500 mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pilih Bukti Transfer</p>
                </motion.div>
              )}
            </AnimatePresence>
          </label>

          <Button onClick={handleBulkPayment} disabled={isUploadingBulk || !receiptFile} variant="primary" className="w-full h-12 text-xs rounded-xl shadow-sm border-indigo-700">
            {isUploadingBulk ? "Memproses..." : "Konfirmasi Pembayaran"}
          </Button>
        </div>
      )}
    </motion.div>
  );
}