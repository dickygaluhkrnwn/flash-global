"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, Search, Filter, ArrowUpDown, 
  AlertCircle, FileSpreadsheet, ShieldAlert,
  Eye, X, Receipt, MapPin, CalendarClock, Download, CheckCircle2
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";

interface UnpaidOrder {
  id: string;
  date: string;
  originAddress: string;
  destAddress: string;
  amount: number;
  status: string;
}

interface B2BClientDebt {
  id: string; 
  name: string;
  email: string;
  unpaidCount: number;
  totalDebt: number;
  orders: UnpaidOrder[];
}

export default function FinanceReceivablesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [b2bDebts, setB2bDebts] = useState<B2BClientDebt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("highest_debt");
  
  // Modal Detail State
  const [selectedClient, setSelectedClient] = useState<B2BClientDebt | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        // Ambil semua order B2B
        const b2bOrderQ = query(collection(db, "orders"), where("isB2BApplied", "==", true));
        const b2bOrderSnap = await getDocs(b2bOrderQ);
        
        const debtMap = new Map<string, B2BClientDebt>();
        
        b2bOrderSnap.forEach(docObj => {
          const data = docObj.data();
          
          // Filter hanya yang belum Lunas
          if (data.paymentStatus !== "Lunas") {
            const clientEmail = data.email || data.origin?.senderName || "Unknown B2B Client";
            const amount = data.finalGrandTotal || data.breakdown?.grandTotal || data.totalCost || 0;
            
            const dateObj = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
            const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            
            let primaryDest = data.destination || "Tujuan";
            if (data.destinations && data.destinations.length > 0) {
                primaryDest = data.destinations.length > 1 ? `${data.destinations.length} Titik Drop` : data.destinations[0].address;
            }

            const orderDetail: UnpaidOrder = {
              id: docObj.id,
              date: dateStr,
              originAddress: data.origin?.address || data.origin || "-",
              destAddress: primaryDest,
              amount: amount,
              status: data.paymentStatus || "Menunggu Pembayaran"
            };
            
            if (debtMap.has(clientEmail)) {
              const existing = debtMap.get(clientEmail)!;
              existing.unpaidCount += 1;
              existing.totalDebt += amount;
              existing.orders.push(orderDetail);
            } else {
              debtMap.set(clientEmail, {
                id: docObj.id,
                name: data.origin?.senderName || "Corporate Client",
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
      } catch (error) {
        console.error("Gagal menarik data piutang:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDebts();
  }, []);

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

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);
  const escapeCsv = (str: string | number) => `"${String(str).replace(/"/g, '""')}"`;

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

  // HANDLER: Unduh Invoice CSV Spesifik Klien
  const handleDownloadClientInvoice = (client: B2BClientDebt) => {
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
      
      showToast("success", `Invoice tagihan untuk ${client.name} berhasil diunduh.`);
    } catch (error) {
      showToast("error", "Gagal mengunduh invoice.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Menghitung Piutang Berjalan...</p>
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
            <Building2 className="w-7 h-7 text-emerald-600" /> Piutang B2B (Net 30)
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Manajemen penagihan invoice untuk klien korporat dengan sistem tempo pembayaran.</p>
        </div>
      </div>

      {/* ADVANCED STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Building2 className="w-16 h-16 text-blue-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Klien Menunggak</span>
          <p className="text-3xl font-black text-blue-600 mt-2">{totalClients} Perusahaan</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle className="w-16 h-16 text-red-500"/></div>
          <span className="text-red-700 text-xs font-bold uppercase tracking-wider">Total Piutang Berjalan (Outstanding)</span>
          <p className="text-3xl font-black text-red-600 mt-2">{formatRupiah(totalOutstanding)}</p>
        </div>
      </div>

      {/* WORKSPACE & TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
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
            <div className="p-20 text-center text-slate-500 font-medium">Bagus! Tidak ada piutang B2B yang sedang berjalan.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="p-5 pl-6">Profil Klien B2B</th>
                  <th className="p-5">Status Tunggakan</th>
                  <th className="p-5">Total Piutang Berjalan</th>
                  <th className="p-5 pr-6 text-right">Rincian Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.map((debt, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 pl-6 align-top">
                      <p className="font-bold text-slate-900 text-sm mb-0.5">{debt.name}</p>
                      <p className="text-xs text-slate-500">{debt.email}</p>
                    </td>
                    <td className="p-5 align-top">
                       <span className="bg-red-50 text-red-600 font-bold px-2.5 py-1 rounded text-[10px] uppercase border border-red-200 flex items-center gap-1.5 w-fit">
                         <AlertCircle className="w-3 h-3" /> {debt.unpaidCount} Transaksi Menggantung
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
                        className="border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold h-9 shadow-sm"
                      >
                        <Eye className="w-4 h-4 mr-1.5" /> Detail Piutang
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedClient(null)}></motion.div>
            
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
                <button onClick={() => setSelectedClient(null)} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Modal */}
              <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6 bg-red-50 border border-red-200 p-5 rounded-2xl">
                  <div>
                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Total Outstanding (Belum Dibayar)</p>
                    <p className="text-3xl font-black text-red-600 tracking-tight">{formatRupiah(selectedClient.totalDebt)}</p>
                  </div>
                  <Button onClick={() => handleDownloadClientInvoice(selectedClient)} className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-md w-full sm:w-auto h-12">
                    <Download className="w-4 h-4 mr-2" /> Unduh Tagihan (CSV)
                  </Button>
                </div>

                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" /> Daftar Transaksi Menunggak ({selectedClient.unpaidCount})
                </h3>

                <div className="space-y-3">
                  {selectedClient.orders.map(order => (
                    <div key={order.id} className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm hover:border-slate-300 transition-colors">
                      <div className="flex-1 space-y-2">
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
                      <div className="text-right shrink-0 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 w-full md:w-auto">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 text-left md:text-right">Tagihan</p>
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

    </div>
  );
}