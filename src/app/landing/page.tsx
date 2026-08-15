import HeroSection from "@/components/landing/home/HeroSection";
import BentoEcosystem from "@/components/landing/home/BentoEcosystem";
import CTASection from "@/components/landing/home/CTASection";

export default function LandingHomePage() {
  return (
    <div className="relative min-h-screen w-full">
      {/* ==========================================
          BACKGROUND AMBIENT & GRID PATTERN
          Memberikan kesan 'Tech Data Center' yang clean ala Vercel
          ========================================== */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex justify-center">
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,white,transparent_80%)]" />
        
        {/* Top Glow Blob (Maroon) */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-maroon/15 rounded-full filter blur-[120px] mix-blend-multiply" />
        
        {/* Side Glow Blob (Gold) - Memberikan keseimbangan warna */}
        <div className="absolute top-[40%] -right-40 w-[600px] h-[600px] bg-brand-gold/10 rounded-full filter blur-[120px] mix-blend-multiply" />
      </div>

      {/* ==========================================
          MAIN CONTENT SECTIONS
          Komponen-komponen ini akan kita bangun setelah ini
          ========================================== */}
      <div className="relative z-10 flex flex-col gap-24 pb-24">
        {/* 1. Hero Section (Animasi masuk & 4 Pilar) */}
        <HeroSection />

        {/* 2. Bento Ecosystem (Fitur B2B, Multi-drop, Radar, Fleet) */}
        <BentoEcosystem />

        {/* 3. CTA Section (Ajakan bergabung kontras tinggi) */}
        <CTASection />
      </div>
    </div>
  );
}