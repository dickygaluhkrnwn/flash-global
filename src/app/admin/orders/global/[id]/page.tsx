"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Globe, MapPin, User, Mail, Phone, 
  Weight, Box, PlaneTakeoff, FileText, CheckCircle2, AlertCircle 
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// IMPORT GLOBAL TYPES
import { Quote } from "@/types/order";

export default function GlobalOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Form State
  const [price, setPrice] = useState("");
  const [docUrl, setDocUrl] = useState("");

  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
  const glassCard = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] rounded-[1.5rem]";

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const docRef = doc(db, "quotes", params.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Quote;
          setQuote(data);
          if (data.offeredPrice) setPrice(data.offeredPrice.toString());
          if (data.customsDocUrl) setDocUrl(data.customsDocUrl);
        } else {
          showToast("error", "Data kuotasi tidak ditemukan.");
          setTimeout(() => router.push("/admin/orders/global"), 2000);
        }
      } catch (error) {
        console.error("Gagal menarik data detail:", error);
        showToast("error", "Koneksi database bermasalah.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuote();
  }, [params.id, router]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "quotes", quote.id), {
        offeredPrice: Number(price),
        customsDocUrl: docUrl,
        status: "Menunggu Persetujuan Klien"
      });
      
      // Update local state to reflect changes
      setQuote(prev => prev ? { ...prev, offeredPrice: Number(price), customsDocUrl: docUrl, status: "Menunggu Persetujuan Klien" } : null);
      showToast("success", "Penawaran Bea Cukai berhasil diterbitkan!");
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal menyimpan penawaran.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin mb-4"></div>
        <p className="text-[#C5A059] text-xs font-bold uppercase tracking-widest animate-pulse">Menarik Data Dokumen...</p>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto">
      {/* GLOBAL TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP NAV & BREADCRUMB IN-PAGE */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            Detail Kuotasi Kargo
          </h1>
          <p className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest">ID Referensi: #{quote.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* KIRI: INFORMASI KARGO & KLIEN */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Rute Global */}
          <div className={`${glassPanel} rounded-[2rem] p-8 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#C5A059] rounded-full blur-[80px] opacity-10 pointer-events-none" />
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Globe className="w-4 h-4"/> Jalur Penerbangan</h2>
            
            <div className="relative pl-6 space-y-8">
              <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-slate-200 border-dashed border-l border-slate-300"></div>
              
              <div className="flex items-start gap-4 relative">
                <span className="absolute -left-[31px] mt-1 w-4 h-4 bg-slate-300 rounded-full border-4 border-white shadow-sm"></span>
                <div className="w-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Origin (Asal)</p>
                  <p className="text-xl font-black text-slate-800">{quote.originCountry}</p>
                  <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> {quote.origin}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 relative">
                <span className="absolute -left-[31px] mt-1 w-4 h-4 bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] rounded-full border-4 border-white shadow-[0_0_8px_rgba(197,160,89,0.5)]"></span>
                <div className="w-full">
                  <p className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest mb-1">Destination (Tujuan)</p>
                  <p className="text-xl font-black text-slate-800">{quote.destCountry}</p>
                  <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> {quote.destination}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Spesifikasi Barang */}
          <div className={`${glassPanel} rounded-[2rem] p-8`}>
             <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Box className="w-4 h-4"/> Spesifikasi Kargo</h2>
             
             <div className="grid grid-cols-2 gap-4">
                <div className={`${glassCard} p-4`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Jenis Komoditi (HS Basis)</p>
                  <p className="text-base font-black text-slate-800 flex items-center gap-2"><PlaneTakeoff className="w-4 h-4 text-[#C5A059]"/> {quote.itemType}</p>
                </div>
                <div className={`${glassCard} p-4`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Berat Total</p>
                  <p className="text-base font-black text-slate-800 flex items-center gap-2"><Weight className="w-4 h-4 text-slate-400"/> {quote.weight} Kg</p>
                </div>
                <div className={`${glassCard} p-4 col-span-2 flex justify-between items-center`}>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dimensi Fisik (PxLxT)</p>
                    <p className="text-base font-black text-slate-800">{quote.length} x {quote.width} x {quote.height} <span className="text-sm text-slate-400">cm</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Servis Opsi</p>
                    <AdminBadge variant="outline">{quote.serviceType}</AdminBadge>
                  </div>
                </div>
             </div>
          </div>

          {/* Card 3: Informasi Klien */}
          <div className={`${glassPanel} rounded-[2rem] p-8`}>
             <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><User className="w-4 h-4"/> Detail Pemohon</h2>
             <div className="space-y-4">
               <div className="flex items-center gap-3 bg-white/50 p-3 rounded-xl border border-white">
                 <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">{quote.name[0]}</div>
                 <div>
                   <p className="text-sm font-black text-slate-900">{quote.name}</p>
                   <p className="text-xs font-medium text-slate-500">Akun Terdaftar</p>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4 mt-2">
                 <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white/50 p-3 rounded-xl border border-white"><Mail className="w-4 h-4 text-slate-400"/> {quote.email}</div>
                 <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white/50 p-3 rounded-xl border border-white"><Phone className="w-4 h-4 text-slate-400"/> {quote.phone}</div>
               </div>
             </div>
          </div>

        </div>

        {/* KANAN: FORM PENAWARAN (ACTION PANEL) */}
        <div className="lg:col-span-5">
          <div className={`${glassPanel} rounded-[2.5rem] p-8 sticky top-24`}>
            <div className="mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_16px_rgba(197,160,89,0.3)] border border-[#A68345] mb-4">
                <FileText className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Kalkulasi Bea & Freight</h2>
              <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                Silakan lakukan perhitungan cermat di luar sistem (Pajak, Cukai, Freight). Masukkan total harga final ke form ini beserta dokumen resminya.
              </p>
            </div>

            <form onSubmit={handleSaveQuote} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                  <span>Harga Penawaran Final</span>
                  {price && <span className="text-[#C5A059]">{formatRupiah(Number(price))}</span>}
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold z-10">Rp</span>
                  <AdminInput 
                    type="number" 
                    required 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    className="pl-12 h-14 font-black text-lg focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/20 shadow-inner" 
                    placeholder="0" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Dokumen Pendukung (GDrive/PDF)</label>
                <AdminInput 
                  type="url" 
                  required 
                  value={docUrl} 
                  onChange={(e) => setDocUrl(e.target.value)} 
                  className="h-12 font-medium focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/20" 
                  placeholder="https://drive.google.com/..." 
                />
              </div>

              <div className="pt-6 border-t border-slate-200/50 mt-6">
                <AdminButton 
                  type="submit" 
                  variant="gold" 
                  className="w-full h-14 font-black text-sm shadow-[0_8px_20px_rgba(197,160,89,0.3)] hover:shadow-[0_12px_25px_rgba(197,160,89,0.4)]"
                  isLoading={isSaving}
                >
                  Terbitkan Penawaran ke Klien
                </AdminButton>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}