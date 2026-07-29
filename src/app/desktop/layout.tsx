import Navbar from "@/components/desktop/Navbar";

export default function DesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) { 
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-[#7A171D]/15 selection:text-[#7A171D] relative overflow-x-hidden font-sans z-0">
      
      {/* --- AMBIENT GLOWING BACKGROUND (APPLE GLASS VIBE) --- */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        {/* Glow Merah di Kiri Atas */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-200/40 blur-[120px]" />
        {/* Glow Emas di Kanan Bawah */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[50%] rounded-full bg-amber-100/50 blur-[120px]" />
        {/* Glow Biru Soft di Tengah (Aksen) */}
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-blue-100/30 blur-[100px]" />
      </div>

      {/* Navbar persisten dengan efek Floating Pill */}
      <Navbar />
      
      {/* Konten Halaman */}
      {/* Margin top diperbesar untuk memberi nafas pada Floating Navbar */}
      <div className="flex-grow flex flex-col mt-[100px]"> 
        {children}
      </div>
    </div>
  );
}