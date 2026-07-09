"use client";

import React, { useRef, useState, useEffect } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import { Navigation } from "lucide-react"; // Import icon kurir
import "mapbox-gl/dist/mapbox-gl.css";

interface MapBaseProps extends Omit<React.ComponentProps<typeof Map>, 'originCoords' | 'drops' | 'routeData'> {
  className?: string;
  originCoords?: { lng: number; lat: number } | null;
  drops?: { id: string; lng?: number; lat?: number; [key: string]: any }[];
  routeData?: any;
  activeDraggable?: "origin" | string | null;
  onMarkerDragEnd?: (lng: number, lat: number, type: "origin" | string) => void;
  // Prop baru khusus untuk halaman pelacakan
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
  const mapRef = useRef<any>(null);

  const [viewState, setViewState] = useState({
    longitude: longitude || 116.2736,
    latitude: latitude || -8.7060,
    zoom: zoom || 9, 
  });

  useEffect(() => {
    if (longitude !== undefined && latitude !== undefined) {
      setViewState((prev) => ({ ...prev, longitude, latitude, zoom: zoom || prev.zoom }));
    }
  }, [longitude, latitude, zoom]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-slate-900 text-slate-400 p-4 rounded-xl border border-slate-700">
        <p className="text-xs font-semibold">Memuat environment Mapbox...</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full min-h-[400px] relative overflow-hidden rounded-xl bg-[#0B0F19] ${className || ""}`}>
      <Map
        ref={mapRef}
        {...viewState}
        interactive={interactive}
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
        {...restProps}
      >
        {/* 1. MARKER ORIGIN (TITIK JEMPUT) */}
        {originCoords && (
          <Marker 
            longitude={originCoords.lng} 
            latitude={originCoords.lat} 
            anchor="bottom"
            draggable={activeDraggable === "origin"}
            onDragEnd={(e: any) => onMarkerDragEnd && onMarkerDragEnd(e.lngLat.lng, e.lngLat.lat, "origin")}
            style={{ zIndex: activeDraggable === "origin" ? 50 : 1 }}
          >
            <div className={`w-9 h-9 bg-red-600 rounded-full border-4 shadow-xl flex items-center justify-center transition-all ${activeDraggable === "origin" ? "border-amber-400 scale-125 cursor-grabbing" : "border-white hover:scale-110 cursor-pointer"}`}>
              <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
            {activeDraggable === "origin" && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-[9px] font-black px-2 py-1 rounded whitespace-nowrap">Geser Titik Asal</div>
            )}
          </Marker>
        )}

        {/* 2. MARKERS DROPS (TITIK PENERIMA) */}
        {drops && drops.filter(d => d.lng !== undefined && d.lat !== undefined).map((drop, idx) => (
          <Marker 
            key={drop.id} 
            longitude={drop.lng!} 
            latitude={drop.lat!} 
            anchor="bottom"
            draggable={activeDraggable === drop.id}
            onDragEnd={(e: any) => onMarkerDragEnd && onMarkerDragEnd(e.lngLat.lng, e.lngLat.lat, drop.id)}
            style={{ zIndex: activeDraggable === drop.id ? 50 : 2 }}
          >
            <div className={`w-8 h-8 bg-[#C5A059] rounded-full border-[3px] shadow-xl flex items-center justify-center text-white text-xs font-black transition-all ${activeDraggable === drop.id ? "border-amber-400 scale-125 cursor-grabbing" : "border-white hover:scale-110 cursor-pointer"}`}>
              {idx + 1}
            </div>
            {activeDraggable === drop.id && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-[9px] font-black px-2 py-1 rounded whitespace-nowrap">Geser Titik {idx + 1}</div>
            )}
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
            <div className="w-10 h-10 bg-[#7A171D] rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white transform scale-110 shadow-[#7A171D]/40">
              <Navigation className="w-4 h-4 fill-current rotate-45 animate-pulse" />
            </div>
          </Marker>
        )}

        {/* 4. ROUTE POLYLINE (GARIS RUTE CERDAS) */}
        {routeData && (
          <Source id="route-source" type="geojson" data={{ type: 'Feature', properties: {}, geometry: routeData } as any}>
            <Layer
              id="route-layer"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{ 'line-color': '#10B981', 'line-width': 4, 'line-opacity': 0.8 }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}