"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Truck, Coins, Building, 
  TrendingUp, Package, 
  ArrowUpRight, Clock, Scale, LifeBuoy, Calculator,
  BarChart3, Zap
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// --- IMPORT GLOBAL TYPES ---
import { DashboardStats, ChartData, ActiveNode } from "@/types/admin";
import { OrderDetail, LocationDetail } from "@/types/order";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalB2B: 0,
    totalDrivers: 0,
    totalOrdersToday: 0,
    totalRevenueToday: 0,
    totalWeightToday: 0,
    activeTickets: 0,
    avgOrderValueWeekly: 0
  });
  
  const [activeNodes, setActiveNodes] = useState<ActiveNode[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // =========================================================================
  // LOGIC AREA: JANGAN DIUBAH! (Sistem Kalkulasi Data Tetap Aman)
  // =========================================================================
  useEffect(() => {
    const aggregateDashboardData = async () => {
      setIsLoading(true);
      try {
        const b2bQuery = query(collection(db, "users"), where("role", "==", "b2b"));
        const b2bSnap = await getDocs(b2bQuery);
        const b2bCount = b2bSnap.size;

        const driverQuery = query(collection(db, "users"), where("role", "==", "driver"));
        const driverSnap = await getDocs(driverQuery);
        const driverCount = driverSnap.size;

        const ticketQuery = query(collection(db, "support_tickets"), where("status", "in", ["Open", "In Progress"]));
        const ticketSnap = await getDocs(ticketQuery);
        const activeTicketsCount = ticketSnap.size;

        const last7Days: ChartData[] = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          d.setHours(0, 0, 0, 0); 
          return {
            dateStr: d.toDateString(),
            label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
            value: 0
          };
        });

        const orderSnap = await getDocs(collection(db, "orders"));
        
        let ordersTodayCount = 0;
        let revenueTodaySum = 0;
        let weightTodaySum = 0;
        
        let totalRevenueWeekly = 0;
        let totalOrdersWeekly = 0;

        const nodesList: ActiveNode[] = [];
        const todayStr = new Date().toDateString();

        orderSnap.forEach((docObj) => {
          const data = docObj.data() as OrderDetail;
          
          let createdAtDate = new Date();
          if (data.createdAt) {
             const ts = data.createdAt as Record<string, unknown>;
             if (typeof ts.toDate === 'function') {
                createdAtDate = ts.toDate() as Date;
             } else {
                createdAtDate = new Date(data.createdAt as string | number);
             }
          }
          
          const orderDateStr = createdAtDate.toDateString();
          const orderTotal = data.breakdown?.grandTotal || data.totalCost || 0;
          const orderWeight = data.totalWeight || data.weight || 0;

          if (orderDateStr === todayStr) {
            ordersTodayCount++;
            revenueTodaySum += orderTotal;
            weightTodaySum += orderWeight;
          }

          const dayIndex = last7Days.findIndex(day => day.dateStr === orderDateStr);
          if (dayIndex !== -1) {
            last7Days[dayIndex].value += orderTotal;
            totalRevenueWeekly += orderTotal;
            totalOrdersWeekly++;
          }

          if (data.status === "Sedang Diproses" || data.status === "Menunggu Pembayaran" || data.status === "Dikirim") {
            const originObj = typeof data.origin === 'object' && data.origin !== null ? data.origin as LocationDetail : null;
            const originAddress = originObj?.address || (typeof data.origin === 'string' ? data.origin : "Unknown");
            
            let destAddress = data.destination || "Unknown";
            if (data.destinations && data.destinations.length > 0) {
                destAddress = data.destinations[0].address || "Unknown";
            }

            nodesList.push({
              id: docObj.id.substring(0, 8).toUpperCase(),
              origin: originAddress,
              destination: destAddress,
              status: data.status,
              vehicle: data.vehicleName || "Kurir",
            });
          }
        });

        const avgAOV = totalOrdersWeekly > 0 ? (totalRevenueWeekly / totalOrdersWeekly) : 0;

        setStats({
          totalB2B: b2bCount,
          totalDrivers: driverCount,
          totalOrdersToday: ordersTodayCount,
          totalRevenueToday: revenueTodaySum,
          totalWeightToday: weightTodaySum,
          activeTickets: activeTicketsCount,
          avgOrderValueWeekly: avgAOV
        });

        setChartData(last7Days);
        setActiveNodes(nodesList.slice(0, 5)); 

      } catch (error) {
        console.error("Gagal melakukan kalkulasi analitik dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    aggregateDashboardData();
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat("id-ID").format(val);
  }

  // =========================================================================
  // UI AREA: iPHONE GLASSMORPHISM DASHBOARD (GEN-Z PREMIUM)
  // =========================================================================

  // Loading Screen Premium
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-[var(--admin-fg-muted)]">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-[#7A171D]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#7A171D] border-t-[#C5A059] rounded-full animate-spin"></div>
        </div>
        <span className="animate-pulse tracking-[0.2em] uppercase text-xs font-bold text-[#7A171D]">Menyusun Analitik Data...</span>
      </div>
    );
  }

  const maxChartValue = Math.max(...chartData.map(d => d.value), 100000); 
  
  // Custom utility class untuk efek iPhone Glass (Diperbarui agar nge-pop)
  const glassStyle = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] hover:bg-white/80 transition-all duration-300";

  return (
    <div className="space-y-6 pb-10">
      
      {/* 1. TOP WELCOME BANNER (Glassmorphism & Brand Colors) */}
      <div className={`${glassStyle} p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6`}>
        {/* Subtle Inner Glow */}
        <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-[#7A171D] rounded-full blur-[120px] opacity-[0.08] pointer-events-none" />
        <div className="absolute bottom-[-50%] left-[20%] w-80 h-80 bg-[#C5A059] rounded-full blur-[100px] opacity-[0.08] pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#9A242B] to-[#7A171D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(122,23,29,0.3)] border border-[#5A0E13]">
              <LayoutDashboard className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            Command Center
          </h1>
          <p className="text-slate-500 text-sm md:text-base max-w-xl font-medium mt-2">
            Pemantauan metrik finansial, pergerakan armada kurir, dan volume transaksi logistik secara real-time.
          </p>
        </div>
        
        {/* Status Pill iOS Style */}
        <div className="relative z-10 flex items-center gap-2.5 bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-white text-xs font-black tracking-widest uppercase text-emerald-600 shadow-sm self-start md:self-auto">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
          </span>
          Engine Online
        </div>
      </div>

      {/* 2. MAIN BENTO GRID (4 METRIK UTAMA + 3 INSIGHTS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Card 1: Revenue */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glassStyle} rounded-[2rem] p-6 flex flex-col justify-between h-40 group relative overflow-hidden`}>
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Gross Revenue</span>
            {/* 3D Icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_16px_rgba(197,160,89,0.3)] border border-[#A68345]">
              <Coins className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="space-y-1 relative z-10 mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatRupiah(stats.totalRevenueToday)}</h3>
            <p className="text-[11px] text-[#7A171D] font-bold flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5"/> Pendapatan Hari Ini</p>
          </div>
        </motion.div>

        {/* Card 2: Orders */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glassStyle} rounded-[2rem] p-6 flex flex-col justify-between h-40 group relative overflow-hidden`}>
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Active Manifests</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#9A242B] to-[#7A171D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(122,23,29,0.3)] border border-[#5A0E13]">
              <Package className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="space-y-1 relative z-10 mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalOrdersToday} <span className="text-base text-slate-400 font-bold">Resi</span></h3>
            <p className="text-[11px] text-slate-500 font-bold">Order masuk hari ini</p>
          </div>
        </motion.div>

        {/* Card 3: B2B Clients */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassStyle} rounded-[2rem] p-6 flex flex-col justify-between h-40 group relative overflow-hidden`}>
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Corporate B2B</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_16px_rgba(15,23,42,0.3)] border border-slate-950">
              <Building className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="space-y-1 relative z-10 mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalB2B} <span className="text-base text-slate-400 font-bold">PT</span></h3>
            <p className="text-[11px] text-slate-500 font-bold">Klien kontrak aktif</p>
          </div>
        </motion.div>

        {/* Card 4: Drivers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={`${glassStyle} rounded-[2rem] p-6 flex flex-col justify-between h-40 group relative overflow-hidden`}>
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Fleet Network</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_16px_rgba(197,160,89,0.3)] border border-[#A68345]">
              <Truck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="space-y-1 relative z-10 mt-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalDrivers} <span className="text-base text-slate-400 font-bold">Mitra</span></h3>
            <p className="text-[11px] text-slate-500 font-bold">Sopir & Vendor terdaftar</p>
          </div>
        </motion.div>
      </div>

      {/* 3. SECONDARY INSIGHTS (Mini Bento Glass) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${glassStyle} rounded-2xl p-5 flex items-center justify-between`}>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Tonase Hari Ini</p>
            <p className="text-xl font-black text-slate-900">{formatNumber(stats.totalWeightToday)} <span className="text-sm font-bold text-slate-400">Kg</span></p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white border border-white shadow-sm flex items-center justify-center"><Scale className="w-5 h-5 text-[#C5A059]" /></div>
        </div>
        <div className={`${glassStyle} rounded-2xl p-5 flex items-center justify-between`}>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Avg. Order Value (7H)</p>
            <p className="text-xl font-black text-slate-900">{formatRupiah(stats.avgOrderValueWeekly)}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white border border-white shadow-sm flex items-center justify-center"><Calculator className="w-5 h-5 text-[#C5A059]" /></div>
        </div>
        <div className={`${glassStyle} rounded-2xl p-5 flex items-center justify-between group hover:border-red-200`}>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tiket CS Berjalan</p>
            <p className="text-xl font-black text-[#7A171D]">{stats.activeTickets} <span className="text-sm font-bold text-slate-400">Tiket</span></p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 shadow-sm flex items-center justify-center group-hover:bg-red-100 transition-colors"><LifeBuoy className="w-5 h-5 text-[#7A171D]" /></div>
        </div>
      </motion.div>

      {/* 4. CORE ANALYTICS & LIVE FEED */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* KIRI: CHART OMSET */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className={`xl:col-span-7 ${glassStyle} rounded-[2.5rem] p-6 md:p-8 flex flex-col h-[420px]`}>
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <div className="p-1.5 bg-[#C5A059]/10 rounded-lg border border-[#C5A059]/20">
                  <BarChart3 className="w-4 h-4 text-[#C5A059]" />
                </div>
                Analitik Tren Omset
              </h2>
              <p className="text-xs font-medium text-slate-500">Perbandingan volume transaksi dalam 7 hari terakhir.</p>
            </div>
            <span className="text-[10px] font-bold text-[#7A171D] bg-[#7A171D]/5 border border-[#7A171D]/10 px-3 py-1.5 rounded-xl uppercase tracking-wider">IDR (Rp)</span>
          </div>

          <div className="w-full flex-1 flex items-end gap-2 md:gap-4 relative px-2">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40 py-4">
              <div className="w-full h-px bg-slate-300 border-dashed border-b border-slate-300/50"></div>
              <div className="w-full h-px bg-slate-300 border-dashed border-b border-slate-300/50"></div>
              <div className="w-full h-px bg-slate-300 border-dashed border-b border-slate-300/50"></div>
            </div>

            {chartData.map((data, idx) => {
              const barHeightPercent = Math.max((data.value / maxChartValue) * 100, 4);
              const isToday = idx === chartData.length - 1;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end relative z-10">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-slate-900 font-bold text-[11px] py-2 px-3 rounded-xl absolute mb-14 transition-all duration-200 pointer-events-none z-20 whitespace-nowrap transform group-hover:-translate-y-2">
                    {formatRupiah(data.value)}
                  </div>
                  
                  {/* Bar */}
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${barHeightPercent}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: idx * 0.05 }}
                    className={`w-full max-w-[48px] rounded-t-2xl transition-all duration-300 relative overflow-hidden ${
                      isToday 
                        ? "bg-gradient-to-t from-[#9A242B] to-[#7A171D] shadow-[0_0_20px_rgba(122,23,29,0.3)] border border-[#5A0E13]/50" 
                        : data.value > 0 
                          ? "bg-gradient-to-t from-slate-300 to-slate-100 border border-white shadow-sm hover:from-[#DFBE7B] hover:to-[#C5A059] hover:border-[#A68345]"
                          : "bg-slate-100/80 border border-slate-300 border-dashed border-b-0" // <-- PERBAIKAN: Bar Kosong lebih tegas
                    }`}
                  >
                    {isToday && <div className="absolute inset-0 bg-white/20 w-full h-1 top-0"></div>}
                  </motion.div>
                  
                  {/* Label */}
                  <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isToday ? "text-[#7A171D]" : "text-slate-500 group-hover:text-slate-800"}`}>
                    {data.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* KANAN: LIVE MANIFEST FEED */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }} className={`xl:col-span-5 ${glassStyle} rounded-[2.5rem] flex flex-col h-[420px] overflow-hidden`}>
          <div className="p-6 md:p-8 pb-4 border-b border-white flex justify-between items-center bg-white/40">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <div className="p-1.5 bg-[#C5A059]/10 rounded-lg border border-[#C5A059]/20">
                  <Zap className="w-4 h-4 text-[#C5A059] fill-[#C5A059]" />
                </div>
                Live Manifest Feed
              </h2>
              <p className="text-xs font-medium text-slate-500">Rute kurir aktif secara real-time.</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto admin-scrollbar p-3">
            {activeNodes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-10 font-bold">
                <Clock className="w-8 h-8 mb-3 opacity-30" />
                Tidak ada manifest rute pengiriman yang aktif.
              </div>
            ) : (
              <div className="space-y-3 p-3">
                {activeNodes.map((node, index) => (
                  // Nested Glassmorphism untuk List Item
                  <div key={index} className="p-4 bg-white/60 backdrop-blur-md border border-white rounded-2xl flex items-center justify-between gap-4 group hover:bg-white hover:shadow-md transition-all cursor-pointer">
                    <div className="space-y-2.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black bg-white border border-slate-200 px-2 py-1 text-slate-700 rounded-md shadow-sm">
                          #{node.id}
                        </span>
                        <span className="text-[9px] text-[#C5A059] font-black uppercase tracking-widest bg-[#C5A059]/10 px-2 py-1 rounded-md border border-[#C5A059]/20">
                          {node.vehicle}
                        </span>
                      </div>
                      
                      <div className="text-xs font-semibold text-slate-600 space-y-1.5 relative pl-4">
                        {/* Garis Konektor Rute */}
                        <div className="absolute left-[5px] top-2 bottom-2 w-[1.5px] bg-slate-300"></div>
                        <p className="truncate flex items-center gap-2 relative">
                          <span className="absolute -left-4 w-2.5 h-2.5 bg-slate-400 rounded-full border-2 border-white shadow-sm"></span>
                          <span className="truncate">{node.origin}</span>
                        </p>
                        <p className="truncate flex items-center gap-2 relative">
                          <span className="absolute -left-4 w-2.5 h-2.5 bg-[#7A171D] rounded-full border-2 border-white shadow-[0_0_5px_rgba(122,23,29,0.5)]"></span>
                          <span className="truncate">{node.destination}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0 gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl border shadow-sm ${
                        node.status === "Sedang Diproses" || node.status === "Dikirim"
                          ? "bg-emerald-50/90 border-emerald-200 text-emerald-700" 
                          : "bg-amber-50/90 border-amber-200 text-amber-700"
                      }`}>
                        {node.status === "Sedang Diproses" || node.status === "Dikirim" ? "In Transit" : "Pending Pay"}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 group-hover:bg-[#7A171D] group-hover:text-white group-hover:border-[#7A171D] transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}