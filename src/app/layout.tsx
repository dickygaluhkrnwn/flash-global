import type { Metadata } from "next";
// @ts-ignore
import "./globals.css";

export const metadata: Metadata = {
  title: "Flash Global | Ekspedisi & Forwarder Internasional",
  description: "Portal resmi Flash Global. Solusi pengiriman kargo dan paket ke luar negeri dengan cepat, aman, dan terpercaya.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}