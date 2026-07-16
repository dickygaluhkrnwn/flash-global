"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { 
  Navigation, ShieldAlert, Power, 
  Map as MapIcon, Filter, 
  RefreshCcw, Truck, Clock,
  MapPin, Activity, AlertCircle, TrendingUp, Building2, User
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
    <div className="w-full h-full bg-slate-50 animate-pulse flex flex-col items-center justify-center rounded-[2rem] border border-slate-200">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-bold tracking-widest uppercase text-[10px]">Menyinkronkan Satelit Mapbox...</p>
    </div>
  ) 
});

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Orderan Aktif
      const qOrders = query(
        collection(db, "orders"), 
        where("status", "in", ["Dikirim", "Sedang Diproses", "Menunggu Kurir", "Menuju Lokasi Jemput"])
      );
      
      // 2. Fetch Fleet Standby (Driver/Vendor yang punya baseCoords dan tidak di suspend)
      const qFleets = collection(db, "driver_wallets");

      const [snapOrders, snapFleets] = await Promise.all([getDocs(qOrders), getDocs(qFleets)]);
      
      const activeList: ActiveNode[] = [];
      const fleetList: DriverData[] = [];

      // Memproses Data Order
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

      // Memproses Data Fleet Standby
      snapFleets.forEach(docObj => {
        const d = docObj.data() as DriverData;
        // Hanya ambil yang tidak disuspend dan memiliki koordinat base
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

  // =======================================================================
  // ALGORITMA CLUSTERING (ORDER) & MERGING DENGAN FLEET BASE
  // =======================================================================
  const clusteredDrops = useMemo(() => {
    let combinedMapDrops: MapDropItem[] = [];
    
    // LAYER 1: ORDER DESTINATIONS (Dengan Clustering Jarak)
    if (mapLayer === "all" || mapLayer === "orders") {
      const clusters: { lat: number; lng: number; count: number; ids: string[], vehicles: string[] }[] = [];
      const threshold = 0.05; // Radius ~5km
      
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

    // LAYER 2: IDLE FLEET BASES (Armada Standby)
    if (mapLayer === "all" || mapLayer === "fleets") {
      const mappedFleets = idleFleets.map(f => ({
        id: f.id,
        lng: f.baseCoords!.lng,
        lat: f.baseCoords!.lat,
        // Prefix khusus agar mudah dikenali di tooltip MapBase
        address: `🟢 STANDBY: ${f.companyName || f.name} (${f.vehicleType || 'Armada'})`
      }));
      combinedMapDrops = [...combinedMapDrops, ...mappedFleets];
    }

    return combinedMapDrops;
  }, [filteredNodes, idleFleets, mapLayer]);

  // Handler Auto-Pan Mapbox
  const handleFocusNode = (coords?: {lat: number, lng: number}) => {
    if (coords && isRadarActive) {
      setMapViewState({ longitude: coords.lng, latitude: coords.lat, zoom: 14 });
    }
  };

  // Kalkulasi Live Stats
  const statsInTransit = nodes.filter(n => n.status.includes("Dikirim") || n.status.includes("Menuju")).length;
  const statsPending = nodes.filter(n => n.status.includes("Sedang Diproses") || n.status.includes("Menunggu")).length;
  const standbyFleetCount = idleFleets.length;

  if (isHydrated && currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Mapbox Radar ini hanya dapat diakses oleh Superadmin atau Divisi Operasional.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10 font-sans">
      
      {/* HEADER COMMAND CENTER (Light Mode) */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-200 relative overflow-hidden">
        <div className={`absolute right-0 top-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-colors duration-1000 ${isRadarActive ? 'bg-emerald-500/10' : 'bg-slate-500/10'}`}></div>
        
        <div className="relative z-10">
           <Badge variant="gold" className="mb-3 shadow-sm inline-flex items-center gap-1.5 px-3 py-1 text-[10px]">
             <Activity className="w-3.5 h-3.5" /> Live Operational
           </Badge>
           <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
             <Navigation className={`w-8 h-8 ${isRadarActive ? 'text-emerald-500' : 'text-slate-400'}`}/> 
             Fleet Radar Control
           </h1>
           <p className="text-slate-500 text-sm mt-1.5 font-medium max-w-2xl">Pusat kendali visual terpadu. Pantau pergerakan rute pengiriman dan titik siaga (standby) dari jaringan mitra armada Anda.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 w-full md:w-auto">
          <div className={`px-5 py-3 border rounded-xl flex items-center gap-2.5 w-full justify-center sm:w-auto transition-colors duration-500 ${isRadarActive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
             <div className={`w-2.5 h-2.5 rounded-full ${isRadarActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-400'}`}></div>
             <span className={`text-xs font-black tracking-widest uppercase ${isRadarActive ? 'text-emerald-600' : 'text-slate-500'}`}>
               {isRadarActive ? 'Satelit Online' : 'Satelit Offline'}
             </span>
          </div>
          <button 
            onClick={() => setIsRadarActive(!isRadarActive)}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 w-full sm:w-auto border shadow-sm ${
              isRadarActive ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-md'
            }`}
          >
            <Power className="w-4 h-4" /> {isRadarActive ? 'Matikan Radar' : 'Nyalakan Radar'}
          </button>
        </div>
      </div>

      {/* LIVE KPI STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Rute Aktif</p>
            <p className="text-2xl font-black text-slate-900">{nodes.length}</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">In Transit / Berjalan</p>
            <p className="text-2xl font-black text-emerald-700">{statsInTransit}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 rounded-xl border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Menunggu Pickup</p>
            <p className="text-2xl font-black text-amber-700">{statsPending}</p>
          </div>
          <div className="w-12 h-12 bg-amber-100 rounded-xl border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
        </div>
        {/* KPI Baru: Menampilkan Armada Standby dari FMS */}
        <div className="bg-[#7A171D]/5 border border-[#7A171D]/10 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-bold text-[#7A171D] uppercase tracking-widest mb-1">Armada Standby</p>
            <p className="text-2xl font-black text-[#7A171D]">{standbyFleetCount} <span className="text-sm font-bold opacity-70">Mitra</span></p>
          </div>
          <div className="w-12 h-12 bg-white rounded-xl border border-[#7A171D]/20 flex items-center justify-center text-[#7A171D] group-hover:scale-110 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER & LAYER CONTROL PANEL */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Map Layers (Order vs Fleets) */}
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 w-full md:w-auto shrink-0 relative">
          <button onClick={() => setMapLayer("all")} className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors flex-1 z-10", mapLayer === 'all' ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700")}>Semua Layer</button>
          <button onClick={() => setMapLayer("orders")} className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors flex-1 z-10", mapLayer === 'orders' ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700")}>Rute Order</button>
          <button onClick={() => setMapLayer("fleets")} className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors flex-1 z-10", mapLayer === 'fleets' ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:text-emerald-600")}>Armada Standby</button>
        </div>

        {/* Status Filters untuk Order */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0 border-l border-slate-200 pl-4">
          <Filter className="w-4 h-4 text-slate-400 hidden lg:block" />
          <button onClick={() => setActiveFilter("All")} className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 border", activeFilter === 'All' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100')}>Semua Status</button>
          <button onClick={() => setActiveFilter("Dikirim")} className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 border", activeFilter === 'Dikirim' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100')}>Dalam Perjalanan</button>
          <button onClick={() => setActiveFilter("Sedang Diproses")} className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 border", activeFilter === 'Sedang Diproses' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100')}>Menunggu Pickup</button>
        </div>

        <Button onClick={fetchData} disabled={isLoading} variant="outline" size="sm" className="h-9 shrink-0 text-slate-500 border-slate-200 bg-slate-50 w-full md:w-auto ml-auto">
          <RefreshCcw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> Sinkronkan
        </Button>
      </div>

      {/* CONTENT AREA: TOGGLE ANTARA MAPBOX DAN LIST VIEW */}
      {isRadarActive ? (
        // ===============================
        // MODE 1: ENTERPRISE LIVE MAPBOX RADAR
        // ===============================
        <div className="flex flex-col lg:flex-row h-[75vh] bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-md relative animate-in fade-in zoom-in-95 duration-500">
           
           {/* SIDE PANEL (LIST TABBED) */}
           <div className="w-full lg:w-[24rem] bg-slate-50 flex flex-col border-r border-slate-200 z-20 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative">
              
              {/* Tabs Sidebar */}
              <div className="flex border-b border-slate-200 bg-white">
                 <button onClick={() => setSidebarTab("orders")} className={cn("flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors outline-none", sidebarTab === "orders" ? "border-[#C5A059] text-slate-900 bg-slate-50/50" : "border-transparent text-slate-400 hover:text-slate-600")}>
                   Log Order ({filteredNodes.length})
                 </button>
                 <button onClick={() => setSidebarTab("fleets")} className={cn("flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors outline-none", sidebarTab === "fleets" ? "border-emerald-500 text-slate-900 bg-slate-50/50" : "border-transparent text-slate-400 hover:text-slate-600")}>
                   Mitra Standby ({idleFleets.length})
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
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
                         className="p-4 bg-white border border-slate-200 rounded-xl hover:border-[#C5A059] hover:shadow-md cursor-pointer transition-all group"
                       >
                          <div className="flex justify-between items-start mb-2.5">
                            <span className="text-slate-900 font-mono text-sm font-black group-hover:text-[#7A171D] transition-colors">#{node.id}</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                              node.status.includes('Dikirim') || node.status.includes('Menuju') ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                            }`}>{node.status.includes('Dikirim') ? 'In Transit' : 'Pending'}</span>
                          </div>
                          <p className="text-xs text-slate-700 font-bold truncate flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-slate-400"/> {node.vehicle}</p>
                          <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-slate-100">
                            <MapPin className="w-3.5 h-3.5 text-[#7A171D] shrink-0 mt-0.5" />
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">{node.destination}</p>
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
                         className="p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all group"
                       >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-900 font-bold text-sm group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                              {fleet.partnerType === "Vendor" ? <Building2 className="w-4 h-4 text-blue-500"/> : <User className="w-4 h-4 text-amber-500"/>}
                              {String(fleet.companyName || fleet.name || "Mitra Armada")}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border bg-emerald-50 text-emerald-600 border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Siap
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-bold truncate flex items-center gap-1.5 mb-2"><Truck className="w-3.5 h-3.5 text-slate-400"/> {String(fleet.vehicleType || "Armada Mitra")}</p>
                          <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-slate-100">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">{String(fleet.baseAddress || "Lokasi belum ditentukan")}</p>
                          </div>
                       </div>
                     ))
                   )
                 )}
              </div>
           </div>

           {/* MAP AREA */}
           <div className="flex-1 relative bg-slate-100">
             <MapBase 
               longitude={mapViewState.longitude}
               latitude={mapViewState.latitude}
               zoom={mapViewState.zoom}
               interactive={true}
               className="w-full h-full"
               drops={clusteredDrops} // Memasukkan data clustering order & titik base fleet
             />
             
             {/* Subtle Inner Shadow instead of dark vignette */}
             <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.05)] z-10 transition-opacity opacity-100"></div>
             
             {/* Overlay Kiri Bawah Map */}
             <div className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 shadow-lg pointer-events-none flex flex-col gap-1">
               <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                 <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                 </span>
                 Sistem Radar Cerdas
               </p>
               <p className="text-slate-500 text-[9px] font-bold">Mendeteksi {clusteredDrops.length} Titik Koordinat (Order & Armada)</p>
             </div>
           </div>
        </div>
      ) : (
        // ===============================
        // MODE 2: DATA LIST VIEW (HEMAT API)
        // ===============================
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="p-8 text-center border-b border-slate-100 bg-slate-50/50">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                <MapIcon className="w-8 h-8 text-slate-400" />
             </div>
             <h3 className="text-xl font-black text-slate-800">Satelit Peta Dinonaktifkan</h3>
             <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Mode Daftar (List View) aktif untuk menghemat penggunaan kuota API Mapbox. Anda tetap dapat memantau status secara tekstual.</p>
          </div>

          <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
            {isLoading ? (
               <div className="p-20 text-center font-bold text-slate-400 animate-pulse">Menyelaraskan Database...</div>
            ) : filteredNodes.length === 0 ? (
               <div className="p-20 text-center font-bold text-slate-400 flex flex-col items-center">
                 <Clock className="w-10 h-10 mb-2 opacity-30"/> Tidak ada pesanan aktif di kategori ini.
               </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm relative">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                    <th className="p-5 pl-8">ID Manifes</th>
                    <th className="p-5">Rute (Asal → Tujuan)</th>
                    <th className="p-5">Armada Logistik</th>
                    <th className="p-5 pr-8">Status Terkini</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNodes.map((node) => (
                    <tr key={node.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 pl-8 align-top">
                        <span className="font-mono font-black text-slate-900 bg-white shadow-sm px-2.5 py-1 rounded border border-slate-200">#{node.id}</span>
                      </td>
                      <td className="p-5 align-top">
                        <div className="space-y-1.5 text-xs font-bold text-slate-600">
                           <p className="truncate max-w-[200px] md:max-w-[300px] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0"/> {node.origin}</p>
                           <p className="text-slate-300 pl-1.5">↓</p>
                           <p className="truncate max-w-[200px] md:max-w-[300px] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#7A171D] shrink-0"/> {node.destination}</p>
                        </div>
                      </td>
                      <td className="p-5 align-top">
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><Truck className="w-4 h-4 text-slate-400"/> {node.vehicle}</p>
                      </td>
                      <td className="p-5 pr-8 align-top">
                         <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border inline-block ${
                           node.status.includes('Dikirim') || node.status.includes('Menuju') ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                         }`}>
                           {node.status}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}