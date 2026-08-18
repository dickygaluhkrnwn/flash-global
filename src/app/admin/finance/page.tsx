import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default function AdminFinanceMainPage() {
  // 1. Baca Custom Header yang disuntikkan oleh Middleware
  const headersList = headers();
  const portalZone = headersList.get("x-portal-zone");

  // 2. Redirect dinamis berdasarkan zona environment
  if (portalZone === "admin") {
    // Di Sub-Domain Production
    redirect("/finance/verification");
  } else {
    // Di Localhost
    redirect("/admin/finance/verification");
  }
}