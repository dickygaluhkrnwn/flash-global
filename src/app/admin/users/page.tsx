import { redirect } from "next/navigation";
import { headers } from "next/headers";

// Karena kita menggunakan layout berbasis Sub-Route, 
// URL utama akan langsung dilempar ke tab pertama (B2C)
export default function AdminUsersMainPage() {
  const headersList = headers();
  const host = headersList.get("host") || "";
  const portalZone = headersList.get("x-portal-zone") || "";
  
  // Deteksi apakah sedang diakses dari Sub-Domain production atau Middleware
  const isSubDomain = host.includes("admin.flashglobalslogistik.com") || portalZone === "admin";

  if (isSubDomain) {
    redirect("/users/b2c");
  } else {
    redirect("/admin/users/b2c");
  }
}