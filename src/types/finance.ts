import { OrderDetail, FirebaseTimestamp } from './order';

export interface Invoice {
  id: string;
  orderId: string; // Relasi ke pesanan
  userId: string; // Bisa B2B atau B2C
  amount: number;
  status: 'unpaid' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date | FirebaseTimestamp;
  paidAt?: Date | FirebaseTimestamp;
  createdAt: Date | FirebaseTimestamp;
}

// Menggantikan "Driver Wallet" dengan Corporate Balance yang lebih enterprise
export interface CorporateBalance {
  userId: string; // ID User B2B atau Driver
  balance: number; // Deposit (Prabayar)
  creditLimit: number; // Limit Tempo (Pascabayar)
  usedCredit: number; // Hutang berjalan
  updatedAt: Date | FirebaseTimestamp;
}

export interface WalletLog {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'deduction' | 'credit_payment' | 'refund';
  description: string;
  recordedBy?: string; // Jika admin yang menginput manual
  createdAt: Date | FirebaseTimestamp;
}

export interface Promo {
  id: string; // Kode Promo (Document ID)
  type: 'percentage' | 'fixed';
  value: number;
  quota: number;
  usedCount: number;
  expiresAt: string | Date | FirebaseTimestamp;
  isActive?: boolean;
  targetService?: 'all' | 'domestik' | 'forwarding'; 
  targetUser?: string; // Spesifik ke email user tertentu, atau "all"
}

// ----------------------------------------------------------------------
// EXPORT DARI PAGE PEMBAYARAN
// ----------------------------------------------------------------------
export interface PaymentMethod {
  bankName: string;
  accountNumber: string;
  accountName: string;
  color: string;
}

export interface PaymentConfig {
  transferBank: PaymentMethod[];
  qrisImageUrl: string | null;
}

// ----------------------------------------------------------------------
// DATA VIEW MODEL UNTUK FINANCE REPORTS & RECEIVABLES
// ----------------------------------------------------------------------
export interface FinanceReport {
  id: string;
  date: string;
  time: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  originAddress: string;
  destAddress: string;
  serviceType: string;
  vehicleName: string;
  weight: number;
  paymentMethod: string;
  paymentStatus: string;
  baseFee: number;
  insuranceFee: number;
  porterFee: number;
  tollFee: number;
  b2bDiscount: number;
  promoCode: string;
  promoDiscount: number;
  amount: number; 
  timestamp: number;
  rawObj: OrderDetail; 
}

export interface UnpaidOrder {
  id: string;
  date: string;
  originAddress: string;
  destAddress: string;
  amount: number;
  status: string;
}

export interface B2BClientDebt {
  id: string; 
  name: string;
  email: string;
  unpaidCount: number;
  totalDebt: number;
  orders: UnpaidOrder[];
}

// ----------------------------------------------------------------------
// EXPORT DARI ALUR CANCEL & REFUND
// ----------------------------------------------------------------------
export interface RefundRequest {
  id: string;
  orderId: string;
  userId: string;
  clientName?: string; 
  nominal: number;
  alasan: string;
  rekeningTujuan: string; // Format: "Nama Bank - No Rekening - Atas Nama"
  status: 'Pending' | 'Approved' | 'Rejected';
  proofUrl?: string; // Bukti transfer pengembalian dana dari Finance
  createdAt: Date | FirebaseTimestamp;
  processedAt?: Date | FirebaseTimestamp;
}