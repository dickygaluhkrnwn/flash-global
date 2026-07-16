import React, { forwardRef } from "react";
import Barcode from "react-barcode";
import { Package } from "lucide-react";

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
  totalCost?: number;
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
      totalCost,
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
        {/* HEADER RESI */}
        <div className="flex flex-col items-center border-b-2 border-black pb-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="w-5 h-5 text-black" />
            <h1 className="text-xl font-black tracking-tighter uppercase">FLASH GLOBAL</h1>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-center">
            Airway Bill (AWB) / Resi Pengiriman
          </p>
        </div>

        {/* BARCODE SECTION */}
        <div className="flex flex-col items-center justify-center mb-4">
          {/* react-barcode akan mengenerate SVG barcode */}
          <Barcode 
            value={resi} 
            width={1.5} 
            height={40} 
            fontSize={12} 
            margin={0} 
            displayValue={false} 
          />
          <p className="font-mono font-black text-sm mt-1 tracking-widest uppercase">{resi}</p>
        </div>

        {/* DETAIL LAYANAN */}
        <div className="border border-black p-2 rounded mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase">Layanan:</span>
            <span className="text-xs font-black uppercase">{serviceType}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase">Armada:</span>
            <span className="text-[10px] font-bold uppercase">{vehicleName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase">Berat/Isi:</span>
            <span className="text-[10px] font-bold">{weight} Kg / {itemsDesc}</span>
          </div>
        </div>

        {/* RUTE PENGIRIMAN */}
        <div className="space-y-3 border-b-2 border-dashed border-black pb-3 mb-3">
          {/* Asal */}
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-black text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-bold">A</span>
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase">Pengirim:</p>
              <p className="text-xs font-black uppercase">{senderName}</p>
              <p className="text-[10px] font-bold mb-1">{senderPhone}</p>
              <p className="text-[9px] leading-snug">{originAddress}</p>
            </div>
          </div>

          {/* Tujuan */}
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 border-2 border-black text-black rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-bold">B</span>
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase">Penerima:</p>
              <p className="text-xs font-black uppercase">{receiverName}</p>
              <p className="text-[10px] font-bold mb-1">{receiverPhone}</p>
              <p className="text-[9px] leading-snug">{destAddress}</p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-[9px] space-y-1">
          <div className="flex justify-between font-bold">
            <span>TGL CETAK:</span>
            <span>{date}</span>
          </div>
          {totalCost !== undefined && (
            <div className="flex justify-between font-bold text-xs mt-1 border-t border-black pt-1">
              <span>TOTAL BIAYA:</span>
              <span>Rp {totalCost.toLocaleString('id-ID')}</span>
            </div>
          )}
        </div>
        
        <div className="text-center mt-4">
          <p className="text-[8px] font-bold italic">Simpan resi ini sebagai bukti pengiriman yang sah.</p>
          <p className="text-[8px] font-bold mt-1">Lacak paket di: www.flashglobal.com</p>
        </div>

      </div>
    );
  }
);

ReceiptTemplate.displayName = "ReceiptTemplate";