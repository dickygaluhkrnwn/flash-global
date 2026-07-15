"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Globe, Search, CheckCircle2, AlertCircle, Filter, 
  ArrowUpDown, DollarSign, Weight, FileText, X, ShieldAlert 
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// IMPORT GLOBAL TYPES
import { Quote } from "@/types/order";

export default function GlobalOrdersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  // Modal State
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({ price: "", docUrl: "" });

  useEffect(() => {
    const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quote)));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteId) return;
    
    try {
      await updateDoc(doc(db, "quotes", selectedQuoteId), {
        offeredPrice: Number(quoteForm.price), customsDocUrl: quoteForm.docUrl, status: "Menunggu Persetujuan Klien"
      });
      showToast("success", "Penawaran Bea Cukai berhasil diterbitkan!");
      setShowQuoteModal(false);
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal menerbitkan penawaran.");
    }
  };

  // Helper aman untuk membaca nilai milisecond dari Firebase Timestamp
  const getMillis = (ts: unknown) => {
    if (!ts) return 0;
    const t = ts as { seconds?: number; toMillis?: () => number };
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (typeof t.seconds === 'number') return t.seconds * 1000;
    return new Date(ts as string | number).getTime();
  };

  // =======================================================================
  // HOOKS USEMEMO (Ditempatkan SEBELUM block guard/return)
  // =======================================================================
  const processedQuotes = useMemo(() => {
    let result = [...quotes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => o.id.toLowerCase().includes(q) || (o.originCountry || "").toLowerCase().includes(q) || (o.destCountry || "").toLowerCase().includes(q));
    }
    if (filterStatus !== "All") result = result.filter(o => o.status.includes(filterStatus));
    
    result.sort((a, b) => {
      const wA = a.weight || 0; 
      const wB = b.weight || 0;
      const cA = a.offeredPrice || 0; 
      const cB = b.offeredPrice || 0;
      const tA = getMillis(a.createdAt);
      const tB = getMillis(b.createdAt);

      if (sortOrder === "newest") return tB - tA;
      if (sortOrder === "oldest") return tA - tB;
      if (sortOrder === "heaviest") return wB - wA;
      if (sortOrder === "highest_value") return cB - cA;
      return 0;
    });
    return result;
  }, [quotes, searchQuery, filterStatus, sortOrder]);

  const totalQuotes = quotes.length;
  const pendingQuotes = quotes.filter(q => !q.offeredPrice).length;

  // =======================================================================
  // GUARDS: RBAC & LOADING (Mencegah "Hook called conditionally" error)
  // =======================================================================
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Dispatch & Order ini hanya dapat dikelola oleh Superadmin atau Divisi Operasional.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Menghubungkan ke Global Node...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Globe className="w-7 h-7 text-[#C5A059]" /> Global Forwarding
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Manajemen bea cukai internasional dan penawaran harga ekspor/impor.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Permintaan Kuotasi</span>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalQuotes}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-amber-600 text-xs font-bold uppercase tracking-wider">Menunggu Penawaran Harga</span>
          <p className="text-3xl font-black text-amber-700 mt-2">{pendingQuotes}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari ID Req, Negara Asal / Tujuan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-[#C5A059] transition-all shadow-sm" />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#C5A059] shadow-sm appearance-none font-semibold text-slate-700 min-w-[140px]">
                <option value="All">Semua Status</option>
                <option value="Menunggu">Pending</option>
                <option value="Disetujui">Approved</option>
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#C5A059] shadow-sm appearance-none font-semibold text-slate-700 min-w-[160px]">
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="heaviest">Terberat (Kg)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {processedQuotes.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Tidak ada data kuotasi forwarding.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="p-5 pl-6">ID & Jalur Negara</th>
                  <th className="p-5">Spek Barang</th>
                  <th className="p-5">Status & Harga</th>
                  <th className="p-5 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedQuotes.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 pl-6 align-top">
                      <p className="font-mono font-black text-[#C5A059] text-base mb-2">#{q.id}</p>
                      <div className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                        <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Asal: {q.originCountry}</p>
                        <p className="text-slate-900 font-extrabold flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]"></span> Tujuan: {q.destCountry}</p>
                      </div>
                    </td>
                    <td className="p-5 align-top pt-6">
                      <p className="font-black text-slate-700 text-sm flex items-center gap-1.5"><Weight className="w-4 h-4 text-slate-400"/> {q.weight} Kg</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">Dimensi: {q.length}x{q.width}x{q.height} cm</p>
                    </td>
                    <td className="p-5 align-top pt-6">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border border-slate-200 inline-block mb-2">{q.status}</span>
                      {q.offeredPrice ? (
                        <p className="text-sm font-black text-emerald-600 flex items-center gap-1"><DollarSign className="w-4 h-4"/> {formatRupiah(q.offeredPrice)}</p>
                      ) : (
                        <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded w-fit border border-amber-200">Belum ada penawaran</p>
                      )}
                    </td>
                    <td className="p-5 pr-6 align-top pt-6 text-right">
                      <Button size="sm" variant="gold" onClick={() => { setSelectedQuoteId(q.id); setQuoteForm({ price: q.offeredPrice?.toString() || "", docUrl: q.customsDocUrl || "" }); setShowQuoteModal(true); }} className="h-9 text-[10px] shadow-sm">
                        <FileText className="w-3.5 h-3.5 mr-1.5" /> Proses Bea Cukai
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showQuoteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowQuoteModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-md relative z-10 shadow-2xl">
              <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-100">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-[#C5A059]"/> Penawaran Forwarding</h2>
                <button type="button" onClick={() => setShowQuoteModal(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500"><X className="w-4 h-4"/></button>
              </div>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Input harga final penawaran kargo (termasuk Freight, Duty & Tax) beserta tautan dokumen GDrive untuk Klien.</p>
              
              <form onSubmit={handleSubmitQuote} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga Final (IDR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                    <Input type="number" required value={quoteForm.price} onChange={(e) => setQuoteForm({...quoteForm, price: e.target.value})} className="pl-11 h-12 font-black text-lg focus-visible:border-[#C5A059]" placeholder="0" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Dokumen Bea Cukai</label>
                  <Input type="url" required value={quoteForm.docUrl} onChange={(e) => setQuoteForm({...quoteForm, docUrl: e.target.value})} className="h-12 font-medium focus-visible:border-[#C5A059]" placeholder="https://drive.google.com/..." />
                </div>
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <Button type="submit" variant="gold" className="w-full h-12 font-bold text-sm shadow-md">Kirim Penawaran ke Klien</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}