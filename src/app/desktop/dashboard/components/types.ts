export interface DeliveryItem {
  id: string;
  name: string;
  weightType?: string;
  dimType?: string;
  weightVal?: number;
  weight?: number; // Kompatibilitas data lama
  length?: number;
  width?: number;
  height?: number;
  value?: number; // Nilai barang untuk asuransi
}

export interface TrackingHistoryItem {
  id: string | number;
  status: string;
  date: string;
  description?: string;
  location?: string;
}

export interface OrderBreakdown {
  deliveryFee: number;
  insuranceFee: number;
  porterFee: number;
  tollFee: number;
  b2bDiscount: number;
  grandTotal: number;
}

export interface Order {
  id: string;
  category: "domestik" | "internasional";
  origin: string;
  destination: string;
  weight: number;
  dimensions: string;
  type: string;
  status: string;
  statusSub: string;
  date: string;
  timestamp: number; // Milisecond untuk sorting presisi
  
  // --- KEUANGAN & PROMO (BARU) ---
  price: number; // Subtotal awal / Harga dasar
  finalPrice?: number; // Harga setelah dipotong diskon
  promoCode?: string; // Kode voucher yang dipakai
  discountAmount?: number; // Total potongan harga promo
  breakdown?: OrderBreakdown; // Rincian biaya lengkap
  
  // --- OPERASIONAL & LOG PENGIRIMAN (BARU) ---
  vehicle?: string;
  driverName?: string;
  driverPhone?: string;
  resi?: string; // Nomor AWB Spesifik / Resi
  trackingHistory?: TrackingHistoryItem[]; // Log riwayat perjalanan ala Shopee

  // --- DATA KLIEN ---
  senderName?: string;
  receiverName?: string;
  senderPhone?: string;
  receiverPhone?: string;
  email?: string;
  items?: DeliveryItem[];
}