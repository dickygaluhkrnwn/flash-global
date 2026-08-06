import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, Building2, 
  Copy, Upload, ChevronRight, MapPin, Receipt, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OrderDetail, LocationDetail } from "@/types/order";
import { PaymentConfig } from "../page";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Props {
  b2bLimit: number; // Disimpan di interface agar tidak merusak prop dari parent, meski UI limit-nya kita buang
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
  const { 
    totalDebt, unpaidOrders, paymentConfig, 
    receiptFile, setReceiptFile, receiptPreview, setReceiptPreview, 
    handleBulkPayment, isUploadingBulk, showToast, formatRupiah 
  } = props;
  
  const router = useRouter();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }} 
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative z-10 w-full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* ======================================================== */}
        {/* KOLOM KIRI: DAFTAR INVOICE TERTUNDA (APPLE LIST STYLE) */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-3 pl-2">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black border border-amber-200 shadow-sm">1</div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Rincian Manifes Tertunda</h3>
          </div>

          <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-4 sm:p-6 border border-white shadow-[0_10px_30px_rgba(0,0,0,0.03)] h-full min-h-[400px]">
            {unpaidOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6">
                <div className="w-20 h-20 bg-emerald-50/80 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-200 shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Tagihan Bersih</h3>
                <p className="text-xs text-slate-500 mt-2 font-medium max-w-xs leading-relaxed">Anda telah melunasi semua invoice. Limit kredit Anda kembali maksimal.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unpaidOrders.map((order) => {
                  const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
                  const originAddress = originObj?.address || (typeof order.origin === 'string' ? order.origin : "-");
                  
                  let destAddress = order.destination || "-";
                  if (order.destinations && order.destinations.length > 0) {
                    destAddress = order.destinations.length > 1 ? `${order.destinations.length} Titik Tujuan` : (order.destinations[0].address || "Tujuan");
                  }
                  
                  const amount = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
                  
                  // Routing Cerdas berdasarkan Kategori
                  const detailPath = order.category?.toLowerCase() === "internasional" 
                    ? `/dashboard/forwarding/${order.id}` 
                    : `/dashboard/${order.id}`;

                  return (
                    <div 
                      key={order.id} 
                      onClick={() => router.push(detailPath)}
                      className="bg-white/80 hover:bg-white backdrop-blur-xl border border-white rounded-[1.5rem] p-5 cursor-pointer group shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all active:scale-[0.98] flex flex-col sm:flex-row gap-4 justify-between"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 shadow-sm">
                          <Receipt className="w-5 h-5 drop-shadow-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-mono font-black text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded border border-amber-200 text-[10px] uppercase tracking-widest">{order.resi || order.id.substring(0,8)}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase">{order.category || "Domestik"}</span>
                          </div>
                          
                          <div className="space-y-1 mt-2 text-xs font-bold text-slate-600">
                            <p className="truncate flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0"/> {originAddress}</p>
                            <p className="truncate flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0"/> {destAddress}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:flex-col sm:justify-center sm:items-end gap-2 shrink-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest sm:hidden">Total Tagihan</p>
                        <span className="text-base font-black text-slate-900 tracking-tight">{formatRupiah(amount)}</span>
                        <div className="hidden sm:flex items-center gap-1 text-[10px] font-black text-blue-500 uppercase tracking-widest group-hover:text-blue-600">
                          Lihat Detail <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* KOLOM KANAN: KONFIRMASI & UPLOAD BUKTI BAYAR */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-3 pl-2">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black border border-amber-200 shadow-sm">2</div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Pelunasan Massal</h3>
          </div>

          <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-8 border border-white shadow-[0_15px_40px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,1)] flex flex-col space-y-6">
            
            {/* 1. Rincian Nominal */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-[1.5rem] border border-red-200 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-red-400/10 rounded-full blur-[40px] pointer-events-none" />
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 relative z-10">Total Harus Dibayar</span>
              <span className="text-4xl sm:text-5xl font-black text-red-600 tracking-tighter relative z-10">{formatRupiah(totalDebt)}</span>
            </div>

            {/* 2. Daftar Bank */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 block uppercase tracking-widest pl-1">Transfer Pembayaran Ke:</label>
              {paymentConfig?.transferBank && paymentConfig.transferBank.length > 0 ? (
                paymentConfig.transferBank.map((bank, idx) => (
                  <div key={idx} className="bg-white/80 backdrop-blur-sm border border-white rounded-[1.25rem] p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
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
                      className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors border border-slate-100 shadow-sm active:scale-95 shrink-0"
                      title="Salin Rekening"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs font-bold text-slate-500 p-4 border border-dashed rounded-2xl bg-white/50 text-center">Metode pembayaran belum tersedia.</p>
              )}
            </div>

            {/* 3. Upload Bukti */}
            <div className="pt-2">
              <label className="text-[10px] font-black text-slate-400 block uppercase tracking-widest pl-1 mb-2">Unggah Bukti Transfer</label>
              <label className={cn(
                "border-2 border-dashed rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center transition-all min-h-[140px] relative overflow-hidden group shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]", 
                unpaidOrders.length === 0 ? "border-slate-200 bg-white/40 opacity-50 cursor-not-allowed" : "border-indigo-300 hover:border-indigo-500 bg-white/60 cursor-pointer hover:bg-indigo-50/50"
              )}>
                <input type="file" accept="image/*" disabled={unpaidOrders.length === 0} onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setReceiptFile(e.target.files[0]);
                    setReceiptPreview(URL.createObjectURL(e.target.files[0]));
                  }
                }} className="hidden" />
                
                <AnimatePresence mode="wait">
                  {receiptPreview ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-slate-900/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={receiptPreview} alt="Pratinjau" className="max-h-[85%] rounded-xl object-contain shadow-2xl border border-white/20" />
                      <div className="absolute bottom-4 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[10px] font-bold tracking-widest uppercase border border-white/30 flex items-center gap-1.5 shadow-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Bukti Terlampir
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-6 h-6 text-amber-500 drop-shadow-sm" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pilih Bukti Transfer<br/><span className="font-bold text-slate-400">(Maks 5MB)</span></p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </label>
            </div>

            {/* 4. Action Button */}
            <div className="pt-4 border-t border-slate-200/50 flex flex-col items-center gap-4">
              <p className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-emerald-500"/> Transaksi Terenkripsi Aman
              </p>
              <Button 
                onClick={handleBulkPayment} 
                disabled={isUploadingBulk || unpaidOrders.length === 0 || !receiptFile} 
                variant="primary" 
                className="w-full h-14 rounded-[1.25rem] text-sm font-black !bg-gradient-to-b !from-amber-500 !to-orange-500 hover:!from-amber-400 hover:!to-orange-400 !border-orange-600 !shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_10px_20px_rgba(245,158,11,0.3)] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
              >
                {isUploadingBulk ? "Memproses Data..." : "Konfirmasi Pembayaran"}
              </Button>
            </div>

          </div>
        </div>

      </div>
    </motion.div>
  );
}