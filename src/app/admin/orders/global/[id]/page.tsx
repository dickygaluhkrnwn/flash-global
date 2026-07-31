"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Globe2, User, MapPin, 
  Calendar, Box, Weight, Building2, DollarSign, 
  Barcode, ClipboardList, Edit3, Save, X, Navigation,
  Maximize
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Quote, FirebaseTimestamp } from "@/types/order"; 

import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { AdminButton } from "@/components/admin/ui/AdminButton";

export default function GlobalOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for Edit Modal
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Quote>>({});

  const glassCard = "bg-white/80 backdrop-blur-xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-[1.5rem]";
  const inputGlass = "bg-slate-50 border border-slate-200 focus:bg-white focus:ring-[3px] focus:ring-[#C5A059]/20 focus:border-[#C5A059]/50 transition-all rounded-xl outline-none";

  useEffect(() => {
    if (!id) return;
    const fetchQuote = async () => {
      try {
        const docRef = doc(db, "quotes", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Quote;
          setQuote(data);
          // Set initial edit data
          setEditData({
            status: data.status,
            offeredPrice: data.offeredPrice || 0,
            vendorName: data.vendorName || "",
            vendorBill: data.vendorBill || 0,
            trackingNumber: data.trackingNumber || "",
            pickupDate: data.pickupDate || "",
            receiverName: data.receiverName || "",
            receiverPhone: data.receiverPhone || "",
            adminNotes: data.adminNotes || ""
          });
        }
      } catch (error) {
        console.error("Gagal menarik data detail:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuote();
  }, [id]);

  const handleSave = async () => {
    if (!quote) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, "quotes", quote.id);
      
      const payload: Partial<Quote> = {
        status: editData.status,
        offeredPrice: Number(editData.offeredPrice) || 0,
        vendorName: editData.vendorName,
        vendorBill: Number(editData.vendorBill) || 0,
        trackingNumber: editData.trackingNumber,
        pickupDate: editData.pickupDate,
        receiverName: editData.receiverName,
        receiverPhone: editData.receiverPhone,
        adminNotes: editData.adminNotes,
      };

      await updateDoc(docRef, payload);
      setQuote({ ...quote, ...payload });
      setIsEditing(false);
    } catch (error) {
      console.error("Gagal update data:", error);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatRupiah = (val?: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);
  
  // KODE DIBERSIHKAN: Type-Safe FirebaseTimestamp Extract + Native Date Support
  const getMillis = (timestamp: FirebaseTimestamp | Date) => {
    if (!timestamp) return 0;
    if (timestamp instanceof Date) return timestamp.getTime(); // <-- Support native Date
    
    if (typeof timestamp === 'object' && timestamp !== null) {
      const ts = timestamp as Extract<FirebaseTimestamp, object>;
      if (typeof ts.toMillis === 'function') return ts.toMillis();
      if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    }
    return new Date(timestamp as string | number).getTime();
  };

  const formatDate = (ts: FirebaseTimestamp | Date) => {
    const millis = getMillis(ts);
    if (!millis) return "-";
    return new Date(millis).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-[#C5A059]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#C5A059] border-t-[#7A171D] rounded-full animate-spin"></div>
        </div>
        <p className="text-[#C5A059] text-xs font-bold uppercase tracking-widest animate-pulse">Menarik Data Dokumen...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <h2 className="text-3xl font-black text-slate-800">Dokumen Tidak Ditemukan</h2>
        <AdminButton onClick={() => router.back()} variant="outline" className="mt-6">Kembali</AdminButton>
      </div>
    );
  }

  // Tentukan varian badge
  let badgeVariant: "success"|"warning"|"danger"|"default" = "default";
  if (quote.status.includes("Setuju") || quote.status.includes("Approved") || quote.status.includes("Proses") || quote.status.includes("Transit") || quote.status.includes("Selesai")) badgeVariant = "success";
  else if (quote.status.includes("Menunggu") || quote.status.includes("Pending")) badgeVariant = "warning";
  else if (quote.status.includes("Tolak") || quote.status.includes("Batal")) badgeVariant = "danger";

  // Identifikasi Display ID
  const quoteDisplayId = quote.quoteId || quote.id;
  const displayId = quoteDisplayId.startsWith("FFW-") ? quoteDisplayId : `FFW-${quoteDisplayId.substring(0,6).toUpperCase()}`;

  return (
    <div className="space-y-8 pb-16 font-sans max-w-[1200px] mx-auto">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Order #{displayId}
            </h1>
            <p className="text-xs font-bold text-slate-400 mt-1">Diajukan: {formatDate(quote.createdAt!)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AdminBadge variant={badgeVariant} className="px-4 py-1.5 text-xs shadow-sm">{quote.status}</AdminBadge>
          <AdminButton onClick={() => setIsEditing(true)} variant="gold" className="shadow-md">
            <Edit3 className="w-4 h-4 mr-2" /> Lengkapi Data
          </AdminButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: PENGIRIM & PENERIMA */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SHIPPER CARD */}
          <div className={`${glassCard} p-6 md:p-8 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full pointer-events-none"></div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <User className="w-4 h-4 text-indigo-500" /> Shipper (Pengirim)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Pengirim</p>
                <p className="text-sm font-bold text-slate-800">{quote.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">No. WhatsApp</p>
                <p className="text-sm font-bold text-slate-800">{quote.phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Negara Asal</p>
                <div className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-slate-400"/><p className="text-sm font-bold text-slate-800">{quote.originCountry}</p></div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jadwal Pickup</p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400"/>
                  <p className="text-sm font-bold text-slate-800">{quote.pickupDate ? new Date(quote.pickupDate).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : <span className="text-slate-400 italic">Belum diatur</span>}</p>
                </div>
              </div>
              <div className="md:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Detail Lokasi Penjemputan</p>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">{quote.origin}</p>
                {quote.originDetail && <p className="text-[11px] text-slate-500 mt-1 font-medium italic">Catatan: {quote.originDetail}</p>}
              </div>
            </div>
          </div>

          {/* CONSIGNEE CARD */}
          <div className={`${glassCard} p-6 md:p-8 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none"></div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <Navigation className="w-4 h-4 text-emerald-500" /> Consignee (Penerima)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Penerima</p>
                <p className="text-sm font-bold text-slate-800">{quote.receiverName || <span className="text-slate-400 italic">Belum diinput admin</span>}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">No. Telepon Penerima</p>
                <p className="text-sm font-bold text-slate-800">{quote.receiverPhone || <span className="text-slate-400 italic">Belum diinput</span>}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Negara Tujuan</p>
                <div className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-slate-400"/><p className="text-sm font-bold text-slate-800">{quote.destCountry}</p></div>
              </div>
              <div className="md:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Detail Lokasi Tujuan</p>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">{quote.destination}</p>
                {quote.destDetail && <p className="text-[11px] text-slate-500 mt-1 font-medium italic">Catatan: {quote.destDetail}</p>}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SPECS & VENDOR */}
        <div className="space-y-6">
          
          {/* CARGO SPECS */}
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

          {/* VENDOR & BILLING */}
          <div className="bg-[#C5A059]/5 backdrop-blur-xl border border-[#C5A059]/30 shadow-[0_15px_40px_rgba(197,160,89,0.08)] rounded-[2.5rem] p-6 md:p-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-5 border-b border-slate-200 pb-3">
              <Building2 className="w-4 h-4 text-[#C5A059]" /> Info Pengiriman & Vendor
            </h3>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">AWB / Connote / Resi</p>
                <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-100">
                  <Barcode className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <p className="text-sm font-black text-slate-800 font-mono tracking-wider">{quote.trackingNumber || <span className="text-slate-400 italic font-sans font-medium tracking-normal text-xs">Menunggu Input Resi</span>}</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Vendor</p>
                  <p className="text-xs font-bold text-slate-800">{quote.vendorName || "-"}</p>
                </div>
                <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><DollarSign className="w-3 h-3"/> Tagihan Vendor (Cost)</p>
                  <p className="text-xs font-black text-red-600">{quote.vendorBill ? formatRupiah(quote.vendorBill) : "-"}</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 rounded-2xl shadow-md border border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Biaya Pengiriman (Harga Jual Klien)</p>
                <p className="text-2xl font-black text-emerald-400 tracking-tight">{quote.offeredPrice ? formatRupiah(quote.offeredPrice) : <span className="text-sm font-medium italic text-slate-500">Belum ada penawaran</span>}</p>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><ClipboardList className="w-3 h-3"/> Catatan Admin</p>
                <p className="text-xs font-medium text-slate-600 leading-relaxed bg-white/80 p-4 rounded-2xl border border-slate-200 italic shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                  {quote.adminNotes ? `"${quote.adminNotes}"` : "Tidak ada catatan."}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL EDIT DATA (NATIVE OVERLAY)                          */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2"><Edit3 className="w-5 h-5 text-[#C5A059]"/> Update Data Pengiriman</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Lengkapi data hasil diskusi dengan klien</p>
                </div>
                <button onClick={() => setIsEditing(false)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-500 rounded-full hover:bg-slate-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* 1. Status & Harga */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Status Penawaran</label>
                    <select 
                      value={editData.status} 
                      onChange={(e) => setEditData({...editData, status: e.target.value})}
                      className={`w-full px-4 py-3 text-sm font-bold text-slate-800 ${inputGlass}`}
                    >
                      <option value="Pending CS Quote">Pending CS Quote</option>
                      <option value="Menunggu Persetujuan">Menunggu Persetujuan Klien</option>
                      <option value="Disetujui - Proses Pickup">Disetujui (Proses Pickup)</option>
                      <option value="Dalam Perjalanan (In Transit)">Dalam Perjalanan (In Transit)</option>
                      <option value="Selesai Dikirim">Selesai Dikirim</option>
                      <option value="Ditolak / Batal">Ditolak / Batal</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 block">Harga Penawaran ke Klien (Rp)</label>
                    <input 
                      type="number" 
                      value={editData.offeredPrice || ""} 
                      onChange={(e) => setEditData({...editData, offeredPrice: Number(e.target.value)})}
                      className={`w-full px-4 py-3 text-sm font-black text-emerald-700 ${inputGlass}`}
                      placeholder="Cth: 5000000"
                    />
                  </div>
                </div>

                {/* 2. Detail Penerima & Pickup */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b pb-2 border-slate-100">Info Operasional Klien</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Tanggal Rencana Pickup</label>
                      <input type="date" value={editData.pickupDate || ""} onChange={(e) => setEditData({...editData, pickupDate: e.target.value})} className={`w-full px-4 py-3 text-sm font-bold text-slate-800 ${inputGlass}`} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Nomor AWB / Resi</label>
                      <input type="text" value={editData.trackingNumber || ""} onChange={(e) => setEditData({...editData, trackingNumber: e.target.value})} className={`w-full px-4 py-3 text-sm font-black text-slate-800 font-mono tracking-widest ${inputGlass}`} placeholder="Input jika sudah terbit..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Nama Penerima (Consignee)</label>
                      <input type="text" value={editData.receiverName || ""} onChange={(e) => setEditData({...editData, receiverName: e.target.value})} className={`w-full px-4 py-3 text-sm font-bold text-slate-800 ${inputGlass}`} placeholder="Nama penerima paket" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">No. HP Penerima</label>
                      <input type="text" value={editData.receiverPhone || ""} onChange={(e) => setEditData({...editData, receiverPhone: e.target.value})} className={`w-full px-4 py-3 text-sm font-bold text-slate-800 ${inputGlass}`} placeholder="Nomor kontak penerima" />
                    </div>
                  </div>
                </div>

                {/* 3. Info Vendor Internal */}
                <div className="space-y-4 bg-orange-50/50 p-4 rounded-[1.5rem] border border-orange-100">
                  <h4 className="text-[11px] font-black text-orange-800 uppercase tracking-widest border-b pb-2 border-orange-200/50">Data Internal Vendor (Rahasia Admin)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Nama Vendor Ekspedisi</label>
                      <input type="text" value={editData.vendorName || ""} onChange={(e) => setEditData({...editData, vendorName: e.target.value})} className={`w-full px-4 py-3 text-sm font-bold text-slate-800 ${inputGlass}`} placeholder="Cth: DHL, FedEx, TLX" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5 block">Tagihan Asli Vendor (Cost) Rp</label>
                      <input type="number" value={editData.vendorBill || ""} onChange={(e) => setEditData({...editData, vendorBill: Number(e.target.value)})} className={`w-full px-4 py-3 text-sm font-black text-red-600 ${inputGlass}`} placeholder="Cth: 4500000" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Catatan Internal / Log</label>
                      <textarea value={editData.adminNotes || ""} onChange={(e) => setEditData({...editData, adminNotes: e.target.value})} rows={3} className={`w-full px-4 py-3 text-sm font-medium text-slate-800 resize-none ${inputGlass}`} placeholder="Tulis instruksi khusus, alasan revisi harga, dsb..."></textarea>
                    </div>
                  </div>
                </div>

              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                <AdminButton onClick={() => setIsEditing(false)} variant="outline" className="px-6 text-xs bg-white">Batal</AdminButton>
                <AdminButton onClick={handleSave} disabled={isSaving} variant="gold" className="px-8 text-xs shadow-md">
                  {isSaving ? "Menyimpan..." : <><Save className="w-4 h-4 mr-2"/> Simpan Pembaruan</>}
                </AdminButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}