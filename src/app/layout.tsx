import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter, Bricolage_Grotesque } from "next/font/google"; // 🚀 TAMBAHAN: Import Google Fonts
// PERBAIKAN: Gunakan relative path khusus untuk file CSS global
import "./globals.css"; 
import AuthProvider from "@/components/AuthProvider";
import { Analytics } from "@vercel/analytics/next";

// ==========================================
// INISIALISASI FONT GOOGLE (Untuk Landing Page & UI Modern)
// ==========================================
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  // Bricolage sangat bagus di weight tebal untuk Headline
});

// ==========================================
// INISIALISASI FONT LOKAL (Bawaan Portal Internal)
// ==========================================
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Metadata Premium & Open Graph (Sesuai Creative Brief)
export const metadata: Metadata = {
  metadataBase: new URL("https://flashglobalslogistik.com"),
  title: "Flash Globals Logistik | B2B Logistics & Global Forwarding Portal",
  description: "Platform Pusat Kendali Logistik Premium. Solusi pengiriman B2B, kargo domestik, global forwarding, dan bea cukai terpadu dengan integrasi live tracking satelit.",
  openGraph: {
    title: "Flash Globals Logistik | Kendalikan Distribusi Kargo Anda",
    description: "B2B Logistics & Global Forwarding Portal. Solusi pengiriman kargo enterprise dengan teknologi live tracking tingkat tinggi.",
    url: "https://flashglobalslogistik.com",
    siteName: "Flash Globals Logistik",
    images: [
      {
        url: "/og-image.png", // Akan menarik file public/og-image.png secara otomatis
        width: 1200,
        height: 630,
        alt: "Flash Globals Logistik - Tech Command Center",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flash Globals Logistik | Enterprise Freight",
    description: "Platform Pusat Kendali Logistik Premium untuk pengiriman B2B & Global Forwarding.",
    images: ["/og-image.png"], // Akan menarik file public/og-image.png secara otomatis
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      {/* 
        Inject semua variabel font (Lokal & Google) ke body.
        Gunakan antialiased agar teks dan ikon super tajam ala UI Apple.
      */}
      <body className={`
        ${geistSans.className} 
        ${geistSans.variable} 
        ${geistMono.variable} 
        ${inter.variable} 
        ${bricolage.variable} 
        antialiased bg-[var(--background)] text-[var(--foreground)]
      `}>
        {/* Bungkus seluruh aplikasi dengan provider otentikasi global */}
        <AuthProvider>
          {children}
        </AuthProvider>
        
        {/* Komponen Vercel Analytics berjalan di background */}
        <Analytics />
      </body>
    </html>
  );
}