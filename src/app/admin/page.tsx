"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Truck, Coins, Building, 
  TrendingUp, Package, MapPin, 
  Activity, ArrowUpRight, Clock, Scale, LifeBuoy, Calculator
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

  useEffect(() => {
    const aggregateDashboardData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Total Klien B2B (Perbaikan Query Role)
        const b2bQuery = query(collection(db, "users"), where("role", "==", "b2b"));
        const b2bSnap = await getDocs(b2bQuery);
        const b2bCount = b2bSnap.size;

        // 2. Fetch Total Mitra Sopir (Perbaikan Query Role)
        const driverQuery = query(collection(db, "users"), where("role", "==", "driver"));
        const driverSnap = await getDocs(driverQuery);
        const driverCount = driverSnap.size;

        // 3. Fetch Tiket Bantuan Aktif (Open / In Progress)
        const ticketQuery = query(collection(db, "support_tickets"), where("status", "in", ["Open", "In Progress"]));
        const ticketSnap = await getDocs(ticketQuery);
        const activeTicketsCount = ticketSnap.size;

        // 4. Siapkan Array 7 Hari Terakhir untuk Grafik (Real Data Generator)
        const last7Days: ChartData[] = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          d.setHours(0, 0, 0, 0); // Reset jam agar aman saat komparasi string
          return {
            dateStr: d.toDateString(),
            label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
            value: 0
          };
        });

        // 5. Fetch Transaksi (Orders)
        // Catatan: Di production besar, gunakan where("createdAt", ">=", sevenDaysAgo)
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
          
          // Safe Date Parsing
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

          // A. Kalkulasi Hari Ini
          if (orderDateStr === todayStr) {
            ordersTodayCount++;
            revenueTodaySum += orderTotal;
            weightTodaySum += orderWeight;
          }

          // B. Mapping ke Grafik 7 Hari Terakhir
          const dayIndex = last7Days.findIndex(day => day.dateStr === orderDateStr);
          if (dayIndex !== -1) {
            last7Days[dayIndex].value += orderTotal;
            totalRevenueWeekly += orderTotal;
            totalOrdersWeekly++;
          }

          // C. Ambil orderan yang sedang aktif berjalan untuk Live Map Node
          if (data.status === "Sedang Diproses" || data.status === "Menunggu Pembayaran" || data.status === "Dikirim") {
            
            // Safe Parsing Origin & Destination
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
        setActiveNodes(nodesList.slice(0, 5)); // Ambil 5 teratas rute aktif

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 font-bold text-sm">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <span className="animate-pulse tracking-widest uppercase text-xs">Menyusun Data Analitik Cerdas...</span>
      </div>
    );
  }

  // Mencari nilai tertinggi untuk skala grafik SVG
  const maxChartValue = Math.max(...chartData.map(d => d.value), 100000); // 100rb sbg fallback base

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. TOP WELCOME BANNER (MODERN LIGHT MODE) */}
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 relative overflow-hidden shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full blur-[100px] opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-emerald-50 rounded-full blur-[80px] opacity-40 pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <LayoutDashboard className="w-8 h-8 md:w-10 md:h-10 text-blue-600" /> Central Command
          </h1>
          <p className="text-slate-500 text-sm md:text-base max-w-xl leading-relaxed font-medium">
            Pemantauan metrik finansial, pergerakan armada kurir, dan volume transaksi logistik secara real-time.
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-2.5 bg-emerald-50 px-5 py-2.5 rounded-xl border border-emerald-100 text-xs font-bold text-emerald-600 self-start md:self-auto shadow-sm">
          <Activity className="w-4 h-4 animate-pulse" /> ENGINE ONLINE
        </div>
      </div>

      {/* 2. QUICK STATS PANEL (4 METRIK UTAMA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 relative overflow-hidden group hover:shadow-md hover:border-emerald-200 transition-all">
          <div className="flex justify-between items-center relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Pendapatan Hari Ini</span>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><Coins className="w-6 h-6" /></div>
          </div>
          <div className="space-y-1.5 relative z-10">
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{formatRupiah(stats.totalRevenueToday)}</h3>
            <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5"/> Transaksi Berjalan</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 group hover:shadow-md hover:border-blue-200 transition-all relative overflow-hidden">
          <div className="flex justify-between items-center relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Order Masuk (Harian)</span>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100"><Package className="w-6 h-6" /></div>
          </div>
          <div className="space-y-1.5 relative z-10">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalOrdersToday} <span className="text-xl text-slate-400 font-bold">Resi</span></h3>
            <p className="text-[11px] text-slate-500 font-semibold">Manifest aktif sistem hari ini</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 group hover:shadow-md hover:border-indigo-200 transition-all relative overflow-hidden">
          <div className="flex justify-between items-center relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Klien Korporat B2B</span>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100"><Building className="w-6 h-6" /></div>
          </div>
          <div className="space-y-1.5 relative z-10">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalB2B} <span className="text-xl text-slate-400 font-bold">PT</span></h3>
            <p className="text-[11px] text-slate-500 font-semibold">Diskon kontrak otomatis aktif</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 group hover:shadow-md hover:border-amber-200 transition-all relative overflow-hidden">
          <div className="flex justify-between items-center relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Sopir Terdaftar</span>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100"><Truck className="w-6 h-6" /></div>
          </div>
          <div className="space-y-1.5 relative z-10">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalDrivers} <span className="text-xl text-slate-400 font-bold">Mitra</span></h3>
            <p className="text-[11px] text-slate-500 font-semibold">Sistem closed-loop e-wallet</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </motion.div>
      </div>

      {/* 3. SECONDARY INSIGHTS (BARU - MENAMBAH KESAN ENTERPRISE) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tonase Hari Ini</p>
            <p className="text-lg font-black text-slate-900">{formatNumber(stats.totalWeightToday)} <span className="text-sm font-bold text-slate-400">Kg</span></p>
          </div>
          <Scale className="w-8 h-8 text-slate-300" />
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">AOV (Avg. Order Value) Mingguan</p>
            <p className="text-lg font-black text-slate-900">{formatRupiah(stats.avgOrderValueWeekly)}</p>
          </div>
          <Calculator className="w-8 h-8 text-slate-300" />
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tiket CS Aktif (Unresolved)</p>
            <p className="text-lg font-black text-red-600">{stats.activeTickets} <span className="text-sm font-bold text-slate-400">Tiket</span></p>
          </div>
          <LifeBuoy className="w-8 h-8 text-red-200" />
        </div>
      </motion.div>

      {/* 4. CORE ANALYTICS GRID (GRAFIK & LIVE MAP NODE) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
        
        {/* KIRI: GRAFIK PENDAPATAN MINGGUAN REAL DATA (SVG CUSTOM OPTIMIZED) */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="xl:col-span-7 bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> Analitik Tren Omset Mingguan
              </h2>
              <p className="text-sm font-medium text-slate-500">Perbandingan volume transaksi harian dalam 7 hari terakhir (Real Data).</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg uppercase tracking-wider shrink-0 shadow-sm">IDR (Rupiah)</span>
          </div>

          {/* AREA GRAFIK SVG MURNI */}
          <div className="w-full h-64 flex items-end gap-3 md:gap-6 pt-4 px-2 relative z-10">
            
            {/* Garis Horizontal Background (Grid) */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40 py-6 mb-5">
              <div className="w-full h-px bg-slate-200"></div>
              <div className="w-full h-px bg-slate-200"></div>
              <div className="w-full h-px bg-slate-200"></div>
              <div className="w-full h-px bg-slate-200"></div>
            </div>

            {chartData.map((data, idx) => {
              // Hitung persentase tinggi bar secara aman (minimal 3% agar grafik tidak hilang jika 0)
              const barHeightPercent = Math.max((data.value / maxChartValue) * 100, 3);
              const isToday = idx === chartData.length - 1;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end relative z-10">
                  {/* Tooltip Nilai Harga */}
                  <div className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white font-bold text-[10px] py-1.5 px-2.5 rounded-lg absolute mb-24 transition-all duration-200 pointer-events-none shadow-xl z-20 whitespace-nowrap transform group-hover:-translate-y-2">
                    {formatRupiah(data.value)}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                  </div>
                  
                  {/* Bar Batang Grafik */}
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${barHeightPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.05 }}
                    className={`w-full max-w-[40px] rounded-t-xl transition-all duration-300 ${
                      isToday 
                        ? "bg-gradient-to-t from-blue-600 to-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.3)]" 
                        : data.value > 0 
                          ? "bg-slate-300 hover:bg-slate-400"
                          : "bg-slate-100 border border-slate-200 border-b-0" // State jika 0
                    }`}
                  />
                  
                  {/* Label Hari */}
                  <span className={`text-xs font-bold transition-colors ${isToday ? "text-blue-600" : "text-slate-500 group-hover:text-slate-900"}`}>
                    {data.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* KANAN: LIVE MAP NODE GRID (TRACKING JALUR AKTIF MANIFEST) */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="xl:col-span-5 bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm flex flex-col justify-between h-full">
          <div className="space-y-1.5 mb-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-500" /> Live Manifest Tracking
            </h2>
            <p className="text-sm font-medium text-slate-500">Pemantauan rute kurir aktif dan manifest sistem secara real-time.</p>
          </div>

          {/* LIST LIVE TRANSIT STREAM */}
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[17rem] pr-2 custom-scrollbar">
            {activeNodes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-10 font-bold">
                <Clock className="w-8 h-8 mb-2 opacity-50" />
                Tidak ada manifest rute pengiriman yang aktif.
              </div>
            ) : (
              activeNodes.map((node, index) => (
                <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 group hover:border-slate-300 hover:shadow-sm transition-all">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-black bg-white border border-slate-200 px-2 py-1 text-slate-700 rounded-lg shadow-sm">
                        #{node.id}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">{node.vehicle}</span>
                    </div>
                    {/* Alamat Rute */}
                    <div className="text-xs font-bold text-slate-700 space-y-1">
                      <p className="truncate flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0"></span> <span className="truncate">Dari: {node.origin}</span></p>
                      <p className="truncate flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span> <span className="truncate">Ke: {node.destination}</span></p>
                    </div>
                  </div>
                  
                  {/* Status Node */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border shadow-sm ${
                      node.status === "Sedang Diproses" || node.status === "Dikirim"
                        ? "bg-blue-50 border-blue-200 text-blue-600" 
                        : "bg-amber-50 border-amber-200 text-amber-600"
                    }`}>
                      {node.status === "Sedang Diproses" || node.status === "Dikirim" ? "In Transit" : "Pending Pay"}
                    </span>
                    <a href={`/admin/orders`} className="text-[10px] font-bold text-slate-400 hover:text-blue-600 flex items-center gap-0.5 mt-2 transition-colors bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                      Detail <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

      </div>

    </div>
  );
}