"use client";

import React, { useRef, useState, useEffect } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import { Navigation, MapPin } from "lucide-react"; 
import "mapbox-gl/dist/mapbox-gl.css";

// --- IMPORT GLOBAL TYPES ---
import { Coordinates, MapDropItem } from "@/types/order";
import { cn } from "@/lib/utils";

interface MapBaseProps extends Omit<React.ComponentProps<typeof Map>, 'originCoords' | 'drops' | 'routeData'> {
  className?: string;
  originCoords?: Coordinates | null;
  drops?: MapDropItem[];
  routeData?: unknown;
  activeDraggable?: "origin" | string | null;
  onMarkerDragEnd?: (lng: number, lat: number, type: "origin" | string) => void;
  driverCoords?: Coordinates | null;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function MapBase({ 
  className, 
  originCoords,
  drops,
  routeData,
  longitude,
  latitude,
  zoom,
  interactive = true,
  activeDraggable,
  onMarkerDragEnd,
  driverCoords,
  ...restProps 
}: MapBaseProps) {
  const mapRef = useRef<React.ElementRef<typeof Map> | null>(null);

  const [viewState, setViewState] = useState({
    longitude: longitude || 118.0149,
    latitude: latitude || -2.5489,
    zoom: zoom || 4.5, 
  });

  useEffect(() => {
    if (longitude !== undefined && latitude !== undefined) {
      setViewState((prev) => ({ ...prev, longitude, latitude, zoom: zoom || prev.zoom }));
    }
  }, [longitude, latitude, zoom]);

  // Menggunakan tema standard dengan laut biru dan daratan putih/abu ("streets-v12")
  const mapStyle = "mapbox://styles/mapbox/streets-v12"; 

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] bg-slate-100/50 backdrop-blur-md text-slate-500 rounded-[2rem] border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-[#7A171D]/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="w-12 h-12 border-[4px] border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-4 shadow-sm"></div>
        <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Konfigurasi Satelit Terputus</p>
      </div>
    );
  }

  // =======================================================================
  // KUNCI PERBAIKAN BUG MAPBOX CRASH (reading 'get' di removeSource)
  // =======================================================================
  // Kita suapi geojsonData dengan format kosong jika routeData sedang bernilai null
  const geojsonData = routeData 
    ? { type: 'Feature', properties: {}, geometry: routeData } 
    : { type: 'FeatureCollection', features: [] };

  return (
    <div className={cn("w-full h-full min-h-[400px] relative overflow-hidden rounded-[2rem] bg-slate-100", className)}>
      <Map
        ref={mapRef}
        {...viewState}
        interactive={interactive}
        onMove={(evt: { viewState: { longitude: number; latitude: number; zoom: number } }) => setViewState(evt.viewState)}
        mapStyle={mapStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false} // Menyembunyikan kontrol atribusi default untuk merapikan UI
        {...restProps}
      >
        {/* ============================================================ */}
        {/* 1. MARKER ORIGIN (TITIK PENGIRIM) - Merah Maroon 3D Glow     */}
        {/* ============================================================ */}
        {originCoords && (
          <Marker 
            longitude={originCoords.lng} 
            latitude={originCoords.lat} 
            anchor="bottom"
            draggable={activeDraggable === "origin"}
            onDragEnd={(e: { lngLat: { lng: number; lat: number } }) => onMarkerDragEnd && onMarkerDragEnd(e.lngLat.lng, e.lngLat.lat, "origin")}
            style={{ zIndex: activeDraggable === "origin" ? 50 : 10 }}
          >
            <div className="relative flex flex-col items-center group">
              <div className={cn(
                "w-12 h-12 rounded-full border-[3px] flex items-center justify-center transition-all duration-500 relative z-10", 
                activeDraggable === "origin" 
                  ? "bg-[#7A171D] border-amber-400 scale-125 cursor-grabbing shadow-[0_0_20px_rgba(251,191,36,0.6)]" 
                  : "bg-gradient-to-br from-[#9A242B] to-[#7A171D] border-white hover:scale-110 cursor-pointer shadow-[0_10px_20px_rgba(122,23,29,0.4),inset_0_2px_4px_rgba(255,255,255,0.4)]"
              )}>
                <MapPin className="w-5 h-5 text-white drop-shadow-sm" />
              </div>
              
              {/* Tali / Titik Tumpu */}
              <div className="w-2 h-2 bg-[#5A0E13] rounded-full mt-1.5 shadow-[0_0_10px_rgba(122,23,29,0.8)] relative z-0">
                <div className="absolute inset-0 bg-[#7A171D] rounded-full animate-ping opacity-60"></div>
              </div>
              
              {/* Tooltip Apple Glass */}
              <div className="absolute bottom-[110%] mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-md border border-white text-slate-900 text-[10px] font-black px-4 py-2 rounded-xl whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.1)] z-50 pointer-events-none uppercase tracking-widest">
                Titik Pengirim
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white"></div>
              </div>
            </div>
          </Marker>
        )}

        {/* ============================================================ */}
        {/* 2. MARKERS DROPS (TITIK PENERIMA) - Emas/Gold 3D Glow        */}
        {/* ============================================================ */}
        {drops && drops.filter(d => d.lng !== undefined && d.lat !== undefined).map((drop, idx) => (
          <Marker 
            key={drop.id} 
            longitude={drop.lng as number} 
            latitude={drop.lat as number} 
            anchor="bottom"
            draggable={activeDraggable === drop.id}
            onDragEnd={(e: { lngLat: { lng: number; lat: number } }) => onMarkerDragEnd && onMarkerDragEnd(e.lngLat.lng, e.lngLat.lat, drop.id)}
            style={{ zIndex: activeDraggable === drop.id ? 50 : 15 }}
          >
            <div className="relative flex flex-col items-center group">
              <div className={cn(
                "w-10 h-10 rounded-full border-[3px] flex items-center justify-center text-white text-base font-black transition-all duration-500 relative z-10", 
                activeDraggable === drop.id 
                  ? "bg-[#C5A059] border-red-500 scale-125 cursor-grabbing shadow-[0_0_20px_rgba(239,68,68,0.6)]" 
                  : "bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] border-white hover:scale-110 cursor-pointer shadow-[0_10px_20px_rgba(197,160,89,0.4),inset_0_2px_4px_rgba(255,255,255,0.5)]"
              )}>
                <span className="drop-shadow-sm">{idx + 1}</span>
              </div>
              
              {/* Tali / Titik Tumpu */}
              <div className="w-1.5 h-1.5 bg-[#A68345] rounded-full mt-1.5 shadow-[0_0_10px_rgba(197,160,89,0.8)] relative z-0"></div>
              
              {/* Tooltip Apple Glass */}
              <div className="absolute bottom-[110%] mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white text-[10px] font-black px-4 py-2 rounded-xl whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.2)] z-50 pointer-events-none uppercase tracking-widest">
                Tujuan {idx + 1}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
              </div>
            </div>
          </Marker>
        ))}

        {/* ============================================================ */}
        {/* 3. MARKER KURIR (SIMULASI PELACAKAN LIVE) - Emerald Radar    */}
        {/* ============================================================ */}
        {driverCoords && (
          <Marker 
            longitude={driverCoords.lng} 
            latitude={driverCoords.lat} 
            anchor="center"
            style={{ zIndex: 100 }}
          >
            <div className="relative flex items-center justify-center">
              {/* Gelombang Radar Pulse */}
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-40 scale-[2.5]"></div>
              <div className="absolute inset-0 bg-emerald-400 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-60 scale-[1.5] animation-delay-300"></div>
              
              {/* Core Kendaraan */}
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full border-[3px] border-white shadow-[0_10px_30px_rgba(16,185,129,0.6),inset_0_2px_4px_rgba(255,255,255,0.6)] flex items-center justify-center text-white transform scale-110 relative z-10 transition-transform duration-1000 ease-linear">
                <Navigation className="w-6 h-6 fill-current rotate-[45deg] drop-shadow-md" />
              </div>
            </div>
          </Marker>
        )}

        {/* ============================================================ */}
        {/* 4. ROUTE POLYLINE (GARIS RUTE SOLID)                         */}
        {/* ============================================================ */}
        <Source id="route-source" type="geojson" data={geojsonData as never}>
          <Layer
            id="route-layer"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 
              'line-color': '#0ea5e9', // Biru cerah (Sky-500)
              'line-width': 6, 
              'line-opacity': 0.8,
            }}
          />
        </Source>
      </Map>
      
      {/* Custom Mapbox Attribution agar lebih rapi */}
      <div className="absolute bottom-3 right-3 text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white shadow-sm pointer-events-none z-10">
        © MAPBOX & OSM
      </div>
    </div>
  );
}