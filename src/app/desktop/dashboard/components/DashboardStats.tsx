import { motion } from "framer-motion";
import { Package, Clock, Truck, CheckCircle2 } from "lucide-react";
import { DashboardOrder } from "@/types/order";
import { cn } from "@/lib/utils";

export default function DashboardStats({ orders }: { orders: DashboardOrder[] }) {
  const totalActivity = orders.length;
  const processingCount = orders.filter(o => o.status === "Sedang Diproses" || o.status === "Menunggu Pembayaran" || o.status.includes("Menunggu")).length;
  const shippingCount = orders.filter(o => o.status === "Dikirim").length;
  const successCount = orders.filter(o => o.status === "Selesai" || o.status === "Sudah Dinilai").length;

  // Warna-warna ini dikonfigurasi untuk memberikan efek "Glossy/3D" pada icon box
  const stats = [
    { 
      label: "Total Aktivitas", 
      value: totalActivity, 
      icon: Package, 
      glow: "bg-[#7A171D]", 
      iconBg: "bg-gradient-to-br from-[#9A242B] to-[#7A171D] shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_16px_rgba(122,23,29,0.3)] border-[#5A0E13]" 
    },
    { 
      label: "Sedang Diproses", 
      value: processingCount, 
      icon: Clock, 
      glow: "bg-amber-500", 
      iconBg: "bg-gradient-to-br from-amber-400 to-amber-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_16px_rgba(217,119,6,0.3)] border-amber-600" 
    },
    { 
      label: "Dalam Perjalanan", 
      value: shippingCount, 
      icon: Truck, 
      glow: "bg-blue-500", 
      iconBg: "bg-gradient-to-br from-blue-400 to-blue-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_16px_rgba(37,99,235,0.3)] border-blue-600" 
    },
    { 
      label: "Pengiriman Sukses", 
      value: successCount, 
      icon: CheckCircle2, 
      glow: "bg-emerald-500", 
      iconBg: "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_16px_rgba(16,185,129,0.3)] border-emerald-600" 
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
      {stats.map((stat, i) => (
        <motion.div 
          key={i} 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: i * 0.05 }} 
          className="glass-card bg-white/60 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] flex items-center justify-between group hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
        >
          {/* Ambient Glow di belakang kartu */}
          <div className={cn("absolute top-[-20%] right-[-10%] w-24 h-24 rounded-full blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity", stat.glow)}></div>

          <div className="space-y-1 relative z-10">
            <p className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
          </div>
          
          <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-[1.25rem] flex items-center justify-center border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shrink-0 relative z-10", stat.iconBg)}>
            <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-sm" />
          </div>
        </motion.div>
      ))}
    </div>
  );
} 