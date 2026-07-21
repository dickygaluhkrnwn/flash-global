"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightNode?: React.ReactNode;
}

export default function Header({ title, showBack = false, rightNode }: HeaderProps) {
  const router = useRouter();

  return (
    // Sticky header dengan efek glassmorphism premium
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button 
            onClick={() => router.back()} 
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="text-lg font-bold text-slate-800">{title}</h1>
      </div>

      {/* Area Kanan: Custom Node atau Default Notifikasi */}
      <div>
        {rightNode || (
          <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600 relative transition-colors">
            <Bell size={20} />
            {/* Indikator notifikasi warna brand-maroon */}
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#7A171D] rounded-full ring-2 ring-white"></span>
          </button>
        )}
      </div>
    </header>
  );
}