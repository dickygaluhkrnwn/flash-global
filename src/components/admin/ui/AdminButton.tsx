import * as React from "react";
import { cn } from "@/lib/utils";

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "gold" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    
    // Base style dengan active:scale-[0.97] untuk efek klik empuk (bouncy)
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.97] relative overflow-hidden";
    
    // ✨ 3D Neumorphism & Glassmorphism Variants
    const variants = {
      primary: "bg-gradient-to-br from-[#9A242B] to-[#7A171D] text-white border border-[#5A0E13] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(122,23,29,0.3)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_10px_20px_rgba(122,23,29,0.4)] focus-visible:ring-[#7A171D]/50 hover:brightness-110",
      secondary: "bg-gradient-to-br from-slate-700 to-slate-900 text-white border border-slate-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_16px_rgba(15,23,42,0.3)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_10px_20px_rgba(15,23,42,0.4)] focus-visible:ring-slate-900/50 hover:brightness-110",
      gold: "bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] text-white border border-[#A68345] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_16px_rgba(197,160,89,0.3)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_10px_20px_rgba(197,160,89,0.4)] focus-visible:ring-[#C5A059]/50 hover:brightness-110",
      danger: "bg-gradient-to-br from-red-500 to-red-700 text-white border border-red-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(239,68,68,0.3)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_10px_20px_rgba(239,68,68,0.4)] focus-visible:ring-red-500/50 hover:brightness-110",
      success: "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border border-emerald-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(16,185,129,0.3)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_10px_20px_rgba(16,185,129,0.4)] focus-visible:ring-emerald-500/50 hover:brightness-110",
      outline: "bg-white/40 backdrop-blur-md border border-white/60 text-slate-700 shadow-sm hover:bg-white/70 hover:text-[#7A171D] hover:border-white focus-visible:ring-[#7A171D]/50 saturate-[150%]",
      ghost: "bg-transparent text-slate-600 hover:bg-white/40 hover:backdrop-blur-md hover:shadow-sm hover:text-slate-900 focus-visible:ring-slate-200",
    };

    const sizes = {
      sm: "h-9 px-4 text-xs",
      md: "h-11 px-5 text-sm",
      lg: "h-12 px-8 text-base",
      icon: "h-11 w-11",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
AdminButton.displayName = "AdminButton";
 
export { AdminButton };