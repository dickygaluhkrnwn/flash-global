"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  FileSpreadsheet, Search, Filter, 
  Download, CalendarClock, ShieldAlert, 
  CheckCircle2, X, FileText, User, 
  MapPin, Package, Truck, Scale, Receipt, 
  TicketPercent, Building, Activity, ArrowRight, Wallet,
  AlertCircle
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

import { FinanceReport } from "@/types/finance";
import { OrderDetail, LocationDetail } from "@/types/order";

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Emerald/Finance Accent)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(16,185,129,0.1)] transition-all duration-300 rounded-2xl";

export default function FinanceReportsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [reports, setReports] = useState<FinanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  
  // State Modal Viewer
  const [selectedReport, setSelectedReport] = useState<FinanceReport | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const reportQ = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const reportSnap = await getDocs(reportQ);
        
        setReports(reportSnap.docs.map(d => {
          const data = d.data() as OrderDetail;
          
          // 1. Safe Date Parsing
          let dateObj = new Date();
          if (data.createdAt) {
            const ts = data.createdAt as Record<string, unknown>;
            if (typeof ts.toDate === 'function') {
               dateObj = ts.toDate() as Date;
            } else {
               dateObj = new Date(data.createdAt as string | number);
            }
          }
          
          // 2. Safe Destination Parsing
          let primaryDest = typeof data.destination === 'string' ? data.destination : "Tujuan";
          if (data.destinations && data.destinations.length > 0) {
              primaryDest = data.destinations.length > 1 ? `${data.destinations.length} Titik Drop` : (data.destinations[0].address || "Tujuan");
          }

          // 3. Safe Origin Parsing
          const originObj = typeof data.origin === 'object' && data.origin !== null ? data.origin as LocationDetail : null;
          const originAddress = originObj?.address || (typeof data.origin === 'string' ? data.origin : "-");
          
          const senderNameFallback = originObj?.senderName || data.senderName;
          const finalClientName = senderNameFallback ? senderNameFallback : (typeof data.name === 'string' ? data.name : "Guest");
          
          const senderPhoneFallback = originObj?.senderPhone || data.senderPhone || "-";
          const finalClientEmail = typeof data.email === 'string' ? data.email : "Tidak ada email";

          return {
            id: d.id,
            date: dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            clientName: finalClientName,
            clientEmail: finalClientEmail,
            clientPhone: senderPhoneFallback,
            originAddress: originAddress,
            destAddress: primaryDest,
            serviceType: data.serviceType || "Kargo",
            vehicleName: data.vehicleName || data.vehicle || "-",
            weight: Number(data.totalWeight || data.weight) || 0,
            paymentMethod: data.paymentMethod || "Transfer Manual",
            paymentStatus: data.paymentStatus || "Belum Bayar",
            
            baseFee: Number(data.breakdown?.deliveryFee || data.totalCost || data.offeredPrice) || 0,
            insuranceFee: Number(data.breakdown?.insuranceFee) || 0,
            porterFee: Number(data.breakdown?.porterFee) || 0,
            tollFee: Number(data.breakdown?.tollFee) || 0,
            b2bDiscount: Number(data.breakdown?.b2bDiscount) || 0,
            
            promoCode: data.appliedPromoCode || "",
            promoDiscount: Number(data.discountPromoAmount) || 0,
            
            amount: Number(data.finalGrandTotal || data.breakdown?.grandTotal || data.totalCost || data.offeredPrice) || 0,
            timestamp: dateObj.getTime(),
            rawObj: data
          };
        }));
      } catch (err) {
        console.error("Gagal menarik data laporan:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);
  const escapeCsv = (str: string | number) => `"${String(str).replace(/"/g, '""')}"`;

  const processedData = useMemo(() => {
    let result = [...reports];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.id.toLowerCase().includes(q) || r.clientEmail.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q));
    }
    if (filterStatus !== "All") result = result.filter(r => r.paymentStatus === filterStatus);
    
    if (dateStart) {
      const start = new Date(dateStart).setHours(0, 0, 0, 0);
      result = result.filter(r => r.timestamp >= start);
    }
    if (dateEnd) {
      const end = new Date(dateEnd).setHours(23, 59, 59, 999);
      result = result.filter(r => r.timestamp <= end);
    }
    
    return result;
  }, [reports, searchQuery, filterStatus, dateStart, dateEnd]);

  const totalIncome = processedData.filter(r => r.paymentStatus === "Lunas").reduce((acc, curr) => acc + curr.amount, 0);

  const handleExportCSV = () => {
    if (processedData.length === 0) {
      showToast("error", "Tidak ada data untuk diekspor.");
      return;
    }

    try {
      const headers = [
        "ID Transaksi", "Tanggal", "Jam", "Nama Klien", "Email", "Telepon", 
        "Layanan", "Kendaraan", "Berat (Kg)", "Titik Asal", "Titik Tujuan", 
        "Tarif Dasar Jarak", "Biaya Asuransi", "Jasa Porter", "Deposit Tol", 
        "Diskon Korporat (B2B)", "Kode Promo Dipakai", "Nilai Potongan Promo", 
        "Total Tagihan Akhir (IDR)", "Metode Bayar", "Status Pembayaran"
      ];

      const rows = processedData.map(r => [
        escapeCsv(r.id), escapeCsv(r.date), escapeCsv(r.time), escapeCsv(r.clientName), escapeCsv(r.clientEmail), escapeCsv(r.clientPhone),
        escapeCsv(r.serviceType), escapeCsv(r.vehicleName), escapeCsv(r.weight), escapeCsv(r.originAddress), escapeCsv(r.destAddress),
        r.baseFee, r.insuranceFee, r.porterFee, r.tollFee, 
        r.b2bDiscount, escapeCsv(r.promoCode || "-"), r.promoDiscount,
        r.amount, escapeCsv(r.paymentMethod), escapeCsv(r.paymentStatus)
      ].join(","));

      const csvContent = headers.join(",") + "\n" + rows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Buku_Besar_FlashGlobal_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("success", "File CSV Laporan Keuangan (Format Detail) berhasil diunduh.");
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal mengekspor file CSV.");
    }
  };

  // RBAC GUARD
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Laporan & Buku Besar ini hanya dapat diakses oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans max-w-7xl mx-auto">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER HALAMAN */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(16,185,129,0.3)] border border-emerald-800">
              <FileSpreadsheet className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            Laporan Keuangan
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl font-medium">
            Tarik data buku besar transaksi dalam periode tertentu secara komprehensif. Perhatikan indikator warna untuk membedakan piutang klien.
          </p>
        </div>
        
        <AdminButton onClick={handleExportCSV} variant="primary" className="h-12 px-6 shrink-0 relative z-10 w-full md:w-auto shadow-lg bg-emerald-600 hover:bg-emerald-700 border-emerald-700">
          <Download className="w-4 h-4 mr-2" /> Ekspor Detail CSV
        </AdminButton>
      </div>

      {/* 2. ADVANCED STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-10 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Volume Terfilter</span>
            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center"><Receipt className="w-5 h-5 text-slate-500" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-4 relative z-10 tracking-tight font-mono">{processedData.length} <span className="text-sm font-medium font-sans opacity-80 uppercase tracking-widest">Tiket</span></p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-emerald-700 to-emerald-900 border border-emerald-950 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_20px_rgba(6,78,59,0.4)] relative overflow-hidden group md:col-span-2">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-[40px] opacity-50 group-hover:opacity-100 transition-opacity" />
          <span className="text-emerald-100 text-[11px] font-bold uppercase tracking-widest relative z-10">Akumulasi Pendapatan Bersih (Lunas)</span>
          <div className="flex items-center justify-between mt-4 relative z-10">
            <p className="text-4xl font-black text-white tracking-tight font-mono">{formatRupiah(totalIncome)}</p>
            <Wallet className="w-8 h-8 text-white/30" />
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* 3. TOOLBAR FILTER & SEARCH */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/4">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari ID, Email, atau Klien..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[150px]">
                <option value="All">Semua Status</option>
                <option value="Lunas">Lunas (Paid)</option>
                <option value="Menunggu Verifikasi Finance">Menunggu (Warning)</option>
                <option value="Belum Bayar">Belum Bayar (Overdue)</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white p-1 rounded-xl shadow-sm">
              <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="bg-transparent px-3 py-1.5 text-sm outline-none focus:text-emerald-600 font-bold text-slate-600 w-full sm:w-auto cursor-pointer" title="Dari Tanggal" />
              <span className="text-slate-300 font-black">-</span>
              <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="bg-transparent px-3 py-1.5 text-sm outline-none focus:text-emerald-600 font-bold text-slate-600 w-full sm:w-auto cursor-pointer" title="Sampai Tanggal" />
            </div>
          </div>
        </div>

        {/* 4. LIST DATA LAPORAN (ROW LAYOUT) */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-emerald-600 animate-pulse" />
              <p>Membaca Jurnal Laporan...</p>
            </div>
          ) : processedData.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <FileSpreadsheet className="w-16 h-16 mb-4 opacity-20 text-slate-500" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Data Tidak Ditemukan</h4>
              <p className="font-medium text-slate-500">Sesuaikan filter tanggal atau pencarian Anda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {processedData.map((r, idx) => {
                  const isLunas = r.paymentStatus === 'Lunas';
                  const isPending = r.paymentStatus.includes('Menunggu');

                  return (
                    <motion.div 
                      key={r.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      transition={{ delay: idx * 0.02 }} 
                      className={`${glassRow} p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group cursor-pointer`}
                      onClick={() => setSelectedReport(r)}
                    >
                      
                      {/* Kolom 1: ID & Klien */}
                      <div className="flex items-center gap-4 w-full lg:w-[35%]">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border", isLunas ? "bg-emerald-50 text-emerald-600 border-emerald-200" : isPending ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-red-50 text-red-600 border-red-200")}>
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">#{r.id.substring(0,8)}</p>
                            <span className="text-[9px] text-slate-400 flex items-center gap-1"><CalendarClock className="w-3 h-3"/> {r.date}</span>
                          </div>
                          <h2 className="text-sm font-black text-slate-900 truncate" title={r.clientName}>{r.clientName}</h2>
                          <p className="text-[11px] font-medium text-slate-500 truncate">{r.clientEmail}</p>
                        </div>
                      </div>

                      {/* Kolom 2: Layanan & Status */}
                      <div className="w-full lg:w-[30%] flex flex-col items-start lg:items-center gap-2 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                            <Package className="w-3 h-3"/> {r.serviceType}
                          </span>
                          {r.promoCode && <span className="bg-pink-50 text-pink-600 border border-pink-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest"><TicketPercent className="w-3 h-3 inline mr-1"/> Promo</span>}
                        </div>
                        <AdminBadge variant={isLunas ? "success" : isPending ? "warning" : "danger"} className="text-[10px] whitespace-nowrap px-3 shadow-sm">
                          {r.paymentStatus}
                        </AdminBadge>
                      </div>

                      {/* Kolom 3: Nominal */}
                      <div className="w-full lg:w-[35%] flex items-center justify-between lg:justify-end gap-5">
                        <div className="text-left lg:text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tagihan Tercatat</p>
                          <p className={cn("text-xl font-black tracking-tight font-mono", isLunas ? "text-emerald-600" : isPending ? "text-amber-600" : "text-red-600")}>
                            {formatRupiah(r.amount)}
                          </p>
                        </div>
                        <AdminButton 
                          size="icon" 
                          variant="outline" 
                          className="h-10 w-10 shrink-0 text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-300 group-hover:bg-emerald-50 rounded-xl"
                          onClick={(e) => { e.stopPropagation(); setSelectedReport(r); }}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </AdminButton>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* MODAL VIEWER READ-ONLY */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedReport(null)}></motion.div>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-5xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] overflow-hidden border border-white"
            >
              <div className="bg-white/50 border-b border-white p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <FileText className="w-6 h-6 text-emerald-600" /> Detail Arsip Laporan
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest font-bold">ID Transaksi: #{selectedReport.id}</p>
                </div>
                <button onClick={() => setSelectedReport(null)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors flex items-center justify-center shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 md:p-8 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* KIRI */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white/60 rounded-2xl p-6 border border-white shadow-sm space-y-6">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Akun Pengirim</p>
                          <p className="text-sm font-black text-slate-900 uppercase">{selectedReport.clientName} <span className="text-slate-400 font-mono font-medium lowercase">({selectedReport.clientPhone})</span></p>
                          <p className="text-xs font-medium text-slate-500">{selectedReport.clientEmail}</p>
                        </div>
                      </div>

                      <div className="relative pl-2">
                        <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-200 border-dashed border-l-2 border-slate-300 z-0"></div>
                        <div className="space-y-6 relative z-10">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 bg-white p-2 rounded-full border border-slate-200 shadow-sm"><MapPin className="w-4 h-4 text-slate-400" /></div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Titik Penjemputan (Asal)</p>
                              <p className="font-bold text-slate-800 text-sm leading-relaxed">{selectedReport.originAddress}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="mt-1 bg-emerald-50 p-2 rounded-full border border-emerald-200 shadow-sm"><MapPin className="w-4 h-4 text-emerald-600" /></div>
                            <div>
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Titik Pengiriman (Tujuan)</p>
                              <p className="font-bold text-slate-800 text-sm leading-relaxed">{selectedReport.destAddress}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/60 rounded-2xl p-6 border border-white shadow-sm space-y-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-slate-400" /> Spesifikasi Kargo & Operasional</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Berat Aktual</p>
                          <p className="text-xl font-black text-slate-900 flex items-center gap-2"><Scale className="w-5 h-5 text-emerald-500"/> {selectedReport.weight} Kg</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pilihan Armada</p>
                          <p className="text-sm font-black text-slate-900 flex items-center gap-2 mt-1 truncate"><Truck className="w-4 h-4 text-blue-500"/> {selectedReport.vehicleName}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KANAN */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-5 text-slate-400 border-b border-slate-800 pb-3"><Receipt className="w-4 h-4 text-emerald-400" /> Arsip Rincian Biaya</h4>
                      
                      <div className="space-y-3 mb-6 text-sm font-medium font-mono">
                        {selectedReport.rawObj?.breakdown ? (
                          <>
                            <div className="flex justify-between items-center text-slate-300">
                              <span className="font-sans">Tarif Dasar</span>
                              <span className="text-white">{formatRupiah(selectedReport.baseFee)}</span>
                            </div>
                            {selectedReport.insuranceFee > 0 && (
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="font-sans">Asuransi</span>
                                <span className="text-emerald-400">+ {formatRupiah(selectedReport.insuranceFee)}</span>
                              </div>
                            )}
                            {selectedReport.porterFee > 0 && (
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="font-sans">Jasa Porter</span>
                                <span className="text-emerald-400">+ {formatRupiah(selectedReport.porterFee)}</span>
                              </div>
                            )}
                            {selectedReport.tollFee > 0 && (
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="font-sans">Deposit Tol/Parkir</span>
                                <span className="text-emerald-400">+ {formatRupiah(selectedReport.tollFee)}</span>
                              </div>
                            )}
                            {selectedReport.b2bDiscount > 0 && (
                              <div className="flex justify-between items-center text-amber-300">
                                <span className="font-sans">Diskon Korporat</span>
                                <span>- {formatRupiah(selectedReport.b2bDiscount)}</span>
                              </div>
                            )}
                            {selectedReport.promoCode && (
                              <div className="flex justify-between items-center text-pink-300 border-t border-slate-700/50 pt-3 mt-3">
                                <span className="flex items-center gap-1.5 font-sans"><TicketPercent className="w-3.5 h-3.5"/> {selectedReport.promoCode}</span>
                                <span>- {formatRupiah(selectedReport.promoDiscount)}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="font-sans">Harga Penawaran Fix</span>
                            <span className="text-white">{formatRupiah(selectedReport.amount)}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-5 border-t border-slate-700/50 flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Total Pemasukan</p>
                          <p className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                            {formatRupiah(selectedReport.amount)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Info Status Metode */}
                    <div className="bg-white/60 rounded-2xl p-6 border border-white shadow-sm flex flex-col gap-3">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan Buku Besar</p>
                       <div className="flex items-center justify-between">
                         <span className="font-black text-slate-800 text-sm flex items-center gap-1.5"><Building className="w-4 h-4 text-slate-400"/> {selectedReport.paymentMethod}</span>
                         <AdminBadge variant={selectedReport.paymentStatus === 'Lunas' ? "success" : selectedReport.paymentStatus.includes('Menunggu') ? "warning" : "danger"} className="text-[9px] whitespace-nowrap shadow-sm">
                           {selectedReport.paymentStatus}
                         </AdminBadge>
                       </div>
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}