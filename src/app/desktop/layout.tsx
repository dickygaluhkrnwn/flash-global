import Navbar from "@/components/desktop/Navbar";

export default function DesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background-alt)] text-[var(--foreground)] selection:bg-[#7A171D] selection:text-white relative overflow-x-hidden font-sans">
      {/* Navbar dipanggil di sini agar persisten di semua rute desktop */}
      <Navbar />
      
      {/* Konten Halaman */}
      <div className="flex-grow flex flex-col mt-[72px]"> {/* mt-[72px] mengimbangi tinggi navbar fixed */}
        {children}
      </div>
    </div>
  );
}