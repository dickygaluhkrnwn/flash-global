"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radar, Wallet, User, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";

export default function BottomNav() {
  const pathname = usePathname();
  const { user, isHydrated } = useAuthStore();
  
  const [partnerType, setPartnerType] = useState<string>("Individual");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isHydrated) {
      if (user?.partnerType) {
        setPartnerType(user.partnerType);
      }
      setIsLoading(false);
    }
  }, [user, isHydrated]);

  const isVendor = partnerType === "Vendor";

  // Warna 3D Gradient Jelly Button (Vendor = Biru, Mandiri = Maroon)
  const activeGradient = isVendor 
    ? "from-blue-600 to-blue-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_6px_15px_rgba(37,99,235,0.3)] border border-blue-900" 
    : "from-[#9A242B] to-[#7A171D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_6px_15px_rgba(122,23,29,0.3)] border border-[#5A0E13]";

  const baseNavItems = [
    { name: "Home", href: "/driver/dashboard", icon: Home },
    { name: "Radar", href: "/driver/radar", icon: Radar }, 
    { name: "Dompet", href: "/driver/wallet", icon: Wallet },
    { name: "Profil", href: "/driver/profile", icon: User },
  ];

  const navItems = isVendor 
    ? [
        baseNavItems[0], 
        baseNavItems[1], 
        { name: "Armada", href: "/driver/fleet", icon: Truck }, 
        baseNavItems[2], 
        baseNavItems[3]  
      ]
    : baseNavItems;

  if (isLoading || !isHydrated) {
    return (
      <div className="fixed bottom-5 left-4 right-4 z-50 flex justify-center pb-safe pointer-events-none">
        <div className="w-full max-w-md h-[76px] glass-panel rounded-[2.5rem] flex justify-around items-center px-2 shadow-lg border border-white">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center justify-center w-full space-y-1.5 animate-pulse">
              <div className="w-6 h-6 bg-slate-200 rounded-md"></div>
              <div className="w-8 h-2 bg-slate-200 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    // Wrapper luar melayang di atas dasar layar (bottom-5)
    <div className="fixed bottom-5 left-4 right-4 z-50 flex justify-center pb-safe pointer-events-none">
      
      {/* 
        CONTAINER UTAMA (APPLE GLASS) 
        - pointer-events-auto agar bisa diklik.
      */}
      <nav className="w-full max-w-md flex items-center justify-between p-2 bg-white/80 backdrop-blur-[40px] saturate-[150%] rounded-[2.5rem] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_12px_40px_rgba(0,0,0,0.08)] pointer-events-auto">
        
        {navItems.map((item) => {
          const isActive = pathname.includes(item.href) || pathname === item.href || pathname === item.href.replace("/driver", "/driver/mobile");

          return (
            <Link 
              key={item.name} 
              href={item.href}
              className="relative flex flex-col items-center justify-center w-full h-[60px] select-none tap-highlight-transparent group z-10 outline-none"
            >
              {/* 
                ANIMASI 3D PILL (SAAT AKTIF)
                Meluncur saat pindah tab berkat layoutId="driver-nav-pill"
              */}
              {isActive && (
                <motion.div 
                  layoutId="driver-nav-pill"
                  className={cn("absolute inset-0 bg-gradient-to-b rounded-[2rem]", activeGradient)}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}

              {/* KONTEN ICON & TEXT */}
              <div className="relative z-20 flex flex-col items-center justify-center w-full h-full space-y-1">
                <item.icon 
                  className={cn(
                    "w-5 h-5 transition-all duration-300",
                    isActive 
                      ? "text-white scale-110 drop-shadow-md" 
                      : "text-slate-400 group-active:scale-90 group-active:text-slate-500"
                  )} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                <span className={cn(
                  "text-[9px] tracking-wide transition-colors duration-300",
                  isActive ? "text-white font-black drop-shadow-sm" : "text-slate-400 font-bold"
                )}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}