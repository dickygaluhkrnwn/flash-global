import Navbar from "@/components/desktop/Navbar";

export default function DesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background-alt)] text-[var(--foreground)] selection:bg-brand-maroon selection:text-white relative overflow-x-hidden">
      {/* Navbar kita panggil di sini biar muncul di semua halaman desktop */}
      <Navbar />
      
      {/* Konten halaman (page.tsx) akan di-render di dalam children ini */}
      <div className="flex-grow flex flex-col">
        {children}
      </div>
    </div>
  );
}