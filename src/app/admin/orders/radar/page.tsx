"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { 
  Navigation, ShieldAlert, Power, 
  List, Map as MapIcon, Filter, 
  RefreshCcw, Truck, Package, Clock,
  MapPin
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";

// --- IMPORT FIREBASE ---
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// --- IMPORT GLOBAL TYPES ---
import { ActiveNode } from "@/types/admin";
import { OrderDetail, LocationDetail } from "@/types/order";

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-full bg-slate-900 animate-pulse flex flex-col items-center justify-center rounded-[2rem] border border-slate-800">
      <div className="w-10 h-10 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">Menghubungkan Satelit Mapbox...</p>
    </div>
  ) 
});

export default function RadarPage() {
  const router = useRouter();
  const { user: currentUser, isHydrated } = useAuthStore();
  const [mapViewState, setMapViewState] = useState({ longitude: 118.0149, latitude: -2.5489, zoom: 4.5 });

  const [isRadarActive, setIsRadarActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [nodes, setNodes] = useState<ActiveNode[]>([]);
  
  // Filter State
  const [activeFilter, setActiveFilter] = useState<"All" | "Dikirim" | "Sedang Diproses">("All");

  const fetchActiveNodes = async () => {
    setIsLoading(true);
    try {
      // Tarik orderan yang berstatus aktif/berjalan saja
      const q = query(
        collection(db, "orders"), 
        where("status", "in", ["Dikirim", "Sedang Diproses", "Menunggu Kurir"])
      );
      
      const snap = await getDocs(q);
      const activeList: ActiveNode[] = [];

      snap.forEach(docObj => {
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

      setNodes(activeList);
    } catch (error) {
      console.error("Gagal menarik data radar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchActiveNodes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const filteredNodes = useMemo(() => {
    if (activeFilter === "All") return nodes;
    return nodes.filter(n => n.status === activeFilter);
  }, [nodes, activeFilter]);

  // Kita manipulasi ActiveNode menjadi drops format untuk MapBase agar dirender sebagai Pin Emas
  const mapDrops = filteredNodes.filter(n => n.coords).map((n) => ({
    id: n.id,
    lng: n.coords!.lng,
    lat: n.coords!.lat,
    address: n.destination
  }));

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
      
      {/* HEADER COMMAND CENTER */}
      <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800 relative overflow-hidden">
        <div className={`absolute right-0 top-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-colors duration-1000 ${isRadarActive ? 'bg-emerald-500/10' : 'bg-slate-500/10'}`}></div>
        
        <div className="relative z-10">
           <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tight">
             <Navigation className={`w-7 h-7 ${isRadarActive ? 'text-emerald-400' : 'text-slate-500'}`}/> 
             Fleet Radar Control
           </h1>
           <p className="text-slate-400 text-sm mt-1.5 font-medium max-w-xl">Pusat kendali visual. Nyalakan satelit untuk memantau titik koordinat pengiriman secara real-time.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 w-full md:w-auto">
          {/* Status Badge */}
          <div className={`px-5 py-3 border rounded-xl flex items-center gap-2.5 w-full justify-center sm:w-auto transition-colors duration-500 ${isRadarActive ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-800/50 border-slate-700'}`}>
             <div className={`w-2.5 h-2.5 rounded-full ${isRadarActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-500'}`}></div>
             <span className={`text-xs font-black tracking-widest uppercase ${isRadarActive ? 'text-emerald-400' : 'text-slate-500'}`}>
               {isRadarActive ? 'SATELIT ONLINE' : 'SATELIT OFFLINE'}
             </span>
          </div>

          {/* Kill-Switch Button */}
          <button 
            onClick={() => setIsRadarActive(!isRadarActive)}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 w-full sm:w-auto border ${
              isRadarActive 
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md'
            }`}
          >
            <Power className="w-4 h-4" /> {isRadarActive ? 'Matikan Radar' : 'Nyalakan Radar'}
          </button>
        </div>
      </div>

      {/* FILTER & TOOLS PANEL */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <div className="flex items-center gap-2 px-3 border-r border-slate-200 shrink-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filter Layer:</span>
          </div>
          
          <button onClick={() => setActiveFilter("All")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 border ${activeFilter === 'All' ? 'bg-[#7A171D] text-white border-[#7A171D] shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
            Semua Rute ({nodes.length})
          </button>
          <button onClick={() => setActiveFilter("Dikirim")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 border ${activeFilter === 'Dikirim' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
            <Truck className="w-3.5 h-3.5 inline mr-1" /> Dalam Perjalanan ({nodes.filter(n => n.status === "Dikirim").length})
          </button>
          <button onClick={() => setActiveFilter("Sedang Diproses")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 border ${activeFilter === 'Sedang Diproses' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
            <Package className="w-3.5 h-3.5 inline mr-1" /> Menunggu Pickup ({nodes.filter(n => n.status === "Sedang Diproses").length})
          </button>
        </div>

        <Button onClick={fetchActiveNodes} disabled={isLoading} variant="outline" size="sm" className="h-9 shrink-0 text-slate-500 border-slate-200 bg-slate-50 w-full sm:w-auto">
          <RefreshCcw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Data
        </Button>
      </div>

      {/* CONTENT AREA: TOGGLE ANTARA MAPBOX DAN LIST VIEW */}
      {isRadarActive ? (
        // ===============================
        // MODE 1: LIVE MAPBOX RADAR
        // ===============================
        <div className="h-[70vh] w-full rounded-[2rem] overflow-hidden border-2 border-slate-200 shadow-xl relative bg-slate-100 group animate-in fade-in zoom-in-95 duration-500">
           <MapBase 
             longitude={mapViewState.longitude}
             latitude={mapViewState.latitude}
             zoom={mapViewState.zoom}
             interactive={true}
             className="w-full h-full"
             drops={mapDrops} // Lempar data node sebagai drops untuk dirender pinnya
           />
           
           {/* Vignette Gelap agar UI terlihat Cinematic */}
           <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.15)] z-10 transition-opacity opacity-100 group-hover:opacity-50"></div>
           
           <div className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 shadow-lg pointer-events-none flex flex-col gap-1">
             <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Menampilkan {filteredNodes.length} Titik
             </p>
             <p className="text-slate-500 text-[9px] font-bold">Zoom out & pan untuk melihat seluruh Nusantara</p>
           </div>
        </div>
      ) : (
        // ===============================
        // MODE 2: DATA LIST VIEW (HEMAT API)
        // ===============================
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="p-8 text-center border-b border-slate-100 bg-slate-50/50">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
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
                 <Clock className="w-10 h-10 mb-2 opacity-30"/> Tidak ada armada yang aktif di kategori ini.
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
                        <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">#{node.id}</span>
                      </td>
                      <td className="p-5 align-top">
                        <div className="space-y-1.5 text-xs font-bold text-slate-600">
                           <p className="truncate max-w-[200px] md:max-w-[300px] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0"/> {node.origin}</p>
                           <p className="text-slate-300 pl-1.5">↓</p>
                           <p className="truncate max-w-[200px] md:max-w-[300px] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#7A171D] shrink-0"/> {node.destination}</p>
                        </div>
                      </td>
                      <td className="p-5 align-top">
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><Truck className="w-4 h-4 text-slate-400"/> {node.vehicle}</p>
                      </td>
                      <td className="p-5 pr-8 align-top">
                         <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border inline-block ${
                           node.status === 'Dikirim' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-amber-50 text-amber-600 border-amber-200'
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