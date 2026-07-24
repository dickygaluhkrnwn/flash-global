"use client";

import { useEffect, useRef } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";

export function useDriverLocation() {
  const { user } = useAuthStore();
  
  // Gunakan ref untuk membatasi (throttle) tembakan ke Firebase (misal: max 15 detik sekali)
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    let watchId: number;
    let isDriver = false;

    const initTracking = async () => {
      try {
        // 1. Validasi Akses: Hanya Individual & FleetDriver yang di-track GPS-nya
        // Manager Vendor (FleetManager/Vendor) tidak perlu di-track
        const walletSnap = await getDoc(doc(db, "driver_wallets", user.uid));
        
        if (walletSnap.exists()) {
          const partnerType = walletSnap.data().partnerType;
          if (partnerType === "Individual" || partnerType === "FleetDriver") {
            isDriver = true;
          }
        }

        if (!isDriver) return; // Jika Vendor/Klien, hentikan proses di sini

        // 2. Kunci Sinyal GPS
        if (navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(
            async (pos) => {
              // 3. Cek Status Online dari LocalStorage (Sesuai Toggle di Dashboard)
              const isOnline = localStorage.getItem("driver_is_online") === "true";
              
              // Jika sedang Offline/Istirahat, JANGAN tembak ke Firebase
              if (!isOnline) return;

              const now = Date.now();
              // 4. Throttle 15 Detik: Mencegah tagihan Firebase membengkak akibat spam GPS
              if (now - lastUpdateRef.current < 15000) return;

              lastUpdateRef.current = now;
              const { latitude, longitude } = pos.coords;

              try {
                const coordsData = { lat: latitude, lng: longitude };
                const isoTime = new Date().toISOString();

                // Tembak ke koleksi users (Untuk master data global)
                await updateDoc(doc(db, "users", user.uid), {
                  driverCoords: coordsData,
                  lastActiveGPS: isoTime
                });

                // Tembak juga ke driver_wallets (Untuk Admin Live Radar)
                await updateDoc(doc(db, "driver_wallets", user.uid), {
                  driverCoords: coordsData,
                  lastActiveGPS: isoTime
                });

              } catch (error) {
                console.warn("Global Tracking Gagal Sinkron:", error);
              }
            },
            (err) => console.warn("GPS Signal Lost:", err),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
          );
        }

      } catch (error) {
        console.error("Gagal inisialisasi Global Tracker:", error);
      }
    };

    initTracking();

    // Cleanup: Matikan GPS jika user logout atau keluar dari sistem
    return () => {
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user]);
}