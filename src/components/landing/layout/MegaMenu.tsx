"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, X, ChevronDown, Package, Building2, ShoppingBag, 
  Truck, Users, MapPin, Wallet, ShieldCheck, ArrowRight 
} from "lucide-react";

// ==========================================
// DATA STRUKTUR MEGA MENU
// ==========================================
const MENU_ITEMS = [
  {
    id: "solutions",
    label: "Solutions",
    href: "/solutions",
    columns: [
      {
        title: "Klien & Pengirim",
        items: [
          { icon: Package, label: "Personal & Retail", desc: "Kirim barang instan dengan Multi-drop & Live POD.", href: "/solutions/personal" },
          { icon: Building2, label: "Enterprise (B2B)", desc: "Limit Tempo, Kasbon otomatis, dan kargo berat.", href: "/solutions/enterprise" },
          { icon: ShoppingBag, label: "E-Commerce", desc: "Integrasi logistik mulus untuk seller & UMKM.", href: "/solutions/ecommerce" },
        ]
      }
    ]
  },
  {
    id: "partners",
    label: "Partners",
    href: "/partners",
    columns: [
      {
        title: "Mitra Flash Global",
        items: [
          { icon: Truck, label: "Driver Individu", desc: "Smart Radar Bidding & pencairan dana instan.", href: "/partners/driver" },
          { icon: Users, label: "Fleet & Vendor", desc: "Manajemen supir, aset truk, dan laporan komisi terpusat.", href: "/partners/fleet-vendor" },
        ]
      }
    ]
  },
  {
    id: "features",
    label: "Features",
    href: "/features",
    columns: [
      {
        title: "Teknologi Kami",
        items: [
          { icon: MapPin, label: "Live Tracking & e-POD", desc: "Lacak posisi presisi & bukti kirim foto satelit.", href: "/features/live-tracking" },
          { icon: Wallet, label: "Flash Wallet", desc: "Dompet digital terenkripsi integrasi DANA API.", href: "/features/flash-wallet" },
          { icon: ShieldCheck, label: "Insurance Protection", desc: "Klaim digital asuransi langsung dari aplikasi.", href: "/features/protection" },
        ]
      }
    ]
  },
];

export default function MegaMenu() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State untuk melacak arah scroll (Auto-Hide Header)
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Reset posisi menu dropdown jika di-scroll agar tidak nyangkut
      if (activeMenu) setActiveMenu(null);

      // Jika ada di paling atas (kurang dari 50px), selalu tampilkan
      if (currentScrollY < 50) {
        setIsVisible(true);
      } 
      // Jika scroll ke BAWAH, sembunyikan header
      else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      } 
      // Jika scroll ke ATAS, munculkan header
      else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, activeMenu]);

  return (
    <>
      {/* 
        HEADER UTAMA: THE FLOATING GLASS PILL
        Ditambahkan efek transisi transform translateY untuk efek Hide/Show saat scroll
      */}
      <header 
        className={`fixed top-6 inset-x-0 z-50 px-4 sm:px-6 flex justify-center pointer-events-none transition-transform duration-500 ease-out ${
          isVisible ? "translate-y-0" : "-translate-y-[150%]"
        }`}
      >
        {/* Kontainer Kaca Melayang */}
        <div 
          className="w-full max-w-6xl bg-white/70 backdrop-blur-2xl border border-white/80 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.05)] pointer-events-auto relative"
          onMouseLeave={() => setActiveMenu(null)}
        >
          <div className="flex justify-between items-center h-16 sm:h-20 px-6 sm:px-8">
            
            {/* 1. LOGO BRAND */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="relative flex items-center h-8 sm:h-10 w-32 sm:w-40" onClick={() => setIsMobileMenuOpen(false)}>
                <Image 
                  src="/logo.png" 
                  alt="Flash Global Logo" 
                  fill
                  sizes="(max-width: 768px) 128px, 160px"
                  priority
                  className="object-contain object-left"
                />
              </Link>
            </div>

            {/* 2. DESKTOP NAVIGATION */}
            <nav className="hidden lg:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              {MENU_ITEMS.map((item) => (
                <div 
                  key={item.id} 
                  className="relative px-2 py-6"
                  onMouseEnter={() => setActiveMenu(item.id)}
                >
                  <button className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                    {item.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeMenu === item.id ? 'rotate-180 text-brand-maroon' : ''}`} />
                  </button>
                </div>
              ))}
              <div className="px-2 py-6">
                <Link href="/company" className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                  Company
                </Link>
              </div>
            </nav>

            {/* 3. CTA BUTTONS */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href="/contact" className="text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-2 transition-colors">
                Contact Sales
              </Link>
              <Link href="/login" className="text-sm font-bold bg-slate-900 text-white px-6 py-2.5 rounded-full shadow-md hover:bg-brand-maroon hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
                Portal Client
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 4. MOBILE MENU BUTTON */}
            <div className="lg:hidden flex items-center">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>

          {/* 
            5. MEGA MENU DROPDOWN PANEL (DESKTOP)
          */}
          <AnimatePresence>
            {activeMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-full left-0 w-full pt-4 hidden lg:block"
              >
                <div className="w-full bg-white/90 backdrop-blur-3xl border border-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.08)] relative overflow-hidden">
                  
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-maroon/5 to-brand-gold/5 rounded-full blur-[80px] pointer-events-none" />

                  <div className="relative z-10 px-10 py-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                      
                      {/* Bagian Kiri */}
                      <div className="col-span-1 bg-gradient-to-br from-slate-50 to-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-brand-maroon shadow-sm mb-4 border border-slate-100">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                          <h3 className="font-heading font-bold text-xl text-slate-900 mb-3">
                            Ekosistem Terintegrasi
                          </h3>
                          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Satu akun untuk mengontrol pengiriman retail, manajemen B2B, dan pencairan komisi secara <em>real-time</em>.
                          </p>
                        </div>
                        <Link href="/contact" className="text-sm font-bold text-brand-maroon hover:text-brand-gold-dark flex items-center gap-1 group w-max transition-colors">
                          Hubungi Sales B2B <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>

                      {/* Bagian Kanan */}
                      <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        {MENU_ITEMS.find(m => m.id === activeMenu)?.columns[0].items.map((subItem, idx) => {
                          const Icon = subItem.icon;
                          return (
                            <Link 
                              key={idx} 
                              href={subItem.href}
                              onClick={() => setActiveMenu(null)}
                              className="group flex items-start gap-5 p-4 rounded-[1.5rem] hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all duration-300"
                            >
                              <div className="w-12 h-12 shrink-0 rounded-full bg-white border border-slate-100 text-slate-400 group-hover:bg-brand-maroon group-hover:text-white group-hover:border-brand-maroon shadow-sm flex items-center justify-center transition-all duration-300">
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-slate-900 group-hover:text-brand-maroon transition-colors mb-1">
                                  {subItem.label}
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                  {subItem.desc}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* 
        6. MOBILE MENU OVERLAY
      */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 top-0 z-40 bg-white/95 backdrop-blur-2xl lg:hidden overflow-y-auto pt-28 pb-10"
          >
            <div className="px-6 flex flex-col gap-8 max-w-lg mx-auto">
              
              {MENU_ITEMS.map((item) => (
                <div key={item.id} className="flex flex-col gap-4">
                  <h3 className="font-heading font-bold text-slate-400 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">
                    {item.label}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {item.columns[0].items.map((subItem, idx) => (
                      <Link 
                        key={idx} 
                        href={subItem.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-slate-800 font-bold py-3 px-4 rounded-2xl hover:bg-slate-50 hover:text-brand-maroon flex items-center gap-4 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <subItem.icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span>{subItem.label}</span>
                          <span className="text-[10px] text-slate-400 font-medium line-clamp-1">{subItem.desc}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="flex flex-col gap-4">
                 <h3 className="font-heading font-bold text-slate-400 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">
                    Company
                  </h3>
                  <Link href="/company" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-800 font-bold py-3 px-4 rounded-2xl hover:bg-slate-50 hover:text-brand-maroon flex items-center gap-4 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    Company Profile
                  </Link>
              </div>
              
              <div className="border-t border-slate-200 pt-8 mt-4 flex flex-col gap-4">
                <Link 
                  href="/contact" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-4 rounded-2xl font-bold text-slate-700 bg-slate-100 flex items-center justify-center gap-2"
                >
                  Contact Sales
                </Link>
                <Link 
                  href="/login" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-4 rounded-2xl font-bold text-white bg-slate-900 shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
                >
                  Portal Client <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}