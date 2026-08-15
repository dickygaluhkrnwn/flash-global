"use client";

import Link from "next/link";
import { 
  Mail, 
  MapPin, 
  Phone,
  ArrowRight,
  Sparkles
} from "lucide-react";

// ==========================================
// CUSTOM SVG ICONS UNTUK SOCIAL MEDIA
// ==========================================
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
);
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);

// ==========================================
// DATA STRUKTUR FOOTER
// ==========================================
const FOOTER_LINKS = {
  solutions: [
    { label: "Personal & Retail", href: "/solutions/personal" },
    { label: "Enterprise (B2B)", href: "/solutions/enterprise" },
    { label: "E-Commerce Logistics", href: "/solutions/ecommerce" },
    { label: "Global Forwarding", href: "/solutions/enterprise#forwarding" },
  ],
  partners: [
    { label: "Jadi Driver (Mitra)", href: "/partners/driver" },
    { label: "Manajemen Fleet/Vendor", href: "/partners/fleet-vendor" },
    { label: "Integrasi API", href: "/developer-api" },
  ],
  features: [
    { label: "Live Tracking & e-POD", href: "/features/live-tracking" },
    { label: "Flash Wallet (DANA API)", href: "/features/flash-wallet" },
    { label: "Smart Radar Bidding", href: "/partners/driver#radar" },
    { label: "Klaim Asuransi Cepat", href: "/features/protection" },
  ],
  company: [
    { label: "Tentang Kami", href: "/about" },
    { label: "Karir", href: "/careers" },
    { label: "Blog & Berita", href: "/blog" },
    { label: "Pusat Bantuan", href: "/help-center" },
    { label: "Hubungi Kami", href: "/contact" },
  ],
  legal: [
    { label: "Syarat & Ketentuan", href: "/legal/terms" },
    { label: "Kebijakan Privasi", href: "/legal/privacy" },
    { label: "Kebijakan Refund", href: "/legal/refunds" },
  ]
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full bg-[#f8fafc] overflow-hidden pt-24 pb-8 font-sans">
      
      {/* 
        EFEK GLOW BLOB DI BACKGROUND FOOTER
        100% Light Mode dengan warna segar
      */}
      <div className="absolute bottom-0 left-[-10%] w-[50vw] h-[50vh] bg-blue-100/50 rounded-full mix-blend-multiply filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-rose-100/40 rounded-full mix-blend-multiply filter blur-[120px] pointer-events-none" />

      <div className="relative max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ==========================================
            THE GLASS PEDESTAL (Wadah Utama)
            ========================================== */}
        <div className="bg-white/60 backdrop-blur-3xl border border-white rounded-[3rem] sm:rounded-[4rem] p-8 sm:p-16 shadow-[0_30px_100px_rgba(0,0,0,0.04)]">
          
          {/* ==========================================
              BAGIAN ATAS: CTA & NEWSLETTER (The Floating Pill)
              ========================================== */}
          <div className="bg-gradient-to-r from-blue-50/50 via-white to-rose-50/50 rounded-[2.5rem] border border-white p-8 sm:p-12 mb-16 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-sm border border-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest mb-4">
                <Sparkles className="w-3 h-3 text-brand-maroon" /> Akses Global
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
                Siap Mengoptimalkan Logistik Anda?
              </h2>
              <p className="text-slate-500 font-medium max-w-lg">
                Bergabung dengan ribuan perusahaan dan mitra driver yang telah beralih ke pusat kendali logistik generasi berikutnya.
              </p>
            </div>
            
            <div className="w-full sm:w-auto flex-shrink-0">
              {/* 🚀 REVISI URL: Mengarah ke pintu Tuan Rumah (/login) */}
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-10 py-5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-brand-maroon transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(15,23,42,0.15)] hover:shadow-[0_10px_40px_rgba(122,23,29,0.3)] group"
              >
                Mulai Sekarang Gratis <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* ==========================================
              BAGIAN TENGAH: SITEMAP LINKS
              ========================================== */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-8 gap-y-12 mb-16">
            
            {/* Kolom 1 & 2: Identitas Brand & Kontak */}
            <div className="col-span-2 lg:col-span-2 pr-4 sm:pr-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-maroon to-brand-gold flex items-center justify-center shadow-lg border border-white/20">
                  <span className="text-white font-heading font-black text-2xl">F</span>
                </div>
                <span className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
                  Flash Global
                </span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                Platform logistik cerdas untuk retail dan B2B. Membawa efisiensi, transparansi, dan kecepatan ke dalam rantai pasok Anda dengan teknologi pelacakan satelit presisi.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4 text-sm text-slate-600 font-medium">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100 mt-0.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                  </div>
                  <span>Gedung Logistik Sentral, Jl. Sudirman No. 45<br/>Jakarta Selatan, Indonesia 12190</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 font-medium">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <span>+62 811 1234 5678</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 font-medium">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <span>support@flashglobals.com</span>
                </div>
              </div>
            </div>

            {/* Kolom 3: Solutions */}
            <div>
              <h3 className="font-bold text-slate-900 mb-6">Solutions</h3>
              <ul className="space-y-4">
                {FOOTER_LINKS.solutions.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-slate-500 hover:text-brand-maroon font-medium transition-colors text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kolom 4: Partners & API */}
            <div>
              <h3 className="font-bold text-slate-900 mb-6">Partners</h3>
              <ul className="space-y-4">
                {FOOTER_LINKS.partners.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-slate-500 hover:text-brand-maroon font-medium transition-colors text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kolom 5: Features */}
            <div>
              <h3 className="font-bold text-slate-900 mb-6">Features</h3>
              <ul className="space-y-4">
                {FOOTER_LINKS.features.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-slate-500 hover:text-brand-maroon font-medium transition-colors text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kolom 6: Company */}
            <div>
              <h3 className="font-bold text-slate-900 mb-6">Company</h3>
              <ul className="space-y-4">
                {FOOTER_LINKS.company.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-slate-500 hover:text-brand-maroon font-medium transition-colors text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* ==========================================
              BAGIAN BAWAH: LEGAL & SOCIAL MEDIA
              ========================================== */}
          <div className="pt-8 border-t border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-slate-500 font-medium">
              <span>&copy; {currentYear} Flash Globals Logistik.</span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <div className="flex flex-wrap justify-center gap-4">
                {FOOTER_LINKS.legal.map((link) => (
                  <Link key={link.href} href={link.href} className="hover:text-slate-900 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300">
                <FacebookIcon className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300">
                <TwitterIcon className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-brand-maroon hover:text-white hover:border-brand-maroon transition-all duration-300">
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-[#0077b5] hover:text-white hover:border-[#0077b5] transition-all duration-300">
                <LinkedinIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}