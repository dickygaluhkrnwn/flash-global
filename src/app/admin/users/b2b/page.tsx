"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Search, CheckCircle2, AlertCircle, Activity, 
  Filter, ArrowUpDown, ArrowUpRight, ArrowDownRight, 
  Building2, FileText, CreditCard, ShieldAlert, Edit3, ShieldX
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";

// IMPORT GLOBAL TYPES
import { User } from "@/types/user";

export default function B2BManagementPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 
  const [sortBy, setSortBy] = useState("name_asc");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const snap = await getDocs(collection(db, "users"));
        
        // BUG FIX: Spread d.data() TERLEBIH DAHULU, lalu timpa dengan uid: d.id.
        // Ini memastikan uid selalu berisi Document ID yang sah, tidak tertimpa oleh field kosong dari database.
        const allUsers = snap.docs.map(d => ({ ...d.data(), uid: d.id })) as User[];
        
        // Filter users dengan role b2b, legacy role 'business', atau yang memiliki npwp
        setUsers(allUsers.filter(u => u.role === "b2b" || (u.role as string) === "business" || u.npwp));
      } catch (error) {
        console.error(error);
        showToast("error", "Gagal memuat data Korporat B2B.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // FUNGSI KRUSIAL: Mengubah contractStatus, b2bLimit, dan secara krusial mengubah ROLE menjadi B2B
  const handleUpdateContract = async (userId: string, status: "Approved" | "Rejected" | "Pending", limitVal: number) => {
    // BUG FIX GUARD: Pastikan userId tidak kosong/undefined sebelum memanggil Firebase
    if (!userId) {
      showToast("error", "ID User tidak valid. Gagal memproses data.");
      return;
    }

    try {
      await updateDoc(doc(db, "users", userId), {
        contractStatus: status,
        b2bLimit: limitVal,
        // Standarisasi role baru: Jika Approved maka b2b, selain itu turunkan ke b2c
        role: status === "Approved" ? "b2b" : "b2c",
        updatedAt: serverTimestamp() // BUG FIX: Tambahkan timestamp log perubahan
      });
      
      showToast("success", `Berkas kontrak dan limit berhasil diperbarui.`);
      
      // Update state lokal tanpa harus refetch ulang seluruh database (Optimization)
      setUsers(prevUsers => prevUsers.map(u => 
        u.uid === userId ? { ...u, contractStatus: status, b2bLimit: limitVal, role: status === "Approved" ? "b2b" : "b2c" } : u
      ));
    } catch (error) {
      console.error("Error updating B2B Contract:", error);
      showToast("error", "Gagal memproses validasi berkas B2B.");
    }
  };

  const processedData = useMemo(() => {
    return users
      .filter(u => {
        // Fallback properti name yang aman dengan double casting
        const clientName = u.companyName || u.displayName || (u as unknown as Record<string, unknown>).name as string || "";
        const matchSearch = clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (u.npwp || "").includes(searchQuery);
        const matchStatus = filterStatus === "all" ? true : (u.contractStatus || "Pending") === filterStatus;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const nameA = a.companyName || a.displayName || (a as unknown as Record<string, unknown>).name as string || "";
        const nameB = b.companyName || b.displayName || (b as unknown as Record<string, unknown>).name as string || "";
        
        if (sortBy === "name_asc") return nameA.localeCompare(nameB);
        if (sortBy === "name_desc") return nameB.localeCompare(nameA);
        if (sortBy === "limit_desc") return (b.b2bLimit || 0) - (a.b2bLimit || 0);
        return 0;
      });
  }, [users, searchQuery, filterStatus, sortBy]);

  // Kalkulasi Statistik Powerful
  const totalB2B = users.length;
  const approvedB2B = users.filter(u => u.contractStatus === "Approved").length;
  const pendingB2B = users.filter(u => u.contractStatus === "Pending" || !u.contractStatus).length;
  const rejectedB2B = users.filter(u => u.contractStatus === "Rejected").length;
  const totalLimit = users.reduce((sum, u) => sum + (u.contractStatus === "Approved" ? (u.b2bLimit || 0) : 0), 0);

  // Kalkulasi Persentase untuk Visualisasi Chart
  const approvedPct = totalB2B > 0 ? (approvedB2B / totalB2B) * 100 : 0;
  const pendingPct = totalB2B > 0 ? (pendingB2B / totalB2B) * 100 : 0;
  const rejectedPct = totalB2B > 0 ? (rejectedB2B / totalB2B) * 100 : 0;

  // RBAC GUARD (Keuangan & Limit Piutang HANYA untuk Superadmin & Finance)
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Validasi Korporat dan Limit Kredit ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER HALAMAN */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Building2 className="w-8 h-8 text-indigo-600" /> Manajemen Klien B2B
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium max-w-2xl">
            Verifikasi legalitas perusahaan, kelola limit plafon kredit (Piutang Net 30), dan integrasi peran operasional korporat.
          </p>
        </div>
      </div>

      {/* ENTERPRISE B2B PORTFOLIO HEALTH (CHART) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-center">
        <div className="w-full md:w-1/3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Portfolio Health</h3>
          <p className="text-xs text-slate-500 font-medium">Distribusi status pendaftaran B2B</p>
        </div>
        <div className="w-full md:w-2/3 space-y-3">
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${approvedPct}%` }} title="Approved"></div>
            <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${pendingPct}%` }} title="Pending"></div>
            <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${rejectedPct}%` }} title="Rejected"></div>
          </div>
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-emerald-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Approved ({approvedB2B})</span>
            <span className="text-amber-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Pending ({pendingB2B})</span>
            <span className="text-red-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Rejected ({rejectedB2B})</span>
          </div>
        </div>
      </div>

      {/* ADVANCED STATISTIK CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Building2 className="w-16 h-16 text-indigo-600"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Entitas Mengajukan</span>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalB2B}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle2 className="w-16 h-16 text-emerald-600"/></div>
          <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Kontrak B2B Aktif</span>
          <p className="text-3xl font-black text-emerald-600 mt-2">{approvedB2B}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FileText className="w-16 h-16 text-amber-600"/></div>
          <span className="text-amber-700 text-xs font-bold uppercase tracking-wider">Menunggu Review</span>
          <p className="text-3xl font-black text-amber-600 mt-2">{pendingB2B}</p>
        </div>
        <div className="bg-slate-900 border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CreditCard className="w-16 h-16 text-white"/></div>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Limit Terdistribusi</span>
          <p className="text-2xl font-black text-white mt-2">Rp {(totalLimit / 1000000).toLocaleString('id-ID')} Jt</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        
        {/* Toolbar Pencarian & Filter */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari entitas perusahaan atau NPWP..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm font-medium focus:border-indigo-600 transition-all shadow-sm" />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-indigo-600 shadow-sm appearance-none font-bold text-slate-700 min-w-[150px]">
                <option value="all">Semua Status</option>
                <option value="Approved">Disetujui</option>
                <option value="Pending">Menunggu Review</option>
                <option value="Rejected">Ditolak</option>
              </select>
            </div>
            <div className="relative flex-1 sm:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-indigo-600 shadow-sm appearance-none font-bold text-slate-700 min-w-[160px]">
                <option value="name_asc">Nama (A - Z)</option>
                <option value="name_desc">Nama (Z - A)</option>
                <option value="limit_desc">Limit Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabel Data Master B2B */}
        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400 font-bold"><Activity className="w-8 h-8 text-indigo-600 animate-pulse" /> Memuat Data Korporat...</div>
          ) : processedData.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Tidak ada entitas B2B yang cocok dengan filter pencarian.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="p-5 pl-6">Profil Perusahaan</th>
                  <th className="p-5">Legalitas & Identitas</th>
                  <th className="p-5">Batas Plafon Kredit (Limit)</th>
                  <th className="p-5">Status Kemitraan</th>
                  <th className="p-5 pr-6 text-right">Manajemen Kontrak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedData.map(u => <B2BRowKey key={u.uid} user={u} onUpdate={handleUpdateContract} />)}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// KOMPONEN BARIS TERPISAH UNTUK MANAJEMEN STATE LOKAL TIAP KLIEN
function B2BRowKey({ user, onUpdate }: { user: User; onUpdate: (id: string, status: "Approved" | "Rejected" | "Pending", limitVal: number) => void }) {
  const [localLimit, setLocalLimit] = useState<number | "">(user.b2bLimit || 0);

  // Helper untuk mendapatkan nama fallback dengan aman
  const displayCompanyName = user.companyName || user.displayName || (user as unknown as Record<string, unknown>).name as string || "Klien Korporat";

  const isPending = user.contractStatus === "Pending" || !user.contractStatus;
  const isApproved = user.contractStatus === "Approved";
  const isRejected = user.contractStatus === "Rejected";

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-5 pl-6 align-top">
        <p className="font-black text-slate-900">{displayCompanyName}</p>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{user.email}</p>
        {user.role === 'b2b' && <span className="mt-2 inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded border border-indigo-200">Role: B2B</span>}
      </td>
      <td className="p-5 align-top">
        <p className="font-mono font-bold text-slate-700">{user.npwp || "Belum Input NPWP"}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{user.industry || "Industri Umum"}</p>
      </td>
      <td className="p-5 align-top">
        <div className="relative w-full max-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
          <input 
            type="number" 
            value={localLimit}
            onChange={(e) => setLocalLimit(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 font-bold text-right transition-all shadow-sm"
            placeholder="0"
          />
        </div>
        {isApproved && (
          <p className="text-[9px] text-emerald-600 mt-1.5 font-bold flex items-center justify-end pr-1"><CheckCircle2 className="w-3 h-3 mr-1"/> Plafon Aktif</p>
        )}
      </td>
      <td className="p-5 align-top">
        <span className={`px-3 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] border inline-flex items-center gap-1.5 ${
          isApproved ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
          isRejected ? "bg-red-50 text-red-700 border-red-200" :
          "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : isRejected ? <ShieldX className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5 animate-pulse" />}
          {user.contractStatus || "Pending"}
        </span>
      </td>
      <td className="p-5 pr-6 align-top text-right">
        
        {/* LOGIKA SMART BUTTONS BERDASARKAN STATUS */}
        <div className="flex flex-col items-end gap-2">
          
          {isPending && (
            <>
              <button onClick={() => onUpdate(user.uid, "Approved", Number(localLimit) || 0)} className="w-32 px-4 py-2 bg-emerald-600 border border-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={() => onUpdate(user.uid, "Rejected", 0)} className="w-32 px-4 py-2 bg-white border border-slate-200 text-red-600 font-bold text-xs rounded-xl hover:bg-red-50 hover:border-red-200 transition-all shadow-sm flex items-center justify-center gap-1.5">
                <ShieldX className="w-3.5 h-3.5" /> Reject
              </button>
            </>
          )}

          {isApproved && (
            <>
              <button onClick={() => onUpdate(user.uid, "Approved", Number(localLimit) || 0)} className="w-32 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1.5" title="Perbarui Plafon Kredit">
                <Edit3 className="w-3.5 h-3.5" /> Update Limit
              </button>
              <button onClick={() => onUpdate(user.uid, "Rejected", 0)} className="w-32 px-4 py-2 bg-white border border-slate-200 text-red-600 font-bold text-[10px] rounded-xl hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-1.5" title="Cabut Akses B2B">
                <ArrowDownRight className="w-3 h-3" /> Revoke B2B
              </button>
            </>
          )}

          {isRejected && (
            <button onClick={() => onUpdate(user.uid, "Approved", Number(localLimit) || 0)} className="w-32 px-4 py-2 bg-white border border-slate-200 text-emerald-600 font-bold text-xs rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm flex items-center justify-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> Re-Approve
            </button>
          )}

        </div>
      </td>
    </tr>
  );
}