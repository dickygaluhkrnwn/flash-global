// src/app/driver/mobile/layout.tsx
"use client"; 

import { ReactNode } from "react";
import BottomNav from "@/components/driver/BottomNav";
import { useDriverLocation } from "@/hooks/useDriverLocation"; 

export default function DriverMobileLayout({ children }: { children: ReactNode }) {
  // 🚀 Aktifkan Mesin Pelacak Global
  useDriverLocation();
 
  return (
    // Background paling luar (Body utama)
    <div className="min-h-screen bg-[var(--background)] flex justify-center selection:bg-[#7A171D]/15 selection:text-[var(--brand-maroon)]">
      
      {/* 
        1. KANVAS MOBILE (FRAME)
        HAPUS overflow-hidden! Biarkan elemen ini memanjang ke bawah secara natural 
        agar browser HP (Safari/Chrome) mengenali native scroll.
      */}
      <div className="w-full max-w-md bg-transparent min-h-screen relative shadow-[0_0_50px_rgba(0,0,0,0.05)] flex flex-col mx-auto">
        
        {/* 
          2. KONTEN UTAMA
          HAPUS overflow-y-auto! Biarkan dia scroll mengikuti window.
          - pb-[100px] (padding bottom): Agar layar bisa di-scroll mentok 
            sampai melewati BottomNav yang tingginya 72px + bottom-5.
          - pt-safe: Aman dari poni/dynamic island iPhone.
        */}
        <main className="flex-1 pb-[100px] tap-highlight-transparent relative z-10 w-full pt-safe">
          {children}
        </main>

        {/* 3. KOMPONEN MELAYANG (Berada di luar flow scroll karena 'fixed') */}
        <BottomNav />
        
      </div>
    </div>
  );
}