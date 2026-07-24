"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OrderDetail, LocationDetail } from "@/types/order";

// 🚀 FUNGSI HELPER PENJINAK WAKTU YANG TYPE-SAFE
const getSafeMillis = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
  
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
    if (typeof obj.toDate === 'function') {
      const dateObj = obj.toDate() as Date;
      return dateObj.getTime();
    }
  }
  return new Date(String(ts)).getTime();
};

export function useOrderRadar(partnerType: string, driverCity?: string) {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Jangan jalankan radar jika role partner belum diketahui
    if (!partnerType) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 1. QUERY UTAMA: Tarik SEMUA order yang "Menunggu Kurir"
    const q = query(
      collection(db, "orders"),
      where("status", "==", "Menunggu Kurir")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderDetail));

      // 2. FILTERING CERDAS DI SISI CLIENT
      const filtered = rawData.filter(order => {
        // --- RULE 1: GATEKEEPER PEMBAYARAN ---
        const isPaid = order.paymentStatus === "Lunas";
        const isTempoB2B = order.isB2BApplied === true;
        
        if (!isPaid && !isTempoB2B) return false;

        // --- 🚀 RULE BARU (GEOFENCING KOTA) ---
        let orderOriginCity = "";
        const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
        
        // BUG FIX: Gunakan String() untuk mencegah error 'toLowerCase on {}'
        if (originObj?.city) {
          orderOriginCity = String(originObj.city).toLowerCase();
        } else if (originObj?.address) {
          orderOriginCity = String(originObj.address).toLowerCase();
        } else if (order.origin) {
          orderOriginCity = String(order.origin).toLowerCase();
        }

        if (driverCity) {
          const safeDriverCity = String(driverCity).toLowerCase();
          if (!orderOriginCity.includes(safeDriverCity)) {
             return false;
          }
        }

        // --- RULE 3: FILTER KAPASITAS / ROLE ---
        const vehicle = String(order.vehicle || order.vehicleName || "").toLowerCase();
        
        const isHeavyCargo = 
          vehicle.includes("truk") || 
          vehicle.includes("cde") || 
          vehicle.includes("cdd") || 
          vehicle.includes("fuso") || 
          vehicle.includes("tronton") || 
          vehicle.includes("wingbox");

        if (partnerType === "Individual") {
          return !isHeavyCargo;
        } else if (partnerType === "Vendor") {
          return isHeavyCargo;
        }

        return false;
      });

      // 3. SORTING WAKTU TERBARU (Di memori)
      filtered.sort((a, b) => {
        // 🚀 Menggunakan fungsi aman yang sudah kita buat di atas
        return getSafeMillis(b.createdAt) - getSafeMillis(a.createdAt);
      });

      setOrders(filtered);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error Radar Bidding:", err);
      setError("Radar gagal terhubung ke satelit. Periksa koneksi Anda.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [partnerType, driverCity]);

  return { orders, isLoading, error };
}