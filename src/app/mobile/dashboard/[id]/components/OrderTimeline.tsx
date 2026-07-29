import { Truck, MapPin, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  isCurrent?: boolean;
  status: string;
  date: string;
  description: string;
  location?: string;
}

export default function OrderTimeline({ timelineData, orderStatus }: { timelineData: TimelineItem[], orderStatus: string }) {
  return (
    <div className="glass-card rounded-[2rem] p-5 relative overflow-hidden">
      {/* Background Watermark */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none"><MapPinned className="w-32 h-32" /></div>
      
      <h3 className="text-xs font-black text-slate-900 mb-6 flex items-center gap-2 relative z-10">
        <Truck className="w-4 h-4 text-[#7A171D]" /> Riwayat Perjalanan
      </h3>
      
      <div className="relative pl-2.5 z-10">
        {/* Garis vertikal timeline */}
        <div className="absolute top-3 bottom-6 left-[15px] w-[2px] bg-gradient-to-b from-slate-300 via-slate-200 to-transparent rounded-full"></div>
        
        <div className="space-y-6 relative">
          {timelineData.map((item, idx) => {
            const isCancelled = orderStatus.includes("Batal");
            const isDone = orderStatus.includes("Selesai");
            
            const activeDotClass = isCancelled 
                ? "bg-red-500 border-white ring-[3px] ring-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.5)] scale-110" 
                : isDone
                ? "bg-emerald-500 border-white ring-[3px] ring-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.5)] scale-110"
                : "bg-[#7A171D] border-white ring-[3px] ring-[#7A171D]/20 shadow-[0_0_10px_rgba(122,23,29,0.5)] scale-110";
            
            const inactiveDotClass = "bg-white border-slate-300 ring-2 ring-slate-100 shadow-sm";

            return (
              <div key={idx} className="flex gap-4 items-start group">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full mt-1 shrink-0 z-10 border-2 transition-all duration-500",
                  item.isCurrent ? activeDotClass : inactiveDotClass
                )} />
                
                <div className={cn("flex-1 min-w-0", item.isCurrent ? "opacity-100" : "opacity-60")}>
                  <h4 className={cn(
                    "text-sm tracking-tight font-black mb-0.5 truncate", 
                    item.isCurrent ? (isCancelled ? "text-red-600" : isDone ? "text-emerald-600" : "text-slate-900") : "text-slate-700"
                  )}>
                    {item.status}
                  </h4>
                  <p className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-widest">{item.date}</p>
                  
                  <div className="bg-white/60 backdrop-blur-sm p-3.5 rounded-[1.25rem] border border-slate-100 shadow-sm inline-block w-full">
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">{item.description}</p>
                    
                    {item.location && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 w-full truncate">
                        <MapPin className="w-3 h-3 text-[#7A171D]/70 shrink-0"/> <span className="truncate">{item.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}