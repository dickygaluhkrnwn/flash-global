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

  // 3. Deteksi halaman Form Wizard / Checkout / Forwarding / Pengaturan
  const isBookingPage = pathname.includes("/delivery/booking") || 
                        pathname.includes("/pembayaran") || 
                        pathname.includes("/forwarding/quote") ||
                        pathname.includes("/settings"); // <-- DITAMBAHKAN DI SINI

  // Jika di halaman Auth, Detail, ATAU Booking/Pembayaran/Forwarding/Settings, sembunyikan Navigasi Global
  const hideGlobalNav = isAuthPage || isDetailPage || isBookingPage;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-[#7A171D]/15 selection:text-[#7A171D] relative overflow-x-hidden font-sans z-0">
      
      {/* AMBIENT GLOWING BACKGROUND (PREMIUM APPLE GLASS STYLE) */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[300px] h-[300px] bg-[#7A171D] rounded-full blur-[120px] opacity-[0.08]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[350px] h-[350px] bg-[#C5A059] rounded-full blur-[120px] opacity-[0.08]" />
      </div>

      {/* Render Header HANYA jika BUKAN di halaman khusus */}
      {!hideGlobalNav && <MobileHeader />}
      
      <main className={`flex-grow flex flex-col w-full max-w-md mx-auto relative ${hideGlobalNav ? "" : "pt-[80px] pb-[100px]"}`}> 
        {children}
      </main>

      {/* Render BottomNav HANYA jika BUKAN di halaman khusus */}
      {!hideGlobalNav && <BottomNav />}

    </div>
  );
}