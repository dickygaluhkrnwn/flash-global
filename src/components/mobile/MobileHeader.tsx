"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  User, Settings, LogOut, 
  ChevronDown, TicketPercent, LifeBuoy, CreditCard, Info, MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- IMPORT FIREBASE & ZUSTAND ---
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

export default function MobileHeader() {
  const router = useRouter();
  
  // State untuk UI
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ambil state dari Zustand
  const { user, logout, isHydrated } = useAuthStore();
  const isLoggedIn = user !== null;

  // Deteksi scroll untuk efek glass pada header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      // Tutup dropdown otomatis kalau user scroll jauh ke bawah
      if (window.scrollY > 100) setIsProfileOpen(false);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handler: Tutup dropdown jika klik di luar area
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fungsi Logout
  const handleLogoutClick = async () => {
    setIsProfileOpen(false);
    try {
      await signOut(auth); 
      logout(); 
      router.push("/login"); 
    } catch (error) {
      console.error("Gagal Logout:", error);
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-4 pt-4 pb-3 flex items-center justify-between",
        isScrolled 
          ? "glass-panel border-b border-white/40 shadow-sm" 
          : "bg-transparent border-transparent"
      )}
    >
      {/* Logo Brand */}
      <Link href="/" className="relative w-[130px] h-[32px] active:scale-95 transition-transform tap-highlight-transparent">
        <Image 
          src="/logo.png" 
          alt="Flash Globals" 
          fill
          priority
          className="object-contain object-left drop-shadow-sm"
        />
      </Link>

      {/* Aksi Kanan (Profile Dropdown) */}
      <div className="relative flex items-center" ref={dropdownRef}>
        {isHydrated && (
          isLoggedIn ? (
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={cn(
                "flex items-center gap-1.5 p-1 pr-2 rounded-full transition-all duration-300 border shadow-sm active:scale-95 tap-highlight-transparent select-none",
                isProfileOpen 
                  ? "bg-white border-slate-200 shadow-[0_4px_15px_rgba(0,0,0,0.05)]" 
                  : "bg-white/60 backdrop-blur-md border-white hover:bg-white"
              )}
            >
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-100 object-cover shadow-sm" />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-[#9A242B] to-[#7A171D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] rounded-full flex items-center justify-center text-white">
                  <User className="w-4 h-4" />
                </div>
              )}
              <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-300", isProfileOpen ? "rotate-180" : "")} />
            </button>
          ) : (
            <Link 
              href="/login"
              className="flex items-center justify-center w-10 h-10 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_10px_rgba(122,23,29,0.2)] border border-[#5A0E13] active:scale-95 transition-all tap-highlight-transparent"
            >
              <User className="w-4 h-4" strokeWidth={2.5} />
            </Link>
          )
        )}

        {/* DROPDOWN MENU MOBILE (Framer Motion) */}
        <AnimatePresence>
          {isProfileOpen && isLoggedIn && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute right-0 top-12 w-[260px] glass-card rounded-[1.75rem] p-2 origin-top-right shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white"
            >
              {/* Header Profil Mini */}
              <div className="px-4 py-3 mb-2 bg-white/60 rounded-[1.25rem] border border-white shadow-sm">
                <p className="text-sm font-black text-slate-900 truncate tracking-tight">{user?.displayName}</p>
                <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">{user?.email}</p>
                <span className={cn(
                  "inline-block mt-2 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full border shadow-sm", 
                  user?.role === 'b2b' ? "bg-indigo-50/80 text-indigo-700 border-indigo-200" : "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/20"
                )}>
                  {user?.role === 'b2b' ? "Corporate" : "Personal"}
                </span>
              </div>

              {/* List Menu */}
              <div className="space-y-1">
                {user?.role === 'b2b' && (
                  <Link href="/finance" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 active:bg-indigo-50 active:text-indigo-700 rounded-2xl transition-colors tap-highlight-transparent">
                    <CreditCard className="w-4 h-4 text-indigo-500" /> Tagihan B2B
                  </Link>
                )}
                
                {/* MENU LACAK RESI */}
                <Link href="/tracking" onClick={() => setIsProfileOpen(false)} className="flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 active:bg-white active:text-[#7A171D] rounded-2xl transition-colors tap-highlight-transparent">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[#7A171D]" /> Lacak Resi
                  </div>
                </Link>

                <Link href="/promo" onClick={() => setIsProfileOpen(false)} className="flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 active:bg-white active:text-[#7A171D] rounded-2xl transition-colors tap-highlight-transparent">
                  <div className="flex items-center gap-3">
                    <TicketPercent className="w-4 h-4 text-emerald-500" /> Voucher
                  </div>
                  <span className="flex w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                </Link>

                <Link href="/layanan" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 active:bg-white active:text-[#7A171D] rounded-2xl transition-colors tap-highlight-transparent">
                  <Info className="w-4 h-4 text-amber-500" /> Tentang Layanan
                </Link>

                <Link href="/support" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 active:bg-white active:text-[#7A171D] rounded-2xl transition-colors tap-highlight-transparent">
                  <LifeBuoy className="w-4 h-4 text-blue-500" /> Bantuan
                </Link>
                
                <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 active:bg-white active:text-[#7A171D] rounded-2xl transition-colors tap-highlight-transparent">
                  <Settings className="w-4 h-4" /> Pengaturan
                </Link>
              </div>

              {/* Footer: Logout */}
              <div className="mt-1 pt-1 border-t border-slate-200/50">
                <button onClick={handleLogoutClick} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 active:bg-red-50/80 rounded-2xl transition-colors tap-highlight-transparent">
                  <LogOut className="w-4 h-4" /> Keluar Sesi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}