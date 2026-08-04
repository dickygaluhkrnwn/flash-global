// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility untuk menggabungkan class Tailwind secara dinamis.
 * Mencegah konflik class (misal: bg-red-500 dan bg-blue-500).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==========================================
// HELPER KHUSUS INTEGRASI DANA API
// ==========================================

/**
 * 1. Formatter Nomor HP DANA
 * DANA mewajibkan nomor HP dengan awalan "628" tanpa "+" atau "0" di depan.
 */
export function formatDanaPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  } else if (cleaned.startsWith('+62')) {
    cleaned = '62' + cleaned.substring(3);
  }
  
  return cleaned;
}

/**
 * 2. Formatter Nominal Uang DANA
 * Mengubah angka dari Firestore (misal: 50000) menjadi format string desimal SNAP API ("50000.00")
 */
export function formatDanaAmount(amount: number): string {
  return Number(amount).toFixed(2);
}

/**
 * 3. Generator Timestamp DANA (Standar SNAP API)
 * Wajib format: YYYY-MM-DDTHH:mm:ss+07:00 (Waktu Jakarta GMT+7)
 */
export function getDanaTimestamp(): string {
  const date = new Date();
  const offset = 7 * 60 * 60 * 1000; 
  const jakartaTime = new Date(date.getTime() + offset);
  
  const pad = (num: number) => String(num).padStart(2, '0');
  
  const year = jakartaTime.getUTCFullYear();
  const month = pad(jakartaTime.getUTCMonth() + 1);
  const day = pad(jakartaTime.getUTCDate());
  const hours = pad(jakartaTime.getUTCHours());
  const minutes = pad(jakartaTime.getUTCMinutes());
  const seconds = pad(jakartaTime.getUTCSeconds());
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`;
}

/**
 * 4. Generator UUID dinamis untuk parameter reqMsgId DANA
 */
export function generateDanaMessageId(): string {
  return crypto.randomUUID();
}

/**
 * 5. Helper untuk memperbaiki format Private Key dari .env
 * Mengubah string literal "\n" menjadi karakter newline sebenarnya (Enter)
 */
export function parsePrivateKey(key: string): string {
  if (!key) return "";
  return key.replace(/\\n/g, '\n');
}

/**
 * 6. Generator Signature DANA (SNAP API Standard)
 * Dipakai untuk TopUp & Inquiry
 */
export async function generateSnapSignature(
  httpMethod: string,
  endpointUrl: string,
  body: Record<string, unknown>, // 🚀 PERBAIKAN: Mengganti any menjadi Record<string, unknown>
  timestamp: string,
  privateKey: string
): Promise<string> {
  const cryptoModule = await import('crypto');
  const minifiedBody = JSON.stringify(body);
  const hashBody = cryptoModule.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();
  
  const stringToSign = `${httpMethod}:${endpointUrl}:${hashBody}:${timestamp}`;
  const validPrivateKey = parsePrivateKey(privateKey);
  
  const sign = cryptoModule.createSign('RSA-SHA256');
  sign.update(stringToSign);
  sign.end();
  
  return sign.sign(validPrivateKey, 'base64');
}

/**
 * 7. Generator Signature DANA (OPEN API Standard)
 * Dipakai khusus untuk API lama seperti Check Merchant Balance
 */
export async function generateOpenApiSignature(
  body: Record<string, unknown>, // 🚀 PERBAIKAN: Mengganti any menjadi Record<string, unknown>
  privateKey: string
): Promise<string> {
  const cryptoModule = await import('crypto');
  
  // Open API format: stringify body -> sign dengan RSA SHA256
  const minifiedBody = JSON.stringify(body);
  const validPrivateKey = parsePrivateKey(privateKey);
  
  const sign = cryptoModule.createSign('RSA-SHA256');
  sign.update(minifiedBody);
  sign.end();
  
  return sign.sign(validPrivateKey, 'base64');
}