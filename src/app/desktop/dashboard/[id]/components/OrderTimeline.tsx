import { Truck, MapPin, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

// Interface spesifik tetap dipertahankan
export interface TimelineItem {
  isCurrent?: boolean;
  status: string;
  date: string;
  description: string;
  location?: string;
}

export default function OrderTimeline({ timelineData, orderStatus }: { timelineData: TimelineItem[], orderStatus: string }) {
  return (
    <div className="glass-card rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden">
      {/* Background Watermark & Glow */}
      <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none"><MapPinned className="w-48 h-48" /></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-48 h-48 bg-[#7A171D] rounded-full blur-[100px] opacity-10 pointer-events-none z-0"></div>
      
      <h3 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-2 relative z-10">
        <Truck className="w-4 h-4 text-[#7A171D]" /> Riwayat Manifes
      </h3>
      
      <div className="relative pl-3 md:pl-4 z-10">
        {/* Garis vertikal dengan gradasi fading */}
        <div className="absolute top-4 bottom-8 left-[17px] md:left-[21px] w-0.5 bg-gradient-to-b from-slate-300 via-slate-200 to-transparent"></div>
        
        <div className="space-y-8 relative">
          {timelineData.map((item, idx) => {
            const isCancelled = orderStatus.includes("Batal");
            const isDone = orderStatus.includes("Selesai");
            
            // Logika styling titik timeline (Pill modern, bukan sekadar bulat)
            const activeDotClass = isCancelled 
                ? "bg-red-500 border-white ring-4 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-125" 
                : isDone
                ? "bg-emerald-500 border-white ring-4 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-125"
                : "bg-[#7A171D] border-white ring-4 ring-[#7A171D]/20 shadow-[0_0_15px_rgba(122,23,29,0.5)] scale-125";
            
            const inactiveDotClass = "bg-white border-slate-300 ring-2 ring-slate-100 shadow-sm";

            return (
              <div key={idx} className="flex gap-5 md:gap-6 items-start group">
                <div className={cn(
                  "w-3 h-3 rounded-full mt-1.5 shrink-0 z-10 border-2 transition-all duration-500",
                  item.isCurrent ? activeDotClass : inactiveDotClass
                )} />
                
                <div className={cn("flex-1", item.isCurrent ? "opacity-100" : "opacity-60 group-hover:opacity-100 transition-opacity")}>
                  <h4 className={cn(
                    "text-base tracking-tight font-black mb-1", 
                    item.isCurrent ? (isCancelled ? "text-red-600" : isDone ? "text-emerald-600" : "text-slate-900") : "text-slate-700"
                  )}>
                    {item.status}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">{item.date}</p>
                  
                  <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm inline-block min-w-full md:min-w-[80%]">
                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">{item.description}</p>
                    
                    {item.location && (
                      <div className="mt-3 pt-3 border-t border-slate-100/80 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-[#7A171D]/70"/> {item.location}
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