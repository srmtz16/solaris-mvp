import { AdminPortal } from "@/components/admin-portal";
import { adminDashboard } from "@/data/admin-dashboard";

export default function MaintenancePage() {
  return <AdminPortal data={adminDashboard} view="mantenimientos" />;
}
