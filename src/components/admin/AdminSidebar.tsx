"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { 
  Truck, Coins, LogOut, Package, ShieldCheck, 
  LayoutDashboard, WalletCards, Users, Send, 
  Banknote, Ticket, LifeBuoy, ChevronDown, 
  User, Building2, UserCog, CreditCard, Globe, Map,
  MessageSquare, FileWarning, History, Users2,
  Receipt,
  FileSpreadsheet,
  UserSquare2
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { Role } from "@/types/user";

interface AdminSidebarProps {
  currentRole: Role | string;
  pathname: string;
}

interface SidebarButtonProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  href: string;
  isExpanded: boolean;
}

const allowedRoles: Role[] = ["superadmin", "admin_finance", "admin_operational", "staff"];

export default function AdminSidebar({ currentRole, pathname }: AdminSidebarProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isUsersRouteActive = pathname.startsWith("/admin/users/b2"); // Hanya aktif untuk b2c dan b2b
  const [isUsersMenuOpen, setIsUsersMenuOpen] = useState(isUsersRouteActive);

  // STATE BARU: Khusus untuk menu Fleet Management (Sopir & Vendor)
  const isFleetRouteActive = pathname.startsWith("/admin/users/drivers");
  const [isFleetMenuOpen, setIsFleetMenuOpen] = useState(isFleetRouteActive);

  const isOrdersRouteActive = pathname.startsWith("/admin/orders");
  const [isOrdersMenuOpen, setIsOrdersMenuOpen] = useState(isOrdersRouteActive);

  const isFinanceRouteActive = pathname.startsWith("/admin/finance");
  const [isFinanceMenuOpen, setIsFinanceMenuOpen] = useState(isFinanceRouteActive);

  const isSupportRouteActive = pathname.startsWith("/admin/support");
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(isSupportRouteActive);

  useEffect(() => {
    if (isUsersRouteActive && isExpanded) setIsUsersMenuOpen(true);
    if (isFleetRouteActive && isExpanded) setIsFleetMenuOpen(true);
    if (isOrdersRouteActive && isExpanded) setIsOrdersMenuOpen(true);
    if (isFinanceRouteActive && isExpanded) setIsFinanceMenuOpen(true);
    if (isSupportRouteActive && isExpanded) setIsSupportMenuOpen(true);
  }, [isUsersRouteActive, isFleetRouteActive, isOrdersRouteActive, isFinanceRouteActive, isSupportRouteActive, isExpanded]);

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin/login");
    } catch (error) {
      console.error("Gagal logout admin:", error);
    }
  };

  const getRoleBadgeLabel = (role: Role | string) => {
    if (role === "superadmin") return "Super Admin";
    if (role === "admin_finance") return "Finance";
    if (role === "admin_operational") return "Operational";
    if (role === "staff") return "Staff CS";
    return "Secure Node";
  };

  if (!allowedRoles.includes(currentRole as Role)) return null;

  return (
    <>
      {isExpanded && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsExpanded(false)} 
        />
      )}

      <aside 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => {
          setIsExpanded(false);
          if (!isUsersRouteActive) setIsUsersMenuOpen(false); 
          if (!isFleetRouteActive) setIsFleetMenuOpen(false);
          if (!isOrdersRouteActive) setIsOrdersMenuOpen(false);
          if (!isFinanceRouteActive) setIsFinanceMenuOpen(false);
          if (!isSupportRouteActive) setIsSupportMenuOpen(false);
        }}
        className={cn(
          "fixed top-0 left-0 h-screen bg-white border-r border-slate-200 shadow-sm shrink-0 py-6 flex flex-col justify-between transition-all duration-300 z-50 overflow-y-auto overflow-x-hidden no-scrollbar",
          isExpanded ? "w-72 px-5 shadow-2xl shadow-slate-200/50" : "w-20 px-3 hidden md:flex" 
        )}
      >
        <div className="space-y-8">
          
          {/* Header Brand */}
          <div className={cn("flex flex-col px-2 transition-all duration-300", isExpanded ? "items-start" : "items-center")}>
            <div className={cn("relative transition-all duration-300 ease-in-out", isExpanded ? "w-[180px] h-[40px] mb-2" : "w-[40px] h-[40px]")}>
              <Image 
                src="/logo.png" 
                alt="Flash Globals Logistik" 
                fill
                priority
                className={cn("object-contain transition-all duration-300", isExpanded ? "object-left" : "object-left overflow-hidden object-cover rounded-md")}
              />
            </div>
            
            <div className={cn("transition-all duration-300 overflow-hidden whitespace-nowrap", isExpanded ? "opacity-100 h-auto mt-1" : "opacity-0 h-0 hidden")}>
              <span className="text-[10px] text-[#7A171D] font-bold flex items-center gap-1 px-2 py-0.5 bg-red-50 rounded-full w-max border border-red-100">
                <ShieldCheck className="w-3 h-3" /> {getRoleBadgeLabel(currentRole)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 w-full">
            
            {isExpanded && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-4 transition-opacity">Main Dashboard</p>}
            <SidebarButton icon={LayoutDashboard} label="Dashboard" href="/admin" isActive={pathname === "/admin"} isExpanded={isExpanded} />

            {/* ==================================================== */}
            {/* KATEGORI 1: MANAJEMEN PENGGUNA (HANYA CLIENT B2C & B2B) */}
            {/* ==================================================== */}
            {isExpanded && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-6 transition-opacity">Customer & Security</p>}
            {(currentRole === "superadmin" || currentRole === "admin_operational" || currentRole === "staff") && (
              <div className="flex flex-col">
                <button 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsUsersMenuOpen(!isUsersMenuOpen);
                  }}
                  className={cn(
                    "flex items-center py-3 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none",
                    isExpanded ? "px-4" : "justify-center px-0",
                    isUsersRouteActive 
                      ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#7A171D]"
                  )}
                >
                  <Users className={cn("w-5 h-5 shrink-0 transition-colors", isUsersRouteActive ? "text-white" : "text-slate-400 group-hover:text-[#7A171D]")} /> 
                  <span className={cn("transition-all duration-300 whitespace-nowrap flex-1", isExpanded ? "ml-3 opacity-100" : "opacity-0 w-0 hidden")}>Data Pelanggan</span>
                  {isExpanded && <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isUsersMenuOpen ? "rotate-180" : "", isUsersRouteActive ? "text-white/70" : "text-slate-400")} />}
                </button>

                <div className={cn("overflow-hidden transition-all duration-300 flex flex-col gap-1", isExpanded && isUsersMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0")}>
                  <SubMenuButton href="/admin/users/b2c" label="Klien Personal (B2C)" icon={User} isActive={pathname.includes("/users/b2c")} />
                  <SubMenuButton href="/admin/users/b2b" label="Klien Korporat (B2B)" icon={Building2} isActive={pathname.includes("/users/b2b")} />
                  {currentRole === "superadmin" && (
                    <SubMenuButton href="/admin/users/staff" label="Manajemen Staf" icon={UserCog} isActive={pathname.includes("/users/staff")} />
                  )}
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* KATEGORI BARU 2: FLEET & DRIVER MANAGEMENT */}
            {/* ==================================================== */}
            {isExpanded && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-6 transition-opacity">Mitra & Fleet</p>}
            {(currentRole === "superadmin" || currentRole === "admin_operational") && (
              <div className="flex flex-col">
                <button 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsFleetMenuOpen(!isFleetMenuOpen);
                  }}
                  className={cn(
                    "flex items-center py-3 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none",
                    isExpanded ? "px-4" : "justify-center px-0",
                    isFleetRouteActive 
                      ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#7A171D]"
                  )}
                >
                  <Users2 className={cn("w-5 h-5 shrink-0 transition-colors", isFleetRouteActive ? "text-white" : "text-slate-400 group-hover:text-[#7A171D]")} /> 
                  <span className={cn("transition-all duration-300 whitespace-nowrap flex-1", isExpanded ? "ml-3 opacity-100" : "opacity-0 w-0 hidden")}>Mitra Pengemudi</span>
                  {isExpanded && <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isFleetMenuOpen ? "rotate-180" : "", isFleetRouteActive ? "text-white/70" : "text-slate-400")} />}
                </button>

                <div className={cn("overflow-hidden transition-all duration-300 flex flex-col gap-1", isExpanded && isFleetMenuOpen ? "max-h-96 mt-1.5 opacity-100" : "max-h-0 opacity-0")}>
                  {/* Menu Utama FMS / Pusat Verifikasi */}
                  <SubMenuButton href="/admin/users/drivers" label="Pusat Verifikasi (Dashboard)" icon={ShieldCheck} isActive={pathname === "/admin/users/drivers"} />
                  {/* Pemisahan Entitas Sesuai Refactoring */}
                  <SubMenuButton href="/admin/users/drivers/individual" label="Mitra Individu" icon={User} isActive={pathname.includes("/users/drivers/individual")} />
                  <SubMenuButton href="/admin/users/drivers/vendor" label="Vendor (PT/CV)" icon={Building2} isActive={pathname.includes("/users/drivers/vendor")} />
                  <SubMenuButton href="/admin/users/drivers/fleet-drivers" label="Sopir Vendor" icon={UserSquare2} isActive={pathname.includes("/users/drivers/fleet-drivers")} />
                  <SubMenuButton href="/admin/users/drivers/fleet-vehicles" label="Armada Truk" icon={Truck} isActive={pathname.includes("/users/drivers/fleet-vehicles")} />
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* SISA MENU (DISPATCH, FINANCE, MASTER DATA, SUPPORT) */}
            {/* ==================================================== */}
            {isExpanded && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-6 transition-opacity">Dispatch & Finance</p>}
            
            {(currentRole === "superadmin" || currentRole === "admin_operational") && (
              <div className="flex flex-col">
                <button 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsOrdersMenuOpen(!isOrdersMenuOpen);
                  }}
                  className={cn(
                    "flex items-center py-3 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none",
                    isExpanded ? "px-4" : "justify-center px-0",
                    isOrdersRouteActive 
                      ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#7A171D]"
                  )}
                >
                  <Send className={cn("w-5 h-5 shrink-0 transition-colors", isOrdersRouteActive ? "text-white" : "text-slate-400 group-hover:text-[#7A171D]")} /> 
                  <span className={cn("transition-all duration-300 whitespace-nowrap flex-1", isExpanded ? "ml-3 opacity-100" : "opacity-0 w-0 hidden")}>Dispatch & Orders</span>
                  {isExpanded && <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isOrdersMenuOpen ? "rotate-180" : "", isOrdersRouteActive ? "text-white/70" : "text-slate-400")} />}
                </button>
                <div className={cn("overflow-hidden transition-all duration-300 flex flex-col gap-1", isExpanded && isOrdersMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0")}>
                  <SubMenuButton href="/admin/orders/domestic" label="Order Domestik" icon={Package} isActive={pathname.includes("/orders/domestic")} />
                  <SubMenuButton href="/admin/orders/global" label="Global Forwarding" icon={Globe} isActive={pathname.includes("/orders/global")} />
                  <SubMenuButton href="/admin/orders/radar" label="Radar Satelit" icon={Map} isActive={pathname.includes("/orders/radar")} />
                </div>
              </div>
            )}

            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <div className="flex flex-col">
                <button 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsFinanceMenuOpen(!isFinanceMenuOpen);
                  }}
                  className={cn(
                    "flex items-center py-3 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none",
                    isExpanded ? "px-4" : "justify-center px-0",
                    isFinanceRouteActive 
                      ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#7A171D]"
                  )}
                >
                  <Banknote className={cn("w-5 h-5 shrink-0 transition-colors", isFinanceRouteActive ? "text-white" : "text-slate-400 group-hover:text-[#7A171D]")} /> 
                  <span className={cn("transition-all duration-300 whitespace-nowrap flex-1", isExpanded ? "ml-3 opacity-100" : "opacity-0 w-0 hidden")}>Keuangan & Tagihan</span>
                  {isExpanded && <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isFinanceMenuOpen ? "rotate-180" : "", isFinanceRouteActive ? "text-white/70" : "text-slate-400")} />}
                </button>
                <div className={cn("overflow-hidden transition-all duration-300 flex flex-col gap-1", isExpanded && isFinanceMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0")}>
                  <SubMenuButton href="/admin/finance/verification" label="Verifikasi Manual" icon={Receipt} isActive={pathname.includes("/finance/verification")} />
                  <SubMenuButton href="/admin/finance/receivables" label="Piutang B2B (Net)" icon={Building2} isActive={pathname.includes("/finance/receivables")} />
                  <SubMenuButton href="/admin/finance/reports" label="Laporan Pembukuan" icon={FileSpreadsheet} isActive={pathname.includes("/finance/reports")} />
                </div>
              </div>
            )}

            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={WalletCards} label="Kas & Dompet Sopir" href="/admin/wallet" isActive={pathname === "/admin/wallet"} isExpanded={isExpanded} />
            )}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={CreditCard} label="Metode Pembayaran" href="/admin/payments" isActive={pathname === "/admin/payments"} isExpanded={isExpanded} />
            )}
            
            {isExpanded && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-6 transition-opacity">Master Data</p>}
            {(currentRole === "superadmin" || currentRole === "admin_operational") && (
              <SidebarButton icon={Truck} label="Data Armada" href="/admin/vehicles" isActive={pathname === "/admin/vehicles"} isExpanded={isExpanded} />
            )}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={Coins} label="Konfigurasi Tarif" href="/admin/pricing" isActive={pathname === "/admin/pricing"} isExpanded={isExpanded} />
            )}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={Ticket} label="Promo & Voucher" href="/admin/promo" isActive={pathname === "/admin/promo"} isExpanded={isExpanded} />
            )}

            {isExpanded && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-6 transition-opacity">Support</p>}
            {(currentRole === "superadmin" || currentRole === "admin_operational" || currentRole === "staff") && (
              <div className="flex flex-col">
                <button 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsSupportMenuOpen(!isSupportMenuOpen);
                  }}
                  className={cn(
                    "flex items-center py-3 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none",
                    isExpanded ? "px-4" : "justify-center px-0",
                    isSupportRouteActive 
                      ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#7A171D]"
                  )}
                >
                  <LifeBuoy className={cn("w-5 h-5 shrink-0 transition-colors", isSupportRouteActive ? "text-white" : "text-slate-400 group-hover:text-[#7A171D]")} /> 
                  <span className={cn("transition-all duration-300 whitespace-nowrap flex-1", isExpanded ? "ml-3 opacity-100" : "opacity-0 w-0 hidden")}>Pusat Bantuan</span>
                  {isExpanded && <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isSupportMenuOpen ? "rotate-180" : "", isSupportRouteActive ? "text-white/70" : "text-slate-400")} />}
                </button>
                <div className={cn("overflow-hidden transition-all duration-300 flex flex-col gap-1", isExpanded && isSupportMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0")}>
                  <SubMenuButton href="/admin/support/tickets" label="Tiket Bantuan CS" icon={MessageSquare} isActive={pathname.includes("/support/tickets")} />
                  <SubMenuButton href="/admin/support/claims" label="Klaim Asuransi" icon={FileWarning} isActive={pathname.includes("/support/claims")} />
                  {currentRole === "superadmin" && (
                    <SubMenuButton href="/admin/support/audit" label="Audit Trail" icon={History} isActive={pathname.includes("/support/audit")} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 mt-8 w-full px-2">
          <button 
            onClick={handleAdminLogout}
            className={`w-full flex items-center ${isExpanded ? 'px-4' : 'justify-center'} py-3.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all text-left overflow-hidden group outline-none`}
            title="Keluar dari Engine"
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
            <span className={cn("transition-all duration-300 ml-3 whitespace-nowrap", isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>Keluar Session</span>
          </button>
        </div>
      </aside>

      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="md:hidden fixed bottom-6 right-6 z-50 bg-[#7A171D] text-white p-4 rounded-full shadow-xl shadow-[#7A171D]/40 active:scale-95 transition-transform"
      >
        <Package className="w-6 h-6" />
      </button>
    </>
  );
}

function SidebarButton({ icon: Icon, label, isActive, href, isExpanded }: SidebarButtonProps) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center py-3.5 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none",
        isExpanded ? "px-4" : "justify-center px-0",
        isActive 
          ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" 
          : "text-slate-600 hover:bg-slate-50 hover:text-[#7A171D]"
      )}
      title={label}
    >
      <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-[#7A171D]")} /> 
      <span className={cn("transition-all duration-300 whitespace-nowrap", isExpanded ? "ml-3 opacity-100 w-auto" : "opacity-0 w-0 hidden")}>{label}</span>
    </Link>
  );
}

function SubMenuButton({ href, label, isActive, icon: Icon }: { href: string; label: string; isActive: boolean; icon: React.ElementType }) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 py-2.5 px-4 ml-4 rounded-lg text-xs font-bold transition-all outline-none border border-transparent",
        isActive 
          ? "bg-red-50 text-[#7A171D] border-red-100" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[#7A171D]" : "text-slate-400")} />
      {label}
    </Link>
  );
}