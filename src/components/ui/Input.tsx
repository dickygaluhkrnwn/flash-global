import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // 1. Layout & Typography Dasar
          "flex w-full rounded-[1.25rem] px-5 py-3.5 text-sm font-bold transition-all duration-300 outline-none",
          
          // 2. Efek Glassmorphism Default (Menyatu di background putih)
          "bg-white/60 backdrop-blur-md border border-slate-200/80 text-slate-900 shadow-[inset_0_2px_5px_rgba(0,0,0,0.02)]",
          
          // 3. Efek Hover
          "hover:border-slate-300 hover:bg-white/80",
          
          // 4. Efek Focus (BUG FIX: Tidak lagi memaksa bg-white agar aman di form gelap)
          "focus-visible:ring-[3px] focus-visible:ring-[#7A171D]/15 focus-visible:border-[#7A171D]/50 focus-visible:shadow-md",
          
          // 5. Placeholder & Tipe File
          "placeholder:text-slate-400 placeholder:font-medium",
          "file:border-0 file:bg-transparent file:text-sm file:font-bold",
          
          // 6. Disabled State
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100/50",
          
          // 7. Error State
          error 
            ? "border-red-300 bg-red-50/80 text-red-900 placeholder:text-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20" 
            : "",
            
          // 8. Custom Class dari Parent (Akan menimpa class di atas dengan aman)
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };