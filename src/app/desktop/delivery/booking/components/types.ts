export interface DeliveryItem {
  id: string;
  name: string;
  weightType: "Kecil" | "Sedang";
  dimType: "S" | "M" | "L";
  weightVal: number;
  length: number;
  width: number;
  height: number;
  value: number;
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
  maxWeight: number;
  baseFare: number;
  minKm: number;
  perKm: number;
  insurancePercent?: number;
}