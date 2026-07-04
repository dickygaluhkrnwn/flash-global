import type { Metadata } from "next";
import { Inter } from "next/font/google";
// PERBAIKAN: Gunakan relative path khusus untuk file CSS global
import "./globals.css"; 
import AuthProvider from "@/components/AuthProvider";

// Inisialisasi font bawaan Next.js
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portal Flash Global",
  description: "Solusi Logistik Domestik & Global",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {/* Bungkus seluruh aplikasi dengan provider otentikasi global */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}