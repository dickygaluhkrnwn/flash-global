"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Navigation, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";

// Karena radar menggunakan Mapbox, kita import MapBase agar satelit tetap aman SSR-nya.
const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center rounded-[2rem]"><p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Menghubungkan Satelit Mapbox...</p></div> 
});

export default function RadarPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [mapViewState] = useState({ longitude: 118.0149, latitude: -2.5489, zoom: 4.5 });

  // RBAC GUARD (Hanya Superadmin & Admin Operasional)
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_ops') {
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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      
      {/* HEADER COMMAND CENTER */}
      <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="relative z-10">
           <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tight">
             <Navigation className="w-7 h-7 text-emerald-400"/> Mapbox Live Radar
           </h1>
           <p className="text-slate-400 text-sm mt-1.5 font-medium max-w-xl">Pusat kendali visual. Pantau pergerakan armada logistik, driver, dan posisi koordinat pengiriman di seluruh wilayah Indonesia secara real-time.</p>
        </div>
        <div className="px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 w-fit relative z-10 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
           <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
           <span className="text-emerald-400 text-xs font-black tracking-widest uppercase">SYSTEM ONLINE</span>
        </div>
      </div>

      {/* MAPBOX CONTAINER */}
      <div className="h-[75vh] w-full rounded-[2rem] overflow-hidden border-2 border-slate-200 shadow-xl relative bg-slate-100 group">
         {/* Interaktif: Karena ini Dashboard Admin, kita set interactive true */}
         <MapBase 
            longitude={mapViewState.longitude}
            latitude={mapViewState.latitude}
            zoom={mapViewState.zoom}
            interactive={true}
            className="w-full h-full"
         />
         
         {/* Vignette Gelap agar UI terlihat Cinematic */}
         <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.15)] z-10 transition-opacity opacity-100 group-hover:opacity-50"></div>
         
         <div className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 shadow-lg pointer-events-none flex flex-col gap-1">
           <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span> GPS Tracking Aktif
           </p>
           <p className="text-slate-500 text-[9px] font-bold">Zoom out untuk melihat seluruh Nusantara</p>
         </div>
      </div>
    </div>
  );
}