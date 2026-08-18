"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, FileText, User, 
  MapPin, Package, Truck, Scale, Receipt, 
  TicketPercent, Building, Activity, ShieldAlert
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

import { FinanceReport } from "@/types/finance";
import { OrderDetail, LocationDetail, FirebaseTimestamp } from "@/types/order";

// 🚀 ENHANCED APPLE GLASSMORPHISM VARIABLES
const glassCard = "bg-white/60 backdrop-blur-[40px] saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,1)] transition-all duration-300 rounded-[2rem]";
const glassInner = "bg-white/50 border border-white/60 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] rounded-[1.25rem]";

export default function FinanceReportDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [report, setReport] = useState<FinanceReport | null>(null);
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
    const fetchDetail = async () => {
      try {
        const docRef = doc(db, "orders", params.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as OrderDetail;
          
          let finalClientEmail: string = String(data.email || data.senderEmail || "");
          
          if (!finalClientEmail && data.userId) {
            try {
              const userSnap = await getDoc(doc(db, "users", data.userId));
              if (userSnap.exists()) {
                const userData = userSnap.data() as Record<string, unknown>;
                if (userData.email) {
                  finalClientEmail = String(userData.email);
                }
              }
            } catch (error) {
              console.warn("Gagal narik user email", error);
            }
          }
          finalClientEmail = finalClientEmail || "Tidak ada email terdaftar";

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
          const finalClientName = senderNameFallback ? String(senderNameFallback) : (typeof data.name === 'string' ? data.name : "Guest");
          const senderPhoneFallback = originObj?.senderPhone || data.senderPhone || "-";
          
          setReport({
            id: docSnap.id,
            date: dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            clientName: finalClientName,
            clientEmail: finalClientEmail,
            clientPhone: String(senderPhoneFallback),
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
          });
        }
      } catch (error) {
        console.error("Gagal menarik data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [params.id]);

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans h-[80vh]">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Akses Ditolak</h2>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8 border-slate-300">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-emerald-600 animate-pulse mb-6" />
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Menghimpun Data Arsip...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans h-[80vh]">
        <FileText className="w-24 h-24 text-slate-300 mb-6" />
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Arsip Tidak Ditemukan</h2>
        <AdminButton onClick={() => router.back()} variant="outline" className="mt-8 border-slate-300 shadow-sm">Kembali</AdminButton>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8 pb-16 font-sans max-w-6xl mx-auto px-4 sm:px-0"
    >
      
      {/* 1. TOP NAV & BREADCRUMB */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => router.push(getAdminUrl('/admin/finance/reports'))} 
            className="w-12 h-12 rounded-[1.25rem] bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-white transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
              Buku Besar Transaksi
            </h1>
            <p className="text-[10px] sm:text-xs font-black text-emerald-600 uppercase tracking-widest mt-1">Ref ID: #{report.id}</p>
          </div>
        </div>
      </div>

      {/* 🚀 2. GRID MASTER (Fokus Perataan Presisi Horizontal) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* === BARIS 1 === */}
        {/* KIRI: Informasi Klien & Rute */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-7 flex"
        >
          <div className={`${glassCard} w-full p-6 sm:p-8 flex flex-col`}>
            
            {/* Header User */}
            <div className="flex items-center gap-5 border-b border-slate-200/60 pb-6 shrink-0">
              <div className="w-16 h-16 bg-slate-100 rounded-[1.25rem] border border-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-slate-400" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Informasi Klien</p>
                <p className="text-lg font-black text-slate-900 uppercase truncate" title={report.clientName}>{report.clientName}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 shadow-sm">{report.clientPhone}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 shadow-sm truncate max-w-[200px]">{report.clientEmail}</span>
                </div>
              </div>
            </div>

            {/* Rute Tracker */}
            <div className="relative pl-4 mt-8 flex-1 flex flex-col justify-center">
              {/* Solid Gradient Line */}
              <div className="absolute left-[31px] top-6 bottom-6 w-1 bg-gradient-to-b from-slate-200 via-emerald-200 to-emerald-500 rounded-full z-0"></div>
              
              <div className="space-y-8 relative z-10">
                <div className="flex items-start gap-5">
                  <div className="mt-1 bg-white p-2.5 rounded-full border-2 border-slate-200 shadow-sm z-10"><MapPin className="w-5 h-5 text-slate-400" /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Titik Penjemputan (Asal)</p>
                    <p className="font-bold text-slate-800 text-sm leading-relaxed">{report.originAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="mt-1 bg-emerald-50 p-2.5 rounded-full border-2 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10"><MapPin className="w-5 h-5 text-emerald-600" /></div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Titik Pengiriman (Tujuan)</p>
                    <p className="font-bold text-slate-800 text-sm leading-relaxed">{report.destAddress}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </motion.div>

        {/* KANAN: Faktur Pembayaran */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-5 flex"
        >
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-[2rem] p-8 sm:p-10 border border-slate-700 shadow-[0_30px_60px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] text-white relative overflow-hidden w-full flex flex-col">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500 rounded-full blur-[100px] opacity-15 pointer-events-none"></div>
            
            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-8 text-slate-400 border-b border-slate-700/80 pb-4 shrink-0"><Receipt className="w-4 h-4 text-emerald-400" /> Faktur Pembayaran</h4>
            
            <div className="space-y-4 mb-8 text-sm font-medium font-mono flex-1">
              {report.rawObj?.breakdown ? (
                <>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-sans">Tarif Dasar Jarak</span>
                    <span className="text-white font-bold">{formatRupiah(report.baseFee)}</span>
                  </div>
                  {report.insuranceFee > 0 && (
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="font-sans">Asuransi</span>
                      <span className="text-emerald-400 font-bold">+ {formatRupiah(report.insuranceFee)}</span>
                    </div>
                  )}
                  {report.porterFee > 0 && (
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="font-sans">Jasa Porter</span>
                      <span className="text-emerald-400 font-bold">+ {formatRupiah(report.porterFee)}</span>
                    </div>
                  )}
                  {report.tollFee > 0 && (
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="font-sans">Deposit Tol/Parkir</span>
                      <span className="text-emerald-400 font-bold">+ {formatRupiah(report.tollFee)}</span>
                    </div>
                  )}
                  {report.b2bDiscount > 0 && (
                    <div className="flex justify-between items-center text-amber-300">
                      <span className="font-sans">Diskon Korporat B2B</span>
                      <span className="font-bold">- {formatRupiah(report.b2bDiscount)}</span>
                    </div>
                  )}
                  {report.promoCode && (
                    <div className="flex justify-between items-center text-pink-300 border-t border-slate-700/50 pt-4 mt-4">
                      <span className="flex items-center gap-1.5 font-sans bg-pink-500/10 px-2 py-0.5 rounded text-pink-400"><TicketPercent className="w-3.5 h-3.5"/> {report.promoCode}</span>
                      <span className="font-bold">- {formatRupiah(report.promoDiscount)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-sans">Harga Penawaran Fix</span>
                  <span className="text-white font-bold">{formatRupiah(report.amount)}</span>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-700/80 flex justify-between items-end relative z-10 shrink-0">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Total Pemasukan Kotor</p>
                <p className="text-4xl sm:text-5xl font-black text-emerald-400 font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                  {formatRupiah(report.amount)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* === BARIS 2 === */}
        {/* KIRI: Spesifikasi Operasional */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-7 flex"
        >
          <div className={`${glassCard} w-full p-6 sm:p-8 flex flex-col justify-center`}>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-5 shrink-0"><Package className="w-4 h-4 text-slate-400" /> Spesifikasi Operasional</h4>
            <div className="grid grid-cols-2 gap-5 flex-1">
              <div className={`${glassInner} p-5 flex flex-col justify-center`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total Berat Aktual</p>
                <p className="text-2xl font-black text-slate-900 flex items-center gap-2"><Scale className="w-6 h-6 text-emerald-500"/> {report.weight} Kg</p>
              </div>
              <div className={`${glassInner} p-5 flex flex-col justify-center`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Pilihan Armada</p>
                <p className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 mt-1 truncate" title={report.vehicleName}><Truck className="w-5 h-5 text-blue-500 shrink-0"/> {report.vehicleName}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KANAN: Status & Metode Pembayaran */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-5 flex"
        >
          <div className={`${glassCard} w-full p-6 sm:p-8 flex flex-col justify-center gap-5`}>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">Keterangan Buku Besar</p>
            <div className={`${glassInner} p-5 flex items-center justify-between flex-1`}>
              <span className="font-black text-slate-800 text-sm flex items-center gap-2"><Building className="w-5 h-5 text-slate-400"/> {report.paymentMethod}</span>
              <AdminBadge variant={report.paymentStatus === 'Lunas' || report.rawObj.status === 'Selesai' ? "success" : report.paymentStatus.includes('Menunggu') ? "warning" : "danger"} className="shadow-sm px-4 py-1.5 text-[10px]">
                {report.paymentStatus === 'Lunas' || report.rawObj.status === 'Selesai' ? "Lunas" : report.paymentStatus}
              </AdminBadge>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}