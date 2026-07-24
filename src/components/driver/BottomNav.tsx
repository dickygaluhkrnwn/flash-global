"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radar, Wallet, User, Truck } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";

export default function BottomNav() {
  const pathname = usePathname();
  const { user, isHydrated } = useAuthStore();
  
  const [partnerType, setPartnerType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isHydrated) {
      if (user?.partnerType) {
        setPartnerType(user.partnerType);
      } else {
        setPartnerType("Individual"); // Fallback
      }
      setIsLoading(false);
    }
  }, [user, isHydrated]);

  const isVendor = partnerType === "Vendor";
  const activeColorText = isVendor ? "text-blue-600" : "text-[#7A171D]";
  const activeColorBg = isVendor ? "bg-blue-600" : "bg-[#7A171D]";

  // 🚀 PERBAIKAN URL (Menyesuaikan dengan Middleware)
  // JANGAN pakai /mobile di href, karena middleware yang akan nge-rewrite secara otomatis.
  const baseNavItems = [
    { name: "Home", href: "/driver/dashboard", icon: Home },
    { name: "Radar", href: "/driver/radar", icon: Radar }, 
    { name: "Dompet", href: "/driver/wallet", icon: Wallet },
    { name: "Profil", href: "/driver/profile", icon: User },
  ];

  const navItems = isVendor 
    ? [
        baseNavItems[0], // Home
        baseNavItems[1], // Radar
        { name: "Armada", href: "/driver/fleet", icon: Truck }, // Extra Khusus Vendor
        baseNavItems[2], // Dompet
        baseNavItems[3]  // Profil
      ]
    : baseNavItems;

  if (isLoading || !isHydrated) {
    return (
      <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-slate-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-50 h-16 pb-safe flex justify-around items-center px-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center justify-center w-full space-y-1.5 animate-pulse">
            <div className="w-6 h-6 bg-slate-200 rounded-md"></div>
            <div className="w-8 h-2 bg-slate-200 rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-slate-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-[100]">
      <div className="flex justify-around items-center h-16 pb-safe relative px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          
          // Karena pathname dari hooks next/navigation BISA mendeteksi path asli /mobile/ setelah di rewrite,
          // kita cocokkan agar tetap aktif meskipun URL di browser pendek.
          const isActive = pathname.includes(item.href) || pathname === item.href || pathname === item.href.replace("/driver", "/driver/mobile");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 z-10 outline-none",
                isActive ? activeColorText : "text-slate-400 hover:text-slate-500"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className={`absolute top-0 w-10 h-1 rounded-b-md ${activeColorBg}`}
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <motion.div
                whileTap={{ scale: 0.85 }}
                animate={isActive ? { y: -2 } : { y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon 
                  className={clsx("w-6 h-6 transition-transform duration-300", isActive && "scale-110")} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
              </motion.div>
              
              <motion.span 
                animate={isActive ? { y: -2 } : { y: 0 }}
                className={clsx("text-[10px] transition-all duration-300", isActive ? "font-bold" : "font-medium")}
              >
                {item.name}
              </motion.span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}