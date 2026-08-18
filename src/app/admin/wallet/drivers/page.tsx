"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ShieldAlert, CheckCircle2, AlertCircle, Wallet, Clock, History, ArrowLeft } from "lucide-react";

import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { cn } from "@/lib/utils";

import DriverBalancesTab from "./components/DriverBalancesTab";
import PendingWithdrawalsTab from "./components/PendingWithdrawalsTab";
import HistoryWithdrawalsTab from "./components/HistoryWithdrawalsTab";

export default function AdminWalletCommandCenter() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"balances" | "pending" | "history">("balances");
  const [toast, setToast] = useState<{ type: "success" | "error", msg: string } | null>(null);

  // =========================================================================
  // LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
  // =========================================================================
  const getAdminUrl = (path: string) => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
      return path.replace(/^\/admin/, '') || '/';
    }
    return path; 
  };

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  // 🚀 PERBAIKAN: Cast currentUser ke format yang diterima oleh komponen anak
  const safeCurrentUser = currentUser as unknown as { uid?: string; role?: string; [key: string]: unknown } | null;

  return (
    <div className="space-y-8 pb-20 font-sans max-w-7xl mx-auto">
      {/* GLOBAL TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cn(
            "fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl",
            toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'
          )}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER & TABS */}
      <div className="flex flex-col gap-8">
        
        {/* Navigation & Title */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(getAdminUrl("/admin/wallet"))} className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-white transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Finance Command Center</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Pusat kendali saldo prabayar dan pencairan dana mitra.</p>
          </div>
        </div>

        {/* APPLE STYLE TAB SELECTOR */}
        <div className="bg-slate-200/60 p-1.5 rounded-2xl flex flex-wrap md:flex-nowrap shadow-inner border border-slate-200/80 w-full md:w-fit">
          <button onClick={() => setActiveTab("balances")} className={cn("flex-1 md:w-48 py-3 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2", activeTab === "balances" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <Wallet className="w-4 h-4" /> Dompet Mitra
          </button>
          <button onClick={() => setActiveTab("pending")} className={cn("flex-1 md:w-48 py-3 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2", activeTab === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <Clock className="w-4 h-4" /> Antrean Cair
          </button>
          <button onClick={() => setActiveTab("history")} className={cn("flex-1 md:w-48 py-3 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2", activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <History className="w-4 h-4" /> Riwayat Selesai
          </button>
        </div>
      </div>

      {/* RENDER KONTEN BERDASARKAN TAB */}
      <div className="mt-4 min-h-[60vh]">
        <AnimatePresence mode="wait">
          {activeTab === "balances" && (
            <motion.div key="balances" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <DriverBalancesTab currentUser={safeCurrentUser} showToast={showToast} />
            </motion.div>
          )}
          {activeTab === "pending" && (
            <motion.div key="pending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <PendingWithdrawalsTab currentUser={safeCurrentUser} showToast={showToast} />
            </motion.div>
          )}
          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <HistoryWithdrawalsTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
}