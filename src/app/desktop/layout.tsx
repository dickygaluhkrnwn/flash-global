import Navbar from "@/components/desktop/Navbar";

export default function DesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navbar kita panggil di sini biar muncul di semua halaman desktop */}
      <Navbar />
      
      {/* Konten halaman (page.tsx) akan di-render di dalam children ini */}
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
}