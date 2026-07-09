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