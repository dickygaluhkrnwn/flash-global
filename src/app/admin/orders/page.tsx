import { redirect } from "next/navigation";

export default function AdminOrdersMainPage() {
  // Mengarahkan rute utama langsung ke sub-menu Domestik
  redirect("/admin/orders/domestic");
}