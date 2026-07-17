import React, { forwardRef } from "react";
import Barcode from "react-barcode";

export interface ReceiptProps {
  resi: string;
  senderName: string;
  senderPhone: string;
  originAddress: string;
  receiverName: string;
  receiverPhone: string;
  destAddress: string;
  weight: number;
  serviceType: string;
  vehicleName: string;
  date: string;
  itemsDesc?: string;
}

// Menggunakan forwardRef agar bisa ditangkap oleh react-to-print
export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptProps>(
  (
    {
      resi,
      senderName,
      senderPhone,
      originAddress,
      receiverName,
      receiverPhone,
      destAddress,
      weight,
      serviceType,
      vehicleName,
      date,
      itemsDesc = "Paket Kargo",
    },
    ref
  ) => {
    return (
      // Container utama di-set lebar 80mm khusus untuk printer thermal
      <div
        ref={ref}
        className="w-[80mm] bg-white text-black p-4 font-sans mx-auto box-border"
        style={{
          color: '#000', // Pastikan hitam murni untuk thermal
          fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif'
        }}
      >
        {/* HEADER RESI (MODERN) */}
        <div className="flex flex-col items-center border-b-[3px] border-black pb-4 mb-4">
          {/* Logo Perusahaan - Menggunakan img standar agar aman saat diprint (no lazy-load bug) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.png" 
            alt="Flash Globals" 
            className="h-9 object-contain mb-3 grayscale contrast-200" 
          />
          <div className="bg-black text-white px-3 py-1 rounded-sm w-full text-center">
            <p className="text-[11px] font-black uppercase tracking-widest">
              Airway Bill / Resi
            </p>
          </div>
        </div>

        {/* BARCODE SECTION (Sleek) */}
        <div className="flex flex-col items-center justify-center mb-5 p-3 border-2 border-black rounded-xl">
          <Barcode 
            value={resi} 
            width={1.6} 
            height={45} 
            fontSize={12} 
            margin={0} 
            displayValue={false} 
          />
          <p className="font-mono font-black text-base mt-2 tracking-[0.2em] uppercase">{resi}</p>
        </div>

        {/* DETAIL LAYANAN (Grid Modern) */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="border border-black rounded-lg p-2 flex flex-col justify-center">
            <span className="text-[8px] font-bold uppercase mb-0.5">Layanan Kargo</span>
            <span className="text-xs font-black uppercase leading-tight">{serviceType}</span>
          </div>
          <div className="border border-black rounded-lg p-2 flex flex-col justify-center">
            <span className="text-[8px] font-bold uppercase mb-0.5">Tipe Armada</span>
            <span className="text-[10px] font-black uppercase leading-tight">{vehicleName}</span>
          </div>
          <div className="border border-black rounded-lg p-2 col-span-2 flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase">Berat & Isi:</span>
            <span className="text-[10px] font-black uppercase text-right">{weight} Kg - {itemsDesc}</span>
          </div>
        </div>

        {/* RUTE PENGIRIMAN (Card Block) */}
        <div className="flex flex-col border-2 border-black rounded-xl overflow-hidden mb-4">
          <div className="bg-black text-white py-1.5 px-3">
            <span className="text-[9px] font-bold uppercase tracking-widest">Detail Rute Logistik</span>
          </div>
          
          <div className="p-3 space-y-3">
            {/* Asal */}
            <div className="flex items-start gap-2 relative">
              <div className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center shrink-0 z-10">
                <span className="text-[10px] font-bold">A</span>
              </div>
              <div className="leading-tight pt-0.5">
                <p className="text-[9px] font-bold uppercase mb-0.5">Pengirim:</p>
                <p className="text-xs font-black uppercase">{senderName}</p>
                <p className="text-[10px] font-bold mb-1">{senderPhone}</p>
                <p className="text-[9px] leading-snug">{originAddress}</p>
              </div>
            </div>

            {/* Garis Penghubung (Visual Line) */}
            <div className="h-0 border-t border-dashed border-black ml-3 mr-3 my-1"></div>

            {/* Tujuan */}
            <div className="flex items-start gap-2 relative">
              <div className="w-5 h-5 border-2 border-black bg-white text-black rounded-full flex items-center justify-center shrink-0 z-10">
                <span className="text-[10px] font-black">B</span>
              </div>
              <div className="leading-tight pt-0.5">
                <p className="text-[9px] font-bold uppercase mb-0.5">Penerima:</p>
                <p className="text-xs font-black uppercase">{receiverName}</p>
                <p className="text-[10px] font-bold mb-1">{receiverPhone}</p>
                <p className="text-[9px] leading-snug">{destAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-[9px] font-bold flex justify-between border-b border-black pb-2 mb-3">
          <span>TGL CETAK:</span>
          <span>{date}</span>
        </div>
        
        <div className="text-center mt-2 space-y-1">
          <p className="text-[8px] font-black uppercase">Simpan resi ini sebagai bukti yang sah.</p>
          <p className="text-[8px] font-bold">Lacak kargo Anda secara Live di:</p>
          <p className="text-[10px] font-black border border-black rounded p-1 mt-1">www.flashglobalslogistik.com</p>
        </div>

      </div>
    );
  }
);

ReceiptTemplate.displayName = "ReceiptTemplate";