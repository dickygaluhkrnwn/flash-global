import type { Metadata } from "next";
import localFont from "next/font/local";
// PERBAIKAN: Gunakan relative path khusus untuk file CSS global
import "./globals.css"; 
import AuthProvider from "@/components/AuthProvider";

// Inisialisasi font lokal Geist Sans
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

// Inisialisasi font lokal Geist Mono (untuk resi, kode, angka harga)
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Metadata Premium
export const metadata: Metadata = {
  title: "Flash Global | Solusi Logistik Premium",
  description: "Platform logistik dan ekspedisi pengiriman domestik & global.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      {/* Inject variabel font ke body, gunakan geistSans sebagai default font, 
        serta tambahkan antialiased agar teks dan ikon super tajam 
      */}
      <body className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}>
        {/* Bungkus seluruh aplikasi dengan provider otentikasi global */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}