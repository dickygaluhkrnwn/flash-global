"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Receipt, Clock, 
  DollarSign, ShieldAlert, 
  Undo2, Wallet, ArrowRight, Activity
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { OrderDetail } from "@/types/order"; 

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Emerald/Finance Accent)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassCard = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_15px_35px_rgba(16,185,129,0.15)] transition-all duration-300 rounded-[2rem] overflow-hidden group cursor-pointer";

export default function FinanceVerificationHub() {
  const router = useRouter();
  const { user: currentUser, isHydrated } = useAuthStore();

  // Real-time Pending Counters
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [pendingRefunds, setPendingRefunds] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  // =========================================================================
  // LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
  // =========================================================================
  const getAdminUrl = (path: string) => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
      return path.replace(/^\/admin/, '') || '/';
    }
    return path; 
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Tarik Data Order (Invoice)
    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      if (!isMounted) return;
      let pending = 0;
      let revenue = 0;
      snapshot.docs.forEach(d => {
        const data = d.data() as OrderDetail;
        
        if (data.paymentStatus === "Menunggu Verifikasi Finance") pending++;
        if (data.paymentStatus === "Lunas") {
          revenue += (data.finalGrandTotal || data.breakdown?.grandTotal || data.totalCost || 0);
        }
      });
      setPendingInvoices(pending);
      setTotalRevenue(revenue);
    });

    // 2. Tarik Data Deposit (B2B)
    const qDeposits = query(collection(db, "deposit_requests"), where("status", "==", "Pending"));
    const unsubDeposits = onSnapshot(qDeposits, (snapshot) => {
      if (isMounted) setPendingDeposits(snapshot.docs.length);
    });

    // 3. Tarik Data Refund
    const qRefunds = query(collection(db, "refund_requests"), where("status", "==", "Pending"));
    const unsubRefunds = onSnapshot(qRefunds, (snapshot) => {
      if (isMounted) setPendingRefunds(snapshot.docs.length);
      setIsLoading(false); // Selesai loading setelah semua listener aktif
    });

    return () => {
      isMounted = false;
      unsubOrders();
      unsubDeposits();
      unsubRefunds();
    };
  }, []);

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  if (!isHydrated) return null;

  // RBAC GUARD
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Keuangan & Tagihan ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-emerald-600 animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menghubungkan ke Buku Besar...</p>
      </div>
    );
  }

  const totalPendingAll = pendingInvoices + pendingDeposits + pendingRefunds;

  return (
    <div className="space-y-6 font-sans pb-12 max-w-6xl mx-auto">

      {/* 1. HEADER HALAMAN (Command Center) */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        <div className="relative z-10 flex-1">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(16,185,129,0.3)] border border-emerald-800">
              <DollarSign className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            Pusat Verifikasi Keuangan
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium max-w-xl">
            Sistem validasi lalu lintas dana. Pilih modul di bawah untuk memproses bukti transfer tagihan, setoran deposit B2B, atau klaim pengembalian dana.
          </p>
        </div>

        {/* Total Revenue Indicator */}
        <div className="relative z-10 bg-white/60 backdrop-blur-md border border-white p-5 rounded-2xl shadow-sm shrink-0 w-full md:w-auto text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pendapatan Tervalidasi</p>
          <p className="text-3xl font-black text-emerald-600 tracking-tight">{formatRupiah(totalRevenue)}</p>
        </div>
      </div>

      {/* 2. LIVE ALERT BANNER */}
      <AnimatePresence>
        {totalPendingAll > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex items-center gap-4 shadow-sm relative z-10 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-amber-700 text-sm">Menunggu Tindakan Finance</h4>
                <p className="text-xs text-amber-600/80 font-medium mt-0.5">Terdapat <span className="font-black text-amber-600">{totalPendingAll} tiket</span> yang membutuhkan verifikasi Anda saat ini.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. BENTO BOX NAVIGATION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        
        {/* Modul: Verifikasi Invoice */}
        <motion.div onClick={() => router.push(getAdminUrl("/admin/finance/verification/invoice"))} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={glassCard}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:border-blue-600 transition-colors duration-300">
                <Receipt className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              {pendingInvoices > 0 ? (
                <span className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm animate-pulse">
                  {pendingInvoices} Pending
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  Clear
                </span>
              )}
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-2">Verifikasi Tagihan</h2>
            <p className="text-slate-500 text-sm font-medium mb-6 flex-1 leading-relaxed">
              Validasi bukti transfer dari klien <span className="font-bold text-slate-700">Reguler (B2C)</span> untuk pesanan dan pengiriman kargo harian.
            </p>

            <div className="flex items-center text-blue-600 font-bold text-xs uppercase tracking-widest group-hover:gap-2 transition-all">
              Buka Modul <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </motion.div>

        {/* Modul: Verifikasi Deposit B2B */}
        <motion.div onClick={() => router.push(getAdminUrl("/admin/finance/verification/deposit"))} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={glassCard}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:border-emerald-600 transition-colors duration-300">
                <Wallet className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors duration-300" />
              </div>
              {pendingDeposits > 0 ? (
                <span className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm animate-pulse">
                  {pendingDeposits} Pending
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  Clear
                </span>
              )}
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-2">Setoran Deposit B2B</h2>
            <p className="text-slate-500 text-sm font-medium mb-6 flex-1 leading-relaxed">
              Verifikasi permohonan pengisian saldo Prabayar (Top-Up Deposit) dari klien <span className="font-bold text-slate-700">Korporat (B2B)</span>.
            </p>

            <div className="flex items-center text-emerald-600 font-bold text-xs uppercase tracking-widest group-hover:gap-2 transition-all">
              Buka Modul <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </motion.div>

        {/* Modul: Verifikasi Refund */}
        <motion.div onClick={() => router.push(getAdminUrl("/admin/finance/verification/refund"))} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={glassCard}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:border-rose-600 transition-colors duration-300">
                <Undo2 className="w-6 h-6 text-rose-600 group-hover:text-white transition-colors duration-300" />
              </div>
              {pendingRefunds > 0 ? (
                <span className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm animate-pulse">
                  {pendingRefunds} Pending
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  Clear
                </span>
              )}
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-2">Pengembalian Dana</h2>
            <p className="text-slate-500 text-sm font-medium mb-6 flex-1 leading-relaxed">
              Tinjau permohonan pembatalan pesanan atau klaim asuransi barang untuk proses transfer <span className="font-bold text-slate-700">Refund</span> ke klien.
            </p>

            <div className="flex items-center text-rose-600 font-bold text-xs uppercase tracking-widest group-hover:gap-2 transition-all">
              Buka Modul <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}