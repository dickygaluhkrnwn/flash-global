"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Globe2, Anchor, Plane, User, Phone, 
  MapPin, CheckCircle2, Clock, Ban, AlertCircle, 
  Copy, Box, Weight, Maximize, CreditCard, ReceiptText, 
  ShieldCheck, Zap, Barcode
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Quote } from "@/types/order";
import { cn } from "@/lib/utils";

type QuoteWithDisplayId = Quote & { quoteId?: string };

export default function MobileForwardingClientDetail() {
  const router = useRouter();
  const params = useParams();
  const quoteIdParam = params?.id as string;
  const { user, isHydrated } = useAuthStore();

  const [quote, setQuote] = useState<QuoteWithDisplayId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedResi, setCopiedResi] = useState(false);

  // === STYLES ===
  const glassCard = "bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-[1.5rem]";

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
          setErrorMsg("Dokumen penawaran tidak ditemukan.");
        }
      } catch (error) {
        console.error("Gagal menarik data:", error);
        setErrorMsg("Terjadi kesalahan sistem saat memuat data.");
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

  const getStatusColor = (status: string) => {
    if (status.includes("Setuju") || status.includes("Approved") || status.includes("Proses") || status.includes("Selesai") || status.includes("In Transit")) {
      return { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: <CheckCircle2 className="w-4 h-4"/> };
    }
    if (status.includes("Tolak") || status.includes("Batal")) {
      return { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: <Ban className="w-4 h-4"/> };
    }
    return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: <Clock className="w-4 h-4"/> };
  };

  if (isLoading || !isHydrated) {
    return (
      <div className="fixed inset-0 z-[150] bg-[#f8fafc] flex flex-col items-center justify-center font-sans overflow-hidden">
        <div className="w-12 h-12 border-4 border-white border-t-[#C5A059] rounded-full animate-spin mb-4 shadow-sm"></div>
        <p className="text-[#C5A059] text-[10px] font-black uppercase tracking-widest animate-pulse">Sinkronisasi Satelit...</p>
      </div>
    );
  }

  if (errorMsg || !quote) {
    return (
      <div className="fixed inset-0 z-[150] bg-[#f8fafc] flex items-center justify-center font-sans px-4">
        <div className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[2rem] flex flex-col items-center max-w-sm text-center shadow-xl w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4"><AlertCircle className="w-8 h-8" /></div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-500 text-xs font-medium mb-6">{errorMsg}</p>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="w-full rounded-xl"><ArrowLeft className="w-4 h-4 mr-2"/> Kembali</Button>
        </div>
      </div>
    );
  }

  const quoteDisplayId = quote.quoteId || quote.id;
  const displayId = quoteDisplayId.startsWith("FFW-") ? quoteDisplayId : `FFW-${quoteDisplayId.substring(0,6).toUpperCase()}`;
  const statusStyle = getStatusColor(quote.status);

  // Helper Backward Compatibility
  const oCity = quote.originCity || (quote.origin ? quote.origin.split(",")[0].trim() : "-");
  const dCity = quote.destCity || (quote.destination ? quote.destination.split(",")[0].trim() : "-");

  return (
    <div className="fixed inset-0 z-[150] bg-[#f8fafc] flex justify-center font-sans overflow-hidden">
      <div className="w-full max-w-md relative flex flex-col h-[100dvh] bg-[#f8fafc] shadow-2xl">
        
        {/* AMBIENT GLOW LOKAL */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-5%] left-[-10%] w-[60vw] h-[30vh] rounded-full bg-[#C5A059]/15 blur-[80px]" />
          <div className="absolute bottom-[-5%] right-[-10%] w-[60vw] h-[30vh] rounded-full bg-slate-300/30 blur-[80px]" />
        </div>

        {/* 1. APP BAR (NATIVE HEADER) */}
        <div className="flex-none bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm pt-safe relative z-[100]">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-slate-700 bg-slate-100 rounded-full active:scale-90 tap-highlight-transparent transition-transform border border-white shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Kargo Global</h2>
              <p className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest">{displayId}</p>
            </div>
            <div className="w-10 h-10" /> {/* Spacer untuk centering */}
          </div>
        </div>

        {/* 2. SCROLLABLE CONTENT */}
        <main className="flex-grow overflow-y-auto overflow-x-hidden p-4 pb-[110px] relative z-10 no-scrollbar space-y-4">
          
          {/* HEADER STATUS CARD */}
          <div className={`${glassCard} p-5 flex flex-col items-center text-center`}>
            <Badge variant="gold" className="mb-3 px-3 py-1 shadow-sm"><Globe2 className="w-3 h-3 mr-1"/> Forwarding</Badge>
            <h1 className="text-3xl font-black text-slate-900 mb-1 font-mono tracking-tighter">#{displayId}</h1>
            <p className="text-xs font-bold text-slate-500 mb-4">Diajukan: {formatDate(quote.createdAt)}</p>
            <div className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border flex items-center gap-2", statusStyle.bg, statusStyle.text, statusStyle.border)}>
              {statusStyle.icon} {quote.status}
            </div>
          </div>

          {/* KARTU RUTE */}
          <div className={`${glassCard} p-5 space-y-6 relative`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/10 rounded-full blur-[40px] pointer-events-none z-0" />
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 relative z-10"><MapPin className="w-4 h-4 text-[#C5A059]" /> Lintas Negara</h3>
            
            <div className="relative pl-2.5 z-10">
              <div className="absolute left-[13px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-slate-200 via-slate-200 to-[#C5A059]/40 z-0 rounded-full"></div>
              
              <div className="space-y-6 relative z-10">
                {/* ORIGIN */}
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-white border-2 border-slate-200 p-1.5 rounded-full shadow-sm shrink-0 z-10"><Anchor className="w-3 h-3 text-slate-500" /></div>
                  <div className="min-w-0 w-full bg-white/60 p-3.5 rounded-2xl border border-white shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Origin</p>
                    <p className="font-black text-slate-900 text-sm">{oCity}, {quote.originCountry}</p>
                    <p className="text-xs font-medium text-slate-600 mt-1 line-clamp-2">{quote.origin}</p>
                  </div>
                </div>

                {/* DESTINATION */}
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-white border-2 border-[#C5A059]/40 p-1.5 rounded-full shadow-sm shrink-0 z-10"><Plane className="w-3 h-3 text-[#C5A059]" /></div>
                  <div className="min-w-0 w-full bg-gradient-to-br from-[#DFBE7B]/10 to-transparent p-3.5 rounded-2xl border border-[#C5A059]/20 shadow-sm">
                    <p className="text-[9px] font-black text-[#C5A059]/80 uppercase tracking-widest mb-1.5">Destination</p>
                    <p className="font-black text-slate-900 text-sm">{dCity}, {quote.destCountry}</p>
                    <p className="text-xs font-medium text-slate-600 mt-1 line-clamp-2">{quote.destination}</p>
                    
                    {(quote.receiverName || quote.receiverPhone) && (
                      <div className="mt-3 pt-3 border-t border-[#C5A059]/20 space-y-1.5">
                        {quote.receiverName && <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><User className="w-3 h-3 text-[#C5A059]"/> {quote.receiverName}</p>}
                        {quote.receiverPhone && <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#C5A059]"/> {quote.receiverPhone}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SPESIFIKASI KARGO (DARK MODE) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-[1.5rem] relative overflow-hidden border border-slate-800 shadow-lg">
            <div className="absolute top-[-20%] right-[-20%] w-24 h-24 bg-[#C5A059] rounded-full blur-[40px] opacity-20 pointer-events-none"></div>
            <h3 className="text-xs font-black text-white/80 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-white/10 pb-2 relative z-10">
              <Box className="w-4 h-4 text-[#C5A059]" /> Spesifikasi
            </h3>
            <div className="space-y-4 relative z-10">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">HS Code / Deskripsi</p>
                <p className="text-sm font-black text-white leading-relaxed">{quote.itemType}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Weight className="w-3 h-3 text-[#C5A059]"/> Berat</p>
                  <p className="text-base font-black text-white">{quote.weight} <span className="text-[10px] text-slate-500">Kg</span></p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Maximize className="w-3 h-3 text-[#C5A059]"/> Dimensi</p>
                  <p className="text-sm font-black text-white mt-1">{quote.length}x{quote.width}x{quote.height} <span className="text-[10px] text-slate-500">cm</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* TRACKING & RESI */}
          {quote.trackingNumber && (
            <div className="bg-[#C5A059]/5 backdrop-blur-md border border-[#C5A059]/30 rounded-[1.5rem] p-5">
              <p className="text-[9px] font-black text-[#C5A059] uppercase tracking-widest mb-2 flex items-center gap-1.5"><Barcode className="w-4 h-4" /> Nomor Resi / AWB</p>
              <div className="flex items-center justify-between bg-white px-3 py-2.5 rounded-xl shadow-sm border border-slate-100">
                <p className="font-mono text-sm font-black tracking-wider text-slate-800">{quote.trackingNumber}</p>
                <button onClick={() => handleCopyResi(quote.trackingNumber!)} className="text-[#C5A059] active:scale-95 transition-all p-1.5 bg-slate-50 rounded-lg">
                  {copiedResi ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* INFO PIC */}
          <div className={`${glassCard} p-5 flex items-center justify-between gap-3`}>
             <div className="flex items-center gap-3 min-w-0">
               <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200"><User className="w-5 h-5 text-slate-400" /></div>
               <div className="min-w-0">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pemohon</p>
                 <p className="text-sm font-black text-slate-900 truncate">{quote.name}</p>
               </div>
             </div>
             <a href={`tel:${quote.phone}`} className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0 shadow-sm active:scale-95"><Phone className="w-4 h-4"/></a>
          </div>

          {/* TAGIHAN PREMIUM */}
          <div className="bg-gradient-to-b from-[#C5A059] to-[#A68345] text-slate-900 rounded-[1.5rem] shadow-lg border border-[#DFBE7B] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-[50px] opacity-20 pointer-events-none"></div>
            
            <div className="p-6 relative z-10">
              <h3 className="text-sm font-black mb-4 flex items-center gap-2"><ReceiptText className="w-4 h-4 opacity-60" /> Quotation Price</h3>
              <div className="bg-white/20 p-3 rounded-xl border border-white/30 mb-5">
                <p className="text-[10px] font-bold leading-relaxed flex items-start gap-1.5"><ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Freight, Duty & Tax (Landed Cost). Tidak ada biaya tersembunyi.</p>
              </div>
              <div className="border-t border-slate-900/10 pt-4">
                <p className="text-[9px] font-black text-slate-900/60 uppercase tracking-widest mb-0.5">Total Tagihan Final</p>
                <p className="text-3xl font-black tracking-tighter text-white">{formatIDR(quote.offeredPrice)}</p>
              </div>
            </div>
          </div>
          
        </main>

        {/* 3. ACTION BAR (FOOTER NATIVE) */}
        <div className="absolute bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-200 p-4 pb-safe bg-white/95 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          {!quote.offeredPrice || quote.status.includes("Pending") ? (
            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-600 bg-slate-100 p-3.5 rounded-[1.25rem] border border-slate-200 shadow-inner">
              <Zap className="w-4 h-4 animate-pulse text-[#C5A059]" /> Sedang Dikalkulasi Pakar
            </div>
          ) : (
            <button 
              onClick={() => window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Tim Flash Global,\nSaya mengonfirmasi Quotation ID: ${displayId}\nTotal: ${formatIDR(quote.offeredPrice)}\nMohon info pembayaran.`)}`, "_blank")}
              className="w-full h-14 bg-slate-900 text-white font-black text-sm shadow-xl active:scale-95 rounded-[1.25rem] flex items-center justify-center gap-2 border border-slate-800 transition-all tap-highlight-transparent"
            >
              <CreditCard className="w-5 h-5" /> Konfirmasi & Bayar
            </button>
          )}
        </div>

      </div>
    </div>
  );
}