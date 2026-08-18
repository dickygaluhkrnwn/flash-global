import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default function MobileRootPage() {
  const headersList = headers();
  const host = headersList.get("host") || "";

  // Jika diakses dari sub-domain production, arahkan langsung ke root dashboard (/)
  if (host.includes("driver.flashglobalslogistik.com")) {
    redirect("/dashboard");
  } else {
    // Jika di localhost, arahkan ke path aslinya
    redirect("/driver/mobile/dashboard");
  }
}