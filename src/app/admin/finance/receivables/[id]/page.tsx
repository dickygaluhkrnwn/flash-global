"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, CheckCircle2, AlertCircle, 
  Building2, CalendarClock, ShieldAlert, Activity, 
  MapPin, FileSpreadsheet, Download, Printer, Mail, Phone, Map
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, writeBatch, doc, getDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";

// IMPORT LIBRARY PRINT DAN TEMPLATE A4
import { useReactToPrint } from "react-to-print";
import { InvoiceA4Template } from "@/components/shared/InvoiceA4Template";

// MENGGUNAKAN GLOBAL TYPES
import { UnpaidOrder, B2BClientDebt } from "@/types/finance"; 
import { OrderDetail, LocationDetail, FirebaseTimestamp } from "@/types/order";

const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(220,38,38,0.1)] transition-all duration-300 rounded-2xl";

export default function ReceivablesDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const userIdParam = decodeURIComponent(params.id);
  const { user: currentUser } = useAuthStore();

  const [clientData, setClientData] = useState<B2BClientDebt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // REF UNTUK CETAK INVOICE A4
  const invoiceRef = useRef<HTMLDivElement>(null);

  // FIX TYPE ERROR: documentTitle pasti string murni
  const safeTitle = clientData ? String(clientData.name).replace(/\s+/g, '_') : 'Corporate_Client';
  const handlePrintInvoice = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `Invoice_B2B_${safeTitle}_${new Date().toISOString().split('T')[0]}`
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Dapatkan Profil Asli Klien dari koleksi Users
        const userRef = doc(db, "users", userIdParam);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : null;

        const companyName = userData?.companyName || userData?.name || "Corporate Client";
        const companyEmail = userData?.companyEmail || userData?.email || "-";
        const companyPhone = userData?.companyPhone || userData?.phone || "-";
        const companyAddress = userData?.defaultAddress || "Alamat tidak tersedia";

        // 2. Tarik semua Order yang belum lunas milik Klien ini
        const b2bOrderQ = query(
          collection(db, "orders"), 
          where("isB2BApplied", "==", true),
          where("userId", "==", userIdParam)
        );
        const b2bOrderSnap = await getDocs(b2bOrderQ);
        
        let totalDebt = 0;
        const orders: UnpaidOrder[] = [];
        
        b2bOrderSnap.forEach(docObj => {
          const data = docObj.data() as OrderDetail;
          
          // 🚀 FIX FATAL LOGIC: Filter Positif seperti di halaman utama
          const isTrueDebt = 
            data.paymentStatus === "Piutang B2B" || 
            data.paymentStatus === "Menunggu Verifikasi Finance" || 
            data.paymentStatus === "Ditolak";
            
          const isNotCancelled = data.status !== "Dibatalkan" && data.paymentStatus !== "Dibatalkan" && data.paymentStatus !== "Refund Selesai";

          if (isTrueDebt && isNotCancelled) {
            const originObj = typeof data.origin === 'object' && data.origin !== null ? data.origin as LocationDetail : null;
            const originAddress = originObj?.address ? String(originObj.address) : (typeof data.origin === 'string' ? String(data.origin) : "-");
            
            const amount = Number(data.finalGrandTotal || data.breakdown?.grandTotal || data.totalCost || 0);
            const weight = Number(data.totalWeight || data.weight || 0);
            const vehicle = data.vehicleName ? String(data.vehicleName) : (data.vehicle ? String(data.vehicle) : "Kargo Logistik");
            
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
            const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            
            let primaryDest = "Tujuan";
            if (typeof data.destination === 'string') {
                primaryDest = String(data.destination);
            } else if (data.destinations && data.destinations.length > 0) {
                primaryDest = data.destinations.length > 1 ? `${data.destinations.length} Titik Drop` : String(data.destinations[0].address || "Tujuan");
            }

            totalDebt += amount;
            orders.push({
              id: String(docObj.id),
              date: dateStr,
              originAddress: originAddress,
              destAddress: primaryDest,
              amount: amount,
              status: data.paymentStatus ? String(data.paymentStatus) : "Menunggu Pembayaran",
              weight: weight,
              vehicle: vehicle
            });
          }
        });
        
        if (orders.length > 0) {
           orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
           
           setClientData({
             id: userIdParam,
             name: companyName,
             email: companyEmail,
             phone: companyPhone,     // Disimpan secara type-safe
             address: companyAddress, // Disimpan secara type-safe
             unpaidCount: orders.length,
             totalDebt: totalDebt,
             orders: orders
           });
        } else {
           showToast("success", "Klien ini tidak memiliki piutang menggantung.");
           setTimeout(() => router.push("/admin/finance/receivables"), 2000);
        }

      } catch (err) {
        console.error("Gagal menarik detail piutang:", err);
        showToast("error", "Gagal memuat rincian data penagihan klien.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userIdParam, router]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);
  const escapeCsv = (str: string | number) => `"${String(str).replace(/"/g, '""')}"`;

  const handleDownloadClientInvoice = () => {
    if (!clientData) return;
    try {
      const headers = ["ID Transaksi", "Tanggal", "Rute Asal", "Rute Tujuan", "Status", "Nominal Tagihan (IDR)"];
      const rows = clientData.orders.map(o => [
        escapeCsv(o.id), escapeCsv(o.date), escapeCsv(o.originAddress), 
        escapeCsv(o.destAddress), escapeCsv(o.status), o.amount
      ].join(","));
      
      rows.push(`"","","","","TOTAL PIUTANG",${clientData.totalDebt}`);

      const csvContent = headers.join(",") + "\n" + rows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const safeName = String(clientData.name).replace(/[^a-zA-Z0-9]/g, "_");
      link.setAttribute("download", `Invoice_B2B_${safeName}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("success", `Rekap CSV tagihan untuk ${clientData.name} berhasil diunduh.`);
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal mengunduh rekap CSV.");
    }
  };

  const handleSettleDebt = async () => {
    if (!clientData) return;
    if (!confirm(`Yakin menandai SELURUH PIUTANG ${clientData.name} sebesar ${formatRupiah(clientData.totalDebt)} sebagai LUNAS?`)) {
      return;
    }

    setIsProcessingPayment(true);
    try {
      const batch = writeBatch(db);
      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();

      clientData.orders.forEach(order => {
        const orderRef = doc(db, "orders", order.id);
        batch.update(orderRef, {
          paymentStatus: "Lunas",
          paymentMethod: "Bank Transfer B2B (Settled)",
          paidAt: serverTimestamp(),
          trackingHistory: arrayUnion({
              id: uniqueId,
              status: "Piutang B2B Dilunaskan",
              date: logDate,
              description: "Pembayaran tagihan termin Piutang (Net 30) telah dibayarkan penuh dan disetujui oleh Finance.",
              location: "Pusat Keuangan Flash Global"
          })
        });
      });

      await batch.commit();
      showToast("success", `Pembayaran diterima! Piutang ${clientData.name} telah dilunaskan.`);
      
      setTimeout(() => router.push("/admin/finance/receivables"), 2000);

    } catch (error) {
      console.error("Gagal melunasi piutang:", error);
      showToast("error", "Terjadi kesalahan saat memproses pelunasan massal.");
      setIsProcessingPayment(false);
    }
  };

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading || !clientData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-red-600 animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menghimpun Berkas Penagihan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-10 max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER NAV */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-white transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Rincian Penagihan Klien
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 font-medium">{clientData.name} <span className="font-mono ml-1 text-[10px] uppercase bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Net 30</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* KIRI: STATS & PRINT ACTIONS (Sticky Column) */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">
           
           {/* Card Info Klien */}
           <div className={`${glassPanel} rounded-3xl p-6 relative overflow-hidden`}>
             <div className="flex items-start gap-4 mb-5 border-b border-white/60 pb-5">
                <div className="w-12 h-12 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Klien Korporat B2B</p>
                  <h2 className="text-sm font-black text-slate-900 truncate uppercase">{clientData.name}</h2>
                </div>
             </div>
             <div className="space-y-3">
               <p className="flex items-center gap-2 text-xs font-medium text-slate-600"><Mail className="w-4 h-4 text-slate-400 shrink-0"/> <span className="truncate">{clientData.email}</span></p>
               <p className="flex items-center gap-2 text-xs font-medium text-slate-600"><Phone className="w-4 h-4 text-slate-400 shrink-0"/> <span className="font-mono">{clientData.phone || "-"}</span></p>
               <p className="flex items-start gap-2 text-xs font-medium text-slate-600 leading-relaxed"><Map className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"/> <span className="line-clamp-2">{clientData.address || "-"}</span></p>
             </div>
           </div>

           {/* Card Tagihan Merah */}
           <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-3xl p-6 border border-red-900 shadow-[0_10px_30px_rgba(220,38,38,0.2)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] opacity-20 pointer-events-none bg-white" />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <p className="text-[11px] font-black text-red-200 uppercase tracking-widest">Total Piutang</p>
                <span className="bg-red-900/50 text-red-100 text-[10px] font-bold px-2 py-1 rounded-lg border border-red-800 flex items-center gap-1.5 shadow-inner">
                  <AlertCircle className="w-3 h-3" /> {clientData.unpaidCount} Transaksi
                </span>
              </div>
              
              <p className="text-4xl font-black text-white tracking-tight font-mono relative z-10">
                {formatRupiah(clientData.totalDebt)}
              </p>
           </div>

           {/* Aksi Export & Print */}
           <div className={`${glassPanel} rounded-3xl p-6 space-y-3`}>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-white/60 pb-2">Dokumen Tagihan</p>
              
              <AdminButton 
                onClick={handlePrintInvoice} 
                disabled={isProcessingPayment}
                variant="outline"
                className="w-full text-[#C5A059] border-[#C5A059] hover:bg-[#C5A059]/10 font-bold bg-white h-11"
              >
                <Printer className="w-4 h-4 mr-2" /> Cetak / Simpan PDF (A4)
              </AdminButton>

              <AdminButton 
                onClick={() => handleDownloadClientInvoice()} 
                disabled={isProcessingPayment}
                variant="outline"
                className="w-full font-bold bg-white text-slate-700 h-11"
              >
                <Download className="w-4 h-4 mr-2" /> Ekspor Rekap CSV
              </AdminButton>
           </div>
        </div>

        {/* KANAN: DAFTAR TRANSAKSI MENGGANTUNG & PELUNASAN */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           
           {/* Section Daftar Transaksi */}
           <div className={`${glassPanel} rounded-[2rem] p-6 md:p-8 flex-1`}>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b border-white/60 pb-4 mb-6">
                <FileSpreadsheet className="w-4 h-4 text-slate-400"/> Daftar Transaksi Menunggak
              </h3>

              <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {clientData.orders.map((order, idx) => (
                  <motion.div 
                    key={order.id} 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    className={`${glassRow} p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group border border-white`}
                  >
                    <div className="flex-1 space-y-3 w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md text-xs border border-slate-200 shadow-sm">#{order.id.substring(0,8)}</span>
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-100 shadow-sm"><CalendarClock className="w-3 h-3"/> {order.date}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs font-medium text-slate-600 w-full">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0"/> <span className="truncate">{order.originAddress}</span>
                        </div>
                        <span className="hidden sm:inline text-slate-300 font-black shrink-0">→</span>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0"/> <span className="truncate">{order.destAddress}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-left md:text-right shrink-0 bg-white px-5 py-3 rounded-xl border border-slate-100 w-full md:w-auto shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 text-left md:text-right">Nilai Tagihan</p>
                      <p className="text-lg font-black text-red-600 text-left md:text-right font-mono tracking-tight">{formatRupiah(order.amount)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
           </div>

           {/* Section Action Pelunasan */}
           <div className={`${glassPanel} rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-100/50 bg-gradient-to-r from-emerald-50/50 to-transparent`}>
             <div className="flex items-start gap-4 max-w-lg">
               <ShieldAlert className="w-8 h-8 text-emerald-600 shrink-0 mt-1" />
               <div>
                 <h4 className="font-black text-slate-900 text-sm">Pelunasan Tagihan Massal</h4>
                 <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                   Pastikan dana pembayaran telah masuk ke rekening perusahaan. Tindakan ini akan melunaskan seluruh {clientData.unpaidCount} transaksi dan mengembalikan limit kredit klien secara otomatis.
                 </p>
               </div>
             </div>
             
             <AdminButton 
                onClick={handleSettleDebt} 
                disabled={isProcessingPayment} 
                className="bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white font-bold h-14 w-full md:w-auto px-8 shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_10px_25px_rgba(16,185,129,0.4)] shrink-0 transition-all text-sm rounded-2xl"
             >
                {isProcessingPayment ? "Memproses Data..." : <><CheckCircle2 className="w-5 h-5 mr-2" /> Terima Pelunasan B2B</>}
             </AdminButton>
           </div>

        </div>
      </div>

      {/* ================================================= */}
      {/* HIDDEN INVOICE A4 COMPONENT UNTUK DIPRINT         */}
      {/* ================================================= */}
      <div style={{ display: 'none' }}>
        {clientData && (
          <InvoiceA4Template 
            ref={invoiceRef}
            invoiceNumber={`INV-${String(clientData.name).substring(0,3).toUpperCase()}-${new Date().getTime().toString().slice(-6)}`}
            issueDate={new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            // Net 30 Days untuk Klien B2B
            dueDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            clientName={String(clientData.name)}
            clientEmail={String(clientData.email)}
            clientAddress={String(clientData.address || "-")}
            clientPhone={String(clientData.phone || "-")}
            items={clientData.orders.map(o => ({
              id: String(o.id).slice(-8).toUpperCase(),
              date: String(o.date),
              description: `Rute Pengiriman: ${o.originAddress} ➔ ${o.destAddress}`,
              service: String(o.vehicle) || "Layanan Kargo B2B",
              weight: Number(o.weight) || 0,
              amount: Number(o.amount)
            }))}
            subTotal={Number(clientData.totalDebt)}
            discountAmount={0}
            taxAmount={0} 
            grandTotal={Number(clientData.totalDebt)}
          />
        )}
      </div>

    </div>
  );
}