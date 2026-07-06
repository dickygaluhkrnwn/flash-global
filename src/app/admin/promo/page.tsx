"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Ticket, Plus, Search, CheckCircle2, 
  AlertCircle, Trash2, Power, PowerOff, 
  CalendarClock, Percent, DollarSign, Activity
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";

interface PromoData {
  id: string; // Kode Promo (misal: FLASHMERDEKA)
  type: "percentage" | "fixed";
  value: number;
  quota: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
}

export default function AdminPromoPage() {
  const [promos, setPromos] = useState<PromoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State Modal Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Form State
  const [newPromo, setNewPromo] = useState<{
    code: string;
    type: "percentage" | "fixed";
    value: number | "";
    quota: number | "";
    expiresAt: string;
  }>({
    code: "",
    type: "percentage",
    value: "",
    quota: "",
    expiresAt: "",
  });

  const fetchPromos = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "promos"));
      const promosList = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as PromoData[];
      
      // Sort berdasarkan yang aktif dulu
      promosList.sort((a, b) => Number(b.isActive) - Number(a.isActive));
      setPromos(promosList);
    } catch (error) {
      console.error("Gagal menarik data promo:", error);
      showToast("error", "Gagal memuat daftar promo dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // HANDLER: Tambah Promo Baru
  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newPromo.code.trim().toUpperCase();
    
    if (!code || !newPromo.value || !newPromo.quota || !newPromo.expiresAt) {
      showToast("error", "Semua kolom wajib diisi.");
      return;
    }

    setIsProcessing(true);
    try {
      const promoRef = doc(db, "promos", code);
      await setDoc(promoRef, {
        code: code,
        type: newPromo.type,
        value: Number(newPromo.value),
        quota: Number(newPromo.quota),
        usedCount: 0,
        expiresAt: newPromo.expiresAt,
        isActive: true,
        createdAt: serverTimestamp()
      });

      showToast("success", `Kode promo ${code} berhasil diterbitkan!`);
      setShowAddModal(false);
      setNewPromo({ code: "", type: "percentage", value: "", quota: "", expiresAt: "" });
      fetchPromos();
    } catch (error) {
      console.error("Gagal membuat promo:", error);
      showToast("error", "Gagal menyimpan promo baru.");
    } finally {
      setIsProcessing(false);
    }
  };

  // HANDLER: Toggle Status (Aktif/Nonaktif)
  const handleTogglePromo = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "promos", id), { isActive: !currentStatus });
      showToast("success", `Status promo ${id} diperbarui.`);
      fetchPromos();
    } catch (error) {
      console.error("Toggle error:", error);
      showToast("error", "Gagal mengubah status promo.");
    }
  };

  // HANDLER: Hapus Promo
  const handleDeletePromo = async (id: string) => {
    if (!confirm(`Anda yakin ingin menghapus promo ${id} secara permanen?`)) return;
    try {
      await deleteDoc(doc(db, "promos", id));
      showToast("success", `Promo ${id} dihapus dari sistem.`);
      fetchPromos();
    } catch (error) {
      console.error("Delete error:", error);
      showToast("error", "Gagal menghapus promo.");
    }
  };

  const filteredPromos = promos.filter(p => p.id.includes(searchQuery.toUpperCase()));

  return (
    <div className="space-y-8 pb-10">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-xl ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-red-950 border-red-500 text-red-400'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Modul */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Ticket className="w-6 h-6 text-pink-500" /> Master Promo & Voucher
          </h1>
          <p className="text-slate-400 text-sm mt-1">Buat kode diskon, atur limit kuota, dan pantau penggunaannya.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="bg-pink-600 hover:bg-pink-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-900/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> Buat Promo Baru
        </button>
      </div>

      {/* Panel Tabel */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Cari kode promo (Misal: FLASH)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-pink-500 text-sm font-semibold uppercase"
            />
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-pink-500" /> {promos.filter(p => p.isActive).length} Promo Aktif
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-10 text-center text-slate-500 font-bold animate-pulse">Menarik data voucher...</div>
          ) : filteredPromos.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Belum ada kode promo yang didaftarkan.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-4 pl-6 font-bold">Kode Voucher</th>
                  <th className="p-4 font-bold">Nilai Diskon</th>
                  <th className="p-4 font-bold">Kuota Terpakai</th>
                  <th className="p-4 font-bold">Batas Waktu</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 pr-6 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredPromos.map((promo) => {
                  const isExpired = new Date(promo.expiresAt) < new Date();
                  const isExhausted = promo.usedCount >= promo.quota;

                  return (
                    <tr key={promo.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 pl-6">
                        <span className="inline-block px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono font-black text-white tracking-widest shadow-inner">
                          {promo.id}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          {promo.type === "percentage" ? <Percent className="w-3.5 h-3.5 text-emerald-400" /> : <DollarSign className="w-3.5 h-3.5 text-amber-400" />}
                          {promo.type === "percentage" ? `${promo.value}%` : `Rp ${promo.value.toLocaleString('id-ID')}`}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-800 rounded-full h-2.5 max-w-[100px] overflow-hidden">
                            <div className="bg-pink-500 h-2.5 rounded-full" style={{ width: `${Math.min((promo.usedCount / promo.quota) * 100, 100)}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-300">{promo.usedCount}/{promo.quota}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1.5 text-xs font-bold ${isExpired ? 'text-red-400' : 'text-slate-300'}`}>
                          <CalendarClock className="w-3.5 h-3.5" /> 
                          {new Date(promo.expiresAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          !promo.isActive ? 'bg-slate-800 text-slate-500' :
                          isExpired ? 'bg-red-950/50 border border-red-900 text-red-400' :
                          isExhausted ? 'bg-amber-950/50 border border-amber-900 text-amber-400' :
                          'bg-emerald-950/50 border border-emerald-900 text-emerald-400'
                        }`}>
                          {!promo.isActive ? "Nonaktif" : isExpired ? "Kadaluarsa" : isExhausted ? "Habis" : "Aktif"}
                        </span>
                      </td>
                      <td className="p-4 pr-6 flex justify-end gap-2">
                        <button 
                          onClick={() => handleTogglePromo(promo.id, promo.isActive)}
                          className={`p-2 rounded-lg transition-colors ${promo.isActive ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'}`}
                          title={promo.isActive ? "Nonaktifkan Promo" : "Aktifkan Promo"}
                        >
                          {promo.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleDeletePromo(promo.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                          title="Hapus Promo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: BUAT PROMO BARU */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isProcessing && setShowAddModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl">
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-500"><Ticket className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-black text-white">Generate Kode Promo</h2>
                  <p className="text-xs text-slate-400">Buat voucher diskon untuk klien.</p>
                </div>
              </div>

              <form onSubmit={handleAddPromo} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">Kode Voucher (Unik)</label>
                  <input type="text" required value={newPromo.code} onChange={(e) => setNewPromo({...newPromo, code: e.target.value.toUpperCase().replace(/\s/g, "")})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono font-bold tracking-widest outline-none focus:border-pink-500 uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-normal" placeholder="Contoh: FLASHMERDEKA" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Tipe Diskon</label>
                    <select value={newPromo.type} onChange={(e) => setNewPromo({...newPromo, type: e.target.value as "percentage" | "fixed"})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-pink-500">
                      <option value="percentage">Persentase (%)</option>
                      <option value="fixed">Nominal (Rp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Nilai Diskon</label>
                    <input type="number" required value={newPromo.value} onChange={(e) => setNewPromo({...newPromo, value: e.target.value === "" ? "" : Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-pink-500" placeholder={newPromo.type === 'percentage' ? "Cth: 15" : "Cth: 20000"} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Batas Kuota Pemakaian</label>
                    <input type="number" required value={newPromo.quota} onChange={(e) => setNewPromo({...newPromo, quota: e.target.value === "" ? "" : Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-pink-500" placeholder="Cth: 100" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Tanggal Kadaluarsa</label>
                    <input type="date" required value={newPromo.expiresAt} onChange={(e) => setNewPromo({...newPromo, expiresAt: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-pink-500 [color-scheme:dark]" />
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-800">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors">Batal</button>
                  <button type="submit" disabled={isProcessing} className="flex-1 py-3.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center">
                    {isProcessing ? "Menyimpan..." : "Terbitkan Promo"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}