export type TrackingStatus = 'pending' | 'pickup' | 'in_transit' | 'delivered' | 'cancelled' | 'refunded';

// ----------------------------------------------------------------------
// EXPORT DARI PAGE TRACKING (New Tracking Data Types)
// ----------------------------------------------------------------------
// Dipindah ke atas agar bisa digunakan oleh Order dan Quote
export type FirebaseTimestamp = { toDate?: () => Date; toMillis?: () => number; seconds?: number } | string | number | null | undefined;

export interface Order {
  id: string;
  userId: string;
  trackingNumber: string; // Nomor Resi / AWB
  origin: string;
  originCoords: { lat: number; lng: number };
  destination: string;
  destCoords: { lat: number; lng: number };
  weight: number;
  length: number;
  width: number;
  height: number;
  distanceKm: number;
  vehicle: string;
  totalPrice: number;
  status: TrackingStatus;
  assignedDriverId?: string;
  createdAt: Date | FirebaseTimestamp;
  updatedAt?: Date | FirebaseTimestamp;
}

export interface Quote {
  id: string; // Digunakan sebagai quoteId
  userId: string;
  name: string;
  email: string;
  phone: string;
  origin: string;
  originCountry: string;
  destination: string;
  destCountry: string;
  itemType: string; // Jenis barang (HS Code basis)
  weight: number;
  length: number;
  width: number;
  height: number;
  serviceType: string;
  status: string; // Diperlebar agar menampung 'Menunggu Persetujuan Klien', dll
  offeredPrice?: number; // BARU: Dari Admin Global Orders
  customsDocUrl?: string; // BARU: Dari Admin Global Orders
  createdAt: Date | FirebaseTimestamp;
}

export interface LocationDetail {
  address?: string;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  lat?: number;
  lng?: number;
  resi?: string;
  [key: string]: unknown;
}

export interface MapDropItem {
  id: string;
  lng: number;
  lat: number;
  address: string;
  [key: string]: unknown;
}

export interface TrackingHistoryItem {
  id?: string | number;
  status: string;
  date: string;
  description?: string;
  location?: string;
  [key: string]: unknown;
}

export interface TrackingData {
  id: string;
  category: "Domestik" | "Internasional";
  status?: string;
  statusSub?: string;
  origin?: LocationDetail | string; 
  destination?: LocationDetail | string; 
  destinations?: LocationDetail[];
  createdAt?: FirebaseTimestamp;
  trackingHistory?: TrackingHistoryItem[];
  driverCoords?: Coordinates;
  vehicleName?: string;
  serviceType?: string;
  resi?: string;
  [key: string]: unknown;
}

// ----------------------------------------------------------------------
// EXPORT DARI PAGE DESKTOP 
// ----------------------------------------------------------------------
export interface AdminPricingConfig {
  domestik?: {
    motor?: { baseFare: number; minKm: number; perKm: number; maxWeight: number };
    mobil?: { baseFare: number; minKm: number; perKm: number; maxWeight: number };
  };
  internasional?: {
    basePerKg?: number;
  };
  discounts?: {
    thresholdKg?: number;
    rate?: number;
  };
}

export interface EstimateData {
  chargeableWeight: number;
  finalEstimate: number;
  parameters: {
    actualWeight: number;
    volumeWeight: number;
    distanceTraveled: number;
    category: string;
    vehicleName: string;
  };
}

export interface OrderSummary {
  id: string;
  destination: string;
  weight: number | string;
  vehicle: string;
  totalCost: number;
}

// ----------------------------------------------------------------------
// EXPORT DARI PAGE BOOKING
// ----------------------------------------------------------------------
export interface Coordinates {
  lng: number;
  lat: number;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface OriginData {
  address: string;
  detail: string;
  senderName: string;
  senderPhone: string;
}

export interface DeliveryItem {
  id: string;
  name: string;
  weightType?: "Kecil" | "Sedang" | string;
  dimType?: "S" | "M" | "L" | string;
  weightVal?: number;
  weight?: number; // Kompatibilitas data lama
  length?: number;
  width?: number;
  height?: number;
  value?: number;
}

export interface OrderBreakdown {
  deliveryFee: number;
  insuranceFee: number;
  porterFee: number;
  tollFee: number;
  b2bDiscount: number;
  grandTotal: number;
}

export interface DashboardOrder {
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
  
  // --- KEUANGAN & PROMO ---
  price: number; 
  finalPrice?: number; 
  promoCode?: string; 
  discountAmount?: number; 
  breakdown?: OrderBreakdown; 
  
  // --- OPERASIONAL & LOG PENGIRIMAN ---
  vehicle?: string;
  driverName?: string;
  driverPhone?: string;
  resi?: string; 
  trackingHistory?: TrackingHistoryItem[]; 

  // --- DATA KLIEN ---
  senderName?: string;
  receiverName?: string;
  senderPhone?: string;
  receiverPhone?: string;
  email?: string;
  items?: DeliveryItem[];
}

export interface DropDestination {
  id: string;
  resi?: string;
  address: string;
  detail: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail: string;
  items: DeliveryItem[];
  lng?: number;
  lat?: number;
}

export interface DynamicVehicle {
  id: string;
  name: string;
  isMotor: boolean;
  category?: "Motor" | "Mobil" | "Truk"; // BARU: Klasifikasi jenis armada
  maxWeight: number;
  baseFare: number;
  minKm: number;
  perKm: number;
  insurancePercent?: number;
  dimS?: { p: number; l: number; t: number };
  dimM?: { p: number; l: number; t: number };
  dimL?: { p: number; l: number; t: number };
}

// ----------------------------------------------------------------------
// EXPORT DARI PAGE DETAIL ORDER & ADMIN FINANCE
// ----------------------------------------------------------------------
export interface OrderDetail {
  id: string;
  category: string;
  userId?: string;
  email?: string;
  status: string;
  statusSub?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  createdAt?: FirebaseTimestamp;
  verifiedAt?: FirebaseTimestamp;
  resi?: string;
  quoteId?: string;
  origin?: LocationDetail | string;
  senderName?: string;
  senderPhone?: string;
  destinations?: LocationDetail[];
  destination?: string;
  serviceType?: string;
  vehicleName?: string;
  vehicle?: string;
  totalWeight?: number;
  weight?: number;
  totalDistance?: number;
  driverName?: string;
  driverPhone?: string;
  totalItemValue?: number;
  breakdown?: OrderBreakdown;
  finalGrandTotal?: number;
  totalCost?: number;
  offeredPrice?: number;
  appliedPromoCode?: string;
  discountPromoAmount?: number;
  trackingHistory?: TrackingHistoryItem[];
  receiptUrl?: string | null;
  [key: string]: unknown; // Extra fields
}