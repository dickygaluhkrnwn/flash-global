import { motion } from "framer-motion";
import { 
  Package, Truck, Plane, ChevronRight, 
  CreditCard, Star, Search, Navigation, 
  Clock, Printer, Building2, ShieldCheck,
  AlertCircle, CheckCircle2, MessageCircle,
  MapPin
} from "lucide-react";
import { DashboardOrder, LocationDetail } from "@/types/order";
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

  // Menentukan warna Badge Status Operasional (Apple Glass Style)
  const getStatusStyles = (status: string) => {
    if (status.includes("Menunggu Pembayaran")) return "bg-red-50/80 border-red-200 text-red-600 shadow-[0_2px_10px_rgba(220,38,38,0.1)]";
    if (status.includes("Menunggu") || status.includes("Sedang Diproses")) return "bg-amber-50/80 border-amber-200 text-amber-600 shadow-[0_2px_10px_rgba(217,119,6,0.1)]";
    if (status === "Dikirim" || status.includes("Transit") || status.includes("Lokasi")) return "bg-blue-50/80 border-blue-200 text-blue-600 shadow-[0_2px_10px_rgba(37,99,235,0.1)]";
    if (status.includes("Selesai") || status.includes("Lunas")) return "bg-emerald-50/80 border-emerald-200 text-emerald-600 shadow-[0_2px_10px_rgba(16,185,129,0.1)]";
    if (status.includes("Batal") || status.includes("Ditolak")) return "bg-slate-100/80 border-slate-200 text-slate-500 shadow-sm";
    return "bg-slate-50/80 border-slate-200 text-slate-600 shadow-sm";
  };

  // Menentukan Ikon Status
  const getStatusIcon = (status: string) => {
    if (status.includes("Menunggu Pembayaran") || status.includes("Batal")) return <AlertCircle className="w-3.5 h-3.5" />;
    if (status.includes("Selesai")) return <CheckCircle2 className="w-3.5 h-3.5" />;
    if (status === "Dikirim" || status.includes("Transit")) return <Navigation className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  const displayPrice = order.finalPrice || order.price || 0;
  const isB2B = order.statusSub === "Piutang B2B";

  // =======================================================================
  // LOGIKA SMART ROUTING: Membedakan Domestik & Internasional (Forwarding)
  // =======================================================================
  const detailPath = order.category === "internasional" 
    ? `/dashboard/forwarding/${order.id}` 
    : `/dashboard/${order.id}`;

  // =======================================================================
  // SAFE EXTRACTION UNTUK ORIGIN & DESTINATION BIAR GAK CRASH
  // =======================================================================
  let originText = "-";
  if (typeof order.origin === 'object' && order.origin !== null) {
    const orgObj = order.origin as LocationDetail;
    originText = String(orgObj.address || orgObj.senderName || "Lokasi Penjemputan");
  } else if (typeof order.origin === 'string') {
    originText = order.origin;
  }

  let destText = "-";
  if (typeof order.destination === 'object' && order.destination !== null) {
    const destObj = order.destination as LocationDetail;
    destText = String(destObj.address || destObj.receiverName || "Lokasi Pengiriman");
  } else if (typeof order.destination === 'string') {
    destText = order.destination;
  }
  
  // Clean up display text (Ambil kota pertamanya saja agar tidak terlalu panjang di card)
  const displayOrigin = originText.split(",")[0];
  const displayDest = destText.split(",")[0];

  // =======================================================================
  // LOGIKA CERDAS: MENYESUAIKAN TOMBOL AKSI BERDASARKAN STATUS & ROLE B2B
  // =======================================================================
  const renderActionButtons = () => {
    // 1. Jika menunggu pembayaran dan BUKAN klien B2B
    if (order.status === "Menunggu Pembayaran" && !isB2B) {
      return (
        <button 
          onClick={(e) => { e.stopPropagation(); router.push("/pembayaran"); }} 
          className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-b from-[#9A242B] to-[#7A171D] hover:from-[#A82B33] hover:to-[#8B1A21] text-white rounded-xl text-xs font-black transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_10px_rgba(122,23,29,0.2)] active:scale-95 border border-[#5A0E13] flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" /> Bayar Sekarang
        </button>
      );
    }

    // 2. Jika baru dibooking / sedang diproses
    if (order.status === "Menunggu Kurir" || order.status === "Sedang Diproses" || order.status === "Menuju Lokasi Jemput") {
      return (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); router.push(detailPath); }} 
            className="flex-1 sm:flex-none px-4 py-3 bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(15,23,42,0.2)] active:scale-95 border border-slate-950 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Cetak AWB
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); router.push(`/tracking/${order.resi || order.id}`); }} 
            className="flex-1 sm:flex-none px-4 py-3 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_10px_rgba(16,185,129,0.2)] active:scale-95 border border-emerald-700 flex items-center justify-center gap-2"
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
          onClick={(e) => { e.stopPropagation(); router.push(`/tracking/${order.resi || order.id}`); }} 
          className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-xl text-xs font-black transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_10px_rgba(37,99,235,0.2)] active:scale-95 border border-blue-700 flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4" /> Lacak Live Radar
        </button>
      );
    }

    // 4. Jika paket Selesai
    if (order.status.includes("Selesai")) {
      return (
        <button 
          onClick={(e) => { e.stopPropagation(); router.push(detailPath); }}
          className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-b from-[#DFBE7B] to-[#C5A059] hover:from-[#EAD098] hover:to-[#D2B270] text-slate-900 rounded-xl text-xs font-black transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_4px_10px_rgba(197,160,89,0.2)] active:scale-95 border border-[#A68345] flex items-center justify-center gap-2"
        >
          <Star className="w-4 h-4 fill-current" /> Beri Penilaian
        </button>
      );
    }

    // 5. Fallback Default
    return (
      <button 
        onClick={(e) => { e.stopPropagation(); handleWAConfirm(order.id, displayPrice); }} 
        className="flex-1 sm:flex-none px-5 py-3 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-700 hover:bg-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95"
      >
        <MessageCircle className="w-4 h-4" /> Hubungi CS
      </button>
    );
  };

  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, scale: 0.98, y: 10 }} 
      animate={{ opacity: 1, scale: 1, y: 0 }} 
      exit={{ opacity: 0, scale: 0.98, y: -10 }} 
      transition={{ duration: 0.3, ease: "easeOut" }} 
      className={cn(
        "rounded-[2rem] border transition-all duration-300 relative overflow-hidden group cursor-pointer",
        isB2B ? "bg-white/80 backdrop-blur-xl border-indigo-200/60 shadow-[0_8px_30px_rgba(99,102,241,0.05)] hover:shadow-[0_8px_40px_rgba(99,102,241,0.1)] hover:bg-white" 
              : "bg-white/60 backdrop-blur-xl border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)] hover:bg-white hover:border-slate-100"
      )}
      onClick={() => router.push(detailPath)}
    >
      {/* HEADER: Kategori & Status Operasional */}
      <div className="px-6 py-4 border-b border-slate-100/60 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <Badge variant={order.category === "internasional" ? "gold" : "brand"} className="px-3 py-1 shadow-sm">
            {order.category}
          </Badge>
          <span className="font-bold text-slate-700 text-[11px] uppercase tracking-widest flex items-center gap-1.5 opacity-80">
            {order.category === "internasional" ? <Plane className="w-3.5 h-3.5 text-[#C5A059]"/> : <Truck className="w-3.5 h-3.5 text-[#7A171D]"/>} 
            {order.vehicle}
          </span>
        </div>
        
        {/* Apple Glass Style Status Pill */}
        <div className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border backdrop-blur-md shadow-sm", getStatusStyles(order.status))}>
          {getStatusIcon(order.status)}
          {order.status}
        </div>
      </div>

      {/* BODY: Info Rute & Spek Paket */}
      <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
        
        {/* Ikon Produk 3D (Portal Admin Style) */}
        <div className={cn(
          "w-16 h-16 rounded-[1.25rem] flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-105 border", 
          isB2B 
            ? "bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_16px_rgba(79,70,229,0.3)] border-indigo-500 text-white" 
            : "bg-gradient-to-br from-slate-100 to-slate-200 shadow-[inset_0_2px_4px_rgba(255,255,255,1),0_8px_16px_rgba(0,0,0,0.05)] border-white text-slate-500"
        )}>
          {isB2B ? <Building2 className="w-7 h-7 drop-shadow-md" /> : <Package className="w-7 h-7 drop-shadow-sm" />}
        </div>

        {/* Info Rute & Ekstra */}
        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center gap-2 mb-2 w-full">
            <MapPin className="w-4 h-4 text-slate-300 shrink-0 hidden sm:block" />
            <h3 className="font-black text-slate-900 text-base md:text-lg tracking-tight truncate max-w-full flex items-center gap-2">
              <span className="truncate max-w-[120px] sm:max-w-[200px]" title={originText}>{displayOrigin}</span>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0"/> 
              <span className="truncate max-w-[120px] sm:max-w-[200px]" title={destText}>{displayDest}</span>
            </h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <span className="bg-slate-100/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-slate-600 font-mono border border-slate-200/60 shadow-sm">
              {order.resi || `ORD-${order.id.substring(0,6)}`}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{order.weight || 0} Kg</span>
            
            {/* Tag Khusus B2B Corporate Net 30 */}
            {isB2B && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-indigo-700 bg-indigo-50/80 border border-indigo-200/60 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm backdrop-blur-sm">
                  <ShieldCheck className="w-3.5 h-3.5" /> Corporate (Net 30)
                </span>
              </>
            )}

            {/* Tag Promo */}
            {order.promoCode && !isB2B && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-rose-600 bg-rose-50/80 border border-rose-200/60 px-2.5 py-1 rounded-md shadow-sm backdrop-blur-sm flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> Promo Applied
                </span>
              </>
            )}
          </div>
        </div>

        {/* Harga Total */}
        <div className="text-left md:text-right w-full md:w-auto pt-4 md:pt-0 border-t border-dashed md:border-none border-slate-200 shrink-0">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
            {isB2B ? "Piutang Berjalan" : "Total Pembayaran"}
          </p>
          <p className={cn("text-2xl md:text-3xl font-black tracking-tighter", isB2B ? "text-slate-900" : "text-[#7A171D]")}>
            {formatIDR(displayPrice)}
          </p>
        </div>
      </div>

      {/* FOOTER: Sub-Status (Payment) & Tombol Aksi */}
      <div className="px-6 py-4 border-t border-slate-100/60 bg-slate-50/50 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-5 relative z-10">
        
        {/* Indikator Status Tagihan / Waktu */}
        <div className="flex items-center gap-2 w-full sm:w-auto text-[10px] uppercase tracking-widest font-black px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm transition-colors group-hover:border-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={cn("truncate max-w-[250px]", isB2B ? "text-indigo-600" : "text-slate-500")}>
            {order.statusSub || `Dibuat pada ${order.date || "-"}`}
          </span>
        </div>
        
        {/* Tombol Aksi Cerdas */}
        <div className="flex gap-3 w-full sm:w-auto">
          {/* Tombol "Lihat Detail" (Glass Style) - Menggunakan route cerdas */}
          <button 
            onClick={(e) => { e.stopPropagation(); router.push(detailPath); }}
            className="hidden sm:flex px-5 py-3 bg-white/80 backdrop-blur-md border border-slate-200 hover:border-slate-300 hover:bg-white text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            Lihat Detail
          </button>

          {renderActionButtons()}
        </div>
      </div>
      
    </motion.div>
  );
}