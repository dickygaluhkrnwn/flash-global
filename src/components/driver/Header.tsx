"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, Bell, ChevronDown, 
  LogOut, Settings, LifeBuoy, User, Truck, Wallet
} from "lucide-react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";

// --- IMPORT FIREBASE & ZUSTAND ---
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getDriverUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('driver.flashglobalslogistik.com')) {
    let cleanPath = path.replace(/^\/driver\/mobile/, '');
    cleanPath = cleanPath.replace(/^\/driver/, '');
    return cleanPath || '/';
  }
  // Jika di localhost
  if (path.startsWith('/driver') && !path.startsWith('/driver/mobile')) {
    return path.replace('/driver', '/driver/mobile');
  }
  return path;
};

interface HeaderProps {
  title: string;
  showBack?: boolean;
  partnerType?: "Individual" | "Vendor" | string;
}

export default function Header({ 
  title, 
  showBack = false, 
  partnerType = "Individual" 
}: HeaderProps) {
  const router = useRouter();
  
  // --- STATE UNTUK UI & SCROLL ---
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- STATE DARI ZUSTAND ---
  const { user, logout, isHydrated } = useAuthStore();
  const isLoggedIn = user !== null;

  // --- DETEKSI SMART SCROLL ---
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    
    // 1. Deteksi pucuk layar (Transparan vs Glass)
    setIsAtTop(latest <= 20);

    // 2. Deteksi arah scroll & tutup dropdown otomatis
    if (latest > previous && latest > 50) {
      setHidden(true); // Sembunyikan header
      setIsProfileOpen(false); // Tutup dropdown jika sedang buka
    } else {
      setHidden(false); // Munculkan header
    }
  });

  // --- HANDLER OUTSIDE CLICK ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- FUNGSI LOGOUT ---
  const handleLogoutClick = async () => {
    setIsProfileOpen(false);
    try {
      await signOut(auth); 
      logout(); 
      router.push(getDriverUrl("/driver/login")); // Dinamis redirect login driver
    } catch (error) {
      console.error("Gagal Logout:", error);
    }
  };

  const notifColor = partnerType === 'Vendor' ? 'bg-blue-500' : 'bg-[var(--brand-maroon)]';

  return (
    <motion.header 
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" }
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }} 
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] w-full max-w-md mx-auto transition-colors duration-500 px-4 py-3 pt-6 flex items-center justify-between",
        isAtTop 
          ? "bg-transparent border-transparent shadow-none" 
          : "glass-panel rounded-b-[2.5rem] border-t-0 border-x-0 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.08)]"
      )}
    >
      {/* KIRI: Tombol Back & Judul */}
      <div className="flex items-center gap-3">
        {showBack && (
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 flex items-center justify-center rounded-[1.25rem] bg-white/70 backdrop-blur-md hover:bg-white text-slate-800 transition-all border border-white/80 shadow-sm tap-highlight-transparent active:scale-90"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
        )}
        <h1 className={cn(
          "text-lg font-black tracking-tight transition-colors duration-300",
          isAtTop ? "text-slate-800 drop-shadow-sm" : "text-slate-900"
        )}>
          {title}
        </h1>
      </div>

      {/* KANAN: Notifikasi & Profil Dropdown */}
      <div className="flex items-center gap-2" ref={dropdownRef}>
        
        {/* Tombol Notifikasi */}
        <button className="relative w-10 h-10 flex items-center justify-center text-slate-700 bg-white/70 backdrop-blur-md rounded-[1rem] hover:bg-white transition-all border border-white/80 shadow-sm tap-highlight-transparent active:scale-90">
          <Bell size={20} strokeWidth={2} />
          <span className={`absolute top-2 right-2.5 w-2 h-2 ${notifColor} rounded-full border border-white shadow-sm animate-pulse`}></span>
        </button>

        {/* Tombol Profil */}
        {isHydrated && isLoggedIn && (
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={cn(
                "flex items-center gap-1.5 p-1 pr-2 rounded-[1rem] transition-all duration-300 border shadow-sm active:scale-95 tap-highlight-transparent select-none outline-none",
                isProfileOpen 
                  ? "bg-white border-slate-200 shadow-[0_4px_15px_rgba(0,0,0,0.05)]" 
                  : "bg-white/70 backdrop-blur-md border-white/80 hover:bg-white"
              )}
            >
              <div className="relative w-8 h-8 rounded-[0.75rem] overflow-hidden bg-slate-100 border border-slate-200">
                {user?.photoURL ? (
                  <Image src={user.photoURL} alt="Avatar" fill className="object-cover" sizes="32px" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#9A242B] to-[#7A171D] flex items-center justify-center text-white">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
              <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-300", isProfileOpen ? "rotate-180" : "")} />
            </button>

            {/* DROPDOWN MENU APPLE GLASS */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 top-12 w-[240px] glass-card rounded-[1.5rem] p-2 origin-top-right shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-white/80"
                >
                  {/* Header Profil Mini */}
                  <div className="px-3 py-3 mb-2 bg-white/60 backdrop-blur-sm rounded-[1rem] border border-white shadow-sm flex flex-col items-center text-center">
                    <p className="text-sm font-black text-slate-900 w-full truncate tracking-tight">{user?.displayName}</p>
                    <p className="text-[10px] font-medium text-slate-500 w-full truncate mt-0.5">{user?.email}</p>
                    <span className={cn(
                      "inline-block mt-2 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border shadow-sm", 
                      partnerType === 'Vendor' ? "bg-blue-50/80 text-blue-700 border-blue-200" : "bg-[#7A171D]/10 text-[#7A171D] border-[#7A171D]/20"
                    )}>
                      {partnerType === 'Vendor' ? "Mitra Vendor" : "Mitra Mandiri"}
                    </span>
                  </div>

                  {/* List Menu Cepat */}
                  <div className="space-y-1">
                    {partnerType === 'Vendor' && (
                      <Link href={getDriverUrl("/driver/fleet")} onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 active:bg-blue-50 active:text-blue-700 rounded-xl transition-colors tap-highlight-transparent">
                        <Truck className="w-4 h-4 text-blue-500" /> Kelola Armada
                      </Link>
                    )}
                    
                    <Link href={getDriverUrl("/driver/wallet")} onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 active:bg-white active:text-[#7A171D] rounded-xl transition-colors tap-highlight-transparent">
                      <Wallet className="w-4 h-4 text-emerald-500" /> Dompet & Komisi
                    </Link>

                    <Link href={getDriverUrl("/driver/profile")} onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 active:bg-white active:text-[#7A171D] rounded-xl transition-colors tap-highlight-transparent">
                      <Settings className="w-4 h-4 text-slate-500" /> Pengaturan Akun
                    </Link>

                    <Link href={getDriverUrl("/driver/support")} onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 active:bg-white active:text-[#7A171D] rounded-xl transition-colors tap-highlight-transparent">
                      <LifeBuoy className="w-4 h-4 text-amber-500" /> Pusat Bantuan
                    </Link>
                  </div>

                  {/* Footer: Logout */}
                  <div className="mt-1 pt-1 border-t border-slate-200/50">
                    <button onClick={handleLogoutClick} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-red-600 active:bg-red-50/80 rounded-xl transition-colors tap-highlight-transparent">
                      <LogOut className="w-4 h-4" /> Keluar Sesi
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.header>
  );
}