"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Receipt, Search, CheckCircle2, AlertCircle, Filter, 
  ArrowUpDown, DollarSign, ShieldAlert, Clock, Undo2, Wallet 
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";

// Import Global Types
import { OrderDetail } from "@/types/order";
// Import Refactored Components
import InvoiceTab from "./components/InvoiceTab";
import DepositTab, { DepositRequest } from "./components/DepositTab";
import RefundTab, { RefundRequest } from "./components/RefundTab";

export default function FinanceVerificationPage() {
  const router = useRouter();
  const { user: currentUser, isHydrated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"orders" | "deposits" | "refunds">("orders");
  
  // Data States
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  
  // BUG FIX: Pisahkan loading state agar tidak stuck jika salah satu collection gagal dimuat
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingDeposits, setLoadingDeposits] = useState(true);
  const [loadingRefunds, setLoadingRefunds] = useState(true);
  
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Pending"); 
  const [sortOrder, setSortOrder] = useState("newest");

  const isLoading = loadingOrders || loadingDeposits || loadingRefunds;

  useEffect(() => {
    // 1. Tarik data Order
    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(qOrders, 
      (snapshot) => {
        setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail)));
        setLoadingOrders(false);
      },
      (error) => {
        console.error("Error fetching orders:", error);
        setLoadingOrders(false); // Fix infinite load
      }
    );

    // 2. Tarik data Deposit
    const qDeposits = query(collection(db, "deposit_requests"), orderBy("createdAt", "desc"));
    const unsubDeposits = onSnapshot(qDeposits, 
      (snapshot) => {
        setDepositRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DepositRequest)));
        setLoadingDeposits(false);
      },
      (error) => {
        console.error("Error fetching deposits:", error);
        setLoadingDeposits(false); // Fix infinite load
      }
    );

    // 3. Tarik data Refund
    const qRefunds = query(collection(db, "refund_requests"), orderBy("createdAt", "desc"));
    const unsubRefunds = onSnapshot(qRefunds, 
      (snapshot) => {
        setRefundRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RefundRequest)));
        setLoadingRefunds(false);
      },
      (error) => {
        console.error("Error fetching refunds:", error);
        setLoadingRefunds(false); // Fix infinite load
      }
    );

    return () => {
      unsubOrders();
      unsubDeposits();
      unsubRefunds();
    };
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  // Global Stats Calculations
  const totalOrdersPending = orders.filter(o => o.paymentStatus === "Menunggu Verifikasi Finance").length;
  const totalDepositsPending = depositRequests.filter(d => d.status === "Pending").length;
  const totalRefundsPending = refundRequests.filter(r => r.status === "Pending").length;
  const totalVerifiedLunas = orders.filter(o => o.paymentStatus === "Lunas").reduce((acc, curr) => acc + (curr.finalGrandTotal || curr.breakdown?.grandTotal || curr.totalCost || 0), 0);

  // Mencegah RBAC gagal sebelum data auth dari Zustand terhidrasi
  if (!isHydrated) return null;

  // RBAC GUARD
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Keuangan & Tagihan ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Menghubungkan ke Buku Besar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Receipt className="w-8 h-8 text-emerald-600" /> Pusat Verifikasi
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">Validasi bukti transfer Tagihan Invoice, Setoran Deposit (B2B), dan Pengembalian Dana (Refund).</p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-16 h-16 text-amber-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Antrean Invoice</span>
          <p className="text-3xl font-black text-amber-600 mt-2">{totalOrdersPending} Tiket</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-16 h-16 text-blue-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Antrean Deposit</span>
          <p className="text-3xl font-black text-blue-600 mt-2">{totalDepositsPending} Tiket</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Undo2 className="w-16 h-16 text-rose-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pengajuan Refund</span>
          <p className="text-3xl font-black text-rose-600 mt-2">{totalRefundsPending} Tiket</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 border border-emerald-700 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-16 h-16 text-white"/></div>
          <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Uang Masuk Divalidasi</span>
          <p className="text-xl md:text-2xl font-black text-white mt-2 truncate">{formatRupiah(totalVerifiedLunas)}</p>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        
        {/* TABS SWITCHER */}
        <div className="flex flex-wrap bg-slate-50 p-2 border-b border-slate-200 w-full relative">
          <button onClick={() => { setActiveTab("orders"); setFilterStatus("Pending"); setSearchQuery(""); }} className={`flex-1 min-w-[120px] py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "orders" ? "text-slate-900 shadow-sm bg-white" : "text-slate-500 hover:text-slate-700"}`}>
            <Receipt className="w-4 h-4"/> Tagihan Invoice
            {totalOrdersPending > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center ml-1">{totalOrdersPending}</span>}
          </button>
          <button onClick={() => { setActiveTab("deposits"); setFilterStatus("Pending"); setSearchQuery(""); }} className={`flex-1 min-w-[120px] py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "deposits" ? "text-emerald-700 shadow-sm bg-white" : "text-slate-500 hover:text-slate-700"}`}>
            <Wallet className="w-4 h-4"/> Setoran Deposit
            {totalDepositsPending > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center ml-1">{totalDepositsPending}</span>}
          </button>
          <button onClick={() => { setActiveTab("refunds"); setFilterStatus("Pending"); setSearchQuery(""); }} className={`flex-1 min-w-[120px] py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "refunds" ? "text-rose-700 shadow-sm bg-white" : "text-slate-500 hover:text-slate-700"}`}>
            <Undo2 className="w-4 h-4"/> Pengembalian Dana
            {totalRefundsPending > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center ml-1">{totalRefundsPending}</span>}
          </button>
        </div>

        {/* TOOLBAR FILTER */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={activeTab === 'orders' ? "Cari ID Manifes atau Nama..." : activeTab === 'deposits' ? "Cari Nama Klien atau ID Top-Up..." : "Cari ID Refund atau Order ID..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-emerald-500 focus:bg-white transition-all shadow-inner" />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white shadow-sm appearance-none font-bold text-slate-700 min-w-[150px]">
                <option value="All">Semua Status</option>
                <option value="Pending">Menunggu Cek</option>
                <option value="Approved">{activeTab === 'orders' ? 'Telah Lunas' : 'Disetujui'}</option>
                <option value={activeTab === 'orders' ? 'Ditolak' : 'Rejected'}>Ditolak</option>
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white shadow-sm appearance-none font-bold text-slate-700 min-w-[160px]">
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="highest_value">Nominal Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABEL DINAMIS */}
        <div className="overflow-x-auto flex-1 bg-white">
          {activeTab === "orders" && <InvoiceTab orders={orders} searchQuery={searchQuery} filterStatus={filterStatus} sortOrder={sortOrder} showToast={showToast} />}
          {activeTab === "deposits" && <DepositTab deposits={depositRequests} searchQuery={searchQuery} filterStatus={filterStatus} sortOrder={sortOrder} showToast={showToast} />}
          {activeTab === "refunds" && <RefundTab refunds={refundRequests} searchQuery={searchQuery} filterStatus={filterStatus} sortOrder={sortOrder} showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}