import { redirect } from "next/navigation";

export default function MobileRootPage() {
  // Arahkan ke URL publik, biarkan Middleware yang me-rewrite ke folder mobile/dashboard di belakang layar
  redirect("/driver/dashboard");
}