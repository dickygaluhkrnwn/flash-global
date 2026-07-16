"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, Search, ArrowUpDown, 
  AlertCircle, FileSpreadsheet, ShieldAlert,
  Eye, X, Receipt, MapPin, CalendarClock, Download, 
  CheckCircle2, TrendingUp, BarChart3, Wallet, Printer
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";

// MENGGUNAKAN GLOBAL TYPES
import { B2BClientDebt, UnpaidOrder } from "@/types/finance";
import { OrderDetail, LocationDetail } from "@/types/order";

// IMPORT LIBRARY PRINT DAN TEMPLATE A4
import { useReactToPrint } from "react-to-print";
import { InvoiceA4Template } from "@/components/shared/InvoiceA4Template";

// Extended interface untuk menampung field tambahan khusus cetak PDF
interface ExtendedUnpaidOrder extends UnpaidOrder {
  weight: number;
  vehicle: string;
}

interface ExtendedB2BClientDebt extends Omit<B2BClientDebt, 'orders'> {
  orders: ExtendedUnpaidOrder[];
}

export default function FinanceReceivablesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [b2bDebts, setB2bDebts] = useState<ExtendedB2BClientDebt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("highest_debt");
  
  // Modal Detail State
  const [selectedClient, setSelectedClient] = useState<ExtendedB2BClientDebt | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // REF UNTUK CETAK INVOICE A4
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  // PERBAIKAN: Menggunakan contentRef sesuai versi terbaru react-to-print
  const handlePrintInvoice = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `Invoice_B2B_${selectedClient?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
  });

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        // Ambil semua order B2B
        const b2bOrderQ = query(collection(db, "orders"), where("isB2BApplied", "==", true));
        const b2bOrderSnap = await getDocs(b2bOrderQ);
        
        const debtMap = new Map<string, ExtendedB2BClientDebt>();
        
        b2bOrderSnap.forEach(docObj => {
          const data = docObj.data() as OrderDetail;
          
          // Filter hanya yang belum Lunas
          if (data.paymentStatus !== "Lunas") {
            
            // 1. Safe Origin Parsing
            const originObj = typeof data.origin === 'object' && data.origin !== null ? data.origin as LocationDetail : null;
            const originAddress = originObj?.address || (typeof data.origin === 'string' ? data.origin : "-");
            const senderNameFallback = originObj?.senderName || data.senderName;
            
            // 2. Safe Client Parsing
            const clientEmail = typeof data.email === 'string' ? data.email : (typeof senderNameFallback === 'string' ? senderNameFallback : "Unknown B2B Client");
            const clientName = typeof senderNameFallback === 'string' ? senderNameFallback : "Corporate Client";
            
            // 3. Safe Amount & Vehicle & Weight
            const amount = data.finalGrandTotal || data.breakdown?.grandTotal || data.totalCost || 0;
            const weight = data.totalWeight || data.weight || 0;
            const vehicle = data.vehicleName || data.vehicle || "Kargo Logistik";
            
            // 4. Safe Date Parsing
            let dateObj = new Date();
            if (data.createdAt) {
               const ts = data.createdAt as Record<string, unknown>;
               if (typeof ts.toDate === 'function') {
                  dateObj = ts.toDate() as Date;
               } else {
                  dateObj = new Date(data.createdAt as string | number);
               }
            }
            const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            
            // 5. Safe Destination Parsing
            let primaryDest = typeof data.destination === 'string' ? data.destination : "Tujuan";
            if (data.destinations && data.destinations.length > 0) {
                primaryDest = data.destinations.length > 1 ? `${data.destinations.length} Titik Drop` : (data.destinations[0].address || "Tujuan");
            }

            const orderDetail: ExtendedUnpaidOrder = {
              id: docObj.id,
              date: dateStr,
              originAddress: originAddress,
              destAddress: primaryDest,
              amount: amount,
              status: data.paymentStatus || "Menunggu Pembayaran",
              weight: weight,
              vehicle: vehicle
            };
            
            if (debtMap.has(clientEmail)) {
              const existing = debtMap.get(clientEmail)!;
              existing.unpaidCount += 1;
              existing.totalDebt += amount;
              existing.orders.push(orderDetail);
            } else {
              debtMap.set(clientEmail, {
                id: docObj.id,
                name: clientName,
                email: clientEmail,
                unpaidCount: 1,
                totalDebt: amount,
                orders: [orderDetail]
              });
            }
          }
        });
        
        // Urutkan order di dalam tiap klien berdasarkan tanggal terbaru
        const finalDebts = Array.from(debtMap.values()).map(client => {
          client.orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return client;
        });

        setB2bDebts(finalDebts);
      } catch (err) {
        console.error("Gagal menarik data piutang:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDebts();
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);
  const escapeCsv = (str: string | number) => `"${String(str).replace(/"/g, '""')}"`;

  // USEMEMO HARUS DI ATAS GUARD RETURN
  const processedData = useMemo(() => {
    let result = [...b2bDebts];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q));
    }
    
    result.sort((a, b) => {
      if (sortOrder === "highest_debt") return b.totalDebt - a.totalDebt;
      if (sortOrder === "highest_count") return b.unpaidCount - a.unpaidCount;
      if (sortOrder === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });
    return result;
  }, [b2bDebts, searchQuery, sortOrder]);

  const totalOutstanding = b2bDebts.reduce((acc, curr) => acc + curr.totalDebt, 0);
  const totalClients = b2bDebts.length;
  const avgDebt = totalClients > 0 ? totalOutstanding / totalClients : 0;

  // HANDLER: Unduh Invoice CSV Spesifik Klien
  const handleDownloadClientInvoice = (client: ExtendedB2BClientDebt) => {
    try {
      const headers = ["ID Transaksi", "Tanggal", "Rute Asal", "Rute Tujuan", "Status", "Nominal Tagihan (IDR)"];
      const rows = client.orders.map(o => [
        escapeCsv(o.id), escapeCsv(o.date), escapeCsv(o.originAddress), 
        escapeCsv(o.destAddress), escapeCsv(o.status), o.amount
      ].join(","));
      
      // Tambahkan baris Total
      rows.push(`"","","","","TOTAL PIUTANG",${client.totalDebt}`);

      const csvContent = headers.join(",") + "\n" + rows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const safeName = client.name.replace(/[^a-zA-Z0-9]/g, "_");
      link.setAttribute("download", `Invoice_B2B_${safeName}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("success", `Rekap CSV tagihan untuk ${client.name} berhasil diunduh.`);
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal mengunduh rekap CSV.");
    }
  };

  // =======================================================================
  // LOGIKA ENTERPRISE: PELUNASAN PIUTANG MASSAL (BATCH WRITE)
  // =======================================================================
  const handleSettleDebt = async (client: ExtendedB2BClientDebt) => {
    if (!confirm(`Yakin ingin menerima pembayaran dan menandai SELURUH PIUTANG ${client.name} sebesar ${formatRupiah(client.totalDebt)} sebagai LUNAS? Tindakan ini akan mengembalikan Limit Kredit klien secara otomatis.`)) {
      return;
    }

    setIsProcessingPayment(true);
    try {
      const batch = writeBatch(db);

      client.orders.forEach(order => {
        const orderRef = doc(db, "orders", order.id);
        batch.update(orderRef, {
          paymentStatus: "Lunas",
          paymentMethod: "Bank Transfer B2B (Settled)",
          paidAt: serverTimestamp()
        });
      });

      // Eksekusi semua update ke database sekaligus
      await batch.commit();

      showToast("success", `Pembayaran diterima! Piutang ${client.name} telah diputihkan dan Limit Kredit dipulihkan.`);
      
      // Update UI Lokal (Buang klien dari daftar piutang)
      setB2bDebts(prev => prev.filter(c => c.email !== client.email));
      setSelectedClient(null);

    } catch (error) {
      console.error("Gagal melunasi piutang:", error);
      showToast("error", "Terjadi kesalahan saat memproses pelunasan massal.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // =========================================================================
  // GUARDS: DITEMPATKAN DI BAWAH SEMUA HOOKS AGAR TIDAK MELANGGAR ATURAN REACT
  // =========================================================================

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
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Menghitung Piutang Berjalan...</p>
      </div>
    );
  }

  // Cari Top 5 Debitur untuk Visualisasi
  const topDebtors = [...b2bDebts].sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 5);

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
            <Wallet className="w-7 h-7 text-emerald-600" /> Piutang B2B (Net 30)
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Manajemen penagihan invoice untuk klien korporat dengan sistem tempo pembayaran.</p>
        </div>
      </div>

      {/* ADVANCED STATISTIK & CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group flex-1">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Building2 className="w-16 h-16 text-blue-500"/></div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Klien Menunggak</span>
            <p className="text-3xl font-black text-blue-600 mt-2">{totalClients} <span className="text-lg font-bold text-slate-400">PT</span></p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group flex-1">
            <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle className="w-16 h-16 text-red-500"/></div>
            <span className="text-red-700 text-xs font-bold uppercase tracking-wider">Total Piutang (Outstanding)</span>
            <p className="text-3xl font-black text-red-600 mt-2">{formatRupiah(totalOutstanding)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group flex-1">
            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-16 h-16 text-emerald-500"/></div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Rata-Rata Piutang/Klien</span>
            <p className="text-2xl font-black text-emerald-600 mt-2">{formatRupiah(avgDebt)}</p>
          </div>
        </div>

        {/* TOP DEBTORS CHART */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-red-500" /> Top 5 Konsentrasi Piutang
          </h3>
          {topDebtors.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-bold bg-slate-50 rounded-xl border border-slate-100">
              Tidak ada data piutang untuk divisualisasikan.
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {topDebtors.map((client, idx) => {
                const percentage = totalOutstanding > 0 ? (client.totalDebt / totalOutstanding) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 truncate max-w-[200px]">{client.name}</span>
                      <span className="text-red-600">{formatRupiah(client.totalDebt)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 }}
                        className="bg-red-500 h-2.5 rounded-full" 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* WORKSPACE & TABLE */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        
        {/* TOOLBAR FILTER */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari nama perusahaan atau email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-emerald-600 transition-all shadow-sm" />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-emerald-600 shadow-sm appearance-none font-semibold text-slate-700 min-w-[200px]">
                <option value="highest_debt">Piutang Terbesar</option>
                <option value="highest_count">Tunggakan Terbanyak</option>
                <option value="name_asc">Nama Klien (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABEL DATA PIUTANG */}
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          {processedData.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium flex flex-col items-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4 opacity-50" />
              Bagus! Tidak ada piutang B2B yang sedang berjalan saat ini.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="p-5 pl-6">Profil Klien B2B</th>
                  <th className="p-5">Status Tunggakan</th>
                  <th className="p-5">Total Piutang Berjalan</th>
                  <th className="p-5 pr-6 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.map((debt, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 pl-6 align-top">
                      <p className="font-bold text-slate-900 text-sm mb-0.5">{debt.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{debt.email}</p>
                    </td>
                    <td className="p-5 align-top">
                       <span className="bg-red-50 text-red-600 font-bold px-2.5 py-1.5 rounded-lg text-[10px] uppercase border border-red-200 flex items-center gap-1.5 w-fit shadow-sm">
                         <AlertCircle className="w-3.5 h-3.5" /> {debt.unpaidCount} Transaksi Menggantung
                       </span>
                    </td>
                    <td className="p-5 align-top">
                       <p className="text-base font-black text-red-600">{formatRupiah(debt.totalDebt)}</p>
                    </td>
                    <td className="p-5 pr-6 align-top text-right">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setSelectedClient(debt)}
                        className="border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold h-10 shadow-sm"
                      >
                        <Eye className="w-4 h-4 mr-1.5" /> Verifikasi Tagihan
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL VIEWER RINCIAN PIUTANG (LARGE) */}
      <AnimatePresence>
        {selectedClient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !isProcessingPayment && setSelectedClient(null)}></motion.div>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-5xl bg-slate-50 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200"
            >
              {/* Header Modal */}
              <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <Receipt className="w-6 h-6 text-red-600" /> Rincian Piutang Klien
                  </h2>
                  <p className="text-sm text-slate-500 font-bold mt-1">{selectedClient.name} <span className="font-normal text-slate-400 ml-1">({selectedClient.email})</span></p>
                </div>
                <button disabled={isProcessingPayment} onClick={() => setSelectedClient(null)} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors disabled:opacity-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Modal */}
              <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6 bg-red-50 border border-red-200 p-6 rounded-3xl shadow-inner relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4"/> Total Outstanding (Belum Dibayar)
                    </p>
                    <p className="text-3xl md:text-4xl font-black text-red-600 tracking-tight">{formatRupiah(selectedClient.totalDebt)}</p>
                  </div>
                  
                  <div className="flex flex-col gap-2 w-full md:w-auto relative z-10">
                    {/* TOMBOL ENTERPRISE: SETTLE DEBT BATCH WRITE */}
                    <Button 
                      onClick={() => handleSettleDebt(selectedClient)} 
                      disabled={isProcessingPayment}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 w-full sm:w-auto h-12"
                    >
                      {isProcessingPayment ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Memproses...</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4 mr-2" /> Terima Pembayaran & Lunaskan</>
                      )}
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleDownloadClientInvoice(selectedClient)} 
                        disabled={isProcessingPayment}
                        variant="outline"
                        className="border-slate-300 text-slate-700 hover:bg-slate-100 flex-1 h-10 shadow-sm font-bold text-xs"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Rekap CSV
                      </Button>
                      
                      {/* TAHAP 3.2: TOMBOL CETAK INVOICE A4 PDF */}
                      <Button 
                        onClick={handlePrintInvoice} 
                        disabled={isProcessingPayment}
                        variant="outline"
                        className="border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059]/10 flex-1 h-10 shadow-sm font-bold text-xs"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak Invoice (A4)
                      </Button>
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" /> Daftar Transaksi Menunggak ({selectedClient.unpaidCount})
                </h3>

                <div className="space-y-3">
                  {selectedClient.orders.map(order => (
                    <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-slate-900">#{order.id.substring(0,8)}</span>
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded"><CalendarClock className="w-3.5 h-3.5"/> {order.date}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            {order.status}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-medium text-slate-600">
                          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400"/> {order.originAddress}</div>
                          <span className="hidden sm:inline text-slate-300">→</span>
                          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600"/> {order.destAddress}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 bg-slate-50 px-5 py-3 rounded-xl border border-slate-100 w-full md:w-auto">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 text-left md:text-right">Nilai Tagihan</p>
                        <p className="text-base font-black text-slate-900 text-left md:text-right">{formatRupiah(order.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================= */}
      {/* HIDDEN INVOICE A4 COMPONENT UNTUK DIPRINT           */}
      {/* ================================================= */}
      <div style={{ display: 'none' }}>
        {selectedClient && (
          <InvoiceA4Template 
            ref={invoiceRef}
            invoiceNumber={`INV-${selectedClient.name.substring(0,3).toUpperCase()}-${new Date().getTime().toString().slice(-6)}`}
            issueDate={new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            // Net 30 Days untuk Klien B2B
            dueDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            clientName={selectedClient.name}
            clientEmail={selectedClient.email}
            clientAddress="Data Terlampir di Sistem"
            clientPhone="-"
            items={selectedClient.orders.map(o => ({
              id: o.id.slice(-8).toUpperCase(),
              date: o.date,
              description: `Rute Pengiriman: ${o.originAddress} ➔ ${o.destAddress}`,
              service: o.vehicle || "Layanan Kargo B2B",
              weight: o.weight || 0,
              amount: o.amount
            }))}
            subTotal={selectedClient.totalDebt}
            discountAmount={0}
            taxAmount={0} 
            grandTotal={selectedClient.totalDebt}
          />
        )}
      </div>

    </div>
  );
}