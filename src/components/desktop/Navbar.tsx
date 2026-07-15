"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Package, Search, User, Menu, Settings, 
  LogOut, LayoutDashboard, ChevronDown, 
  X, TicketPercent, LifeBuoy 
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
      <motion.nav 
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : "-100%" }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "w-full fixed top-0 left-0 right-0 z-[100] transition-all duration-300",
          isScrolled ? "bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm py-2" : "bg-transparent py-4"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7A171D] to-[#5A0E13] rounded-xl flex items-center justify-center shadow-lg shadow-[#7A171D]/20 group-hover:scale-105 transition-transform duration-300 border border-red-500/10">
              <Package className="text-[#C5A059] w-5 h-5" />
            </div>
            <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Flash<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Global</span>
            </span>
          </Link>

          {/* Menu Navigasi Tengah (Desktop) */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.path || (link.path !== "/" && pathname.includes(link.path));
              return (
                <Link 
                  key={link.name} 
                  href={link.path} 
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1.5",
                    isActive 
                      ? "bg-[#7A171D]/10 text-[#7A171D]" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
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
                    className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-all border border-slate-200 bg-white shadow-sm"
                  >
                    {user?.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200 object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-[#7A171D] to-[#C5A059] rounded-full flex items-center justify-center text-white shadow-inner">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    
                    <div className="text-left hidden lg:block">
                      <p className="text-sm font-bold text-slate-900 leading-none truncate max-w-[120px]">{user?.displayName}</p>
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
                        className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-2"
                      >
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                          <p className="text-sm font-black text-slate-900 truncate">{user?.displayName}</p>
                          <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{user?.email}</p>
                          <span className="inline-block mt-2 px-2 py-0.5 bg-[#C5A059]/10 text-[#A68345] text-[10px] font-bold uppercase tracking-wider rounded-md">
                            {user?.role === 'b2b' ? "Corporate Account" : "Personal Account"}
                          </span>
                        </div>

                        <div className="p-2 space-y-1">
                          <Link href="/dashboard" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:text-[#7A171D] hover:bg-[#7A171D]/5 rounded-xl transition-colors">
                            <LayoutDashboard className="w-4 h-4" /> Dasbor Portal
                          </Link>
                          
                          <Link href="/promo" onClick={() => setIsProfileOpen(false)} className="flex items-center justify-between px-3 py-2.5 text-sm font-bold text-slate-600 hover:text-[#7A171D] hover:bg-[#7A171D]/5 rounded-xl transition-colors group">
                            <div className="flex items-center gap-3">
                              <TicketPercent className="w-4 h-4 text-emerald-500 group-hover:text-[#7A171D] transition-colors" /> Voucher Saya
                            </div>
                            <span className="flex w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          </Link>

                          {/* MENU BARU: PUSAT BANTUAN CS */}
                          <Link href="/support" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:text-[#7A171D] hover:bg-[#7A171D]/5 rounded-xl transition-colors group">
                            <LifeBuoy className="w-4 h-4 text-blue-500 group-hover:text-[#7A171D] transition-colors" /> Pusat Bantuan
                          </Link>
                          
                          <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:text-[#7A171D] hover:bg-[#7A171D]/5 rounded-xl transition-colors">
                            <Settings className="w-4 h-4" /> Pengaturan Akun
                          </Link>
                        </div>

                        <div className="p-2 border-t border-slate-100 mt-1">
                          <button onClick={handleLogoutClick} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
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
                  className="hidden md:flex items-center gap-2 bg-[#7A171D] hover:bg-[#5A0E13] text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-md shadow-[#7A171D]/20 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <User className="w-4 h-4" /> Masuk / Daftar
                </Link>
              )
            )}
            
            {/* Tombol Hamburger Mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </motion.nav>

      {/* MOBILE FULLSCREEN MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-white pt-24 px-6 flex flex-col md:hidden"
          >
            <div className="flex flex-col space-y-4 text-center mt-10">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.path} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-black text-slate-800 hover:text-[#7A171D]"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="mt-auto mb-10 w-full space-y-3">
              {isLoggedIn ? (
                <>
                  <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-200">
                    {user?.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border border-slate-200 object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-[#7A171D] to-[#C5A059] rounded-full flex items-center justify-center text-white">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-base font-bold text-slate-900">{user?.displayName}</p>
                      <p className="text-xs font-medium text-slate-500">{user?.email}</p>
                    </div>
                  </div>
                  
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-xl font-bold text-center">
                    <LayoutDashboard className="w-5 h-5"/> Dasbor Portal
                  </Link>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/promo" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex flex-col items-center justify-center gap-2 py-4 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold text-sm text-center">
                      <TicketPercent className="w-5 h-5" /> Voucher Saya
                    </Link>
                    {/* MENU BARU MOBILE: PUSAT BANTUAN */}
                    <Link href="/support" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex flex-col items-center justify-center gap-2 py-4 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold text-sm text-center">
                      <LifeBuoy className="w-5 h-5" /> Pusat Bantuan
                    </Link>
                  </div>
                  
                  <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-bold text-sm text-center">
                    <Settings className="w-4 h-4"/> Pengaturan Akun
                  </Link>

                  <button onClick={handleLogoutClick} className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-bold text-center mt-2">Keluar Sesi</button>
                </>
              ) : (
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center gap-2 bg-[#7A171D] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-[#7A171D]/20">
                  <User className="w-5 h-5" /> Masuk / Daftar Sekarang
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}