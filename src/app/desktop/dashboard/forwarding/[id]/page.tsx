"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Globe2, Anchor, Plane, User, Phone, 
  MapPin, CheckCircle2, Clock, Ban, AlertCircle, 
  Copy, Box, Weight, Maximize, CreditCard, ReceiptText, ShieldCheck, Zap, Mail, Barcode
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Quote } from "@/types/order";
import { cn } from "@/lib/utils";

// Tambahkan ext agar aman jika ada quoteId dari database lama
type QuoteWithDisplayId = Quote & { quoteId?: string };

export default function ForwardingClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteIdParam = params?.id as string;
  const { user, isHydrated } = useAuthStore();

  const [quote, setQuote] = useState<QuoteWithDisplayId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedResi, setCopiedResi] = useState(false);

  // === STYLES ===
  const glassCard = "bg-white/80 backdrop-blur-xl border border-white shadow-[0_15px_40px_rgba(0,0,0,0.04)] rounded-[2.5rem]";

  useEffect(() => {
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  useEffect(() => {
    const fetchQuoteDetail = async () => {
      if (!user?.uid || !quoteIdParam) return;
      setIsLoading(true);

      try {
        const docRef = doc(db, "quotes", quoteIdParam);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userId !== user.uid) {
            setErrorMsg("Akses Ditolak. Anda tidak memiliki izin untuk melihat dokumen ini.");
          } else {
            setQuote({ 
              ...data, 
              id: docSnap.id,
              quoteId: data.id || data.quoteId || docSnap.id 
            } as QuoteWithDisplayId);
          }
        } else {
          setErrorMsg("Dokumen penawaran tidak ditemukan di sistem.");
        }
      } catch (error) {
        console.error("Gagal menarik data penawaran:", error);
        setErrorMsg("Terjadi kesalahan sistem saat memuat data penawaran.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuoteDetail();
  }, [quoteIdParam, user]);

  const formatIDR = (val?: number) => {
    if (!val) return "Menunggu Kalkulasi";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  const getMillis = (ts: unknown) => {
    if (!ts) return 0;
    const t = ts as { seconds?: number; toMillis?: () => number };
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (typeof t.seconds === 'number') return t.seconds * 1000;
    return new Date(ts as string | number).getTime();
  };

  const formatDate = (ts: unknown) => {
    const millis = getMillis(ts);
    if (!millis) return "-";
    return new Date(millis).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleCopyResi = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedResi(true);
    setTimeout(() => setCopiedResi(false), 2000);
  };

  // Status Styling Logic
  const getStatusColor = (status: string) => {
    if (status.includes("Setuju") || status.includes("Approved") || status.includes("Proses") || status.includes("Selesai") || status.includes("In Transit")) {
      return { bg: "bg-emerald-50/80", border: "border-emerald-200", text: "text-emerald-700", icon: <CheckCircle2 className="w-5 h-5"/> };
    }
    if (status.includes("Tolak") || status.includes("Batal")) {
      return { bg: "bg-red-50/80", border: "border-red-200", text: "text-red-700", icon: <Ban className="w-5 h-5"/> };
    }
    return { bg: "bg-amber-50/80", border: "border-amber-200", text: "text-amber-700", icon: <Clock className="w-5 h-5"/> };
  };

  if (isLoading || !isHydrated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center font-sans bg-[#f8fafc] relative z-0">
        <div className="w-16 h-16 border-[5px] border-white border-t-[#C5A059] rounded-full animate-spin mb-6 shadow-sm"></div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Memuat Dokumen</h2>
        <p className="text-[#C5A059] text-[10px] font-black uppercase tracking-widest animate-pulse mt-2">Menghubungkan ke Global Node...</p>
      </main>
    );
  }

  if (errorMsg || !quote) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center font-sans px-6 text-center bg-[#f8fafc]">
        <div className="glass-card p-10 md:p-12 rounded-[3rem] border border-white flex flex-col items-center max-w-lg shadow-xl">
          <div className="w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 text-red-500 rounded-[2rem] flex items-center justify-center mb-8 border border-red-200 shadow-sm"><AlertCircle className="w-12 h-12 drop-shadow-sm" /></div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Terjadi Kesalahan</h2>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed max-w-md">{errorMsg}</p>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="h-14 w-full rounded-[1.25rem] font-black shadow-sm"><ArrowLeft className="w-5 h-5 mr-2" /> Kembali ke Dasbor</Button>
        </div>
      </main>
    );
  }

  const quoteDisplayId = quote.quoteId || quote.id;
  const displayId = quoteDisplayId.startsWith("FFW-") ? quoteDisplayId : `FFW-${quoteDisplayId.substring(0,6).toUpperCase()}`;
  const statusStyle = getStatusColor(quote.status);

  // Helper Backward Compatibility (Menangani Data Lama)
  const oCity = quote.originCity || (quote.origin ? quote.origin.split(",")[0].trim() : "-");
  const dCity = quote.destCity || (quote.destination ? quote.destination.split(",")[0].trim() : "-");

  return (
    <main className="min-h-screen bg-[#f8fafc] py-12 lg:py-20 px-4 md:px-8 relative overflow-hidden font-sans pb-32 z-0">
      
      {/* === AMBIENT GLOWING BACKGROUND === */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[50vh] rounded-full bg-[#C5A059]/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[50vh] rounded-full bg-slate-300/30 blur-[120px]" />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10 space-y-6">
        
        {/* === BACK BUTTON === */}
        <button onClick={() => router.push("/dashboard")} className="glass-card flex items-center gap-2 text-slate-600 hover:text-[#C5A059] hover:bg-white font-bold text-sm transition-all w-fit mb-4 px-5 py-3 rounded-[1.25rem] active:scale-95 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dasbor
        </button>

        {/* ==========================================
            HEADER PESANAN (GLASS BENTO STYLE)
            ========================================== */}
        <div className={`${glassCard} p-6 md:p-10 flex flex-col md:flex-row justify-between md:items-center gap-8 relative overflow-hidden`}>
          <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-[#C5A059]/15 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge variant="gold" className="shadow-sm px-3.5 py-1.5 text-[10px] uppercase tracking-widest font-black flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5"/> Forwarding
              </Badge>
              <span className="text-[10px] font-black text-slate-500 flex items-center gap-1.5 bg-white/60 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5"/> Diajukan: {formatDate(quote.createdAt)}
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-2 font-mono uppercase">#{displayId}</h1>
            </div>
          </div>

          <div className="flex flex-col md:items-end z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status Penawaran</p>
            <div className={cn("px-6 py-3.5 rounded-[1.25rem] text-sm font-black uppercase tracking-widest border flex items-center gap-2.5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_10px_20px_rgba(0,0,0,0.05)] backdrop-blur-md", statusStyle.bg, statusStyle.text, statusStyle.border)}>
              {statusStyle.icon} {quote.status}
            </div>
          </div>
        </div>

        {/* ==========================================
            MAIN CONTENT GRID
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* --------------------------------------
              KOLOM KIRI: Rute & Cargo Specs
              -------------------------------------- */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* RUTE INTERNASIONAL */}
            <div className={`${glassCard} p-6 md:p-8 space-y-8 relative overflow-hidden`}>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2.5 tracking-tight"><MapPin className="w-5 h-5 text-[#C5A059]" /> Rute Lintas Negara</h3>
              
              <div className="relative pl-3">
                <div className="absolute left-[19px] top-8 bottom-8 w-[3px] bg-gradient-to-b from-slate-200 via-slate-200 to-[#C5A059]/40 z-0 rounded-full"></div>
                
                <div className="space-y-8 relative z-10">
                  {/* ORIGIN */}
                  <div className="flex items-start gap-5">
                    <div className="mt-1 bg-white border-[3px] border-slate-200 p-2 rounded-full shadow-sm shrink-0 z-10"><Anchor className="w-4 h-4 text-slate-500" /></div>
                    <div className="min-w-0 w-full">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lokasi Asal (Origin)</p>
                      <div className="bg-white/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]">
                        <div className="flex items-center gap-2 mb-3">
                           <Globe2 className="w-4 h-4 text-[#C5A059] shrink-0" />
                           <p className="font-black text-slate-900 text-lg truncate">{oCity}, <span className="text-slate-500 font-bold">{quote.originCountry}</span></p>
                        </div>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed bg-white/50 p-3 rounded-xl border border-slate-100 line-clamp-2">{quote.origin}</p>
                        {quote.originDetail && <p className="text-[10px] text-slate-500 mt-2 font-medium italic">Patokan: {quote.originDetail}</p>}
                      </div>
                    </div>
                  </div>

                  {/* DESTINATION */}
                  <div className="flex items-start gap-5">
                    <div className="mt-1 bg-white border-[3px] border-[#C5A059]/40 p-2 rounded-full shadow-[0_4px_10px_rgba(197,160,89,0.2)] shrink-0 z-10"><Plane className="w-4 h-4 text-[#C5A059]" /></div>
                    <div className="min-w-0 w-full">
                      <p className="text-[10px] font-black text-[#C5A059]/80 uppercase tracking-widest mb-2">Lokasi Tujuan Akhir</p>
                      <div className="bg-gradient-to-br from-[#DFBE7B]/10 to-transparent backdrop-blur-md p-5 rounded-[1.5rem] border border-[#C5A059]/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]">
                        <div className="flex items-center gap-2 mb-3">
                           <Globe2 className="w-4 h-4 text-[#C5A059] shrink-0" />
                           <p className="font-black text-slate-900 text-lg truncate">{dCity}, <span className="text-slate-500 font-bold">{quote.destCountry}</span></p>
                        </div>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed bg-white/60 p-3 rounded-xl border border-white line-clamp-2">{quote.destination}</p>
                        {quote.destDetail && <p className="text-[10px] text-slate-500 mt-2 font-medium italic">Patokan: {quote.destDetail}</p>}
                        
                        {(quote.receiverName || quote.receiverPhone) && (
                          <div className="mt-4 pt-4 border-t border-[#C5A059]/20 flex flex-wrap items-center justify-between gap-3 text-xs font-black text-slate-600">
                            {quote.receiverName && <span className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-[#C5A059]"/> {quote.receiverName}</span>}
                            {quote.receiverPhone && <span className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100"><Phone className="w-3.5 h-3.5 text-[#C5A059]"/> {quote.receiverPhone}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* INFO PENGIRIM */}
            <div className={`${glassCard} p-6 relative overflow-hidden flex flex-col md:flex-row gap-6 md:items-center justify-between`}>
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-100 rounded-[1.25rem] flex items-center justify-center shrink-0 border border-slate-200"><User className="w-6 h-6 text-slate-400" /></div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Informasi Pemohon</p>
                   <p className="font-black text-slate-900 tracking-tight">{quote.name}</p>
                 </div>
               </div>
               <div className="flex flex-col gap-2">
                 <span className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><Phone className="w-3.5 h-3.5 text-slate-400" /> {quote.phone}</span>
                 <span className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><Mail className="w-3.5 h-3.5 text-slate-400" /> {quote.email}</span>
               </div>
            </div>

          </div>

          {/* --------------------------------------
              KOLOM KANAN: Spek, Tracking & Billing
              -------------------------------------- */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-10">
            
            {/* SPESIFIKASI KARGO (BUG FIX: Conflict background glassCard removed) */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden border border-slate-800 shadow-xl">
              <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-[#C5A059] rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
              <h3 className="text-xs font-black text-white/80 uppercase tracking-widest flex items-center gap-2 mb-5 border-b border-white/10 pb-3 relative z-10">
                <Box className="w-4 h-4 text-[#C5A059]" /> Spesifikasi Kargo
              </h3>
              <div className="space-y-5 relative z-10">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deskripsi Barang (HS Code Base)</p>
                  <p className="text-base font-black text-white leading-relaxed">{quote.itemType}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-inner">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Weight className="w-3.5 h-3.5 text-[#C5A059]"/> Berat Aktual</p>
                    <p className="text-xl font-black text-white">{quote.weight} <span className="text-xs text-slate-500 font-bold ml-0.5">Kg</span></p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-inner">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Maximize className="w-3.5 h-3.5 text-[#C5A059]"/> Dimensi</p>
                    <p className="text-sm font-black text-white mt-1.5">{quote.length}x{quote.width}x{quote.height} <span className="text-[10px] text-slate-500 font-bold ml-0.5">cm</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* TRACKING & RESI */}
            {quote.trackingNumber && (
              <div className="bg-[#C5A059]/5 backdrop-blur-xl border border-[#C5A059]/30 shadow-[0_15px_40px_rgba(197,160,89,0.08)] rounded-[2.5rem] p-6 md:p-8">
                <p className="text-[10px] font-black text-[#C5A059] uppercase tracking-widest mb-3 flex items-center gap-1.5"><Barcode className="w-4 h-4" /> Nomor Resi / AWB</p>
                <div className="flex items-center justify-between bg-white px-5 py-4 rounded-2xl shadow-sm border border-slate-100">
                  <p className="font-mono text-lg font-black tracking-wider text-slate-800">{quote.trackingNumber}</p>
                  <button onClick={() => handleCopyResi(quote.trackingNumber!)} className="text-[#C5A059] hover:text-[#A68345] active:scale-95 transition-all p-2.5 bg-slate-50 hover:bg-[#C5A059]/10 rounded-xl">
                    {copiedResi ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* KARTU TAGIHAN PREMIUM */}
            <div className="bg-gradient-to-b from-[#C5A059] to-[#A68345] text-slate-900 rounded-[2.5rem] shadow-[0_24px_50px_rgba(197,160,89,0.3)] border border-[#DFBE7B] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-[100px] opacity-20 pointer-events-none transition-opacity duration-700"></div>
              
              <div className="p-8 md:p-10 relative z-10">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3 tracking-tight"><ReceiptText className="w-6 h-6 text-slate-900/60" /> Quotation Price</h3>
                
                <div className="space-y-4 mb-8 text-sm font-bold text-slate-900/80">
                  <div className="flex items-start gap-3 bg-white/20 p-4 rounded-2xl border border-white/30">
                    <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      Biaya Freight, Duty & Tax (Landed Cost). Tidak ada biaya tersembunyi selain yang tercantum pada Quotation Resmi.
                    </p>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-900/10">
                  <p className="text-[10px] font-black text-slate-900/60 uppercase tracking-widest mb-1">Total Tagihan Final</p>
                  <p className="text-4xl font-black tracking-tighter drop-shadow-sm text-white">
                    {formatIDR(quote.offeredPrice)}
                  </p>
                </div>
              </div>

              <div className="px-8 md:px-10 py-6 bg-slate-900/10 border-t border-slate-900/10 flex flex-col gap-3 relative z-10">
                 {!quote.offeredPrice || quote.status.includes("Pending") ? (
                   <div className="flex items-center justify-center gap-2 text-xs font-black text-slate-900 bg-white/40 p-4 rounded-xl shadow-inner border border-white/30">
                     <Zap className="w-4 h-4 animate-pulse" /> Sedang Dikalkulasi Pakar Bea Cukai
                   </div>
                 ) : (
                   <Button onClick={() => window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Tim Flash Global,\nSaya ingin mengonfirmasi Quotation untuk:\nID: ${displayId}\nTotal: ${formatIDR(quote.offeredPrice)}\nMohon instruksi pembayaran.`)}`, "_blank")} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg">
                     <CreditCard className="w-5 h-5 mr-2" /> Konfirmasi & Bayar
                   </Button>
                 )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}