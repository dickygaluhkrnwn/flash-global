"use client"; // Wajib ditambahkan karena kita memanggil Hook yang mengakses GPS/Client Browser

import { ReactNode } from "react";
import BottomNav from "@/components/driver/BottomNav";
import { useDriverLocation } from "@/hooks/useDriverLocation"; // Import Global GPS Tracker

export default function DriverMobileLayout({ children }: { children: ReactNode }) {
  
  // 🚀 Aktifkan Mesin Pelacak Global di sini!
  useDriverLocation();

  return (
    // Background luar menggunakan warna background-alt (light gray) dari globals.css
    <div className="min-h-screen bg-[#F8F9FA] flex justify-center selection:bg-[#7A171D]/20 selection:text-[#7A171D]">
      
      {/* 
        Mobile Frame Wrapper:
        Membatasi lebar maksimal agar seperti HP (max-w-md = 448px).
        Menggunakan bg-white sebagai warna dasar area konten.
      */}
      <div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl flex flex-col overflow-hidden">
        
        {/* 
          Main Content Area:
          Diberi padding-bottom (pb-20) agar konten terbawah tidak tertutup oleh BottomNav.
          Menggunakan class no-scrollbar dari globals.css agar bersih.
        */}
        <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
          {children}
        </main>

        {/* Bottom Navigation Component */}
        <BottomNav />
        
      </div>
    </div>
  );
}