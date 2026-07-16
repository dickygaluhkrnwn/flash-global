import React, { forwardRef } from "react";
import { Package, Building2, MapPin, Phone, Mail } from "lucide-react";

export interface InvoiceItem {
  id: string; // ID Order / Resi
  date: string; // Tanggal pengiriman
  description: string; // Detail rute asal -> tujuan
  service: string; // Layanan & Armada
  weight: number; // Berat (Kg)
  amount: number; // Harga total order ini
}

export interface InvoiceA4Props {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  
  // Data Klien (Billed To)
  clientName: string;
  clientCompany?: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;

  // Daftar Tagihan
  items: InvoiceItem[];

  // Kalkulasi Keuangan
  subTotal: number;
  discountAmount?: number;
  taxAmount?: number; // PPN (misal 11%)
  grandTotal: number;

  // Info Pembayaran (Footer)
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export const InvoiceA4Template = forwardRef<HTMLDivElement, InvoiceA4Props>(
  (
    {
      invoiceNumber,
      issueDate,
      dueDate,
      clientName,
      clientCompany,
      clientAddress,
      clientEmail,
      clientPhone,
      items,
      subTotal,
      discountAmount = 0,
      taxAmount = 0,
      grandTotal,
      bankName = "BCA",
      accountNumber = "8720516839",
      accountName = "PT FLASH GLOBAL LOGISTIK",
    },
    ref
  ) => {

    const formatRupiah = (val: number) => {
      return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
    };

    return (
      // Kertas A4 Container (210mm x 297mm)
      <div
        ref={ref}
        className="bg-white text-slate-900 font-sans mx-auto box-border relative overflow-hidden"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm', // Margin kertas standar
          color: '#0f172a'
        }}
      >
        {/* Dekorasi Airmark (Watermark transparan di belakang) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
           <Package className="w-[150mm] h-[150mm] text-slate-900" />
        </div>

        {/* HEADER: Kop Surat Flash Global */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white !print-exact-color" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', backgroundColor: '#0f172a' }}>
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Flash Global</h1>
              <p className="text-xs font-bold tracking-widest text-[#7A171D] uppercase mt-1">Logistics & Forwarding</p>
            </div>
          </div>
          
          <div className="text-right text-xs text-slate-600">
            <p className="font-bold text-slate-900 mb-1">PT. FLASH GLOBAL LOGISTIK</p>
            <p>Gedung Logistik Center Lt. 3</p>
            <p>Jl. Jend. Sudirman Kav. 21, Jakarta Selatan 12920</p>
            <p>NPWP: 02.123.456.7-890.000</p>
            <p className="mt-1">Email: finance@flashglobal.com | Telp: +62 21 555 1234</p>
          </div>
        </div>

        {}
        {/* META INVOICE & INFO KLIEN (BILLED TO) */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-4">INVOICE</h2>
            <div className="space-y-1 text-sm">
              <div className="flex gap-4">
                <span className="w-32 font-bold text-slate-500">Nomor Invoice</span>
                <span className="font-black text-slate-900 uppercase">#{invoiceNumber}</span>
              </div>
              <div className="flex gap-4">
                <span className="w-32 font-bold text-slate-500">Tanggal Terbit</span>
                <span className="font-bold text-slate-900">{issueDate}</span>
              </div>
              <div className="flex gap-4">
                <span className="w-32 font-bold text-slate-500">Jatuh Tempo</span>
                <span className="font-bold text-red-600">{dueDate}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 w-80 !print-exact-color" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', backgroundColor: '#f8fafc' }}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> Ditagihkan Kepada:</p>
            <p className="text-sm font-black text-slate-900 uppercase mb-1">{clientCompany || clientName}</p>
            {clientCompany && <p className="text-xs font-bold text-slate-600 mb-2">UP: {clientName}</p>}
            
            <div className="space-y-1.5 text-xs text-slate-600">
              <p className="flex items-start gap-1.5 leading-relaxed"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5"/> {clientAddress || "-"}</p>
              <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0"/> {clientPhone || "-"}</p>
              <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 shrink-0"/> {clientEmail || "-"}</p>
            </div>
          </div>
        </div>

        {}
        {/* TABEL RINCIAN TAGIHAN */}
        <div className="mb-8">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-800 text-slate-900">
                <th className="py-3 px-2 font-bold uppercase tracking-wider text-xs w-8">No</th>
                <th className="py-3 px-2 font-bold uppercase tracking-wider text-xs">ID Resi / AWB</th>
                <th className="py-3 px-2 font-bold uppercase tracking-wider text-xs">Rute & Layanan</th>
                <th className="py-3 px-2 font-bold uppercase tracking-wider text-xs text-center">Tgl. Order</th>
                <th className="py-3 px-2 font-bold uppercase tracking-wider text-xs text-center">Berat</th>
                <th className="py-3 px-2 font-bold uppercase tracking-wider text-xs text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, index) => (
                <tr key={item.id} className="text-slate-700">
                  <td className="py-4 px-2 align-top">{index + 1}</td>
                  <td className="py-4 px-2 align-top font-mono font-bold text-slate-900">{item.id}</td>
                  <td className="py-4 px-2 align-top">
                    <p className="font-bold text-slate-900 text-xs mb-1">{item.description}</p>
                    <p className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded w-fit !print-exact-color">{item.service}</p>
                  </td>
                  <td className="py-4 px-2 align-top text-center text-xs">{item.date}</td>
                  <td className="py-4 px-2 align-top text-center text-xs">{item.weight} Kg</td>
                  <td className="py-4 px-2 align-top text-right font-bold text-slate-900">{formatRupiah(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {}
        {/* RINGKASAN KALKULASI FINANSIAL */}
        <div className="flex justify-end mb-12">
          <div className="w-80 space-y-3 text-sm">
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-bold">Total Subtotal</span>
              <span className="font-semibold">{formatRupiah(subTotal)}</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-600">
                <span className="font-bold">Diskon / Potongan</span>
                <span className="font-semibold">- {formatRupiah(discountAmount)}</span>
              </div>
            )}
            
            {taxAmount > 0 && (
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-bold">PPN (11%)</span>
                <span className="font-semibold">+ {formatRupiah(taxAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center border-t-2 border-slate-900 pt-3 mt-3 !print-exact-color">
              <span className="font-black text-slate-900 text-base uppercase tracking-widest">Grand Total</span>
              <span className="font-black text-slate-900 text-xl">{formatRupiah(grandTotal)}</span>
            </div>
          </div>
        </div>

        {}
        {/* FOOTER: INSTRUKSI PEMBAYARAN & TANDA TANGAN */}
        <div className="flex justify-between items-end mt-auto pt-10">
          
          <div className="max-w-[50%]">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2 border-b border-slate-200 pb-2">Instruksi Pembayaran</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-2">Mohon lakukan pembayaran penuh sebelum tanggal jatuh tempo ke rekening resmi kami di bawah ini:</p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs !print-exact-color" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact', backgroundColor: '#f8fafc' }}>
              <p><span className="font-bold text-slate-500 w-24 inline-block">Nama Bank</span> : <span className="font-bold text-slate-900">{bankName}</span></p>
              <p><span className="font-bold text-slate-500 w-24 inline-block">No. Rekening</span> : <span className="font-mono font-black text-slate-900">{accountNumber}</span></p>
              <p><span className="font-bold text-slate-500 w-24 inline-block">Atas Nama</span> : <span className="font-bold text-slate-900">{accountName}</span></p>
            </div>
          </div>

          <div className="text-center w-48">
            <p className="text-xs font-bold text-slate-600 mb-16">Hormat Kami,</p>
            {/* Tempat untuk menaruh stempel digital / ttd jika diperlukan */}
            <div className="w-full border-b border-slate-900 mb-2 relative">
               <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full border-2 border-red-600/30 flex items-center justify-center opacity-40 -rotate-12 pointer-events-none !print-exact-color">
                 <span className="text-red-600 text-[10px] font-black uppercase tracking-widest border-y border-red-600 py-0.5 px-2">VALIDATED</span>
               </div>
            </div>
            <p className="text-xs font-black text-slate-900">Finance Dept.</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">PT Flash Global Logistik</p>
          </div>

        </div>

      </div>
    );
  }
);

InvoiceA4Template.displayName = "InvoiceA4Template";