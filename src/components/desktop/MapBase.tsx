"use client";

import React, { useRef, useState, useEffect } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import { Navigation, MapPin } from "lucide-react"; 
import "mapbox-gl/dist/mapbox-gl.css";

interface MapBaseProps extends Omit<React.ComponentProps<typeof Map>, 'originCoords' | 'drops' | 'routeData'> {
  className?: string;
  originCoords?: { lng: number; lat: number } | null;
  drops?: { id: string; lng?: number; lat?: number; [key: string]: unknown }[];
  routeData?: unknown;
  activeDraggable?: "origin" | string | null;
  onMarkerDragEnd?: (lng: number, lat: number, type: "origin" | string) => void;
  driverCoords?: { lng: number; lat: number } | null;
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
      <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-slate-50 text-slate-400 p-4 rounded-3xl border border-slate-200">
        <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Konfigurasi Satelit Mapbox Terputus...</p>
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
    <div className={`w-full h-full min-h-[400px] relative overflow-hidden rounded-[2rem] bg-slate-100 ${className || ""}`}>
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
        {/* 1. MARKER ORIGIN (TITIK PENGIRIM) - Merah Maroon */}
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
              <div className={`w-10 h-10 bg-gradient-to-b from-[#7A171D] to-[#5A0E13] rounded-full border-4 shadow-xl flex items-center justify-center transition-all duration-300 ${activeDraggable === "origin" ? "border-amber-400 scale-125 cursor-grabbing" : "border-white hover:scale-110 cursor-pointer shadow-[#7A171D]/30"}`}>
                <MapPin className="w-4 h-4 text-white fill-white/20" />
              </div>
              <div className="w-1.5 h-1.5 bg-[#7A171D] rounded-full mt-1.5 shadow-[0_0_8px_#7A171D]"></div>
              
              <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                Titik Pengirim
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </Marker>
        )}

        {/* 2. MARKERS DROPS (TITIK PENERIMA) - Emas/Gold */}
        {drops && drops.filter(d => d.lng !== undefined && d.lat !== undefined).map((drop, idx) => (
          <Marker 
            key={drop.id} 
            longitude={drop.lng!} 
            latitude={drop.lat!} 
            anchor="bottom"
            draggable={activeDraggable === drop.id}
            onDragEnd={(e: { lngLat: { lng: number; lat: number } }) => onMarkerDragEnd && onMarkerDragEnd(e.lngLat.lng, e.lngLat.lat, drop.id)}
            style={{ zIndex: activeDraggable === drop.id ? 50 : 15 }}
          >
            <div className="relative flex flex-col items-center group">
              <div className={`w-9 h-9 bg-gradient-to-b from-[#C5A059] to-[#A68345] rounded-full border-[3px] shadow-xl flex items-center justify-center text-white text-sm font-black transition-all duration-300 ${activeDraggable === drop.id ? "border-amber-400 scale-125 cursor-grabbing" : "border-white hover:scale-110 cursor-pointer shadow-[#C5A059]/30"}`}>
                {idx + 1}
              </div>
              <div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full mt-1.5 shadow-[0_0_8px_#C5A059]"></div>
              
              <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-50">
                Tujuan {idx + 1}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </Marker>
        ))}

        {/* 3. MARKER KURIR (SIMULASI PELACAKAN LIVE) */}
        {driverCoords && (
          <Marker 
            longitude={driverCoords.lng} 
            latitude={driverCoords.lat} 
            anchor="center"
            style={{ zIndex: 100 }}
          >
            <div className="w-12 h-12 bg-emerald-500 rounded-full border-[3px] border-white shadow-2xl flex items-center justify-center text-white transform scale-110 shadow-emerald-500/40 relative">
               <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-50 scale-150"></div>
              <Navigation className="w-5 h-5 fill-current rotate-45 animate-pulse relative z-10" />
            </div>
          </Marker>
        )}

        {/* 4. ROUTE POLYLINE (GARIS RUTE SOLID) - Bypass Bug Mapbox */}
        <Source id="route-source" type="geojson" data={geojsonData as never}>
          <Layer
            id="route-layer"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 
              'line-color': '#0ea5e9', // Biru cerah (Blue-500)
              'line-width': 5, 
              'line-opacity': 0.85,
            }}
          />
        </Source>
      </Map>
      
      {/* Custom Mapbox Attribution agar lebih rapi */}
      <div className="absolute bottom-2 right-2 text-[9px] text-slate-500 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-md pointer-events-none">
        © Mapbox © OpenStreetMap
      </div>
    </div>
  );
}