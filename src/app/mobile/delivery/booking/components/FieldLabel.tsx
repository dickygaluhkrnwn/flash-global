import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export const FieldLabel = ({ 
  label, 
  infoTitle, 
  infoText, 
  onInfoClick,
  className
}: { 
  label: string; 
  infoTitle?: string; 
  infoText?: string; 
  onInfoClick?: (t: string, text: string) => void;
  className?: string;
}) => (
  <div className={cn("flex items-center justify-between px-1 mb-2", className)}>
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
    {infoTitle && onInfoClick && infoText && (
      <button 
        type="button" 
        onClick={() => onInfoClick(infoTitle, infoText)} 
        className="text-slate-400 active:text-[#7A171D] transition-all bg-slate-100/50 active:bg-slate-200 p-1.5 rounded-full shadow-sm border border-transparent tap-highlight-transparent active:scale-90" 
        title={`Informasi ${label}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);