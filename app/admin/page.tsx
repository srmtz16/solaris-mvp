import { AdminPortal } from "@/components/admin-portal";
import { adminDashboard } from "@/data/admin-dashboard";

export default function AdminPage() {
  return <AdminPortal data={adminDashboard} />;
}
