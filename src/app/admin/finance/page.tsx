import { redirect } from "next/navigation";

export default function AdminFinanceMainPage() {
  // Mengarahkan rute utama langsung ke sub-menu Verifikasi Manual
  redirect("/admin/finance/verification");
}