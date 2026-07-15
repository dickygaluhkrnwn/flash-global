import { DynamicVehicle } from "./order";

export interface DashboardStats {
  totalB2B: number;
  totalDrivers: number;
  totalOrdersToday: number;
  totalRevenueToday: number;
  totalWeightToday: number;
  activeTickets: number;
  avgOrderValueWeekly: number;
}

export interface ChartData {
  label: string;
  value: number;
  dateStr: string;
}

export interface ActiveNode {
  id: string;
  origin: string;
  destination: string;
  status: string;
  vehicle: string;
  coords?: { lat: number; lng: number }; 
}

// DIPERBARUI: Menambahkan phone dan balance untuk halaman Manajemen Driver
export interface DriverData {
  id: string;
  name: string;
  vehicleType: string;
  phone?: string; 
  balance?: number;
  isSuspended?: boolean;
  [key: string]: unknown;
}

// Konfigurasi Tarif dari Halaman Pricing Admin
export interface PricingConfig {
  b2bDiscount: number;
  tarifPorter: number;
  customVehicles: DynamicVehicle[];
  [key: string]: unknown;
}