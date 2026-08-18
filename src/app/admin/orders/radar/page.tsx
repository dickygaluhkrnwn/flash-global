"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { 
  Navigation, ShieldAlert, Power, 
  Map as MapIcon, Filter, 
  RefreshCcw, Truck, Clock,
  MapPin, Activity, AlertCircle, TrendingUp, Building2, User, Layers,
  Package
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// --- IMPORT FIREBASE ---
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// --- IMPORT GLOBAL TYPES ---
import { ActiveNode, DriverData } from "@/types/admin";
import { OrderDetail, LocationDetail, MapDropItem } from "@/types/order";

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-full bg-white/40 backdrop-blur-xl animate-pulse flex flex-col items-center justify-center rounded-[2rem] border border-white">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-black tracking-widest uppercase text-[10px]">Menyinkronkan Satelit Mapbox...</p>
    </div>
  ) 
});

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getAdminUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
    return path.replace(/^\/admin/, '') || '/';
  }
  return path; 
};

export default function RadarPage() {
  const router = useRouter();
  const { user: currentUser, isHydrated } = useAuthStore();
  
  const [mapViewState, setMapViewState] = useState({ longitude: 118.0149, latitude: -2.5489, zoom: 4.5 });
  const [isRadarActive, setIsRadarActive] = useState(true); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Data States
  const [nodes, setNodes] = useState<ActiveNode[]>([]);
  const [idleFleets, setIdleFleets] = useState<DriverData[]>([]);
  
  // View States
  const [activeFilter, setActiveFilter] = useState<"All" | "Dikirim" | "Sedang Diproses">("All");
  const [mapLayer, setMapLayer] = useState<"all" | "orders" | "fleets">("all");
  const [sidebarTab, setSidebarTab] = useState<"orders" | "fleets">("orders");

  // =========================================================================
  // CUSTOM STYLES: APPLE GLASSMORPHISM
  // =========================================================================
  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
  const glassSidebar = "bg-white/80 backdrop-blur-2xl border-r border-white/60 shadow-[4px_0_24px_rgba(0,0,0,0.05)]";

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const qOrders = query(
        collection(db, "orders"), 
        where("status", "in", ["Dikirim", "Sedang Diproses", "Menunggu Kurir", "Menuju Lokasi Jemput"])
      );
      const qFleets = collection(db, "driver_wallets");

      const [snapOrders, snapFleets] = await Promise.all([getDocs(qOrders), getDocs(qFleets)]);
      
      const activeList: ActiveNode[] = [];
      const fleetList: DriverData[] = [];

      snapOrders.forEach(docObj => {
        const data = docObj.data() as OrderDetail;
        const originObj = typeof data.origin === 'object' && data.origin !== null ? data.origin as LocationDetail : null;
        const originAddress = originObj?.address || (typeof data.origin === 'string' ? data.origin : "Unknown");
        
        let primaryDest = typeof data.destination === 'string' ? data.destination : "Tujuan";
        let destCoords: {lat: number, lng: number} | undefined = undefined;

        if (data.destinations && data.destinations.length > 0) {
            primaryDest = data.destinations[0].address || "Tujuan";
            if (data.destinations[0].lat && data.destinations[0].lng) {
               destCoords = { lat: data.destinations[0].lat, lng: data.destinations[0].lng };
            }
        }

        activeList.push({
          id: docObj.id.substring(0, 8).toUpperCase(),
          origin: originAddress,
          destination: primaryDest,
          status: data.status,
          vehicle: data.vehicleName || data.vehicle || "Kurir",
          coords: destCoords
        });
      });

      snapFleets.forEach(docObj => {
        const d = docObj.data() as DriverData;
        if (!d.isSuspended && d.baseCoords) {
          fleetList.push({ ...d, id: docObj.id });
        }
      });

      setNodes(activeList);
      setIdleFleets(fleetList);
    } catch (error) {
      console.error("Gagal menarik data radar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const filteredNodes = useMemo(() => {
    if (activeFilter === "All") return nodes;
    return nodes.filter(n => n.status.includes(activeFilter));
  }, [nodes, activeFilter]);

  const clusteredDrops = useMemo(() => {
    let combinedMapDrops: MapDropItem[] = [];
    
    if (mapLayer === "all" || mapLayer === "orders") {
      const clusters: { lat: number; lng: number; count: number; ids: string[], vehicles: string[] }[] = [];
      const threshold = 0.05; 
      
      filteredNodes.forEach(n => {
        if (!n.coords) return;
        let added = false;
        for (const c of clusters) {
          if (Math.abs(c.lat - n.coords.lat) < threshold && Math.abs(c.lng - n.coords.lng) < threshold) {
            c.count += 1;
            c.ids.push(n.id);
            if (!c.vehicles.includes(n.vehicle)) c.vehicles.push(n.vehicle);
            added = true;
            break;
          }
        }
        if (!added) {
          clusters.push({ lat: n.coords.lat, lng: n.coords.lng, count: 1, ids: [n.id], vehicles: [n.vehicle] });
        }
      });

      const mappedOrders = clusters.map((c, i) => ({
        id: `cluster-${i}`,
        lng: c.lng,
        lat: c.lat,
        address: c.count > 1 ? `${c.count} Pesanan di Area Ini (Armada: ${c.vehicles.join(", ")})` : `Tujuan: ${c.vehicles[0]} | AWB #${c.ids[0]}`
      }));
      combinedMapDrops = [...combinedMapDrops, ...mappedOrders];
    }

    if (mapLayer === "all" || mapLayer === "fleets") {
      const mappedFleets = idleFleets.map(f => ({
        id: f.id,
        // KODE DIBERSIHKAN: Menghindari pemaksaan Non-Null Assertion (!) yang rentan error
        lng: f.baseCoords?.lng || 0,
        lat: f.baseCoords?.lat || 0,
        address: `🟢 STANDBY: ${f.companyName || f.name} (${f.vehicleType || 'Armada'})`
      }));
      combinedMapDrops = [...combinedMapDrops, ...mappedFleets];
    }

    return combinedMapDrops;
  }, [filteredNodes, idleFleets, mapLayer]);

  const handleFocusNode = (coords?: {lat: number, lng: number}) => {
    if (coords && isRadarActive) {
      setMapViewState({ longitude: coords.lng, latitude: coords.lat, zoom: 14 });
    }
  };

  const statsInTransit = nodes.filter(n => n.status.includes("Dikirim") || n.status.includes("Menuju")).length;
  const statsPending = nodes.filter(n => n.status.includes("Sedang Diproses") || n.status.includes("Menunggu")).length;
  const standbyFleetCount = idleFleets.length;

  if (isHydrated && currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Mapbox Radar ini hanya dapat diakses oleh Superadmin atau Divisi Operasional.</p>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10 font-sans">
      
      {/* 1. HEADER COMMAND CENTER (Glassmorphism) */}
      <div className={`${glassPanel} p-6 md:p-8 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden`}>
        <div className={`absolute right-0 top-[-50%] w-96 h-96 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000 ${isRadarActive ? 'bg-emerald-500/20' : 'bg-slate-500/10'}`}></div>
        
        <div className="relative z-10">
           <AdminBadge variant="gold" className="mb-3">
             <Activity className="w-3.5 h-3.5 mr-1" /> Live Operational
           </AdminBadge>
           <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm transition-colors duration-500 ${isRadarActive ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
               <Navigation className={`w-6 h-6 ${isRadarActive ? 'text-emerald-500' : 'text-slate-400'}`}/> 
             </div>
             Fleet Radar Control
           </h1>
           <p className="text-slate-500 text-sm mt-2 font-medium max-w-2xl">
             Pusat kendali visual terpadu. Pantau pergerakan rute pengiriman dan titik siaga (standby) dari jaringan mitra armada Anda.
           </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 w-full md:w-auto">
          <div className={`px-5 py-3 rounded-xl border flex items-center gap-2.5 w-full justify-center sm:w-auto transition-colors duration-500 shadow-sm ${isRadarActive ? 'bg-white/80 border-emerald-200' : 'bg-white/60 border-white'}`}>
             <div className={`w-3 h-3 rounded-full ${isRadarActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-400'}`}></div>
             <span className={`text-xs font-black tracking-widest uppercase ${isRadarActive ? 'text-emerald-600' : 'text-slate-500'}`}>
               {isRadarActive ? 'Satelit Online' : 'Satelit Offline'}
             </span>
          </div>
        </div>
      </div>

      {/* 2. LIVE KPI STATS (Mini Bento Glass) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${glassPanel} rounded-2xl p-5 flex items-center justify-between group hover:bg-white/80`}>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Rute Aktif</p>
            <p className="text-2xl font-black text-slate-900">{nodes.length}</p>
          </div>
          <div className="w-12 h-12 bg-white/60 border border-white shadow-sm rounded-full flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        
        <div className={`${glassPanel} rounded-2xl p-5 flex items-center justify-between group hover:bg-white/80`}>
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-500 rounded-full blur-[60px] opacity-10" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">In Transit / Berjalan</p>
            <p className="text-2xl font-black text-blue-700">{statsInTransit}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50/50 border border-blue-100 shadow-sm rounded-full flex items-center justify-center text-blue-500 relative z-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className={`${glassPanel} rounded-2xl p-5 flex items-center justify-between group hover:bg-white/80`}>
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-amber-500 rounded-full blur-[60px] opacity-10" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Menunggu Pickup</p>
            <p className="text-2xl font-black text-amber-700">{statsPending}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50/50 border border-amber-100 shadow-sm rounded-full flex items-center justify-center text-amber-500 relative z-10 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className={`${glassPanel} rounded-2xl p-5 flex items-center justify-between group hover:bg-white/80`}>
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-[#C5A059] rounded-full blur-[60px] opacity-10" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest mb-1">Armada Standby</p>
            <p className="text-2xl font-black text-[#A68345]">{standbyFleetCount} <span className="text-sm font-bold opacity-70">Mitra</span></p>
          </div>
          <div className="w-12 h-12 bg-[#C5A059]/10 border border-[#C5A059]/20 shadow-sm rounded-full flex items-center justify-center text-[#C5A059] relative z-10 group-hover:scale-110 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. CONTENT AREA: MAPBOX & SIDEBAR LIST */}
      {isRadarActive ? (
        // ===============================
        // MODE 1: ENTERPRISE LIVE MAPBOX RADAR
        // ===============================
        <div className="flex flex-col lg:flex-row h-[75vh] rounded-[2rem] overflow-hidden border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] relative animate-in fade-in zoom-in-95 duration-500">
           
           {/* SIDE PANEL (LIST TABBED GLASSMORPHISM) */}
           <div className={`w-full lg:w-[26rem] flex flex-col z-20 shrink-0 relative ${glassSidebar}`}>
              
              {/* Tabs Sidebar & Sync Button */}
              <div className="flex items-center justify-between border-b border-white/60 bg-white/40 backdrop-blur-md px-2 pt-2">
                 <div className="flex flex-1">
                   <button onClick={() => setSidebarTab("orders")} className={cn("flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-colors outline-none", sidebarTab === "orders" ? "border-[#7A171D] text-[#7A171D]" : "border-transparent text-slate-500 hover:text-slate-800")}>
                     Log Order ({filteredNodes.length})
                   </button>
                   <button onClick={() => setSidebarTab("fleets")} className={cn("flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-colors outline-none", sidebarTab === "fleets" ? "border-[#C5A059] text-[#A68345]" : "border-transparent text-slate-500 hover:text-slate-800")}>
                     Standby ({idleFleets.length})
                   </button>
                 </div>
                 <button onClick={fetchData} disabled={isLoading} className="p-2 mr-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/50 transition-colors">
                   <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                 </button>
              </div>

              {/* ✨ FILTER STATUS KHUSUS UNTUK TAB ORDERS (DI DALAM SIDEBAR) */}
              {sidebarTab === "orders" && (
                <div className="px-4 py-3 bg-white/30 border-b border-white/60 flex items-center gap-2 overflow-x-auto admin-scrollbar shrink-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
                  <button onClick={() => setActiveFilter("All")} className={cn("px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all shrink-0 border", activeFilter === 'All' ? 'bg-[#7A171D] text-white border-[#5A0E13] shadow-sm' : 'bg-white/60 text-slate-500 border-white hover:bg-white')}>Semua</button>
                  <button onClick={() => setActiveFilter("Dikirim")} className={cn("px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all shrink-0 border", activeFilter === 'Dikirim' ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-white/60 text-slate-500 border-white hover:bg-white')}>In Transit</button>
                  <button onClick={() => setActiveFilter("Sedang Diproses")} className={cn("px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all shrink-0 border", activeFilter === 'Sedang Diproses' ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-white/60 text-slate-500 border-white hover:bg-white')}>Pending</button>
                </div>
              )}
              
              {/* LIST KONTEN SIDEBAR */}
              <div className="flex-1 overflow-y-auto admin-scrollbar p-4 space-y-4">
                 
                 {/* KONTEN TAB: ORDERS */}
                 {sidebarTab === "orders" && (
                   filteredNodes.length === 0 ? (
                      <div className="text-center text-slate-500 p-10 text-xs font-bold flex flex-col items-center">
                        <AlertCircle className="w-8 h-8 mb-3 opacity-30 text-slate-400"/> Filter kosong. Tidak ada data pesanan.
                      </div>
                   ) : (
                     filteredNodes.map(node => (
                       <div 
                         key={node.id} 
                         onClick={() => handleFocusNode(node.coords)}
                         className="p-5 bg-white/60 backdrop-blur-md border border-white rounded-[1.25rem] hover:border-[#7A171D]/40 hover:shadow-md cursor-pointer transition-all group"
                       >
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-slate-900 font-mono text-sm font-black group-hover:text-[#7A171D] transition-colors">#{node.id}</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${
                              node.status.includes('Dikirim') || node.status.includes('Menuju') ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                            }`}>{node.status.includes('Dikirim') ? 'In Transit' : 'Pending'}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-bold truncate flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded border border-slate-100 w-fit"><Truck className="w-3.5 h-3.5 text-slate-400"/> {node.vehicle}</p>
                          <div className="flex items-start gap-2 mt-3 pt-3 border-t border-white/60">
                            <MapPin className="w-4 h-4 text-[#7A171D] shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">{node.destination}</p>
                          </div>
                       </div>
                     ))
                   )
                 )}

                 {/* KONTEN TAB: FLEET STANDBY */}
                 {sidebarTab === "fleets" && (
                   idleFleets.length === 0 ? (
                      <div className="text-center text-slate-500 p-10 text-xs font-bold flex flex-col items-center">
                        <Building2 className="w-8 h-8 mb-3 opacity-30 text-slate-400"/> Tidak ada armada yang siap (standby).
                      </div>
                   ) : (
                     idleFleets.map(fleet => (
                       <div 
                         key={fleet.id} 
                         onClick={() => handleFocusNode(fleet.baseCoords)}
                         className="p-5 bg-white/60 backdrop-blur-md border border-white rounded-[1.25rem] hover:border-[#C5A059]/50 hover:shadow-md cursor-pointer transition-all group"
                       >
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-slate-900 font-bold text-sm group-hover:text-[#A68345] transition-colors flex items-center gap-2">
                              {fleet.partnerType === "Vendor" ? <Building2 className="w-4 h-4 text-[#C5A059]"/> : <User className="w-4 h-4 text-[#DFBE7B]"/>}
                              {String(fleet.companyName || fleet.name || "Mitra Armada")}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-emerald-50/80 text-emerald-600 border-emerald-200 flex items-center gap-1.5 shadow-sm">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span> Siap
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-bold truncate flex items-center gap-1.5 mb-3 bg-white/80 px-2 py-1 rounded border border-slate-100 w-fit"><Truck className="w-3.5 h-3.5 text-slate-400"/> {String(fleet.vehicleType || "Armada Mitra")}</p>
                          <div className="flex items-start gap-2 mt-3 pt-3 border-t border-white/60">
                            <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">{String(fleet.baseAddress || "Lokasi belum ditentukan")}</p>
                          </div>
                       </div>
                     ))
                   )
                 )}
              </div>
           </div>

           {/* MAPBOX AREA */}
           <div className="flex-1 relative bg-slate-100">
             
             {/* ✨ CONTROLS MENGAMBANG DI DALAM PETA */}
             <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none">
                
                {/* Filter Layer Peta */}
                <div className="flex flex-col gap-2 pointer-events-auto">
                  <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col sm:flex-row gap-1">
                    <button onClick={() => setMapLayer("all")} className={cn("px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2", mapLayer === 'all' ? "bg-white shadow-sm text-slate-900 border border-slate-100" : "text-slate-500 hover:text-slate-800 hover:bg-white/50")}>
                      <Layers className="w-3.5 h-3.5"/> Semua Layer
                    </button>
                    <button onClick={() => setMapLayer("orders")} className={cn("px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2", mapLayer === 'orders' ? "bg-white shadow-sm text-[#7A171D] border border-slate-100" : "text-slate-500 hover:text-[#7A171D] hover:bg-white/50")}>
                      <Package className="w-3.5 h-3.5"/> Rute Order
                    </button>
                    <button onClick={() => setMapLayer("fleets")} className={cn("px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2", mapLayer === 'fleets' ? "bg-white shadow-sm text-[#C5A059] border border-slate-100" : "text-slate-500 hover:text-[#C5A059] hover:bg-white/50")}>
                      <Truck className="w-3.5 h-3.5"/> Armada Standby
                    </button>
                  </div>
                </div>

                {/* Tombol Matikan Radar */}
                <button 
                  onClick={() => setIsRadarActive(false)}
                  className="bg-white/90 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.15)] px-4 py-2.5 rounded-xl text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2 pointer-events-auto hover:bg-red-50 hover:border-red-200 transition-colors"
                >
                  <Power className="w-4 h-4" /> Matikan Radar
                </button>
             </div>

             <MapBase 
               longitude={mapViewState.longitude}
               latitude={mapViewState.latitude}
               zoom={mapViewState.zoom}
               interactive={true}
               className="w-full h-full"
               drops={clusteredDrops} 
             />
             
             {/* Subtle Inner Shadow instead of dark vignette */}
             <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.1)] z-10"></div>
             
             {/* Overlay Kiri Bawah Map (Informasi Satelit) */}
             <div className="absolute bottom-6 left-6 z-20 bg-white/80 backdrop-blur-xl px-5 py-4 rounded-2xl border border-white shadow-xl pointer-events-none flex flex-col gap-1.5">
               <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                 <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                 </span>
                 Sistem Radar Cerdas
               </p>
               <p className="text-slate-600 text-[10px] font-bold">Mendeteksi {clusteredDrops.length} Titik Koordinat Aktif</p>
             </div>
           </div>
        </div>
      ) : (
        // ===============================
        // MODE 2: DATA LIST VIEW (HEMAT API)
        // ===============================
        <div className={`${glassPanel} rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 relative`}>
          
          <div className="absolute top-6 right-6 z-20">
            <button 
              onClick={() => setIsRadarActive(true)}
              className="bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] text-white border border-[#A68345] shadow-[0_8px_16px_rgba(197,160,89,0.3)] hover:brightness-110 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
            >
              <Power className="w-4 h-4" /> Nyalakan Radar Satelit
            </button>
          </div>

          <div className="p-10 text-center border-b border-white/60 bg-white/40">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-white shadow-sm">
                <MapIcon className="w-8 h-8 text-slate-400" />
             </div>
             <h3 className="text-xl font-black text-slate-800">Satelit Peta Dinonaktifkan</h3>
             <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto font-medium">Mode Daftar (List View) aktif untuk menghemat penggunaan kuota API Mapbox. Anda tetap dapat memantau status secara tekstual.</p>
          </div>

          <div className="overflow-x-auto max-h-[500px] admin-scrollbar p-6">
            {isLoading ? (
               <div className="p-20 text-center font-bold text-slate-400 animate-pulse">Menyelaraskan Database...</div>
            ) : filteredNodes.length === 0 ? (
               <div className="p-20 text-center font-bold text-slate-400 flex flex-col items-center">
                 <Clock className="w-10 h-10 mb-2 opacity-30"/> Tidak ada pesanan aktif di kategori ini.
               </div>
            ) : (
              <div className="space-y-4">
                {filteredNodes.map((node) => (
                  <div key={node.id} className="bg-white/60 backdrop-blur-md border border-white rounded-[1.5rem] p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:bg-white hover:shadow-md transition-all">
                    
                    <div className="flex flex-col gap-2 min-w-[150px]">
                      <span className="font-mono font-black text-[#7A171D] bg-white shadow-sm px-3 py-1.5 rounded-lg border border-slate-200 w-fit text-sm">#{node.id}</span>
                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5"/> {node.vehicle}</p>
                    </div>
                    
                    <div className="flex-1 w-full space-y-2 relative pl-4 border-l-2 border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white absolute -left-[7px]"></span>
                        <p className="text-xs font-bold text-slate-600 truncate max-w-[300px]" title={node.origin}>{node.origin}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#7A171D] border-2 border-white absolute -left-[7px] shadow-[0_0_5px_rgba(122,23,29,0.5)]"></span>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[300px]" title={node.destination}>{node.destination}</p>
                      </div>
                    </div>
                    
                    <div className="shrink-0 flex items-center justify-end min-w-[120px]">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                        node.status.includes('Dikirim') || node.status.includes('Menuju') ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                      }`}>
                        {node.status}
                      </span>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}