"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Package, Search, User, Menu, Settings, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- CATATAN INTEGRASI DATABASE (FIREBASE AUTH) ---
  // [TODO: Firebase] Di tahap integrasi nanti, variabel 'isLoggedIn' statis ini 
  // akan dihapus dan diganti dengan listener state dari Firebase Auth.
  // Contoh: 
  // const { user } = useFirebaseAuth();
  // const isLoggedIn = user !== null;
  // --------------------------------------------------
  
  // Untuk keperluan Prototype: Anggap user "Sudah Login" jika tidak berada di halaman /login
  const isLoggedIn = pathname !== "/login";

  // Fungsi untuk menutup dropdown saat area luar diklik
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setIsProfileOpen(false);
    
    // --- CATATAN INTEGRASI BACKEND ---
    // [TODO: Firebase] Di sini kita panggil fungsi auth.signOut() sebelum melakukan redirect.
    // await firebaseSignOut();
    // ----------------------------------

    // Alihkan halaman ke login sesuai request prototype
    router.push("/login");
  };

  return (
    <nav className="w-full bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Logo Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-gradient-to-br from-[#7A171D] to-[#5A0E13] rounded-xl flex items-center justify-center shadow-lg shadow-[#7A171D]/20 group-hover:shadow-[#7A171D]/40 transition-all">
            <Package className="text-[#C5A059] w-6 h-6" />
          </div>
          <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Flash <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Global</span>
          </span>
        </Link>

        {/* Menu Navigasi Tengah */}
        <div className="hidden md:flex items-center space-x-8">
          <Link 
            href="/" 
            className={`text-sm font-semibold transition-colors hover:text-[#7A171D] ${pathname === "/" ? "text-[#7A171D]" : "text-gray-600"}`}
          >
            Beranda
          </Link>
          <Link 
            href="/tracking" 
            className={`text-sm font-semibold transition-colors hover:text-[#7A171D] flex items-center gap-1 ${pathname.includes("/tracking") ? "text-[#7A171D]" : "text-gray-600"}`}
          >
            <Search className="w-4 h-4" /> Cek Resi
          </Link>
          <Link 
            href="/layanan" 
            className={`text-sm font-semibold transition-colors hover:text-[#7A171D] ${pathname === "/layanan" ? "text-[#7A171D]" : "text-gray-600"}`}
          >
            Layanan Kami
          </Link>
        </div>

        {/* Area Kanan (Login/Register ATAU User Profile) */}
        <div className="flex items-center gap-4">
          
          {isLoggedIn ? (
            // UI STATE: SUDAH LOGIN (Interactive Dropdown Prototype)
            <div className="hidden md:block relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl hover:bg-slate-100 transition-all border border-transparent hover:border-gray-200"
              >
                {/* [TODO: Firebase] Foto profil nanti bisa ambil dari user.photoURL Cloudinary */}
                <div className="w-9 h-9 bg-gradient-to-br from-[#7A171D] to-[#C5A059] rounded-xl flex items-center justify-center text-white shadow-inner">
                  <User className="w-5 h-5" />
                </div>
                
                <div className="text-left hidden lg:block">
                  {/* [TODO: Firebase] Nama nanti ditarik dari user.displayName */}
                  <p className="text-sm font-bold text-gray-900 leading-none">Bos Ekspedisi</p>
                  <p className="text-[11px] font-semibold text-[#C5A059] mt-0.5 uppercase tracking-wider">Premium B2B</p>
                </div>
                
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ml-1 ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden py-2"
                  >
                    {/* Header Dropdown - Info User */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-slate-50/50">
                      <p className="text-sm font-bold text-gray-900">Bos Ekspedisi</p>
                      {/* [TODO: Firebase] Email ditarik dari user.email */}
                      <p className="text-xs text-gray-500 truncate mt-0.5">bos@flashglobal.com</p>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2 space-y-1">
                      <Link 
                        href="/dashboard" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-[#7A171D] hover:bg-[#7A171D]/5 rounded-xl transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" /> Dasbor Portal
                      </Link>
                      <Link 
                        href="/settings" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-[#7A171D] hover:bg-[#7A171D]/5 rounded-xl transition-colors"
                      >
                        <Settings className="w-4 h-4" /> Pengaturan Akun
                      </Link>
                    </div>

                    {/* Tombol Logout */}
                    <div className="p-2 border-t border-gray-100 mt-1">
                      <button 
                        onClick={handleLogoutClick}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors animate-none"
                      >
                        <LogOut className="w-4 h-4" /> Keluar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            // UI STATE: BELUM LOGIN (Muncul khusus jika berada di halaman login)
            <Link 
              href="/login"
              className="hidden md:flex items-center gap-2 bg-[#7A171D]/10 hover:bg-[#7A171D]/20 text-[#7A171D] px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
            >
              <User className="w-4 h-4" /> Masuk / Daftar
            </Link>
          )}
          
          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-gray-600 hover:text-[#7A171D]">
            <Menu className="w-6 h-6" />
          </button>
        </div>

      </div>
    </nav>
  );
}