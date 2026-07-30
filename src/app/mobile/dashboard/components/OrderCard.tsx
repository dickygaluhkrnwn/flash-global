import { motion } from "framer-motion";
import { Package, Truck, Plane, ChevronRight, CreditCard, Star, Search, Navigation, Clock, Printer, Building2, CheckCircle2, AlertCircle, MessageCircle } from "lucide-react";
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

  const getStatusStyles = (status: string) => {
    if (status.includes("Menunggu Pembayaran")) return "bg-red-50 border-red-200 text-red-600";
    if (status.includes("Menunggu") || status.includes("Sedang Diproses")) return "bg-amber-50 border-amber-200 text-amber-600";
    if (status === "Dikirim" || status.includes("Transit") || status.includes("Lokasi")) return "bg-blue-50 border-blue-200 text-blue-600";
    if (status.includes("Selesai") || status.includes("Lunas")) return "bg-emerald-50 border-emerald-200 text-emerald-600";
    if (status.includes("Batal") || status.includes("Ditolak")) return "bg-slate-100 border-slate-200 text-slate-500";
    return "bg-slate-50 border-slate-200 text-slate-600";
  };

  const getStatusIcon = (status: string) => {
    if (status.includes("Menunggu Pembayaran") || status.includes("Batal")) return <AlertCircle className="w-3 h-3" />;
    if (status.includes("Selesai")) return <CheckCircle2 className="w-3 h-3" />;
    if (status === "Dikirim" || status.includes("Transit")) return <Navigation className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const displayPrice = order.finalPrice || order.price;
  const isB2B = order.statusSub === "Piutang B2B";

  // =======================================================================
  // LOGIKA SMART ROUTING (Mendeteksi arah detail card)
  // =======================================================================
  const detailPath = order.category === "internasional" 
    ? `/dashboard/forwarding/${order.id}` 
    : `/dashboard/${order.id}`;

  const renderActionButtons = () => {
    // Semua tombol dibuat full-width dengan height h-12 agar sangat nyaman disentuh jempol
    if (order.status === "Menunggu Pembayaran" && !isB2B) {
      return (
        <button onClick={(e) => { e.stopPropagation(); router.push("/pembayaran"); }} className="w-full h-12 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white rounded-xl text-xs font-black shadow-sm active:scale-95 border border-[#5A0E13] flex items-center justify-center gap-2 tap-highlight-transparent">
          <CreditCard className="w-4 h-4" /> Bayar Sekarang
        </button>
      );
    }

    if (order.status === "Menunggu Kurir" || order.status === "Sedang Diproses" || order.status === "Menuju Lokasi Jemput") {
      return (
        <div className="grid grid-cols-2 gap-2 w-full">
          <button onClick={(e) => { e.stopPropagation(); router.push(detailPath); }} className="h-12 bg-slate-800 text-white rounded-xl text-[11px] font-bold active:scale-95 border border-slate-950 flex items-center justify-center gap-1.5 tap-highlight-transparent">
            <Printer className="w-3.5 h-3.5" /> Cetak AWB
          </button>
          <button onClick={(e) => { e.stopPropagation(); router.push(`/tracking/${order.resi}`); }} className="h-12 bg-emerald-500 text-white rounded-xl text-[11px] font-bold active:scale-95 border border-emerald-700 flex items-center justify-center gap-1.5 tap-highlight-transparent">
            <Search className="w-3.5 h-3.5" /> Lacak Live
          </button>
        </div>
      );
    }

    if (order.status === "Dikirim" || order.status.includes("Transit")) {
      return (
        <button onClick={(e) => { e.stopPropagation(); router.push(`/tracking/${order.resi}`); }} className="w-full h-12 bg-blue-500 text-white rounded-xl text-xs font-black active:scale-95 border border-blue-600 flex items-center justify-center gap-2 tap-highlight-transparent">
          <Navigation className="w-4 h-4" /> Buka Satelit Radar
        </button>
      );
    }

    if (order.status.includes("Selesai")) {
      return (
        <button onClick={(e) => { e.stopPropagation(); router.push(detailPath); }} className="w-full h-12 bg-[#DFBE7B] text-slate-900 rounded-xl text-xs font-black active:scale-95 border border-[#A68345] flex items-center justify-center gap-2 tap-highlight-transparent">
          <Star className="w-4 h-4 fill-current" /> Beri Penilaian
        </button>
      );
    }

    return (
      <button onClick={(e) => { e.stopPropagation(); handleWAConfirm(order.id, displayPrice); }} className="w-full h-12 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 tap-highlight-transparent">
        <MessageCircle className="w-4 h-4" /> Hubungi Bantuan CS
      </button>
    );
  };

  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, scale: 0.95, y: 10 }} 
      animate={{ opacity: 1, scale: 1, y: 0 }} 
      exit={{ opacity: 0, scale: 0.95, y: -10 }} 
      className={cn(
        "rounded-[2rem] border transition-all duration-300 relative overflow-hidden cursor-pointer tap-highlight-transparent",
        isB2B ? "glass-card bg-indigo-50/50 border-indigo-200/60 shadow-sm active:bg-indigo-50" 
              : "glass-card bg-white/70 border-white shadow-sm active:bg-slate-50"
      )}
      onClick={() => router.push(detailPath)}
    >
      <div className="px-5 py-3 border-b border-slate-200/50 flex justify-between items-center relative z-10 bg-white/40">
        <div className="flex items-center gap-2">
          <Badge variant={order.category === "internasional" ? "gold" : "brand"} className="px-2 py-0.5 text-[9px] shadow-none">
            {order.category}
          </Badge>
          <span className="font-bold text-slate-700 text-[9px] uppercase tracking-widest flex items-center gap-1 opacity-80">
            {order.category === "internasional" ? <Plane className="w-3 h-3 text-[#C5A059]"/> : <Truck className="w-3 h-3 text-[#7A171D]"/>} 
            {order.vehicle}
          </span>
        </div>
        
        <div className={cn("text-[9px] font-black uppercase tracking-widest flex items-center gap-1 px-2.5 py-1 rounded-lg border", getStatusStyles(order.status))}>
          {getStatusIcon(order.status)}
          <span className="truncate max-w-[100px]">{order.status}</span>
        </div>
      </div>

      <div className="p-5 relative z-10">
        <div className="flex gap-4 items-center">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border", 
            isB2B ? "bg-gradient-to-br from-indigo-400 to-indigo-600 border-indigo-500 text-white" : "bg-gradient-to-br from-slate-100 to-slate-200 border-white text-slate-500 shadow-inner"
          )}>
            {isB2B ? <Building2 className="w-6 h-6" /> : <Package className="w-6 h-6" />}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
              <span className="truncate">{order.origin.split(",")[0]}</span>
              <ChevronRight className="w-3 h-3 text-slate-300 shrink-0"/> 
              <span className="truncate">{order.destination.split(",")[0]}</span>
            </h3>
            
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[9px] font-bold uppercase tracking-widest">
              <span className="text-slate-500">{order.resi}</span>
              <span className="text-slate-300">•</span>
              <span className="text-[#7A171D]">{order.weight} Kg</span>
              {isB2B && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-indigo-600">Net 30</span>
                </>
              )}
            </div>
            
            <p className={cn("text-lg font-black tracking-tighter mt-1", isB2B ? "text-indigo-900" : "text-[#7A171D]")}>
              {formatIDR(displayPrice)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-200/50 bg-white/40 flex flex-col gap-3 relative z-10">
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-black text-slate-500">
          <Clock className="w-3 h-3 shrink-0" />
          <span className="truncate">{order.statusSub || `Dibuat ${order.date}`}</span>
        </div>
        {renderActionButtons()}
      </div>
    </motion.div>
  );
}