"use client";

import MobileHeader from "@/components/mobile/MobileHeader";
import BottomNav from "@/components/mobile/BottomNav";
import { usePathname } from "next/navigation";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // 1. Deteksi halaman Auth
  const isAuthPage = pathname.includes("/login") || pathname.includes("/reset-password");
  
  // 2. Deteksi halaman Detail (Agar BottomNav & Header Global disembunyikan)
  const isDetailPage = (pathname.startsWith("/dashboard/") && pathname !== "/dashboard") || 
                       (pathname.startsWith("/tracking/") && pathname !== "/tracking");

  // 3. Deteksi halaman Form Wizard / Checkout / Forwarding
  const isBookingPage = pathname.includes("/delivery/booking") || 
                        pathname.includes("/pembayaran") || 
                        pathname.includes("/forwarding/quote");

  // Jika di halaman Auth, Detail, ATAU Booking/Pembayaran/Forwarding, sembunyikan Navigasi Global
  const hideGlobalNav = isAuthPage || isDetailPage || isBookingPage;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 text-slate-900 selection:bg-[#7A171D]/15 selection:text-[#7A171D] relative overflow-x-hidden font-sans z-0">
      
      {/* --- AMBIENT GLOWING BACKGROUND --- */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] left-[-20%] w-[70%] h-[40%] rounded-full bg-rose-200/40 blur-[100px]" />
        <div className="absolute bottom-[5%] right-[-20%] w-[60%] h-[40%] rounded-full bg-amber-100/40 blur-[100px]" />
        <div className="absolute top-[30%] left-[50%] w-[50%] h-[30%] rounded-full bg-blue-100/30 blur-[90px]" />
      </div>

      {/* Render Header HANYA jika BUKAN di halaman khusus */}
      {!hideGlobalNav && <MobileHeader />}
      
      {/* 
        BUG FIX: Hapus `z-10` dari className main.
        Tanpa z-index pengikat, child component yang menggunakan overlay `fixed z-[150]` 
        (seperti di tab Settings) akan bisa melampaui MobileHeader (z-100) dan BottomNav (z-50).
      */}
      <main className={`flex-grow flex flex-col w-full max-w-md mx-auto relative ${hideGlobalNav ? "" : "pt-[80px] pb-[100px]"}`}> 
        {children}
      </main>

      {/* Render BottomNav HANYA jika BUKAN di halaman khusus */}
      {!hideGlobalNav && <BottomNav />}

    </div>
  );
}