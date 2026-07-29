import { motion, AnimatePresence } from "framer-motion";
import { Wallet, QrCode, Building2, Copy, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PaymentConfig } from "../page";
import { cn } from "@/lib/utils";

interface Props {
  depositBalance: number;
  paymentConfig: PaymentConfig | null;
  topupAmount: number | "";
  setTopupAmount: (val: number | "") => void;
  topupFileInputRef: React.RefObject<HTMLInputElement>;
  topupFile: File | null;
  setTopupFile: (file: File | null) => void;
  topupPreview: string | null;
  setTopupPreview: (preview: string | null) => void;
  handleTopupSubmit: (e: React.FormEvent) => void;
  isSubmittingTopup: boolean;
  showToast: (type: "success" | "error", msg: string) => void;
  formatRupiah: (val: number) => string;
}

export default function DepositTab(props: Props) {
  const { depositBalance, paymentConfig, topupAmount, setTopupAmount, topupFileInputRef, topupFile, setTopupFile, topupPreview, setTopupPreview, handleTopupSubmit, isSubmittingTopup, showToast, formatRupiah } = props;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
      
      {/* KARTU SALDO DEPOSIT */}
      <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[160px] border border-emerald-500">
        <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/20 rounded-full blur-[40px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/40 shadow-sm mb-3">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest mb-1">Saldo Prabayar</p>
          <h3 className="text-3xl font-black tracking-tighter drop-shadow-md truncate w-full px-4">
            {formatRupiah(depositBalance)}
          </h3>
        </div>
      </div>

      {/* FORM TOP-UP */}
      <div className="glass-card rounded-[2rem] p-5 shadow-sm border border-slate-200">
        <h2 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 mb-5">Isi Saldo (Top-Up)</h2>

        <div className="space-y-6">
          {/* QRIS Card */}
          {paymentConfig?.qrisImageUrl && (
            <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 text-center shadow-inner relative overflow-hidden group">
              <div className="flex items-center justify-center gap-1.5 mb-4 relative z-10">
                <QrCode className="w-4 h-4 text-emerald-600"/>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Scan QRIS</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={paymentConfig.qrisImageUrl} alt="QRIS" className="w-40 h-40 object-contain mx-auto rounded-xl border border-slate-200 shadow-sm bg-white p-2" />
            </div>
          )}

          {/* Transfer Bank List */}
          {paymentConfig?.transferBank && paymentConfig.transferBank.length > 0 && (
            <div className="space-y-3">
              <label className="text-[9px] font-black text-slate-400 block uppercase tracking-widest pl-1">Atau Transfer Manual</label>
              {paymentConfig.transferBank.map((bank, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-[1.25rem] p-3.5 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-900 mb-0.5">{bank.bankName}</p>
                      <p className="text-xs font-mono font-black text-emerald-700">{bank.accountNumber}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(bank.accountNumber); showToast("success", "Rekening disalin!"); }} className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:text-emerald-600 transition-colors border border-slate-100 shadow-sm active:scale-90 tap-highlight-transparent">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleTopupSubmit} className="space-y-5 pt-6 mt-6 border-t border-slate-100">
          <div>
            <label className="text-[9px] font-black text-slate-400 mb-2 block uppercase tracking-widest pl-1">Nominal (Rp)</label>
            <input type="number" required min="50000" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-lg font-black tracking-tight outline-none text-center focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 shadow-inner placeholder:text-slate-300" placeholder="Min. 50.000" />
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-400 mb-2 block uppercase tracking-widest pl-1">Bukti Transfer</label>
            <label className={cn("border-2 border-dashed rounded-[1.25rem] p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[120px] relative overflow-hidden tap-highlight-transparent", !topupFile ? "border-slate-300 bg-slate-50" : "border-emerald-400 bg-emerald-50/50")}>
              <input type="file" accept="image/*" ref={topupFileInputRef} onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setTopupFile(e.target.files[0]);
                  setTopupPreview(URL.createObjectURL(e.target.files[0]));
                }
              }} className="hidden" />
              
              <AnimatePresence mode="wait">
                {topupPreview ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={topupPreview} alt="Bukti Topup" className="w-full h-full object-cover rounded-lg opacity-40" />
                    <div className="absolute inset-0 flex items-center justify-center"><span className="bg-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> Terlampir</span></div>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    <Upload className="w-5 h-5 text-emerald-500 mx-auto" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Pilih Bukti (Maks 5MB)</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </label>
          </div>

          <Button type="submit" disabled={isSubmittingTopup || !topupFile} variant="primary" className="w-full h-12 rounded-xl text-xs font-black !bg-gradient-to-b !from-emerald-500 !to-emerald-600 hover:!from-emerald-400 hover:!to-emerald-500 !border-emerald-700 shadow-sm active:scale-95 uppercase tracking-widest">
            {isSubmittingTopup ? "Mengajukan..." : "Konfirmasi Top-Up"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}