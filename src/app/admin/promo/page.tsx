"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Ticket, Plus, Search, CheckCircle2, 
  AlertCircle, Trash2, Power, PowerOff, 
  CalendarClock, Percent, DollarSign, Activity,
  Globe2, Truck, User, ShieldAlert, X
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

interface PromoData {
  id: string; // Kode Promo
  type: "percentage" | "fixed";
  value: number;
  quota: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  targetService?: "all" | "domestik" | "forwarding"; // Dibuat optional untuk backward compatibility
  targetUser?: string; // Dibuat optional untuk backward compatibility
}

export default function AdminPromoPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [promos, setPromos] = useState<PromoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterService, setFilterService] = useState("all");
  
  // Modal States
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
    targetService: "all" | "domestik" | "forwarding";
    targetUser: string;
  }>({
    code: "",
    type: "percentage",
    value: "",
    quota: "",
    expiresAt: "",
    targetService: "all",
    targetUser: "", // Kosong berarti untuk semua user
  });

  const fetchPromos = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "promos"));
      const promosList = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as PromoData[];
      
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
      showToast("error", "Semua kolom utama wajib diisi.");
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
        targetService: newPromo.targetService,
        targetUser: newPromo.targetUser.trim().toLowerCase() || "all",
        createdAt: serverTimestamp()
      });

      showToast("success", `Kode promo ${code} berhasil diterbitkan!`);
      setShowAddModal(false);
      setNewPromo({ code: "", type: "percentage", value: "", quota: "", expiresAt: "", targetService: "all", targetUser: "" });
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

  // LOGIKA FILTER CERDAS DENGAN FALLBACK UNTUK DATA LAMA (USEMEMO DITARIK KE ATAS)
  const processedPromos = useMemo(() => {
    let result = [...promos];
    if (searchQuery) {
      result = result.filter(p => p.id.includes(searchQuery.toUpperCase()));
    }
    if (filterService !== "all") {
      // Fallback ke "all" jika targetService undefined pada dokumen Firestore lama
      result = result.filter(p => (p.targetService || "all") === filterService);
    }
    return result;
  }, [promos, searchQuery, filterService]);

  const activePromoCount = promos.filter(p => p.isActive && new Date(p.expiresAt) >= new Date() && p.usedCount < p.quota).length;

  // =========================================================================
  // GUARDS: DITEMPATKAN DI BAWAH SEMUA HOOKS AGAR TIDAK MELANGGAR ATURAN REACT
  // =========================================================================

  // RBAC GUARD (Hanya Superadmin & Finance)
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Master Promo ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-10 h-10 text-[#C5A059] animate-pulse mb-4" />
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Menarik Data Voucher...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 font-sans">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Modul */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Badge variant="gold" className="mb-3 px-3 py-1 shadow-sm inline-flex items-center gap-1.5">
            <Ticket className="w-3 h-3 fill-current"/> Marketing & Sales Panel
          </Badge>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A059] to-[#A68345]">Promo & Voucher</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Buat kode diskon spesial untuk Klien Domestik, Kargo Global, atau Khusus Klien VIP tertentu.</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)} 
          variant="gold"
          className="w-full md:w-auto h-12 px-6 text-sm font-bold shrink-0 shadow-lg shadow-[#C5A059]/20"
        >
          <Plus className="w-4 h-4 mr-2" /> Buat Promo Baru
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Ticket className="w-16 h-16 text-white"/></div>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Voucher Terbit</span>
          <p className="text-3xl font-black text-white mt-2">{promos.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Voucher Siap Pakai</span>
          <p className="text-3xl font-black text-emerald-600 mt-2">{activePromoCount}</p>
        </div>
      </div>

      {/* Panel Tabel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari kode voucher (Misal: FLASH)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10 text-sm font-semibold uppercase transition-all shadow-sm"
            />
          </div>
          <select 
            value={filterService} 
            onChange={(e) => setFilterService(e.target.value)}
            className="w-full md:w-auto bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#C5A059] shadow-sm text-slate-700"
          >
            <option value="all">Semua Layanan</option>
            <option value="domestik">Kargo Domestik</option>
            <option value="forwarding">Global Forwarding</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {processedPromos.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Belum ada kode promo yang didaftarkan.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                  <th className="p-5 pl-6">Kode Voucher & Target</th>
                  <th className="p-5">Nilai Diskon</th>
                  <th className="p-5">Kuota Terpakai</th>
                  <th className="p-5">Batas Waktu</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedPromos.map((promo) => {
                  const isExpired = new Date(promo.expiresAt) < new Date();
                  const isExhausted = promo.usedCount >= promo.quota;

                  // Memberikan nilai default "all" jika field masih undefined dari db lama
                  const safeTargetService = promo.targetService || "all";
                  const safeTargetUser = promo.targetUser || "all";

                  return (
                    <tr key={promo.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 pl-6 align-top">
                        <span className="inline-block px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono font-black text-white tracking-widest shadow-sm mb-2">
                          {promo.id}
                        </span>
                        <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-500 uppercase">
                          <span className="flex items-center gap-1.5">
                            {safeTargetService === "domestik" ? <Truck className="w-3 h-3 text-emerald-500"/> : safeTargetService === "forwarding" ? <Globe2 className="w-3 h-3 text-blue-500"/> : <Ticket className="w-3 h-3 text-slate-400"/>}
                            Layanan: {safeTargetService.toUpperCase()}
                          </span>
                          {safeTargetUser !== "all" && (
                            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">
                              <User className="w-3 h-3"/> {safeTargetUser}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-5 align-top pt-6">
                        <div className="flex items-center gap-1.5 font-black text-slate-900 text-base">
                          {promo.type === "percentage" ? <Percent className="w-4 h-4 text-[#C5A059]" /> : <DollarSign className="w-4 h-4 text-emerald-500" />}
                          {promo.type === "percentage" ? `${promo.value}%` : `Rp ${promo.value.toLocaleString('id-ID')}`}
                        </div>
                      </td>
                      <td className="p-5 align-top pt-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="w-full bg-slate-100 rounded-full h-2.5 max-w-[120px] overflow-hidden border border-slate-200">
                            <div className="bg-[#C5A059] h-2.5 rounded-full" style={{ width: `${Math.min((promo.usedCount / promo.quota) * 100, 100)}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-500">{promo.usedCount} dari {promo.quota} Klaim</span>
                        </div>
                      </td>
                      <td className="p-5 align-top pt-6">
                        <span className={`flex items-center gap-1.5 text-xs font-bold ${isExpired ? 'text-red-500' : 'text-slate-600'}`}>
                          <CalendarClock className="w-4 h-4" /> 
                          {new Date(promo.expiresAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="p-5 align-top pt-6">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border inline-block ${
                          !promo.isActive ? 'bg-slate-100 text-slate-500 border-slate-200' :
                          isExpired ? 'bg-red-50 border-red-200 text-red-600' :
                          isExhausted ? 'bg-amber-50 border-amber-200 text-amber-600' :
                          'bg-emerald-50 border-emerald-200 text-emerald-600'
                        }`}>
                          {!promo.isActive ? "Nonaktif" : isExpired ? "Kadaluarsa" : isExhausted ? "Habis" : "Aktif"}
                        </span>
                      </td>
                      <td className="p-5 pr-6 flex justify-end gap-2 align-top pt-6">
                        <button 
                          onClick={() => handleTogglePromo(promo.id, promo.isActive)}
                          className={`p-2.5 rounded-xl border transition-colors shadow-sm ${promo.isActive ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                          title={promo.isActive ? "Nonaktifkan Promo" : "Aktifkan Promo"}
                        >
                          {promo.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleDeletePromo(promo.id)}
                          className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-colors shadow-sm"
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

      {/* Modal Add Promo */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowAddModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-lg relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"><Ticket className="w-5 h-5" /></div>
                  <h2 className="text-xl font-black text-slate-900">Buat Voucher Diskon</h2>
                </div>
                <button onClick={() => !isProcessing && setShowAddModal(false)} className="text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-full hover:bg-red-50 transition-colors"><X className="w-4 h-4"/></button>
              </div>

              <form onSubmit={handleAddPromo} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kode Voucher (Unik)</label>
                  <Input type="text" required value={newPromo.code} onChange={(e) => setNewPromo({...newPromo, code: e.target.value.toUpperCase().replace(/\s/g, "")})} className="font-mono font-black tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-normal" placeholder="Contoh: FLASHMERDEKA" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipe Diskon</label>
                    <select value={newPromo.type} onChange={(e) => setNewPromo({...newPromo, type: e.target.value as "percentage" | "fixed"})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-slate-900 text-sm font-semibold outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10">
                      <option value="percentage">Persentase (%)</option>
                      <option value="fixed">Nominal (Rp)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nilai Diskon</label>
                    <Input type="number" required value={newPromo.value} onChange={(e) => setNewPromo({...newPromo, value: e.target.value === "" ? "" : Number(e.target.value)})} className="font-bold" placeholder={newPromo.type === 'percentage' ? "Cth: 15" : "Cth: 20000"} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Layanan</label>
                    <select value={newPromo.targetService} onChange={(e) => setNewPromo({...newPromo, targetService: e.target.value as "all" | "domestik" | "forwarding"})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-slate-900 text-sm font-semibold outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10">
                      <option value="all">Semua Layanan</option>
                      <option value="domestik">Kargo Domestik</option>
                      <option value="forwarding">Global Forwarding</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Batas Kuota Promo</label>
                    <Input type="number" required value={newPromo.quota} onChange={(e) => setNewPromo({...newPromo, quota: e.target.value === "" ? "" : Number(e.target.value)})} placeholder="Cth: 100" className="font-bold" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Klien Khusus (Opsional)</label>
                  <Input type="email" value={newPromo.targetUser} onChange={(e) => setNewPromo({...newPromo, targetUser: e.target.value})} placeholder="Kosongkan jika untuk semua klien" />
                  <p className="text-[10px] text-amber-600 font-medium">Jika diisi, promo ini hanya bisa diklaim oleh email akun yang bersangkutan.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tanggal Kadaluarsa</label>
                  <Input type="date" required value={newPromo.expiresAt} onChange={(e) => setNewPromo({...newPromo, expiresAt: e.target.value})} className="font-bold text-slate-700" />
                </div>

                <div className="flex gap-3 pt-6 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 h-12 border-slate-300">Batal</Button>
                  <Button type="submit" variant="gold" disabled={isProcessing} className="flex-1 h-12 shadow-md">
                    {isProcessing ? "Menyimpan..." : "Terbitkan Promo"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}