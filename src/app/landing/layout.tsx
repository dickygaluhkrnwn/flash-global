import MegaMenu from "@/components/landing/layout/MegaMenu";
import Footer from "@/components/landing/layout/Footer";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // relative & min-h-screen memastikan footer selalu ada di bawah 
    // meskipun konten halaman sedang kosong/sedikit
    <div className="relative flex flex-col min-h-screen bg-[var(--background)] selection:bg-brand-maroon/20 selection:text-brand-maroon">
      
      {/* 
        1. HEADER / MEGA MENU 
        Fixed di atas, komponen ini akan membawa efek glass-panel
        serta navigasi dropdown raksasa
      */}
      <MegaMenu />

      {/* 
        2. MAIN CONTENT 
        Semua halaman (Homepage, Solutions, Features) akan dirender di sini.
        flex-1 memastikan konten mengambil sisa ruang antara header dan footer.
      */}
      <main className="flex-1 w-full overflow-hidden">
        {children}
      </main>

      {/* 
        3. FOOTER 
        Sitemap raksasa penutup ala startup unicorn
      */}
      <Footer />
      
    </div>
  );
}