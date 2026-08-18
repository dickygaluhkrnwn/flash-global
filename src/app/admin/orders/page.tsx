import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default function AdminOrdersMainPage() {
  const headersList = headers();
  const host = headersList.get("host") || "";
  const portalZone = headersList.get("x-portal-zone") || "";
  
  // Deteksi apakah sedang diakses dari Sub-Domain production atau Middleware
  const isSubDomain = host.includes("admin.flashglobalslogistik.com") || portalZone === "admin";

  // Mengarahkan rute utama langsung ke sub-menu Domestik dengan penyesuaian URL
  if (isSubDomain) {
    redirect("/orders/domestic");
  } else {
    redirect("/admin/orders/domestic");
  }
}