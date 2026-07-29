"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PackagePlus, Globe2, ListOrdered, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function BottomNav() {
  const pathname = usePathname();

  // Susunan Presisi 5 Menu (Standar Maksimal Apple iOS)
  const navItems = [
    { name: "Beranda", path: "/", icon: Home },
    { name: "Domestik", path: "/delivery/booking", icon: PackagePlus },
    { name: "Global", path: "/forwarding/quote", icon: Globe2 }, // Menu Baru
    { name: "Pesanan", path: "/dashboard", icon: ListOrdered },
    { name: "Profil", path: "/settings", icon: User },
  ];

  return (
    // Wrapper luar untuk menempatkan nav melayang di atas batas bawah layar
    <div className="fixed bottom-5 left-4 right-4 z-50 md:hidden flex justify-center pb-safe pointer-events-none">
      
      {/* 
        CONTAINER UTAMA (APPLE GLASS 3D) 
        - Menggunakan backdrop-blur tebal
        - Inset shadow putih murni untuk efek bevel/kaca 3D
        - Drop shadow luar untuk efek melayang (Floating)
        - pointer-events-auto agar bisa diklik meskipun wrappernya none
      */}
      <nav className="w-full max-w-md flex items-center justify-between p-2 bg-white/80 backdrop-blur-[40px] saturate-[150%] rounded-[2rem] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_12px_40px_rgba(0,0,0,0.08)] pointer-events-auto">
        
        {navItems.map((item) => {
          const isActive = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);

          return (
            <Link 
              key={item.name} 
              href={item.path}
              className="relative flex flex-col items-center justify-center w-full h-[60px] select-none tap-highlight-transparent group z-10"
            >
              {/* 
                ANIMASI 3D PILL (SAAT AKTIF)
                - Menggunakan Framer Motion layoutId agar pill-nya "meluncur" saat pindah tab
                - Gradient Maroon
                - Inset shadow atas putih transparan + drop shadow maroon = Efek Permata 3D (Jelly Button)
              */}
              {isActive && (
                <motion.div 
                  layoutId="active-nav-pill"
                  className="absolute inset-0 bg-gradient-to-b from-[#9A242B] to-[#7A171D] rounded-[1.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_6px_15px_rgba(122,23,29,0.3)] border border-[#5A0E13]"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}

              {/* KONTEN ICON & TEXT */}
              <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
                <item.icon 
                  className={cn(
                    "w-5 h-5 mb-1 transition-all duration-300",
                    isActive 
                      ? "text-white scale-110 drop-shadow-md" 
                      : "text-slate-400 group-active:scale-90 group-active:text-slate-600"
                  )} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                <span className={cn(
                  "text-[9px] font-bold tracking-wide transition-colors duration-300",
                  isActive ? "text-white drop-shadow-sm" : "text-slate-400"
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