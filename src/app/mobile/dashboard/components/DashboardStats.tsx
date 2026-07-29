import { motion } from "framer-motion";
import { Package, Clock, Truck, CheckCircle2 } from "lucide-react";
import { DashboardOrder } from "@/types/order";
import { cn } from "@/lib/utils";

export default function DashboardStats({ orders }: { orders: DashboardOrder[] }) {
  const totalActivity = orders.length;
  const processingCount = orders.filter(o => o.status === "Sedang Diproses" || o.status === "Menunggu Pembayaran" || o.status.includes("Menunggu")).length;
  const shippingCount = orders.filter(o => o.status === "Dikirim").length;
  const successCount = orders.filter(o => o.status === "Selesai" || o.status === "Sudah Dinilai").length;

  // Penyesuaian UI agar icon box lebih subtle dan elegan ala iOS
  const stats = [
    { 
      label: "Total Pesanan", 
      value: totalActivity, 
      icon: Package, 
      color: "text-[#7A171D]", 
      bg: "bg-[#7A171D]/10", 
      border: "border-[#7A171D]/20", 
      glow: "bg-[#7A171D]" 
    },
    { 
      label: "Diproses", 
      value: processingCount, 
      icon: Clock, 
      color: "text-amber-600", 
      bg: "bg-amber-50", 
      border: "border-amber-200", 
      glow: "bg-amber-400" 
    },
    { 
      label: "Dikirim", 
      value: shippingCount, 
      icon: Truck, 
      color: "text-blue-600", 
      bg: "bg-blue-50", 
      border: "border-blue-200", 
      glow: "bg-blue-400" 
    },
    { 
      label: "Selesai", 
      value: successCount, 
      icon: CheckCircle2, 
      color: "text-emerald-600", 
      bg: "bg-emerald-50", 
      border: "border-emerald-200", 
      glow: "bg-emerald-400" 
    },
  ];

  return (
    // REVISI NATIVE MOBILE: 2x2 Bento Grid yang langsung terlihat semua
    <div className="grid grid-cols-2 gap-3 px-6 mb-6">
      {stats.map((stat, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
          className="glass-card bg-white/70 backdrop-blur-xl p-4 rounded-[1.5rem] border border-white shadow-[0_4px_15px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[110px] relative overflow-hidden active:scale-95 transition-transform tap-highlight-transparent select-none"
        >
          {/* Ambient Glow di sudut kartu */}
          <div className={cn("absolute -top-4 -right-4 w-16 h-16 rounded-full blur-[24px] opacity-15 pointer-events-none", stat.glow)}></div>

          {/* Ikon di atas */}
          <div className="flex justify-between items-start relative z-10">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border", stat.bg, stat.color, stat.border)}>
              <stat.icon className="w-4 h-4" strokeWidth={2.5} />
            </div>
          </div>

          {/* Value & Label di bawah */}
          <div className="mt-3 relative z-10">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
              {stat.value}
            </h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              {stat.label}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}