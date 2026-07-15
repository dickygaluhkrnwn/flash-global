"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  FileSpreadsheet, Search, Filter, 
  Download, CalendarClock, ShieldAlert, 
  CheckCircle2, Eye, X, FileText, User, 
  MapPin, Package, Truck, Scale, Receipt, 
  TicketPercent, Building
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";

import { FinanceReport } from "@/types/finance";
import { OrderDetail, LocationDetail } from "@/types/order";

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
          
          // 1. Safe Date Parsing (Menghindari error Strict Mode TypeScript)
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
          
          // PERBAIKAN TS STRICT: Memastikan fallback berjenis string
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
            paymentStatus: data.paymentStatus || "Menunggu Pembayaran",
            
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
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Menghimpun Data Laporan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-10">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <CheckCircle2 className="w-5 h-5" /> {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER HALAMAN */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600" /> Laporan Pembukuan
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Tarik data buku besar transaksi dalam periode tertentu secara komprehensif untuk keperluan audit.</p>
        </div>
        <Button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-6 shadow-md w-full md:w-auto">
          <Download className="w-4 h-4 mr-2" /> Ekspor Detail CSV (Excel)
        </Button>
      </div>

      {/* ADVANCED STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Volume Transaksi Terfilter</span>
          <p className="text-3xl font-black text-slate-900 mt-2">{processedData.length} Tiket</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Akumulasi Pendapatan Bersih (Lunas)</span>
          <p className="text-3xl font-black text-emerald-600 mt-2">{formatRupiah(totalIncome)}</p>
        </div>
      </div>

      {/* WORKSPACE & TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* TOOLBAR FILTER LENGKAP */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari ID, Nama Klien, atau Email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-emerald-600 transition-all shadow-sm" />
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 sm:flex-none">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-emerald-600 shadow-sm appearance-none font-semibold text-slate-700 min-w-[150px]">
                <option value="All">Semua Status</option>
                <option value="Lunas">Lunas</option>
                <option value="Menunggu Verifikasi Finance">Menunggu Verifikasi</option>
                <option value="Belum Bayar">Belum Bayar</option>
              </select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-600 shadow-sm font-semibold text-slate-700 w-full sm:w-auto" title="Dari Tanggal" />
              <span className="text-slate-400 font-bold">-</span>
              <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-600 shadow-sm font-semibold text-slate-700 w-full sm:w-auto" title="Sampai Tanggal" />
            </div>
          </div>
        </div>

        {/* TABEL DATA LAPORAN */}
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          {processedData.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Tidak ada data transaksi yang cocok dengan filter.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="p-5 pl-6"><CalendarClock className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5"/> Waktu & ID</th>
                  <th className="p-5">Profil Klien</th>
                  <th className="p-5">Layanan</th>
                  <th className="p-5">Status Bayar</th>
                  <th className="p-5">Nominal Tagihan</th>
                  <th className="p-5 pr-6 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 pl-6 align-top">
                      <p className="font-bold text-slate-900 text-sm mb-0.5">{r.date}</p>
                      <p className="font-mono text-[10px] text-slate-400 uppercase font-bold">#{r.id.substring(0,8)}</p>
                    </td>
                    <td className="p-5 align-top">
                      <p className="font-bold text-slate-700 truncate max-w-[150px]">{r.clientName}</p>
                      <p className="text-xs text-slate-500">{r.clientEmail}</p>
                    </td>
                    <td className="p-5 align-top">
                      <p className="text-xs font-bold text-slate-600">{r.serviceType}</p>
                      {r.promoCode && <span className="text-[9px] bg-pink-50 text-pink-600 border border-pink-200 px-1.5 py-0.5 rounded mt-1 inline-block uppercase font-bold">Promo Dipakai</span>}
                    </td>
                    <td className="p-5 align-top">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border inline-block ${
                         r.paymentStatus === 'Lunas' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                         r.paymentStatus.includes('Menunggu') ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                       }`}>
                         {r.paymentStatus}
                       </span>
                    </td>
                    <td className="p-5 align-top">
                       <p className="text-sm font-black text-slate-900">{formatRupiah(r.amount)}</p>
                    </td>
                    <td className="p-5 pr-6 align-top text-right">
                       <Button 
                          onClick={() => setSelectedReport(r)}
                          size="sm" 
                          variant="outline" 
                          className="border-slate-200 text-slate-500 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 text-[10px] shadow-sm font-bold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Cek Bukti
                        </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL VIEWER READ-ONLY */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedReport(null)}></motion.div>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-5xl bg-slate-50 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200"
            >
              <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <FileText className="w-6 h-6 text-emerald-600" /> Detail Arsip Transaksi
                  </h2>
                  <p className="text-sm text-slate-500 font-mono mt-1 uppercase tracking-widest font-bold">#{selectedReport.id}</p>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <User className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Akun Pengirim</p>
                          <p className="text-sm font-black text-slate-900">{selectedReport.clientName} <span className="text-slate-400 font-medium ml-1">({selectedReport.clientPhone})</span></p>
                          <p className="text-xs font-semibold text-slate-500">{selectedReport.clientEmail}</p>
                        </div>
                      </div>

                      <div className="relative pl-2">
                        <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-100 border-dashed border-l-2 border-slate-200 z-0"></div>
                        <div className="space-y-6 relative z-10">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 bg-white p-1 rounded-full"><MapPin className="w-5 h-5 text-slate-400" /></div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Titik Asal</p>
                              <p className="font-bold text-slate-900 text-sm">{selectedReport.originAddress}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="mt-1 bg-white p-1 rounded-full"><MapPin className="w-5 h-5 text-emerald-600" /></div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tujuan / Destinasi</p>
                              <p className="font-bold text-slate-900 text-sm">{selectedReport.destAddress}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-emerald-600" /> Spesifikasi Kargo & Operasional</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Berat</p>
                          <p className="text-lg font-black text-slate-900 flex items-center gap-2"><Scale className="w-4 h-4 text-slate-400"/> {selectedReport.weight} Kg</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Armada</p>
                          <p className="text-sm font-black text-slate-900 flex items-center gap-2 mt-1"><Truck className="w-4 h-4 text-slate-400"/> {selectedReport.vehicleName}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl text-white relative overflow-hidden">
                      <h4 className="text-sm font-black flex items-center gap-2 mb-4"><Receipt className="w-4 h-4 text-emerald-400" /> Arsip Rincian Biaya</h4>
                      
                      <div className="space-y-3 mb-4 text-sm font-medium">
                        {selectedReport.rawObj?.breakdown ? (
                          <>
                            <div className="flex justify-between items-center text-slate-400">
                              <span>Tarif Dasar</span>
                              <span className="text-white">{formatRupiah(selectedReport.baseFee)}</span>
                            </div>
                            {selectedReport.insuranceFee > 0 && (
                              <div className="flex justify-between items-center text-slate-400">
                                <span>Asuransi</span>
                                <span className="text-emerald-400">+ {formatRupiah(selectedReport.insuranceFee)}</span>
                              </div>
                            )}
                            {selectedReport.porterFee > 0 && (
                              <div className="flex justify-between items-center text-slate-400">
                                <span>Jasa Porter</span>
                                <span className="text-emerald-400">+ {formatRupiah(selectedReport.porterFee)}</span>
                              </div>
                            )}
                            {selectedReport.tollFee > 0 && (
                              <div className="flex justify-between items-center text-slate-400">
                                <span>Deposit Tol/Parkir</span>
                                <span className="text-emerald-400">+ {formatRupiah(selectedReport.tollFee)}</span>
                              </div>
                            )}
                            {selectedReport.b2bDiscount > 0 && (
                              <div className="flex justify-between items-center text-amber-400">
                                <span>Diskon Klien (B2B)</span>
                                <span>- {formatRupiah(selectedReport.b2bDiscount)}</span>
                              </div>
                            )}
                            {selectedReport.promoCode && (
                              <div className="flex justify-between items-center text-pink-400 border-t border-slate-700/50 pt-2 mt-2">
                                <span className="flex items-center gap-1.5"><TicketPercent className="w-3.5 h-3.5"/> Promo: {selectedReport.promoCode}</span>
                                <span>- {formatRupiah(selectedReport.promoDiscount)}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex justify-between items-center text-slate-400">
                            <span>Harga Penawaran Fix</span>
                            <span className="text-white">{formatRupiah(selectedReport.amount)}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t-2 border-dashed border-slate-700 flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pemasukan</p>
                          <p className="text-2xl font-black text-emerald-400">
                            {formatRupiah(selectedReport.amount)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Info Status Metode */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-2">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Keterangan Buku Besar</p>
                       <div className="flex items-center justify-between">
                         <span className="font-bold text-slate-700 text-sm flex items-center gap-1.5"><Building className="w-4 h-4 text-slate-400"/> {selectedReport.paymentMethod}</span>
                         <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border inline-block ${
                           selectedReport.paymentStatus === 'Lunas' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                           selectedReport.paymentStatus.includes('Menunggu') ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                         }`}>
                           {selectedReport.paymentStatus}
                         </span>
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