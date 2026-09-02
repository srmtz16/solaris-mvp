import { AdminPortal } from "@/components/admin-portal";
import { adminDashboard } from "@/data/admin-dashboard";

export default function ClientsPage() {
  return <AdminPortal data={adminDashboard} view="clientes" />;
}
