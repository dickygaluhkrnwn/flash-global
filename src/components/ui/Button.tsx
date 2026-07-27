import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "gold" | "danger" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    
    // Rombakan Base Style: scale lebih kerasa, font lebih modern
    const baseStyles = "relative inline-flex items-center justify-center whitespace-nowrap rounded-2xl font-bold tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.95] overflow-hidden";
    
    // Varian Desain Tombol (Apple / Vercel Vibe)
    const variants = {
      // Primary dengan Inner Shadow putih di atas, Gradasi maroon
      primary: "bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white hover:from-[#A82B33] hover:to-[#8B1A21] focus-visible:ring-[#7A171D]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_10px_rgba(122,23,29,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_6px_15px_rgba(122,23,29,0.3)] border border-[#5A0E13]",
      
      // Secondary dark slate
      secondary: "bg-gradient-to-b from-slate-800 to-slate-900 text-white hover:from-slate-700 hover:to-slate-800 focus-visible:ring-slate-900/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_10px_rgba(15,23,42,0.2)] border border-slate-950",
      
      // Gold aksen
      gold: "bg-gradient-to-b from-[#DFBE7B] to-[#C5A059] text-white hover:from-[#EAD098] hover:to-[#D2B270] focus-visible:ring-[#C5A059]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_10px_rgba(197,160,89,0.2)] border border-[#A68345]",
      
      // Danger merah
      danger: "bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 focus-visible:ring-red-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_10px_rgba(239,68,68,0.2)] border border-red-700",
      
      // Outline transparan yang elegan
      outline: "border-2 border-slate-200 bg-white/50 backdrop-blur-sm hover:border-[#7A171D] hover:bg-[#7A171D]/5 text-slate-700 hover:text-[#7A171D] focus-visible:ring-[#7A171D]/20 shadow-sm",
      
      // Ghost button (menu, tabs)
      ghost: "bg-transparent text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 focus-visible:ring-slate-200",
      
      // BARU: Glass button untuk overlay di atas peta atau banner
      glass: "glass-card text-slate-800 hover:bg-white hover:text-[#7A171D]"
    };

    // Ukuran Tombol
    const sizes = {
      sm: "h-9 px-5 text-xs rounded-xl",
      md: "h-12 px-6 text-sm",
      lg: "h-14 px-8 text-base rounded-[1.25rem]",
      icon: "h-12 w-12",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {/* Shine effect tambahan khusus untuk varian dengan background gradient */}
        {(variant === 'primary' || variant === 'gold' || variant === 'secondary' || variant === 'danger') && (
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
        )}

        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current relative z-10" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };