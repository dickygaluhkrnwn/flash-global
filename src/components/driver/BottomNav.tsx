"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radar, Wallet, User } from "lucide-react";
import { clsx } from "clsx";

export default function BottomNav() {
  const pathname = usePathname();

  // HAPUS kata /mobile dari href, gunakan public URL
  const navItems = [
    { name: "Home", href: "/driver/dashboard", icon: Home },
    { name: "Radar", href: "/driver/radar", icon: Radar }, 
    { name: "Wallet", href: "/driver/wallet", icon: Wallet },
    { name: "Profil", href: "/driver/profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-slate-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-50">
      <div className="flex justify-around items-center h-16 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
                isActive ? "text-[#7A171D]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon 
                className={clsx("w-6 h-6 transition-transform duration-200", isActive && "scale-110")} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className={clsx("text-[10px]", isActive ? "font-bold" : "font-medium")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}