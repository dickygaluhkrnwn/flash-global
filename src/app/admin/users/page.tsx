import { redirect } from "next/navigation";

// Karena kita menggunakan layout berbasis Sub-Route, 
// URL utama /admin/users akan langsung dilempar ke tab pertama (B2C)
export default function AdminUsersMainPage() {
  redirect("/admin/users/b2c");
}