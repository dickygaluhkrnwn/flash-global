import { motion } from "framer-motion";
import { QrCode, Building2, Copy, Upload, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PaymentConfig } from "../page";

interface Props {
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
  const { 
    paymentConfig, topupAmount, setTopupAmount, 
    topupFileInputRef, topupFile, setTopupFile, topupPreview, 
    setTopupPreview, handleTopupSubmit, isSubmittingTopup, 
    showToast 
  } = props;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }} 
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative z-10 w-full flex flex-col gap-8 pb-6 pt-2"
    >
      
      {/* ======================================================== */}
      {/* STEP 1: TUJUAN TRANSFER (APPLE WALLET STYLE) */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pl-2">
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black border border-emerald-200 shadow-sm">1</div>
          <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Pilih Tujuan Transfer</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          
          {/* QRIS Card */}
          {paymentConfig?.qrisImageUrl && (
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 text-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_10px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group h-full flex flex-col items-center justify-center transition-all hover:shadow-[0_15px_30px_rgba(16,185,129,0.1)]">
              <div className="absolute top-[-50%] right-[-10%] w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none z-0" />
              
              <div className="flex items-center justify-center gap-2 mb-5 relative z-10">
                <QrCode className="w-5 h-5 text-emerald-600"/>
                <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Scan QRIS Nasional</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={paymentConfig.qrisImageUrl} alt="QRIS" className="w-48 h-48 object-contain mx-auto rounded-[1.5rem] border border-slate-200 shadow-lg bg-white p-4 relative z-10 group-hover:scale-105 transition-transform duration-500" />
            </div>
          )}

          {/* Transfer Bank List */}
          {paymentConfig?.transferBank && paymentConfig.transferBank.length > 0 && (
            <div className="space-y-4 w-full h-full flex flex-col">
              <div className="grid grid-cols-1 gap-4 flex-1">
                {paymentConfig.transferBank.map((bank, idx) => (
                  <div key={idx} className="bg-white/80 backdrop-blur-xl border border-white rounded-[1.5rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 h-full relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-400 rounded-l-[1.5rem]" />
                    <div className="flex items-start gap-4 w-full pl-2">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                        <Building2 className="w-6 h-6 drop-shadow-sm" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">{bank.bankName}</p>
                        <p className="text-xl font-mono font-black text-slate-800 tracking-tight truncate">{bank.accountNumber}</p>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1 truncate">A.N: {bank.accountName}</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { navigator.clipboard.writeText(bank.accountNumber); showToast("success", "Nomor rekening disalin!"); }}
                      className="w-full sm:w-auto px-5 py-3 sm:p-3.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors border border-slate-200 shadow-sm active:scale-95 shrink-0 flex items-center justify-center gap-2"
                      title="Salin Rekening"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="text-xs font-bold sm:hidden">Salin Rekening</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* STEP 2: NOMINAL & BUKTI (GLASS FORM) */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pl-2">
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black border border-emerald-200 shadow-sm">2</div>
          <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Konfirmasi Setoran</h3>
        </div>

        <form onSubmit={handleTopupSubmit} className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-8 border border-white shadow-[0_15px_40px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,1)] space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* Custom Input Number (Apple Pay Style) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 block uppercase tracking-widest pl-2">Nominal Top-Up Minimum Rp 50.000</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 select-none">Rp</span>
                <input 
                  type="number" 
                  required min="50000"
                  value={topupAmount} 
                  onChange={(e) => setTopupAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                  className="w-full h-full min-h-[140px] bg-slate-50/50 hover:bg-white focus:bg-white backdrop-blur-xl border border-white rounded-[2rem] pl-16 pr-6 py-5 text-slate-900 text-3xl sm:text-4xl font-black tracking-tighter outline-none transition-all text-center focus:border-emerald-400 focus:ring-[4px] focus:ring-emerald-500/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02),0_5px_15px_rgba(0,0,0,0.03)] placeholder:text-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  placeholder="0" 
                />
              </div>
            </div>

            {/* Custom File Upload Box */}
            <div className="space-y-2 h-full">
              <label className="text-[10px] font-black text-slate-400 block uppercase tracking-widest pl-2">Unggah Bukti Transfer Asli</label>
              <label className="border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/40 hover:bg-emerald-50/50 min-h-[140px] h-full relative overflow-hidden group shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                <input type="file" accept="image/*" ref={topupFileInputRef} onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setTopupFile(e.target.files[0]);
                    setTopupPreview(URL.createObjectURL(e.target.files[0]));
                  }
                }} className="hidden" />
                
                {topupPreview ? (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center z-10 transition-all">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={topupPreview} alt="Bukti Topup" className="max-h-[85%] rounded-xl object-contain shadow-2xl border border-white/20" />
                    <div className="absolute bottom-4 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[10px] font-bold tracking-widest uppercase border border-white/30 flex items-center gap-1.5 shadow-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Bukti Terlampir
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                      <Upload className="w-6 h-6 text-emerald-500 drop-shadow-sm" />
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                      Klik untuk unggah resi<br/>
                      <span className="text-slate-400 font-bold">Maks. 5MB (JPG/PNG)</span>
                    </p>
                  </div>
                )}
              </label>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-emerald-500"/> Transaksi Terenkripsi Aman
            </p>
            <Button 
              type="submit" 
              disabled={isSubmittingTopup || !topupFile || !topupAmount} 
              variant="primary" 
              className="w-full sm:w-auto px-10 h-14 rounded-[1.25rem] text-sm font-black !bg-gradient-to-b !from-emerald-500 !to-emerald-600 hover:!from-emerald-400 hover:!to-emerald-500 !border-emerald-700 !shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_10px_20px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
            >
              {isSubmittingTopup ? "Mengajukan..." : "Kirim Pengajuan"}
            </Button>
          </div>

        </form>
      </div>

    </motion.div>
  );
}