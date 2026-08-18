import * as React from "react";
import { cn } from "@/lib/utils";

const AdminCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "bento-card flex flex-col transition-all duration-300", 
      // ✨ PERBAIKAN: Kaca lebih "Susu", Border lebih putih, Shadow lebih nge-pop
      "bg-white/70 backdrop-blur-[40px] saturate-[180%]",
      "border border-white",
      "shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)]",
      "hover:bg-white/80 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_12px_40px_rgba(0,0,0,0.12)]",
      className
    )} 
    {...props} 
  />
));
AdminCard.displayName = "AdminCard";

const AdminCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)} {...props} />
));
AdminCardHeader.displayName = "AdminCardHeader";

const AdminCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-lg font-black leading-none tracking-tight text-[var(--admin-fg)]", className)} {...props} />
));
AdminCardTitle.displayName = "AdminCardTitle";

const AdminCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-[var(--admin-fg-muted)] font-medium leading-relaxed", className)} {...props} />
));
AdminCardDescription.displayName = "AdminCardDescription";

const AdminCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0 flex-1", className)} {...props} />
));
AdminCardContent.displayName = "AdminCardContent";

const AdminCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0 mt-auto", className)} {...props} />
));
AdminCardFooter.displayName = "AdminCardFooter";

export { AdminCard, AdminCardHeader, AdminCardTitle, AdminCardDescription, AdminCardContent, AdminCardFooter }; 