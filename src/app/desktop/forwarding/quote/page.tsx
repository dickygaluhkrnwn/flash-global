"use client";

import { useState, Suspense, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  User, Phone, Mail, Box, 
  Globe2, ShieldCheck, 
  MessageCircle, Info, Maximize, Zap,
  Anchor, Plane
} from "lucide-react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// --- IMPORT UI KIT ---
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// ======================================================================
// DYNAMIC IMPORT SSR: FALSE (FOR INDEPENDENT MAPBOX)
// ======================================================================
const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-[52px] w-full bg-slate-50 rounded-xl border border-slate-200 animate-pulse flex items-center px-4 text-xs font-semibold text-slate-400">Synchronizing global satellites...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// Helper Component for Labels - Didefinisikan dengan Tipe yang Aman
const FieldLabel = ({ label, icon: Icon }: { label: string, icon?: React.ElementType }) => (
  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
    {Icon && <Icon className="w-3.5 h-3.5 text-[#C5A059]" />} {label}
  </label>
);

function QuoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isHydrated } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  // Order Data State (Auto-filled from URL if exists)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    origin: searchParams.get("origin") || "",
    destination: searchParams.get("destination") || "",
    itemType: "",
    weight: searchParams.get("weight") || "",
    length: searchParams.get("l") || "",
    width: searchParams.get("w") || "",
    height: searchParams.get("h") || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSmartMapChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Function to extract Country from Mapbox address (usually after the last comma)
  const extractCountry = (fullAddress: string) => {
    if (!fullAddress) return "-";
    const parts = fullAddress.split(",");
    return parts[parts.length - 1].trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.origin || !formData.destination) {
      setErrorMsg("Origin and destination locations are required.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const quoteId = `FFW-${Date.now().toString().slice(-6)}`;
      
      // Save to Firestore
      await addDoc(collection(db, "quotes"), {
        quoteId,
        userId: user?.uid || "guest",
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        origin: formData.origin,
        originCountry: extractCountry(formData.origin),
        destination: formData.destination,
        destCountry: extractCountry(formData.destination),
        itemType: formData.itemType,
        weight: Number(formData.weight) || 0,
        length: Number(formData.length) || 0,
        width: Number(formData.width) || 0,
        height: Number(formData.height) || 0,
        serviceType: "Global Cargo", 
        status: "Pending CS Quote",
        createdAt: serverTimestamp(),
      });

      // WhatsApp Message Template to Customs/Forwarding CS
      const adminWA = "6281234567890"; 
      const waText = `Hello Flash Global Expert Team, I would like to request a quotation for international forwarding.%0A%0A*🧾 Quotation ID:* ${quoteId}%0A*👤 PIC Name:* ${formData.name}%0A%0A*📌 Routing:*%0A- Origin: ${extractCountry(formData.origin)} (${formData.origin})%0A- Destination: ${extractCountry(formData.destination)} (${formData.destination})%0A%0A*📦 Cargo Specifications:*%0A- Description: ${formData.itemType}%0A- Actual Weight: ${formData.weight} Kg%0A- Dimensions: ${formData.length}x${formData.width}x${formData.height} cm%0A%0APlease assist with the estimated Freight, Duty & Tax (Landed Cost). Thank you.`;
      
      window.open(`https://wa.me/${adminWA}?text=${waText}`, "_blank");
      
      // Redirect to Dashboard
      router.push("/dashboard");

    } catch (error) {
      console.error("Failed to save quote:", error);
      setErrorMsg("Failed to process your request. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full relative z-10 pb-20 font-sans">
      
      {/* GLOBAL CSS INJECTION TO HACK MAPBOX SEARCH BOX UI */}
      <style dangerouslySetInnerHTML={{__html: `
        mapbox-search-listbox {
          z-index: 99999 !important;
          border-radius: 16px !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          border: 1px solid #e2e8f0 !important;
          margin-top: 8px !important;
          background-color: white !important;
          overflow: hidden !important;
          font-family: inherit !important;
        }
        mapbox-search-box {
          --focus-box-shadow: none;
          --border-radius: 12px;
          --box-shadow: none;
        }
      `}} />

      {/* HEADER TITLE */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 mb-8 mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <Badge variant="gold" className="mb-4 shadow-sm inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse"></span>
            Export & Import Services
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Request a Quote <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A059] to-[#A68345]">Global Forwarding</span>
          </h1>
          <p className="text-slate-500 mt-3 text-base max-w-xl font-medium leading-relaxed">
            Complete your cross-border cargo specifications. Our customs experts will calculate the best Landed Cost (Freight, Duty & Tax) for you.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button onClick={() => router.push("/delivery/booking")} variant="outline" className="border-slate-200 h-11 text-xs px-5 text-slate-600 hover:text-[#7A171D] hover:border-[#7A171D]/50 hover:bg-[#7A171D]/5 transition-colors">
             Domestic Cargo
          </Button>
          <Button variant="gold" className="shadow-md h-11 text-xs px-5 cursor-default hover:scale-100">
            <Globe2 className="w-4 h-4 mr-1.5"/> Global Cargo
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-[1400px] mx-auto px-6 md:px-10 mb-8">
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-2xl flex items-center gap-3 shadow-sm">
              <Info className="w-5 h-5 shrink-0"/> {errorMsg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10 px-6 md:px-10 items-start">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: PREMIUM CARGO DATA FORM                      */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[60%] xl:w-[65%] space-y-8">
          <form id="quote-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* SECTION 1: Smart International Routing */}
            <Card className="shadow-sm border-slate-200 relative overflow-visible z-50">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C5A059] rounded-l-2xl"></div>
              <CardContent className="p-6 md:p-8 pl-8 md:pl-10 relative">
                <div className="flex items-center gap-4 mb-6 border-b pb-4 border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 text-[#C5A059] flex items-center justify-center font-black">1</div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">International Shipping Route</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  {/* Mapbox Origin */}
                  <div className="relative z-[60]">
                    <FieldLabel label="Origin Location" icon={Anchor} />
                    <div className="border-2 border-slate-200 focus-within:border-[#C5A059] focus-within:ring-4 focus-within:ring-[#C5A059]/10 rounded-xl transition-all bg-slate-50 shadow-sm relative">
                      <SearchBox
                        accessToken={MAPBOX_TOKEN}
                        options={{ language: 'en' }}
                        value={formData.origin}
                        placeholder="Search origin port/country..."
                        onRetrieve={(res) => {
                          const feature = res.features[0];
                          handleSmartMapChange("origin", feature.properties.full_address || feature.properties.name);
                        }}
                        theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '14px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '600' } }}
                      />
                    </div>
                  </div>

                  {/* Mapbox Destination */}
                  <div className="relative z-[50]">
                    <FieldLabel label="Destination Location" icon={Plane} />
                    <div className="border-2 border-slate-200 focus-within:border-[#C5A059] focus-within:ring-4 focus-within:ring-[#C5A059]/10 rounded-xl transition-all bg-slate-50 shadow-sm relative">
                      <SearchBox
                        accessToken={MAPBOX_TOKEN}
                        options={{ language: 'en' }}
                        value={formData.destination}
                        placeholder="Search destination port/country..."
                        onRetrieve={(res) => {
                          const feature = res.features[0];
                          handleSmartMapChange("destination", feature.properties.full_address || feature.properties.name);
                        }}
                        theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '14px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '600' } }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 2: Cargo Specifications */}
            <Card className="shadow-sm border-slate-200 relative overflow-visible z-40">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800 rounded-l-2xl"></div>
              <CardContent className="p-6 md:p-8 pl-8 md:pl-10">
                <div className="flex items-center gap-4 mb-6 border-b pb-4 border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">2</div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">Main Cargo Specifications</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-3">
                    <FieldLabel label="Cargo Description (HS Code Basis)" icon={Box} />
                    <Input type="text" name="itemType" value={formData.itemType} onChange={handleChange} placeholder="e.g., Used Coffee Machine, Cotton Clothes, Legal Documents..." className="h-12 bg-slate-50 font-semibold focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/10" required />
                  </div>

                  <div>
                    <FieldLabel label="Total Actual Weight" />
                    <div className="relative">
                      <Input type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="0" className="h-12 text-center font-black text-lg bg-slate-50 focus-visible:border-[#C5A059] pr-10" required />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">KG</span>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <FieldLabel label="Cargo Dimensions (L x W x H)" icon={Maximize} />
                    <div className="flex gap-2 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:border-[#C5A059] focus-within:ring-[#C5A059]/10 shadow-sm transition-all h-12">
                      <input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="L" className="w-1/3 px-2 text-center font-bold bg-transparent outline-none border-r border-slate-200" required />
                      <input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="W" className="w-1/3 px-2 text-center font-bold bg-transparent outline-none border-r border-slate-200" required />
                      <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="H" className="w-1/3 px-2 text-center font-bold bg-transparent outline-none" required />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3 shadow-sm">
                  <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    <strong className="block mb-1 text-amber-900 font-bold">Volumetric Policy</strong>
                    For international cargo shipments, the system will compare the <b>Actual Weight</b> with the <b>Volumetric Weight (L x W x H / 5000)</b>, and apply the higher value to determine the Freight rate.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 3: Contact Data */}
            <Card className="shadow-sm border-slate-200 relative overflow-visible z-30">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#7A171D] rounded-l-2xl"></div>
              <CardContent className="p-6 md:p-8 pl-8 md:pl-10">
                <div className="flex items-center gap-4 mb-6 border-b pb-4 border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-[#7A171D]/10 text-[#7A171D] flex items-center justify-center font-black">3</div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">PIC Contact Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <FieldLabel label="Full Name / Company" icon={User} />
                    <div className="relative">
                      <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Representative Name" className="pl-12 h-12 bg-slate-50 font-bold focus-visible:border-[#7A171D]" required />
                    </div>
                  </div>
                  <div>
                    <FieldLabel label="Active WhatsApp" icon={Phone} />
                    <div className="relative">
                      <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+62812xxxxxx" className="pl-12 h-12 bg-slate-50 font-bold focus-visible:border-[#7A171D]" required />
                    </div>
                  </div>
                  <div>
                    <FieldLabel label="Correspondence Email" icon={Mail} />
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@company.com" className="pl-12 h-12 bg-slate-50 font-bold focus-visible:border-[#7A171D]" required />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </form>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: PROCEDURE PANEL & SUBMIT (STICKY)           */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[40%] xl:w-[35%] lg:sticky lg:top-28 space-y-6 z-20">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-[80px] opacity-15 pointer-events-none"></div>
            
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/20">
              <Zap className="w-7 h-7 text-[#C5A059]" />
            </div>

            <h3 className="text-2xl font-black mb-3 text-white tracking-tight">
              Forwarding Procedure
            </h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8">
              Cross-border cargo shipping requires special handling regarding customs regulations, HS Codes, and efficient mode of transport selection.
            </p>

            <div className="space-y-6 mb-8">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#C5A059] text-slate-900 flex items-center justify-center text-xs font-black shrink-0 shadow-[0_0_15px_rgba(197,160,89,0.3)]">1</div>
                <p className="text-sm text-slate-300 font-medium pt-1">Fill out the cargo specifications and destination coordinates in the form.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 shrink-0 border border-slate-700">2</div>
                <p className="text-sm text-slate-300 font-medium pt-1">Submit the ticket. The system will synchronize your data to the Forwarding admin portal.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 shrink-0 border border-slate-700">3</div>
                <p className="text-sm text-slate-300 font-medium pt-1">Our logistics experts will analyze and release an Official Quotation for your approval.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-8 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-emerald-300 leading-relaxed">Guaranteed transparent quotation, no hidden fees.</span>
            </div>

            <Button 
              type="submit" 
              form="quote-form"
              disabled={isLoading}
              variant="gold"
              className="w-full h-14 text-sm font-black shadow-[0_10px_25px_rgba(197,160,89,0.2)] transition-all active:scale-[0.98] rounded-xl flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> Encrypting Data...</>
              ) : (
                <><MessageCircle className="w-5 h-5 fill-current opacity-90" /> Connect with Customs Expert</>
              )}
            </Button>
          </motion.div>
        </div>

      </div>
    </div>
  );
}

export default function DesktopForwardingQuotePage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16 px-6 relative overflow-hidden font-sans selection:bg-[#C5A059]/30 selection:text-[#7A171D]">
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.04] pointer-events-none" />
      
      <Suspense fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center z-10 relative font-sans">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin mb-4 shadow-sm"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Preparing Global Encryption...</p>
        </div>
      }>
        <QuoteForm />
      </Suspense>
    </main>
  );
}