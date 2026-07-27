"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { 
  Search, User, Menu, Settings, 
  LogOut, LayoutDashboard, ChevronDown, 
  X, TicketPercent, LifeBuoy, CreditCard 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- IMPORT FIREBASE & ZUSTAND ---
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // State untuk UI
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State & Ref untuk Smart Scroll Navbar
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);

  // Ambil state dari Zustand
  const { user, logout, isHydrated } = useAuthStore();
  const isLoggedIn = user !== null;

  // Handler: Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handler: Sembunyikan Navbar saat scroll ke bawah, beri background saat tidak di puncak
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Beri efek shadow/background jika sudah scroll lebih dari 20px
      if (currentScrollY > 20) setIsScrolled(true);
      else setIsScrolled(false);

      // Sembunyikan navbar jika scroll ke bawah (Smart Header)
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
        setIsProfileOpen(false); 
        setIsMobileMenuOpen(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fungsi Logout Asli
  const handleLogoutClick = async () => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    try {
      await signOut(auth); 
      logout(); 
      router.push("/login"); 
    } catch (error) {
      console.error("Gagal Logout:", error);
    }
  };

  const navLinks = [
    { name: "Beranda", path: "/" },
    { name: "Cek Pengiriman", path: "/tracking", icon: Search },
    { name: "Layanan Kami", path: "/layanan" },
  ];

  return (
    <>
      {/* NAVBAR BUNGKUSAN LUAR (Fix positioning) */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: isVisible ? 0 : "-100%" }}
        transition={{ duration: 0.4, type: "spring", stiffness: 100, damping: 20 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-out",
          isScrolled ? "pt-4 px-4 md:px-8" : "pt-6 px-4 md:px-8"
        )}
      >
        {/* CONTAINER DALAM (Berubah jadi Floating Pill saat di-scroll) */}
        <div 
          className={cn(
            "mx-auto max-w-7xl flex items-center justify-between transition-all duration-500",
            isScrolled 
              ? "glass-panel rounded-full py-2.5 px-6" 
              : "bg-transparent rounded-none py-2 px-2 border-transparent shadow-none"
          )}
        >
          {/* Logo Brand */}
          <Link href="/" className="flex items-center group relative w-[160px] md:w-[200px] h-[36px] md:h-[42px] transition-transform active:scale-95">
            <Image 
              src="/logo.png" 
              alt="Flash Globals Logistik" 
              fill
              priority
              className="object-contain object-left drop-shadow-sm group-hover:opacity-90 transition-opacity duration-300"
            />
          </Link>

          {/* Menu Navigasi Tengah (Desktop) */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => {
              const isActive = link.path === "/" ? pathname === "/" : pathname.includes(link.path);
              return (
                <Link 
                  key={link.name} 
                  href={link.path} 
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 active:scale-95",
                    isActive 
                      ? "bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-[#7A171D] border border-slate-100" 
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-transparent"
                  )}
                >
                  {link.icon && <link.icon className="w-4 h-4" strokeWidth={2.5} />}
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Area Kanan (Login/Register ATAU User Profile) */}
          <div className="flex items-center gap-3">
            
            {isHydrated && (
              isLoggedIn ? (
                // UI STATE: SUDAH LOGIN
                <div className="hidden md:block relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={cn(
                      "flex items-center gap-3 p-1.5 pr-3 rounded-full transition-all duration-300 border shadow-sm active:scale-95",
                      isProfileOpen 
                        ? "bg-white border-slate-200 shadow-[0_4px_15px_rgba(0,0,0,0.05)]" 
                        : "bg-white/60 border-white hover:bg-white"
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
                    
                    <div className="text-left hidden lg:block">
                      <p className="text-sm font-black text-slate-800 leading-none truncate max-w-[120px]">{user?.displayName}</p>
                    </div>
                    
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300 ml-1", isProfileOpen ? "rotate-180" : "")} />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 mt-3 w-72 glass-card rounded-[2rem] p-2 origin-top-right"
                      >
                        {/* Header Profil */}
                        <div className="px-4 py-4 mb-2 bg-white/50 rounded-[1.5rem] border border-white">
                          <p className="text-base font-black text-slate-900 truncate tracking-tight">{user?.displayName}</p>
                          <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{user?.email}</p>
                          <span className={cn(
                            "inline-block mt-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm", 
                            user?.role === 'b2b' ? "bg-indigo-50/80 text-indigo-700 border-indigo-200" : "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/20"
                          )}>
                            {user?.role === 'b2b' ? "Corporate Account" : "Personal Account"}
                          </span>
                        </div>

                        {/* Menu Items ala iOS */}
                        <div className="space-y-1">
                          <Link href="/dashboard" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:text-[#7A171D] hover:bg-white rounded-2xl transition-all">
                            <LayoutDashboard className="w-4 h-4" /> Dasbor Portal
                          </Link>

                          {user?.role === 'b2b' && (
                            <Link href="/finance" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:text-indigo-700 hover:bg-white rounded-2xl transition-all group">
                              <CreditCard className="w-4 h-4 text-indigo-500 group-hover:text-indigo-700" /> Tagihan Korporat
                            </Link>
                          )}
                          
                          <Link href="/promo" onClick={() => setIsProfileOpen(false)} className="flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 hover:text-[#7A171D] hover:bg-white rounded-2xl transition-all group">
                            <div className="flex items-center gap-3">
                              <TicketPercent className="w-4 h-4 text-emerald-500 group-hover:text-[#7A171D]" /> Voucher Saya
                            </div>
                            <span className="flex w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                          </Link>

                          <Link href="/support" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:text-[#7A171D] hover:bg-white rounded-2xl transition-all group">
                            <LifeBuoy className="w-4 h-4 text-blue-500 group-hover:text-[#7A171D]" /> Pusat Bantuan
                          </Link>
                          
                          <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:text-[#7A171D] hover:bg-white rounded-2xl transition-all">
                            <Settings className="w-4 h-4" /> Pengaturan Akun
                          </Link>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200/50">
                          <button onClick={handleLogoutClick} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50/80 rounded-2xl transition-all">
                            <LogOut className="w-4 h-4" /> Keluar Sesi
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                // UI STATE: BELUM LOGIN
                <Link 
                  href="/login"
                  className="hidden md:flex items-center gap-2 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_10px_rgba(122,23,29,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_6px_15px_rgba(122,23,29,0.3)] border border-[#5A0E13] active:scale-[0.96]"
                >
                  <User className="w-4 h-4" strokeWidth={2.5} /> Masuk / Daftar
                </Link>
              )
            )}
            
            {/* Tombol Hamburger Mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-800 bg-white/60 hover:bg-white rounded-full border border-white shadow-sm transition-all active:scale-95"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </motion.nav>

      {/* MOBILE FULLSCREEN MENU (Apple Glass Blur) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[90] bg-slate-50/90 backdrop-blur-3xl pt-28 px-6 flex flex-col md:hidden overflow-y-auto"
          >
            <div className="flex flex-col space-y-3 text-center mt-6">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.path} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-black text-slate-800 hover:text-[#7A171D] py-3 rounded-2xl active:bg-white/50 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="mt-auto pt-8 pb-10 w-full space-y-3">
              {isLoggedIn ? (
                <>
                  <div className="glass-card rounded-[2rem] p-5 flex items-center gap-4 border border-white">
                    {user?.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.photoURL} alt="Avatar" className="w-14 h-14 rounded-full border-2 border-white object-cover shadow-sm" />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-[#9A242B] to-[#7A171D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] rounded-full flex items-center justify-center text-white">
                        <User className="w-7 h-7" />
                      </div>
                    )}
                    <div className="text-left overflow-hidden">
                      <p className="text-lg font-black text-slate-900 truncate">{user?.displayName}</p>
                      <p className="text-sm font-medium text-slate-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                  
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-b from-slate-800 to-slate-900 text-white rounded-2xl font-bold text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_10px_rgba(15,23,42,0.2)] border border-slate-950 active:scale-[0.98] transition-all">
                    <LayoutDashboard className="w-5 h-5"/> Dasbor Portal
                  </Link>

                  {user?.role === 'b2b' && (
                    <Link href="/finance" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex flex-row items-center justify-center gap-3 py-4 bg-indigo-50/80 text-indigo-700 border border-indigo-200 rounded-2xl font-bold text-center mt-3 active:scale-[0.98] transition-all">
                      <CreditCard className="w-5 h-5" /> Tagihan Korporat B2B
                    </Link>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Link href="/promo" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex flex-col items-center justify-center gap-2 py-5 bg-white border border-slate-100 shadow-sm rounded-2xl font-bold text-sm text-slate-700 active:scale-[0.98] transition-all">
                      <TicketPercent className="w-6 h-6 text-emerald-500" /> Voucher
                    </Link>
                    <Link href="/support" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex flex-col items-center justify-center gap-2 py-5 bg-white border border-slate-100 shadow-sm rounded-2xl font-bold text-sm text-slate-700 active:scale-[0.98] transition-all">
                      <LifeBuoy className="w-6 h-6 text-blue-500" /> Bantuan
                    </Link>
                  </div>
                  
                  <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-slate-100 shadow-sm rounded-2xl font-bold text-slate-700 text-center active:scale-[0.98] transition-all">
                    <Settings className="w-5 h-5"/> Pengaturan Akun
                  </Link>

                  <button onClick={handleLogoutClick} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-center mt-2 border border-red-100 active:scale-[0.98] transition-all">Keluar Sesi</button>
                </>
              ) : (
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white py-4 rounded-2xl font-bold text-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_20px_rgba(122,23,29,0.3)] border border-[#5A0E13] active:scale-[0.98] transition-all">
                  <User className="w-5 h-5" strokeWidth={2.5} /> Masuk / Daftar Sekarang
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}