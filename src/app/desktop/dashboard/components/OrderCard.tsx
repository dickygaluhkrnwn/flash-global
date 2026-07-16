import { motion } from "framer-motion";
import { 
  Package, Truck, Plane, ChevronRight, 
  CreditCard, Star, Search, Navigation, 
  Clock, Printer, Building2, ShieldCheck 
} from "lucide-react";
import { DashboardOrder } from "@/types/order";
import { Badge } from "@/components/ui/Badge";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  order: DashboardOrder;
  formatIDR: (v: number) => string;
  handleWAConfirm: (id: string, price: number) => void;
}

export default function OrderCard({ order, formatIDR, handleWAConfirm }: Props) {
  const router = useRouter();

  // Menentukan warna tulisan status operasional
  const getStatusColor = (status: string) => {
    if (status.includes("Menunggu Pembayaran")) return "text-red-600";
    if (status.includes("Menunggu") || status.includes("Sedang Diproses")) return "text-amber-600";
    if (status === "Dikirim" || status.includes("Transit") || status.includes("Lokasi")) return "text-blue-600";
    if (status.includes("Selesai") || status.includes("Lunas")) return "text-emerald-600";
    return "text-slate-600";
  };

  // Harga final yang ditampilkan (sudah dipotong diskon jika ada)
  const displayPrice = order.finalPrice || order.price;
  
  // Detektor Klien Korporat B2B
  // Pada Dashboard Utama, paymentStatus di-mapping ke statusSub
  const isB2B = order.statusSub === "Piutang B2B";

  // =======================================================================
  // LOGIKA CERDAS: MENYESUAIKAN TOMBOL AKSI BERDASARKAN STATUS & ROLE B2B
  // =======================================================================
  const renderActionButtons = () => {
    // 1. Jika menunggu pembayaran dan BUKAN klien B2B (Klien B2B bypass pembayaran)
    if (order.status === "Menunggu Pembayaran" && !isB2B) {
      return (
        <button 
          onClick={(e) => { e.stopPropagation(); router.push("/desktop/pembayaran"); }} 
          className="flex-1 sm:flex-none px-4 py-2.5 bg-[#7A171D] hover:bg-[#5A0E13] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
        >
          <CreditCard className="w-4 h-4" /> Bayar Sekarang
        </button>
      );
    }

    // 2. Jika baru dibooking / sedang diproses di gudang
    if (order.status === "Menunggu Kurir" || order.status === "Sedang Diproses" || order.status === "Menuju Lokasi Jemput") {
      return (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); router.push(`/desktop/dashboard/${order.id}`); }} 
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Cetak AWB
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); router.push(`/desktop/tracking/${order.resi}`); }} 
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" /> Lacak Cepat
          </button>
        </>
      );
    }

    // 3. Jika paket sudah jalan (Dikirim / In Transit)
    if (order.status === "Dikirim" || order.status.includes("Transit")) {
      return (
        <button 
          onClick={(e) => { e.stopPropagation(); router.push(`/desktop/tracking/${order.resi}`); }} 
          className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
        >
          <Navigation className="w-4 h-4" /> Lacak Live Radar
        </button>
      );
    }

    // 4. Jika paket Selesai
    if (order.status.includes("Selesai")) {
      return (
        <button 
          onClick={(e) => { e.stopPropagation(); router.push(`/desktop/dashboard/${order.id}`); }}
          className="flex-1 sm:flex-none px-4 py-2.5 bg-[#C5A059] hover:bg-[#A68345] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
        >
          <Star className="w-4 h-4 fill-current" /> Nilai Kinerja
        </button>
      );
    }

    // 5. Fallback Default (Misal: Menunggu Verifikasi Finance, dsb)
    return (
      <button 
        onClick={(e) => { e.stopPropagation(); handleWAConfirm(order.id, displayPrice); }} 
        className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
      >
        Hubungi CS
      </button>
    );
  };

  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.98 }} 
      transition={{ duration: 0.3 }} 
      className={cn(
        "rounded-[1.5rem] border shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer",
        isB2B ? "bg-white border-indigo-200/60" : "bg-white border-slate-200"
      )}
      onClick={() => router.push(`/desktop/dashboard/${order.id}`)}
    >
      {/* HEADER: Kategori & Status Operasional */}
      <div className={cn("px-5 py-3.5 border-b flex justify-between items-center", isB2B ? "bg-indigo-50/30 border-indigo-100" : "bg-slate-50/50 border-slate-100")}>
        <div className="flex items-center gap-3">
          <Badge variant={order.category === "internasional" ? "brand" : "gold"} className="px-2.5 py-1 text-[10px] shadow-sm uppercase tracking-widest">
            {order.category}
          </Badge>
          <span className="font-bold text-slate-700 text-xs items-center gap-1.5 hidden sm:flex">
            {order.category === "internasional" ? <Plane className="w-4 h-4 text-[#C5A059]"/> : <Truck className="w-4 h-4 text-[#7A171D]"/>} 
            {order.vehicle}
          </span>
        </div>
        <div className={cn("text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1 rounded-md border bg-white shadow-sm", getStatusColor(order.status), isB2B ? "border-indigo-100" : "border-slate-100")}>
          {(order.status === "Dikirim" || order.status.includes("Transit")) && <Navigation className="w-3.5 h-3.5" />}
          {order.status}
        </div>
      </div>

      {/* BODY: Info Rute & Spek Paket */}
      <div className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center">
        
        {/* Ikon Produk Dinamis */}
        <div className={cn("w-14 h-14 md:w-16 md:h-16 border rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105", isB2B ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-slate-50 border-slate-200 text-slate-400")}>
          {isB2B ? <Building2 className="w-7 h-7 md:w-8 md:h-8" /> : <Package className="w-7 h-7 md:w-8 md:h-8" />}
        </div>

        {/* Info Rute & Ekstra */}
        <div className="flex-1 w-full">
          <h3 className="font-bold text-slate-900 text-base md:text-lg mb-2 truncate flex items-center gap-2">
            {order.origin.split(",")[0]} <ChevronRight className="w-4 h-4 text-slate-300 shrink-0"/> {order.destination.split(",")[0]}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 font-mono tracking-wider border border-slate-200 shadow-sm">
              {order.resi}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{order.weight} Kg</span>
            
            {/* Tag Khusus B2B Corporate Net 30 */}
            {isB2B && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                  <ShieldCheck className="w-3 h-3" /> Corporate (Net 30)
                </span>
              </>
            )}

            {/* Tag Promo */}
            {order.promoCode && !isB2B && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-pink-600 bg-pink-50 border border-pink-200 px-1.5 py-0.5 rounded-md shadow-sm">Voucher Terpakai</span>
              </>
            )}
          </div>
        </div>

        {/* Harga Total */}
        <div className="text-left md:text-right w-full md:w-auto pt-4 md:pt-0 border-t md:border-none border-slate-100 shrink-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
            {isB2B ? "Total Piutang Berjalan" : "Total Tagihan"}
          </p>
          <p className={cn("text-xl md:text-2xl font-black tracking-tight", isB2B ? "text-slate-900" : "text-[#7A171D]")}>
            {formatIDR(displayPrice)}
          </p>
        </div>
      </div>

      {/* FOOTER: Sub-Status (Payment) & Tombol Aksi */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Indikator Status Tagihan / Waktu */}
        <div className="flex items-center gap-2 w-full sm:w-auto text-[11px] font-bold px-3 py-2 rounded-xl border bg-white shadow-sm transition-colors group-hover:border-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={cn("truncate max-w-[250px]", isB2B ? "text-indigo-600" : "text-slate-600")}>
            {order.statusSub || `Dibuat pada ${order.date}`}
          </span>
        </div>
        
        {/* Tombol Aksi Cerdas Sesuai State */}
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Tombol "Lihat Detail" disembunyikan di Mobile jika ada action buttons lain agar tidak penuh, tapi di Desktop tetap ada */}
          <button 
            onClick={(e) => { e.stopPropagation(); router.push(`/desktop/dashboard/${order.id}`); }}
            className="hidden sm:flex px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            Lihat Detail
          </button>

          {renderActionButtons()}
        </div>
      </div>
      
    </motion.div>
  );
}