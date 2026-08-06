"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  FileSpreadsheet, Search, Filter, 
  Download, CalendarClock, ShieldAlert, 
  CheckCircle2, AlertCircle, Package, Receipt, 
  TicketPercent, Activity, ArrowRight, PieChart, Banknote 
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

import { FinanceReport } from "@/types/finance";
import { OrderDetail, LocationDetail, FirebaseTimestamp } from "@/types/order";

const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(16,185,129,0.1)] transition-all duration-300 rounded-[1.5rem]";

export default function FinanceReportsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [reports, setReports] = useState<FinanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [pricingMap, setPricingMap] = useState<Record<string, number>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const fetchReportsAndPricing = async () => {
      try {
        // 1. TARIK MASTER KOMISI
        const pMap: Record<string, number> = {};
        const pricingSnap = await getDoc(doc(db, "settings", "pricing"));
        if (pricingSnap.exists()) {
          const config = pricingSnap.data();
          if (config.customVehicles && Array.isArray(config.customVehicles)) {
            config.customVehicles.forEach((v: Record<string, unknown>) => {
              const vName = v.name as string;
              const vCommission = v.appCommission;
              if (vName && vCommission !== undefined) {
                pMap[vName] = Number(vCommission);
              }
            });
          }
        }
        setPricingMap(pMap);

        // 2. TARIK DATA USERS (UNTUK EMAIL)
        const uMap: Record<string, string> = {};
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach(u => {
          uMap[u.id] = u.data().email || "";
        });

        // 3. TARIK DATA ORDER
        const reportQ = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const reportSnap = await getDocs(reportQ);
        
        setReports(reportSnap.docs.map(d => {
          const data = d.data() as OrderDetail;
          
          const getMillis = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined) => {
            if (!timestamp) return 0;
            if (timestamp instanceof Date) return timestamp.getTime();
            if (typeof timestamp === 'object' && timestamp !== null) {
              const ts = timestamp as Extract<FirebaseTimestamp, object>;
              if (typeof ts.toMillis === 'function') return ts.toMillis();
              if (typeof ts.seconds === 'number') return ts.seconds * 1000;
            }
            return new Date(timestamp as string | number).getTime();
          };

          const millis = getMillis(data.createdAt);
          const dateObj = millis ? new Date(millis) : new Date();
          
          let primaryDest = typeof data.destination === 'string' ? data.destination : "Tujuan";
          if (data.destinations && data.destinations.length > 0) {
              primaryDest = data.destinations.length > 1 ? `${data.destinations.length} Titik Drop` : (data.destinations[0].address || "Tujuan");
          }

          const originObj = typeof data.origin === 'object' && data.origin !== null ? data.origin as LocationDetail : null;
          const originAddress = originObj?.address || (typeof data.origin === 'string' ? data.origin : "-");
          
          const senderNameFallback = originObj?.senderName || data.senderName;
          const finalClientName = String(senderNameFallback || data.name || "Guest");
          
          const senderPhoneFallback = originObj?.senderPhone || data.senderPhone || "-";
          const finalClientPhone = String(senderPhoneFallback);
          
          const rawEmail = data.email || data.senderEmail || uMap[String(data.userId || "")] || "Tidak ada email terdaftar";
          const finalClientEmail = String(rawEmail);

          return {
            id: String(d.id),
            date: dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            clientName: finalClientName,
            clientEmail: finalClientEmail,
            clientPhone: finalClientPhone,
            originAddress: originAddress,
            destAddress: primaryDest,
            serviceType: String(data.serviceType || "Kargo"),
            vehicleName: String(data.vehicleName || data.vehicle || "-"),
            weight: Number(data.totalWeight || data.weight) || 0,
            paymentMethod: String(data.paymentMethod || "Transfer Manual"),
            paymentStatus: String(data.paymentStatus || "Belum Bayar"),
            
            baseFee: Number(data.breakdown?.deliveryFee || data.totalCost || data.offeredPrice) || 0,
            insuranceFee: Number(data.breakdown?.insuranceFee) || 0,
            porterFee: Number(data.breakdown?.porterFee) || 0,
            tollFee: Number(data.breakdown?.tollFee) || 0,
            b2bDiscount: Number(data.breakdown?.b2bDiscount) || 0,
            
            promoCode: String(data.appliedPromoCode || ""),
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
    fetchReportsAndPricing();
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

  const totalOmzetLunas = processedData.filter(r => r.paymentStatus === "Lunas" || r.rawObj.status === "Selesai").reduce((acc, curr) => acc + curr.amount, 0);
  const totalUangNyangkut = processedData.filter(r => r.paymentStatus !== "Lunas" && r.rawObj.status !== "Selesai" && r.rawObj.status !== "Dibatalkan").reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalProfitAplikasi = processedData.filter(r => r.paymentStatus === "Lunas" || r.rawObj.status === "Selesai").reduce((acc, curr) => {
    const vName = curr.vehicleName || "";
    const pCommission = pricingMap[vName] !== undefined ? pricingMap[vName] : 20; 
    return acc + ((curr.amount * pCommission) / 100);
  }, 0);

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
        "Total Tagihan Akhir (IDR)", "Estimasi Profit App", "Metode Bayar", "Status Pembayaran"
      ];

      const rows = processedData.map(r => {
        const vName = r.vehicleName || "";
        const pCommission = pricingMap[vName] !== undefined ? pricingMap[vName] : 20;
        const estProfit = (r.amount * pCommission) / 100;

        return [
          escapeCsv(r.id), escapeCsv(r.date), escapeCsv(r.time), escapeCsv(r.clientName), escapeCsv(r.clientEmail), escapeCsv(r.clientPhone),
          escapeCsv(r.serviceType), escapeCsv(r.vehicleName), escapeCsv(r.weight), escapeCsv(r.originAddress), escapeCsv(r.destAddress),
          r.baseFee, r.insuranceFee, r.porterFee, r.tollFee, 
          r.b2bDiscount, escapeCsv(r.promoCode || "-"), r.promoDiscount,
          r.amount, estProfit, escapeCsv(r.paymentMethod), escapeCsv(r.paymentStatus)
        ].join(",")
      });

      const csvContent = headers.join(",") + "\n" + rows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Laba_Rugi_FlashGlobal_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("success", "File CSV Laporan Keuangan (Format Laba Rugi) berhasil diunduh.");
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal mengekspor file CSV.");
    }
  };

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Laporan & Buku Besar ini hanya dapat diakses oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans max-w-7xl mx-auto px-4 sm:px-0">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HERO WALLET SECTION (GABUNGAN HEADER & STATS) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 sm:p-10 rounded-[2.5rem] border border-slate-700 shadow-[0_30px_60px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-blue-500 rounded-full blur-[80px] opacity-10 pointer-events-none" />
        
        {/* Header Title */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-slate-700/80 pb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-4 tracking-tight drop-shadow-md">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(16,185,129,0.3)] border border-emerald-800 shrink-0">
                <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
              </div>
              Laporan & Profit
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-3 max-w-2xl font-medium leading-relaxed">
              Pantau arus kas kotor (omzet) dan kas bersih (profit komisi perusahaan) berdasarkan data penyelesaian tiket manifes secara *real-time*.
            </p>
          </div>
          <AdminButton onClick={handleExportCSV} variant="primary" className="h-12 px-6 shrink-0 relative z-10 w-full md:w-auto shadow-[0_8px_20px_rgba(16,185,129,0.3)] bg-emerald-600 hover:bg-emerald-700 border-emerald-700">
            <Download className="w-4 h-4 mr-2" /> Ekspor Profit CSV
          </AdminButton>
        </div>

        {/* Stats Grid inside Hero */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {/* Profit Bersih (Utama) */}
          <div className="sm:col-span-1 border-r-0 sm:border-r border-slate-700/80 pr-0 sm:pr-8">
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
              <PieChart className="w-3.5 h-3.5" /> Profit Bersih (Hak PT)
            </span>
            <p className="text-4xl sm:text-5xl font-black text-white tracking-tighter font-mono drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]">
              {formatRupiah(totalProfitAplikasi)}
            </p>
            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest font-bold">Dari Total Omzet: <span className="text-slate-300">{formatRupiah(totalOmzetLunas)}</span></p>
          </div>

          {/* Uang Nyangkut & Tiket */}
          <div className="sm:col-span-2 grid grid-cols-2 gap-6 sm:gap-8">
            <div>
              <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                <Banknote className="w-3.5 h-3.5" /> Uang Tertahan (Piutang)
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-200 tracking-tight font-mono">
                {formatRupiah(totalUangNyangkut)}
              </p>
            </div>
            <div>
              <span className="text-blue-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                <Receipt className="w-3.5 h-3.5" /> Volume Transaksi
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-200 tracking-tight font-mono">
                {processedData.length} <span className="text-xs font-sans text-slate-500 uppercase tracking-widest ml-1">Tiket</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* 2. TOOLBAR FILTER & SEARCH */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari ID, Email, atau Klien..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
            <div className="relative w-full sm:w-auto">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full sm:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[160px]">
                <option value="All">Semua Status</option>
                <option value="Lunas">Lunas (Paid)</option>
                <option value="Menunggu Verifikasi Finance">Menunggu (Warning)</option>
                <option value="Belum Bayar">Belum Bayar (Overdue)</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto bg-white/60 backdrop-blur-md border border-white p-1 rounded-xl shadow-sm">
              <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="bg-transparent px-3 py-2 text-sm outline-none focus:text-emerald-600 font-bold text-slate-600 w-full sm:w-32 cursor-pointer" title="Dari Tanggal" />
              <span className="text-slate-300 font-black">-</span>
              <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="bg-transparent px-3 py-2 text-sm outline-none focus:text-emerald-600 font-bold text-slate-600 w-full sm:w-32 cursor-pointer" title="Sampai Tanggal" />
            </div>
          </div>
        </div>

        {/* 3. LIST DATA LAPORAN (ROW LAYOUT DENGAN BREATHING ROOM) */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-emerald-600 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Membaca Jurnal Laporan...</p>
            </div>
          ) : processedData.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <FileSpreadsheet className="w-16 h-16 mb-4 opacity-20 text-slate-500" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Data Tidak Ditemukan</h4>
              <p className="font-medium text-slate-500">Sesuaikan filter tanggal atau pencarian Anda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <AnimatePresence>
                {processedData.map((r, idx) => {
                  const isLunas = r.paymentStatus === 'Lunas' || r.rawObj.status === 'Selesai';
                  const isPending = r.paymentStatus.includes('Menunggu');

                  // Hitung estimasi profit per baris laporan
                  const vName = r.vehicleName || "";
                  const pCommission = pricingMap[vName] !== undefined ? pricingMap[vName] : 20;
                  const estProfit = (r.amount * pCommission) / 100;

                  return (
                    <motion.div 
                      key={r.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      transition={{ delay: idx * 0.02 }} 
                      onClick={() => router.push(`/admin/finance/reports/${r.id}`)}
                      className={`${glassRow} p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 group cursor-pointer`} 
                    >
                      
                      {/* Kolom 1: ID & Klien */}
                      <div className="flex items-center gap-5 w-full lg:w-[35%]">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border", isLunas ? "bg-emerald-50 text-emerald-600 border-emerald-200" : isPending ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-red-50 text-red-600 border-red-200")}>
                          <Receipt className="w-6 h-6" />
                        </div>
                        <div className="overflow-hidden space-y-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">#{r.id.substring(0,8)}</p>
                            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><CalendarClock className="w-3 h-3"/> {r.date}</span>
                          </div>
                          <h2 className="text-base font-black text-slate-900 truncate" title={r.clientName}>{r.clientName}</h2>
                          <p className="text-xs font-bold text-slate-500 truncate">{r.clientEmail}</p>
                        </div>
                      </div>

                      {/* Kolom 2: Layanan & Status */}
                      <div className="w-full lg:w-[25%] flex flex-col items-start lg:items-center gap-3 border-t border-slate-100 pt-5 lg:pt-0 lg:border-t-0">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                            <Package className="w-3.5 h-3.5"/> {r.serviceType}
                          </span>
                          {r.promoCode && <span className="bg-pink-50 text-pink-600 border border-pink-200 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm"><TicketPercent className="w-3.5 h-3.5 inline mr-1"/> Promo</span>}
                        </div>
                        <AdminBadge variant={isLunas ? "success" : isPending ? "warning" : "danger"} className="text-[10px] px-4 py-1.5 shadow-sm">
                          {isLunas ? "Lunas" : r.paymentStatus}
                        </AdminBadge>
                      </div>

                      {/* Kolom 3: Nominal & Profit */}
                      <div className="w-full lg:w-[40%] flex items-center justify-between lg:justify-end gap-6">
                        <div className="text-left lg:text-right flex items-center gap-6 lg:gap-8">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Omzet Kotor</p>
                            <p className="text-base font-black tracking-tight font-mono text-slate-500">
                              {formatRupiah(r.amount)}
                            </p>
                          </div>
                          <div className="w-px h-10 bg-slate-200 hidden lg:block"></div>
                          <div>
                            <p className="text-[10px] font-black text-[#7A171D] uppercase tracking-widest mb-1">Profit Komisi</p>
                            <p className={cn("text-2xl font-black tracking-tight font-mono", isLunas ? "text-emerald-600" : isPending ? "text-amber-600" : "text-red-600")}>
                              {isLunas ? formatRupiah(estProfit) : "Rp 0"}
                            </p>
                          </div>
                        </div>
                        <div className="h-12 w-12 shrink-0 bg-white border border-slate-200 text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-300 group-hover:bg-emerald-50 rounded-2xl flex items-center justify-center transition-all shadow-sm">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}