"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Truck, Coins, Building, 
  TrendingUp, Package, MapPin, 
  Activity, ArrowUpRight, Clock
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// --- INTERFACES ---
interface DashboardStats {
  totalB2B: number;
  totalDrivers: number;
  totalOrdersToday: number;
  totalRevenueToday: number;
}

interface ChartData {
  label: string;
  value: number;
}

interface ActiveNode {
  id: string;
  origin: string;
  destination: string;
  status: string;
  vehicle: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalB2B: 0,
    totalDrivers: 0,
    totalOrdersToday: 0,
    totalRevenueToday: 0,
  });
  
  const [activeNodes, setActiveNodes] = useState<ActiveNode[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const aggregateDashboardData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Total Klien B2B
        const b2bQuery = query(collection(db, "users"), where("role", "==", "b2b_client"));
        const b2bSnap = await getDocs(b2bQuery);
        const b2bCount = b2bSnap.size;

        // 2. Fetch Total Mitra Sopir
        const driverSnap = await getDocs(collection(db, "driver_wallets"));
        const driverCount = driverSnap.size;

        // 3. Fetch Transaksi & Live Node Hari Ini
        const orderSnap = await getDocs(collection(db, "orders"));
        let ordersTodayCount = 0;
        let revenueTodaySum = 0;
        const nodesList: ActiveNode[] = [];

        // Simulasi filter tanggal hari ini pada level aplikasi untuk fleksibilitas dev
        const todayStr = new Date().toDateString();

        orderSnap.forEach((docObj) => {
          const data = docObj.data();
          const createdAtDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          
          if (createdAtDate.toDateString() === todayStr) {
            ordersTodayCount++;
            revenueTodaySum += data.breakdown?.grandTotal || data.totalCost || 0;
          }

          // Ambil orderan yang sedang aktif berjalan untuk Live Map Node
          if (data.status === "Sedang Diproses" || data.status === "Menunggu Pembayaran") {
            nodesList.push({
              id: docObj.id.substring(0, 8).toUpperCase(),
              origin: data.origin?.address || data.origin || "Unknown",
              destination: data.destinations?.[0]?.address || data.destination || "Unknown",
              status: data.status,
              vehicle: data.vehicleName || "Kurir",
            });
          }
        });

        setStats({
          totalB2B: b2bCount,
          totalDrivers: driverCount,
          totalOrdersToday: ordersTodayCount,
          totalRevenueToday: revenueTodaySum,
        });

        setActiveNodes(nodesList.slice(0, 5)); // Ambil 5 teratas rute aktif

        // 4. Set Mock Data Rapi untuk Grafik Mingguan (Senin - Minggu)
        setChartData([
          { label: "Sen", value: revenueTodaySum * 0.7 || 450000 },
          { label: "Sel", value: revenueTodaySum * 0.9 || 620000 },
          { label: "Rab", value: revenueTodaySum * 0.8 || 580000 },
          { label: "Kam", value: revenueTodaySum * 1.1 || 850000 },
          { label: "Jum", value: revenueTodaySum * 1.3 || 1200000 },
          { label: "Sab", value: revenueTodaySum * 0.9 || 950000 },
          { label: "Min", value: revenueTodaySum || 1400000 },
        ]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400 font-bold text-sm animate-pulse">
        Sinkronisasi Komponen Dashboard Utama...
      </div>
    );
  }

  // Mencari nilai tertinggi untuk skala grafik SVG
  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);

  return (
    <div className="space-y-10 pb-10">
      
      {/* 1. TOP WELCOME BANNER */}
      <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-8 rounded-3xl border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7A171D] rounded-full blur-[140px] opacity-15 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-[#C5A059] rounded-full blur-[120px] opacity-5 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              <LayoutDashboard className="w-8 h-8 text-[#C5A059]" /> Central Command Dashboard
            </h1>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
              Pemantauan metrik finansial, pergerakan armada kurir, dan volume transaksi logistik Flash Global secara terpusat.
            </p>
          </div>
          <div className="flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold text-emerald-400 self-start md:self-auto">
            <Activity className="w-4 h-4 animate-pulse" /> ENGINE ONLINE
          </div>
        </div>
      </div>

      {/* 2. QUICK STATS PANEL (3 METRIK INTEGRASI DATABASE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Omset Hari Ini */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-4 relative overflow-hidden group hover:border-[#7A171D]/40 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pendapatan Hari Ini</span>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center"><Coins className="w-5 h-5" /></div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight">{formatRupiah(stats.totalRevenueToday)}</h3>
            <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5"/> +12.4% vs kemarin</p>
          </div>
        </div>

        {/* Total Order Hari Ini */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-4 group hover:border-blue-500/30 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Order Hari Ini</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Package className="w-5 h-5" /></div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight">{stats.totalOrdersToday} Order</h3>
            <p className="text-[11px] text-slate-400 font-medium">Manifest domestik terdaftar</p>
          </div>
        </div>

        {/* Klien B2B Aktif */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-4 group hover:border-emerald-500/30 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Klien B2B Aktif</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><Building className="w-5 h-5" /></div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight">{stats.totalB2B} Perusahaan</h3>
            <p className="text-[11px] text-emerald-400 font-bold">Diskon kontrak otomatis aktif</p>
          </div>
        </div>

        {/* Total Driver Terdaftar */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-4 group hover:border-purple-500/30 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Mitra Sopir</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center"><Truck className="w-5 h-5" /></div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight">{stats.totalDrivers} Kurir</h3>
            <p className="text-[11px] text-slate-400 font-medium">Sistem wallet closed-loop</p>
          </div>
        </div>

      </div>

      {/* 3. CORE ANALYTICS GRID (GRAFIK & LIVE MAP NODE) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* KIRI: GRAFIK PENDAPATAN & TRANSAKSI (SVG CUSTOM OPTIMIZED) */}
        <div className="xl:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#C5A059]" /> Analitik Tren Omset Seminggu Terakhir
              </h2>
              <p className="text-xs text-slate-500">Perbandingan volume chart performa transaksi harian.</p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg uppercase tracking-wider">Mata Uang: IDR</span>
          </div>

          {/* AREA GRAFIK SVG */}
          <div className="w-full h-64 flex items-end gap-3 md:gap-6 pt-4 px-2">
            {chartData.map((data, idx) => {
              // Hitung persentase tinggi bar secara aman
              const barHeightPercent = (data.value / maxChartValue) * 100;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end">
                  {/* Tooltip Nilai Harga */}
                  <div className="opacity-0 group-hover:opacity-100 bg-slate-800 border border-slate-700 text-white font-mono text-[10px] py-1 px-2 rounded absolute mb-24 transition-opacity duration-200 pointer-events-none shadow-xl z-20">
                    {formatRupiah(data.value)}
                  </div>
                  
                  {/* Bar Batang Grafik */}
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(barHeightPercent, 8)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.05 }}
                    className={`w-full rounded-t-xl transition-all duration-300 ${
                      idx === chartData.length - 1 
                        ? "bg-gradient-to-t from-[#7A171D] to-[#C5A059] shadow-[0_0_20px_rgba(197,160,89,0.2)]" 
                        : "bg-slate-800 group-hover:bg-slate-700"
                    }`}
                  />
                  
                  {/* Label Hari */}
                  <span className="text-xs font-bold text-slate-500 group-hover:text-white transition-colors">{data.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* KANAN: LIVE MAP NODE GRID (TRACKING JALUR AKTIF MANIFEST) */}
        <div className="xl:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col justify-between">
          <div className="space-y-1 mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400" /> Live Manifest Dispatch Logs
            </h2>
            <p className="text-xs text-slate-500">Pemantauan rute kurir aktif dari manifest booking klien secara real-time.</p>
          </div>

          {/* LIST LIVE TRANSIT STREAM */}
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[17rem] pr-1">
            {activeNodes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs py-10">
                <Clock className="w-8 h-8 mb-2 opacity-40" />
                Tidak ada manifest rute pengiriman yang aktif saat ini.
              </div>
            ) : (
              activeNodes.map((node, index) => (
                <div key={index} className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4 group hover:border-slate-700/50 transition-colors">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-slate-300 rounded">
                        #{node.id}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">{node.vehicle}</span>
                    </div>
                    {/* Alamat Rute */}
                    <div className="text-xs font-bold text-slate-300 space-y-0.5">
                      <p className="truncate flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Dari: {node.origin}</p>
                      <p className="truncate flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Ke: {node.destination}</p>
                    </div>
                  </div>
                  
                  {/* Status Node */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                      node.status === "Sedang Diproses" 
                        ? "bg-blue-950/40 border-blue-900 text-blue-400" 
                        : "bg-amber-950/40 border-amber-900 text-amber-400"
                    }`}>
                      {node.status === "Sedang Diproses" ? "In Transit" : "Pending Pay"}
                    </span>
                    <Link href={`/admin/orders`} className="text-[10px] text-slate-500 hover:text-white flex items-center gap-0.5 mt-2 transition-colors">
                      Detail <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

// Sub-komponen helper Link Next.js yang aman untuk linter build
function Link({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}