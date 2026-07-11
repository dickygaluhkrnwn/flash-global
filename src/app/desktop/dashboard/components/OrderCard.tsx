import { motion } from "framer-motion";
import { Package, Truck, Plane, ChevronRight, CreditCard, Star, Search, Navigation, Clock } from "lucide-react";
import { Order } from "./types";
import { Badge } from "@/components/ui/Badge";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  order: Order;
  formatIDR: (v: number) => string;
  handleWAConfirm: (id: string, price: number) => void;
}

export default function OrderCard({ order, formatIDR, handleWAConfirm }: Props) {
  const router = useRouter();

  // Menentukan warna tulisan status
  const getStatusColor = (status: string) => {
    if (status.includes("Menunggu Pembayaran")) return "text-red-600";
    if (status.includes("Menunggu")) return "text-amber-600";
    if (status === "Dikirim" || status.includes("Transit") || status.includes("Lokasi")) return "text-blue-600";
    if (status.includes("Selesai") || status.includes("Lunas")) return "text-emerald-600";
    return "text-slate-600";
  };

  // Harga final yang ditampilkan (sudah dipotong diskon jika ada)
  const displayPrice = order.finalPrice || order.price;

  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.98 }} 
      transition={{ duration: 0.3 }} 
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-default"
    >
      {/* HEADER: Kategori & Status (Shopee Style) */}
      <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-3">
          <Badge variant={order.category === "internasional" ? "brand" : "gold"} className="px-2 py-0.5 text-[10px] shadow-sm uppercase">
            {order.category}
          </Badge>
          <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5 hidden sm:flex">
            {order.category === "internasional" ? <Plane className="w-3.5 h-3.5 text-slate-400"/> : <Truck className="w-3.5 h-3.5 text-slate-400"/>} 
            {order.vehicle}
          </span>
        </div>
        <div className={cn("text-xs font-black uppercase tracking-wider flex items-center gap-1.5", getStatusColor(order.status))}>
          {(order.status === "Dikirim" || order.status.includes("Transit")) && <Navigation className="w-3.5 h-3.5" />}
          {order.status}
        </div>
      </div>

      {/* BODY: Info Singkat Paket (Bisa diklik untuk menuju Detail) */}
      <div 
        onClick={() => router.push(`/dashboard/${order.id}`)}
        className="p-5 flex flex-col md:flex-row gap-4 md:gap-5 items-start md:items-center cursor-pointer hover:bg-slate-50/50 transition-colors"
      >
        {/* Ikon Produk */}
        <div className="w-14 h-14 md:w-16 md:h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
          <Package className="w-7 h-7 md:w-8 md:h-8 text-slate-400" />
        </div>

        {/* Info Rute & Kurir */}
        <div className="flex-1 w-full">
          <h3 className="font-bold text-slate-900 text-base md:text-lg mb-1.5 truncate flex items-center gap-2">
            {order.origin.split(",")[0]} <ChevronRight className="w-4 h-4 text-slate-300 shrink-0"/> {order.destination.split(",")[0]}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-xs font-semibold text-slate-500">
            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono tracking-wider border border-slate-200">
              {order.resi}
            </span>
            <span className="text-slate-300">•</span>
            <span>{order.weight} Kg</span>
            {order.promoCode && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-pink-600 bg-pink-50 border border-pink-100 px-1.5 py-0.5 rounded">Promo Dipakai</span>
              </>
            )}
          </div>
        </div>

        {/* Harga Total */}
        <div className="text-left md:text-right w-full md:w-auto pt-3 md:pt-0 border-t md:border-none border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Total Pesanan</p>
          <p className="text-lg md:text-xl font-black text-[#7A171D]">{formatIDR(displayPrice)}</p>
        </div>
      </div>

      {/* FOOTER: Status Sub & Tombol Aksi */}
      <div className="px-5 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Waktu & Sub Status */}
        <div className="flex items-center gap-2 w-full sm:w-auto text-[11px] font-medium text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate max-w-[250px]">{order.statusSub || `Dibuat pada ${order.date}`}</span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => router.push(`/dashboard/${order.id}`)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            Lihat Detail
          </button>

          {/* Tombol Aksi Cerdas Sesuai Status */}
          {order.status === "Menunggu Pembayaran" ? (
            <button 
              onClick={() => router.push("/pembayaran")} 
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#7A171D] hover:bg-[#5A0E13] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" /> Bayar
            </button>
          ) : order.status === "Dikirim" || order.status.includes("Transit") || order.status.includes("Jemput") ? (
            <button 
              onClick={() => router.push(`/tracking/${order.resi}`)} 
              className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Search className="w-4 h-4" /> Lacak
            </button>
          ) : order.status === "Selesai" ? (
            <button 
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#C5A059] hover:bg-[#A68345] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Star className="w-4 h-4 fill-current" /> Nilai
            </button>
          ) : (
            // Fallback (Menunggu Review, Verifikasi Finance, dll)
            <button 
              onClick={() => handleWAConfirm(order.id, displayPrice)} 
              className="flex-1 sm:flex-none px-4 py-2.5 border border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              Hubungi CS
            </button>
          )}
        </div>
      </div>
      
    </motion.div>
  );
}