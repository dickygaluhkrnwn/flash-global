import * as React from "react";
import { cn } from "@/lib/utils";

export interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const AdminInput = React.forwardRef<HTMLInputElement, AdminInputProps>(
  ({ className, type, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center">
        {/* Render Left Icon if exists */}
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center justify-center text-slate-400 pointer-events-none z-10">
            {leftIcon}
          </div>
        )}

        <input
          type={type}
          className={cn(
            // ✨ Base Frosted Glass Styling
            "flex w-full rounded-xl border border-white/60 bg-white/40 backdrop-blur-md py-2.5 text-sm font-medium text-[var(--admin-fg)] transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]",
            "placeholder:text-slate-400 placeholder:font-normal",
            
            // Hover & Focus States (Kaca menjadi lebih terang saat diisi)
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:border-white/80 focus-visible:bg-white/80 hover:bg-white/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            
            // Padding adjustments based on icons
            leftIcon ? "pl-11" : "px-4",
            rightIcon ? "pr-11" : "px-4",
            
            // Error states
            error 
              ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20 bg-red-50/50" 
              : "focus-visible:ring-[var(--admin-primary)]/15",
            className
          )}
          ref={ref}
          {...props}
        />

        {/* Render Right Icon if exists */}
        {rightIcon && (
          <div className="absolute right-3.5 flex items-center justify-center text-slate-400 z-10">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
AdminInput.displayName = "AdminInput";

export { AdminInput }; 