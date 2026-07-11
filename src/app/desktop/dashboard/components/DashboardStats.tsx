import { motion } from "framer-motion";
import { Package, Clock, Truck, CheckCircle2 } from "lucide-react";
import { Order } from "./types";
import { cn } from "@/lib/utils";

export default function DashboardStats({ orders }: { orders: Order[] }) {
  const totalActivity = orders.length;
  const processingCount = orders.filter(o => o.status === "Sedang Diproses" || o.status === "Menunggu Pembayaran" || o.status.includes("Menunggu")).length;
  const shippingCount = orders.filter(o => o.status === "Dikirim").length;
  const successCount = orders.filter(o => o.status === "Selesai" || o.status === "Sudah Dinilai").length;

  const stats = [
    { label: "Total Aktivitas", value: totalActivity, sub: "Domestik & Global", icon: Package, color: "text-[#7A171D] bg-[#7A171D]/10 border-[#7A171D]/20" },
    { label: "Sedang Diproses", value: processingCount, sub: "Menuju kargo/pickup", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: "Dalam Perjalanan", value: shippingCount, sub: "Darat, Udara & Laut", icon: Truck, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "Pengiriman Sukses", value: successCount, sub: "Manifes Aman", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
      {stats.map((stat, i) => (
        <motion.div 
          key={i} 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: i * 0.05 }} 
          className="bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow"
        >
          <div className="space-y-1">
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
          </div>
          <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110", stat.color)}>
            <stat.icon className="w-5 h-5" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}