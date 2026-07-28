import { motion } from "framer-motion";
import { Wallet, PlusCircle, QrCode, Building2, Copy, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PaymentConfig } from "../page";

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
  const { 
    depositBalance, paymentConfig, topupAmount, setTopupAmount, 
    topupFileInputRef, topupFile, setTopupFile, topupPreview, 
    setTopupPreview, handleTopupSubmit, isSubmittingTopup, 
    showToast, formatRupiah 
  } = props;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }} 
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start relative z-10"
    >
      
      {/* ======================================================== */}
      {/* KARTU SALDO DEPOSIT (3D PREMIUM EMERALD) */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 text-white p-8 md:p-12 rounded-[2.5rem] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_20px_40px_rgba(16,185,129,0.3)] relative overflow-hidden flex flex-col justify-center min-h-[350px] border border-emerald-500 group">
        
        {/* Ambient 3D Glow */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/20 rounded-full blur-[80px] pointer-events-none z-0 group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-emerald-950/40 rounded-full blur-[60px] pointer-events-none z-0" />
        
        {/* Dekorasi Grid Pattern Samars */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none mix-blend-overlay"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-white/20 rounded-[1.25rem] flex items-center justify-center border border-white/40 backdrop-blur-md shadow-sm shrink-0">
              <Wallet className="w-7 h-7 text-white drop-shadow-sm" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1.5 drop-shadow-sm">Saldo Prabayar Anda</p>
              <p className="text-[10px] font-bold text-emerald-50 bg-black/20 backdrop-blur-sm px-3.5 py-1.5 rounded-lg inline-block border border-white/10 uppercase tracking-widest shadow-inner">
                Bebas bayar instan
              </p>
            </div>
          </div>
          <h3 className="text-5xl md:text-6xl font-black tracking-tighter drop-shadow-lg truncate">
            {formatRupiah(depositBalance)}
          </h3>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FORM TOP-UP (APPLE GLASS PANEL) */}
      {/* ======================================================== */}
      <div className="glass-card rounded-[2.5rem] p-6 md:p-10 border border-white shadow-[0_15px_40px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none z-0" />
        
        <div className="border-b border-white/60 pb-6 mb-8 flex items-center gap-4 relative z-10 shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)]">
          <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 w-12 h-12 rounded-[1rem] flex items-center justify-center border border-emerald-300 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] shrink-0">
             <PlusCircle className="w-6 h-6 drop-shadow-sm" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Isi Saldo (Top-Up)</h2>
        </div>

        <div className="space-y-6 mb-10 relative z-10">
          
          {/* QRIS Card */}
          {paymentConfig?.qrisImageUrl && (
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-8 text-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_10px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="absolute top-[-50%] right-[-10%] w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none z-0" />
              
              <div className="flex items-center justify-center gap-2 mb-6 relative z-10">
                <QrCode className="w-5 h-5 text-emerald-600"/>
                <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Scan QRIS Nasional</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={paymentConfig.qrisImageUrl} alt="QRIS" className="w-56 h-56 object-contain mx-auto rounded-[1.5rem] border border-slate-200 shadow-lg bg-white p-4 relative z-10 group-hover:scale-105 transition-transform duration-500" />
            </div>
          )}

          {/* Transfer Bank List */}
          {paymentConfig?.transferBank && paymentConfig.transferBank.length > 0 && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 block uppercase tracking-widest pl-1">Transfer Bank Manual</label>
              <div className="grid grid-cols-1 gap-4">
                {paymentConfig.transferBank.map((bank, idx) => (
                  <div key={idx} className="bg-white/80 backdrop-blur-xl border border-white rounded-[1.5rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_10px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-start gap-4 w-full">
                      <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200 shadow-sm">
                        <Building2 className="w-6 h-6 drop-shadow-sm" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-900 mb-0.5">{bank.bankName}</p>
                        <p className="text-lg md:text-xl font-mono font-black text-emerald-700 tracking-tight truncate">{bank.accountNumber}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">A.N: {bank.accountName}</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { navigator.clipboard.writeText(bank.accountNumber); showToast("success", "Nomor rekening disalin!"); }}
                      className="w-full sm:w-auto px-5 py-3 sm:p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors border border-slate-200 shadow-sm active:scale-95 shrink-0 flex items-center justify-center gap-2"
                      title="Salin Rekening"
                    >
                      <Copy className="w-5 h-5" />
                      <span className="text-xs font-bold sm:hidden">Salin Rekening</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleTopupSubmit} className="space-y-8 pt-8 border-t border-white/60 relative z-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
          
          {/* Custom Input Number (Tanpa Arrow bawaan Browser) */}
          <div>
            <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-widest pl-1">Masukkan Nominal (Rp)</label>
            <input 
              type="number" 
              required min="50000"
              value={topupAmount} 
              onChange={(e) => setTopupAmount(e.target.value === "" ? "" : Number(e.target.value))} 
              className="w-full bg-white/80 backdrop-blur-xl border border-white rounded-[1.5rem] px-6 py-5 text-slate-900 text-3xl md:text-4xl font-black tracking-tighter outline-none transition-all text-center focus:border-emerald-400 focus:ring-[4px] focus:ring-emerald-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02),0_10px_20px_rgba(0,0,0,0.03)] placeholder:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
              placeholder="0" 
            />
          </div>

          {/* Custom File Upload Box */}
          <div>
            <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-widest pl-1">Unggah Bukti Transfer</label>
            <label className="border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-[1.5rem] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/40 hover:bg-emerald-50/50 min-h-[200px] relative overflow-hidden group shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
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
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                    <Upload className="w-7 h-7 text-emerald-500 drop-shadow-sm" />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                    Klik untuk upload bukti<br/>
                    <span className="text-slate-400 font-bold">(Maksimal 5MB)</span>
                  </p>
                </div>
              )}
            </label>
          </div>

          <Button type="submit" disabled={isSubmittingTopup || !topupFile} variant="primary" className="w-full h-14 md:h-16 rounded-[1.25rem] text-sm md:text-base font-black !bg-gradient-to-b !from-emerald-500 !to-emerald-600 hover:!from-emerald-400 hover:!to-emerald-500 !border-emerald-700 !shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_10px_20px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all uppercase tracking-widest">
            {isSubmittingTopup ? "Mengajukan Top-Up..." : "Konfirmasi Top-Up Saldo"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}